import Anthropic from "@anthropic-ai/sdk";
import { db, agentRegistryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cache in-memory so we don't hit DB on every session create
let cachedCoordinatorId: string | null = null;
let cachedEnvironmentId: string | null = null;

const SPECIALIST_ROLES = [
  {
    role: "system-architect",
    name: "MASSA System Architect",
    model: "claude-opus-4-8" as const,
    system: `You are the MASSA System Architect. You analyze project requirements, design the overall system architecture, define data models, and break work into parallel tracks for specialist engineers.

Your job:
1. Analyze the project goal and decompose it into clear architectural layers
2. Define the data schema (tables, relationships, indexes)
3. Specify the API surface (endpoints, auth, rate limits)
4. Assign work tracks to specialist subagents
5. Ensure all pieces fit together cohesively

Output clean, production-grade architecture decisions. Think like a senior architect at Stripe or Linear.`,
  },
  {
    role: "backend-engineer",
    name: "MASSA Backend Engineer",
    model: "claude-opus-4-8" as const,
    system: `You are the MASSA Backend Engineer. You build production-grade server-side code: Node.js APIs, PostgreSQL schemas with Drizzle ORM, authentication, business logic, and integrations.

Write TypeScript throughout. Use Express 5, Zod for validation, Pino for logging. Follow REST conventions. Include error handling, input validation, and proper HTTP status codes. Think like a senior engineer at a Series B startup.`,
  },
  {
    role: "frontend-engineer",
    name: "MASSA Frontend Engineer",
    model: "claude-opus-4-8" as const,
    system: `You are the MASSA Frontend Engineer. You build stunning React + TypeScript UIs with Tailwind CSS and Framer Motion.

Your work must look like a $50,000 agency build:
- Framer Motion animations (spring physics, stagger, viewport triggers)
- Glass morphism cards, gradient heroes, frosted glass nav
- Inter/Plus Jakarta Sans typography with tight tracking
- Proper TypeScript types for all props and state
- Responsive (mobile-first), accessible, fast

Make every pixel count. Think Vercel, Linear, Stripe.`,
  },
  {
    role: "ux-designer",
    name: "MASSA UI/UX Designer",
    model: "claude-opus-4-8" as const,
    system: `You are the MASSA UI/UX Designer. You design component architectures, design tokens, layout systems, and user flows before code is written.

Output:
- Design token specifications (colors, spacing, typography, shadows)
- Component inventory with props and variants
- Layout specifications (grid, breakpoints, spacing)
- User flow diagrams (in text form)
- Interaction specifications (hover states, transitions, loading states)

Think like a designer at a top-tier design agency who codes.`,
  },
  {
    role: "motion-designer",
    name: "MASSA Motion Designer",
    model: "claude-opus-4-8" as const,
    system: `You are the MASSA Motion Designer. You add life to interfaces with precisely tuned animations using Framer Motion, CSS keyframes, and Lottie.

Specialties:
- Entrance animations (fade-in-up, scale-in, slide-in)
- Scroll-triggered animations with IntersectionObserver / Framer's whileInView
- Micro-interactions (button press, form field focus, card hover)
- Page transitions and route animations
- Loading states, skeleton screens, and progress indicators
- Particle systems and gradient animations

Use spring physics (stiffness: 400, damping: 28) as the default. Never use linear easing for UI elements.`,
  },
  {
    role: "copywriter",
    name: "MASSA Copywriter",
    model: "claude-opus-4-8" as const,
    system: `You are the MASSA Marketing Copywriter. You write conversion-optimized copy for landing pages, marketing sites, email sequences, and product UIs.

Your copy is:
- Clear and benefit-first (not feature-first)
- Specific (uses numbers, names, real outcomes)
- Urgency-creating without being spammy
- Tonally confident and modern (Notion, Linear, Vercel style)
- SEO-aware with natural keyword inclusion

Deliver: headlines, subheadlines, body copy, CTAs, testimonials, FAQ answers, meta descriptions.`,
  },
  {
    role: "qa-engineer",
    name: "MASSA QA Engineer",
    model: "claude-opus-4-8" as const,
    system: `You are the MASSA QA Engineer. You review all generated code for:
- TypeScript type errors and unsafe patterns
- Logic bugs and edge cases
- Security vulnerabilities (SQL injection, XSS, CSRF, etc.)
- Performance issues (N+1 queries, memory leaks, blocking I/O)
- Missing error handling
- API contract mismatches

Output a numbered list of issues with severity (CRITICAL / HIGH / MEDIUM / LOW) and the exact fix. Be thorough and precise.`,
  },
];

async function getOrCreateAgent(role: string, name: string, model: "claude-opus-4-8", system: string): Promise<string> {
  // Check DB first
  const existing = await db.query.agentRegistryTable.findFirst({
    where: eq(agentRegistryTable.role, role),
  });
  if (existing) return existing.agentId;

  // Create new persistent agent
  const agent = await (client.beta as any).agents.create({
    name,
    model,
    system,
    tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }],
  });

  await db.insert(agentRegistryTable).values({
    role,
    agentId: agent.id,
    version: agent.version ?? "1",
  });

  logger.info({ role, agentId: agent.id }, "Created MASSA agent");
  return agent.id as string;
}

async function getOrCreateEnvironment(): Promise<string> {
  if (cachedEnvironmentId) return cachedEnvironmentId;

  const existing = await db.query.agentRegistryTable.findFirst({
    where: eq(agentRegistryTable.role, "environment"),
  });
  if (existing) {
    cachedEnvironmentId = existing.agentId;
    return cachedEnvironmentId;
  }

  const env = await (client.beta as any).environments.create({
    type: "cloud",
    networking: { type: "unrestricted" },
  });

  await db.insert(agentRegistryTable).values({
    role: "environment",
    agentId: env.id,
  });

  cachedEnvironmentId = env.id as string;
  logger.info({ environmentId: env.id }, "Created MASSA environment");
  return cachedEnvironmentId;
}

export async function initMassaAgents(): Promise<void> {
  try {
    logger.info("Initializing MASSA Managed Agents...");

    // Create all specialists
    const specialistIds: string[] = [];
    for (const spec of SPECIALIST_ROLES) {
      const id = await getOrCreateAgent(spec.role, spec.name, spec.model, spec.system);
      specialistIds.push(id);
    }

    // Get/create environment
    cachedEnvironmentId = await getOrCreateEnvironment();

    // Get or create coordinator (needs all specialist IDs)
    const existingCoord = await db.query.agentRegistryTable.findFirst({
      where: eq(agentRegistryTable.role, "coordinator"),
    });

    if (existingCoord) {
      cachedCoordinatorId = existingCoord.agentId;
    } else {
      const coordinator = await (client.beta as any).agents.create({
        name: "MASSA Coordinator",
        model: "claude-opus-4-8",
        system: `You are the MASSA OS Coordinator — the orchestrating intelligence that builds world-class software products.

When given a project to build, you:
1. Delegate architecture to the System Architect subagent
2. Simultaneously hand off UI/UX design specs to the Designer
3. Brief the Copywriter on tone, audience, and copy needs
4. Once architecture is defined, coordinate Backend and Frontend engineers in parallel
5. Ask the Motion Designer to enhance key interactions
6. Finally, route all code to the QA Engineer for review

Communicate clearly between subagents. Synthesize their outputs into a coherent whole. Your final output should be a complete, production-ready codebase with documentation.

This is a $50,000 agency-quality build. Every decision should reflect that standard.`,
        tools: [{ type: "agent_toolset_20260401", default_config: { enabled: true } }],
        multiagent: {
          type: "coordinator",
          agents: specialistIds,
        },
      });

      await db.insert(agentRegistryTable).values({
        role: "coordinator",
        agentId: coordinator.id,
        environmentId: cachedEnvironmentId,
        version: coordinator.version ?? "1",
      });

      cachedCoordinatorId = coordinator.id as string;
      logger.info({ coordinatorId: coordinator.id }, "Created MASSA Coordinator agent");
    }

    logger.info({ coordinatorId: cachedCoordinatorId, environmentId: cachedEnvironmentId }, "MASSA Managed Agents ready");
  } catch (err) {
    // Managed Agents API may not be available in all environments — fail soft
    logger.warn({ err }, "Could not initialize MASSA Managed Agents (falling back to streaming mode)");
  }
}

export async function getCoordinatorId(): Promise<string | null> {
  if (cachedCoordinatorId) return cachedCoordinatorId;
  const row = await db.query.agentRegistryTable.findFirst({
    where: eq(agentRegistryTable.role, "coordinator"),
  });
  cachedCoordinatorId = row?.agentId ?? null;
  return cachedCoordinatorId;
}

export async function getEnvironmentId(): Promise<string | null> {
  if (cachedEnvironmentId) return cachedEnvironmentId;
  const row = await db.query.agentRegistryTable.findFirst({
    where: eq(agentRegistryTable.role, "environment"),
  });
  cachedEnvironmentId = row?.agentId ?? null;
  return cachedEnvironmentId;
}

export async function createProjectSession(
  projectId: number,
  projectName: string,
  projectGoal: string,
  projectType: string,
  designMd?: string | null,
): Promise<{ sessionId: string } | null> {
  const coordinatorId = await getCoordinatorId();
  const environmentId = await getEnvironmentId();
  if (!coordinatorId || !environmentId) return null;

  try {
    const designContext = designMd ? `\n\n## Design System\n${designMd}` : "";
    const session = await (client.beta as any).sessions.create({
      agent: { type: "agent", id: coordinatorId },
      environment_id: environmentId,
      title: `Build: ${projectName} (${projectType})`,
      input: [
        {
          type: "user",
          content: `Build a production-grade ${projectType} called "${projectName}".

Goal: ${projectGoal}${designContext}

Deliver complete, working code across all layers. This is a premium $50k agency build. Coordinate all specialist subagents in parallel where possible.`,
        },
      ],
    });

    return { sessionId: session.id as string };
  } catch (err) {
    logger.warn({ err, projectId }, "Could not create Managed Agent session");
    return null;
  }
}

export { client as anthropicClient };

import { Router, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { complete } from "../lib/models.js";
import { db, projectsTable, buildsTable, projectMessagesTable, massaSkillsTable } from "@workspace/db";
import { eq, desc, or, like } from "drizzle-orm";
import { createProjectSession, getCoordinatorId } from "../lib/massaAgents.js";

const router = Router();

// SSE client registry: projectId -> set of response objects
const sseClients = new Map<number, Set<Response>>();

function pushSSE(projectId: number, event: string, data: unknown) {
  const clients = sseClients.get(projectId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { clients.delete(res); }
  }
}

// Project type → specialist agents + prompts
const DESIGN_SYSTEM_PROMPT = `
DESIGN SYSTEM — Follow these non-negotiable principles for ALL generated UIs:

VISUAL FEEL: Enterprise SaaS meets boutique agency. Think Linear, Vercel, Stripe, Notion, Loom.
- Dark mode first with optional light mode
- Typography: Inter or Plus Jakarta Sans, tight tracking on headings (-0.03em), generous line-height on body
- Color: One brand accent (violet, emerald, or blue) with carefully considered neutrals
- Spacing: 4px base grid, generous section padding (80-120px), compact component density

ANIMATIONS (use Framer Motion):
- Fade-in-up on scroll for sections (initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 })
- Stagger children with delay increments of 0.08s
- Spring physics on interactive elements (type: "spring", stiffness: 400, damping: 28)
- Hover scale on cards (whileHover: { scale: 1.02 })
- Smooth gradient text animations

COMPONENTS that MUST look premium:
- Hero: Full-viewport with gradient mesh background, floating glow effects, animated headline
- Cards: Glass morphism (backdrop-filter: blur(16px), bg: rgba(255,255,255,0.05)), subtle border
- Buttons: Gradient fills, shimmer on hover, shadow glow matching brand color
- Navigation: Frosted glass sticky nav with active state
- Metrics/KPIs: Animated number counters, trend indicators with sparklines

CSS/STYLING:
- Tailwind CSS with custom config
- CSS custom properties for theme tokens
- @keyframes for custom animations where Framer isn't used
- box-shadow with multiple layers for depth
- background: linear-gradient or conic-gradient for hero sections

This is a $50,000 agency-quality build. Make every pixel count.
`;

const PROJECT_TYPE_CONFIG: Record<string, {
  description: string;
  agents: string[];
  systemPrompt: (name: string, goal: string) => string;
}> = {
  "landing-page": {
    description: "High-converting landing page with hero, features, testimonials, CTA",
    agents: ["UI/UX Designer", "Frontend Engineer", "Copywriter Agent", "Motion Designer"],
    systemPrompt: (name, goal) => `You are building a world-class, high-converting landing page for "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

LANDING PAGE STRUCTURE (all sections required):
1. HERO: Full-viewport, gradient mesh background (radial gradients layered), animated headline with gradient text, subheadline, two CTAs (primary gradient button + ghost button), floating UI mockup or screenshot, trust badges
2. SOCIAL PROOF BAR: Logo strip of well-known brands, scrolling marquee animation
3. FEATURES: 3-column grid, each card with gradient icon container, title, description, micro-animation on hover
4. HOW IT WORKS: Numbered steps with connecting line, alternating left/right layout
5. TESTIMONIALS: Card carousel with avatar, quote, star rating, company
6. PRICING: 3 tiers, middle tier highlighted with gradient border and "Most Popular" badge
7. FAQ: Accordion with smooth open/close animation
8. FINAL CTA: Dark section with centered headline and single CTA button with glow
9. FOOTER: Multi-column with logo, links, social icons

Generate COMPLETE React + TypeScript + Tailwind + Framer Motion code. Every component should look like it cost $50k to build.`,
  },
  "crm": {
    description: "Enterprise CRM with contacts, deals pipeline, and analytics",
    agents: ["System Architect", "Backend Engineer", "Frontend Engineer", "Data Engineer"],
    systemPrompt: (name, goal) => `You are building an enterprise-grade CRM called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

CRM MUST INCLUDE:
1. CONTACTS: Sortable table with avatar, tags, last activity, deal value. Row hover shows quick actions. Bulk select + actions.
2. DEAL PIPELINE: Drag-and-drop Kanban board (use @hello-pangea/dnd). Columns: Lead → Qualified → Proposal → Negotiation → Won/Lost. Deal cards show value, probability, next step.
3. CONTACT DETAIL: Left panel with info, right panel with activity timeline (calls, emails, meetings, notes). Inline editing.
4. DASHBOARD: Revenue chart (area chart), conversion funnel, deal velocity, win rate, top performers leaderboard.
5. GLOBAL SEARCH: CMD+K command palette for contacts, deals, activities.

UI: Sidebar nav (collapsed/expanded), top bar with search + notifications + user avatar, breadcrumbs.
Database: PostgreSQL with proper relations (contacts, deals, activities, users, teams).
Generate complete TypeScript + React + Node.js + PostgreSQL + Drizzle ORM code.`,
  },
  "saas": {
    description: "Full-stack SaaS with auth, billing, multi-tenant dashboard",
    agents: ["System Architect", "Backend Engineer", "Frontend Engineer", "Security Engineer", "DevOps Engineer"],
    systemPrompt: (name, goal) => `You are building a production-grade SaaS platform called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

SAAS MUST INCLUDE:
1. AUTH: Email/password + Google OAuth. Magic link option. 2FA flow. Beautiful auth pages with brand illustration.
2. ONBOARDING: Multi-step wizard (3-5 steps). Progress bar. Celebrate completion with confetti.
3. DASHBOARD: Personalized greeting, key metrics, recent activity, quick actions, onboarding checklist.
4. SETTINGS: Profile, team members (invite flow), billing (upgrade/downgrade with plan comparison), API keys.
5. BILLING: Stripe integration. Usage meters. Invoice history. Upgrade prompts with value props.
6. ADMIN: User management, usage analytics, revenue metrics, feature flags.
7. API: REST with API key auth, rate limiting (Redis), OpenAPI docs, webhook system.

Architecture: Multi-tenant (organization-scoped data), RBAC (owner/admin/member), audit logs.
Generate complete TypeScript + React + Node.js + PostgreSQL + Stripe code.`,
  },
  "marketing-site": {
    description: "Full marketing site with blog, SEO, lead capture, animations",
    agents: ["UI/UX Designer", "Frontend Engineer", "Copywriter Agent", "SEO Specialist", "Motion Designer"],
    systemPrompt: (name, goal) => `You are building a premium marketing website for "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

MARKETING SITE STRUCTURE:
1. HOME: Hero with animated particles or gradient mesh, value prop, social proof, feature highlights, testimonials, CTA
2. PRODUCT: Deep-dive feature pages with screenshots, comparison tables, interactive demos (mocked)
3. PRICING: Transparent pricing with toggle (monthly/annual), feature comparison table, FAQs
4. BLOG: Article grid with categories/tags, reading time, author card, related posts, newsletter signup
5. ABOUT: Company story, team grid with hover effects, timeline, culture photos
6. CONTACT: Multi-column contact page with form, map placeholder, office details, social links
7. CASE STUDIES: Customer success stories with metrics, before/after

SEO: meta tags, OG images, structured data, sitemap.xml, robots.txt
Performance: lazy loading, image optimization, prefetching
Generate complete React (Vite or Next.js) + TypeScript + Tailwind + Framer Motion code.`,
  },
  "ecommerce": {
    description: "Premium e-commerce with products, cart, checkout, orders",
    agents: ["System Architect", "Backend Engineer", "Frontend Engineer", "Payment Engineer", "UI/UX Designer"],
    systemPrompt: (name, goal) => `You are building a premium e-commerce platform called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

ECOMMERCE MUST INCLUDE:
1. STOREFRONT: Hero with featured collection, trending products grid, promotional banners with countdown timer
2. PRODUCT CATALOG: Filter sidebar (price, category, tags, rating), sort options, grid/list toggle, infinite scroll
3. PRODUCT DETAIL: Image gallery with zoom, size/variant selector, quantity, add-to-cart with animation, reviews, related products
4. CART: Slide-in drawer, quantity controls, coupon field, upsell section, summary with shipping estimate
5. CHECKOUT: Multi-step (shipping → payment → review). Stripe Elements. Order confirmation with animation.
6. ACCOUNT: Order history, tracking, wishlist, saved addresses, loyalty points
7. ADMIN: Product management, order fulfillment, inventory alerts, revenue analytics

Design: Luxury feel — serif product headings, editorial photography placeholders, generous whitespace.
Generate complete TypeScript + React + Node.js + Stripe + PostgreSQL code.`,
  },
  "dashboard": {
    description: "Analytics dashboard with real-time data, charts, and insights",
    agents: ["UI/UX Designer", "Frontend Engineer", "Backend Engineer", "Data Engineer"],
    systemPrompt: (name, goal) => `You are building a stunning analytics dashboard called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

DASHBOARD MUST INCLUDE:
1. OVERVIEW: Animated KPI cards (number counter animation on mount), sparkline in each card, trend % with up/down indicator
2. CHARTS: Area chart (revenue over time), bar chart (by category), donut chart (distribution), heatmap (activity)
3. DATA TABLE: Virtualized table for large datasets, sortable columns, row selection, inline editing, column visibility toggle
4. FILTERS: Date range picker, multi-select filters, saved filter presets
5. REAL-TIME: WebSocket connection for live updates, toast notifications for anomalies
6. REPORTS: Scheduled reports, export to CSV/PDF, email delivery
7. ALERTS: Threshold-based alerts, notification center, alert history

Use Recharts or Nivo for charts. Use Tanstack Table for data tables.
Generate complete React + TypeScript + Recharts + Node.js code that looks like Mixpanel or Amplitude.`,
  },
  "mobile-app": {
    description: "React Native mobile app with beautiful UI and native feel",
    agents: ["Mobile Engineer", "UI/UX Designer", "Backend Engineer", "Motion Designer"],
    systemPrompt: (name, goal) => `You are building a premium mobile app called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

MOBILE APP MUST INCLUDE:
1. ONBOARDING: 3-4 swipeable screens with Lottie animations, skip option, smooth transitions
2. AUTH: Biometric login, social auth, phone number option
3. NAVIGATION: Bottom tab bar with haptic feedback, stack navigation with shared element transitions
4. HOME SCREEN: Personalized, animated widgets, pull-to-refresh with custom animation
5. CORE FEATURE SCREENS: Main functionality with native gestures (swipe, long-press, pinch)
6. PROFILE: Editable profile, settings, notifications preferences, app theme
7. NOTIFICATIONS: Rich push notifications with deep links, in-app notification center

Use React Navigation v6, Reanimated 3, Gesture Handler, and React Native MMKV for storage.
Generate complete React Native + TypeScript code with native feel.`,
  },
  "api": {
    description: "Production REST API with auth, rate limiting, docs, monitoring",
    agents: ["System Architect", "Backend Engineer", "Security Engineer", "DevOps Engineer"],
    systemPrompt: (name, goal) => `You are building a production-grade API called "${name}". Goal: ${goal}

Generate a complete, battle-tested REST API with:
1. ROUTES: RESTful endpoints with proper HTTP methods, status codes, error responses
2. AUTH: JWT (access + refresh tokens), API keys with scopes, OAuth2 flow
3. VALIDATION: Zod schemas for all inputs, comprehensive error messages
4. RATE LIMITING: Redis-based rate limiting with different tiers, headers included
5. MIDDLEWARE: Request ID, logging (Pino), CORS, helmet security headers, compression
6. DATABASE: PostgreSQL with Drizzle ORM, migrations, connection pooling
7. CACHING: Redis for expensive queries, cache invalidation strategy
8. DOCS: Auto-generated OpenAPI/Swagger docs, Postman collection
9. WEBHOOKS: Event system with delivery guarantees, retry logic, signature verification
10. MONITORING: Health endpoints, Prometheus metrics, error tracking hooks

Generate complete TypeScript + Node.js + Express + PostgreSQL + Redis code. Enterprise-grade quality.`,
  },
  "automation": {
    description: "Workflow automation with triggers, actions, and 100+ integrations",
    agents: ["System Architect", "Integration Specialist", "Backend Engineer", "AI/ML Engineer", "Frontend Engineer"],
    systemPrompt: (name, goal) => `You are building an automation platform called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

AUTOMATION PLATFORM MUST INCLUDE:
1. WORKFLOW BUILDER: Visual drag-and-drop canvas (React Flow), trigger node, action nodes, condition nodes, loop nodes
2. TRIGGERS: Webhook, schedule (cron), email, form submission, API polling, database change
3. ACTIONS: HTTP request, send email, Slack message, database write, transform data, AI call, delay
4. CONDITIONS: If/else branching, switch cases, filter arrays, wait for condition
5. EXECUTION: Parallel execution, error handling, retry with backoff, timeout configuration
6. HISTORY: Execution timeline, per-step logs, replay failed runs, performance metrics
7. TEMPLATES: Pre-built workflow library (30+ templates), one-click import

Generate complete TypeScript + React + React Flow + Node.js + Redis (for job queues) code.`,
  },
  "data-pipeline": {
    description: "Data pipeline with ETL, transformations, and visualization",
    agents: ["Data Engineer", "Backend Engineer", "AI/ML Engineer", "Frontend Engineer"],
    systemPrompt: (name, goal) => `You are building a data pipeline platform called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

DATA PIPELINE MUST INCLUDE:
1. INGESTION: CSV upload, API polling, webhook receivers, database connectors (Postgres, MySQL, MongoDB)
2. TRANSFORMATIONS: Visual transform builder, 50+ built-in functions (filter, map, aggregate, join, dedupe)
3. SCHEMA: Auto-detection, manual override, type coercion, validation rules
4. STORAGE: PostgreSQL for structured data, object storage for raw files
5. SCHEDULER: Cron-based runs, dependency-aware DAG execution
6. MONITORING: Pipeline health, data quality metrics, anomaly alerts, SLA tracking
7. VISUALIZATION: Embeddable charts, dataset explorer, SQL editor, shareable dashboards

Generate complete TypeScript + Node.js + PostgreSQL + Bull (job queues) + React code.`,
  },
};

PROJECT_TYPE_CONFIG["video-generation"] = {
  description: "AI-generated video content and video-first web experiences",
  agents: ["Motion Designer", "Frontend Engineer", "Copywriter Agent"],
  systemPrompt: (name, goal) => `You are building a video-generation platform called "${name}". Goal: ${goal}

${DESIGN_SYSTEM_PROMPT}

VIDEO PLATFORM MUST INCLUDE:
1. VIDEO PROMPT INPUT: Full-screen cinematic prompt builder with style presets (cinematic, animated, documentary, product demo)
2. GENERATION QUEUE: Progress tracker with estimated time, thumbnail preview on completion
3. VIDEO GALLERY: Masonry grid of generated videos with hover-to-play, download, share
4. STYLE CONFIGURATOR: Duration, aspect ratio (16:9/9:16/1:1), FPS, quality settings
5. SCRIPT-TO-VIDEO: Text input → scene breakdown → multiple video clips → assembled timeline
6. BRAND KIT: Upload logo, color palette, intro/outro templates

Design: Cinematic dark theme with film grain texture, spotlight effects, premium video player UI.
Generate complete React + TypeScript + Tailwind + Framer Motion code.`,
};

const DEFAULT_TYPE_CONFIG = PROJECT_TYPE_CONFIG["saas"];

// GET /api/projects
router.get("/projects", async (_req, res) => {
  try {
    const projects = await db.query.projectsTable.findMany({
      orderBy: [desc(projectsTable.createdAt)],
      with: { builds: true },
    });
    return res.json({ projects });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to fetch projects";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/projects/:id
router.get("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const project = await db.query.projectsTable.findFirst({
      where: eq(projectsTable.id, id),
      with: { builds: true },
    });
    if (!project) return res.status(404).json({ error: "not found" });
    return res.json({ project });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to fetch project";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/projects/:id/stream — SSE endpoint for live build events
router.get("/projects/:id/stream", async (req, res) => {
  const projectId = parseInt(req.params.id);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Register client
  if (!sseClients.has(projectId)) sseClients.set(projectId, new Set());
  sseClients.get(projectId)!.add(res);

  // Send current state immediately
  try {
    const project = await db.query.projectsTable.findFirst({
      where: eq(projectsTable.id, projectId),
      with: { builds: true },
    });
    if (project) {
      res.write(`event: state\ndata: ${JSON.stringify({ project })}\n\n`);
    }
  } catch { /* ok */ }

  // Keep alive
  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.get(projectId)?.delete(res);
  });
});

// POST /api/projects — create and immediately start generating
router.post("/projects", async (req, res) => {
  const { prompt, clarifications, model, projectType = "saas", designMd } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.status(400).json({ error: "prompt required" });
  }

  const typeConfig = PROJECT_TYPE_CONFIG[projectType] ?? DEFAULT_TYPE_CONFIG;

  const clarificationContext = Array.isArray(clarifications) && clarifications.length > 0
    ? `\n\nUser clarifications:\n${clarifications.map((c: { question: string; answer: string }) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n")}`
    : "";

  // Build decomposition with type-aware agents
  let decomposition: {
    name: string;
    goal: string;
    builds: Array<{
      slug: string;
      title: string;
      summary: string;
      agent: string;
      agentRole: string;
      stack: string[];
      dependsOn: string[];
    }>;
  };

  try {
    const raw = await complete({
      model,
      maxTokens: 2000,
      system: `You are MASSA OS, an AI orchestration system that builds ${typeConfig.description}.

Decompose the project into specialist agent build modules. Each module is a distinct deliverable handled by one agent.

Agents available for this project type: ${typeConfig.agents.join(", ")}

Return ONLY valid JSON:
{
  "name": "Project Name (2-4 words, catchy)",
  "goal": "One-sentence goal",
  "builds": [
    {
      "slug": "unique-slug",
      "title": "Module Title",
      "summary": "What this agent builds",
      "agent": "Agent Name",
      "agentRole": "Agent's specific responsibility",
      "stack": ["Tech1", "Tech2"],
      "dependsOn": ["slug-of-dependency"]
    }
  ]
}

Create 4-6 modules that together form a complete, production-ready ${projectType.replace("-", " ")}.`,
      user: `Build: "${prompt.trim()}" (type: ${projectType})${clarificationContext}`,
    });
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    decomposition = JSON.parse(cleaned);
  } catch {
    // Smart fallback based on project type
    const fallbackBuilds = getFallbackBuilds(projectType, prompt.trim());
    decomposition = {
      name: prompt.trim().split(" ").slice(0, 3).join(" "),
      goal: prompt.trim(),
      builds: fallbackBuilds,
    };
  }

  const [project] = await db.insert(projectsTable).values({
    name: decomposition.name,
    goal: decomposition.goal,
    status: "planning",
    projectType,
    designMd: designMd || null,
  }).returning();

  const buildRows = await db.insert(buildsTable).values(
    decomposition.builds.map((b) => ({
      projectId: project.id,
      slug: b.slug,
      title: b.title,
      summary: b.summary,
      agent: b.agent,
      agentRole: b.agentRole,
      stack: b.stack,
      dependsOn: b.dependsOn,
      status: "queued",
      progress: 0,
    }))
  ).returning();

  res.json({ project: { ...project, builds: buildRows } });

  void runPlanningPipeline(project.id, project.name, project.goal, projectType, model, buildRows, decomposition.builds, typeConfig, project.designMd);
  return;
});

// POST /api/projects/:id/approve — approve planning and start builds
router.post("/projects/:id/approve", async (req, res) => {
  const projectId = parseInt(req.params.id);
  try {
    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
    if (!project) return res.status(404).json({ error: "project not found" });
    if (project.status !== "awaiting_approval") return res.status(400).json({ error: "project is not awaiting approval" });

    await db.update(projectsTable).set({ status: "in_progress" }).where(eq(projectsTable.id, projectId));

    const buildRows = await db.query.buildsTable.findMany({ where: eq(buildsTable.projectId, projectId) });
    const origBuilds = buildRows.map(b => ({ slug: b.slug, dependsOn: b.dependsOn as string[] }));
    const typeConfig = PROJECT_TYPE_CONFIG[project.projectType] ?? DEFAULT_TYPE_CONFIG;

    pushSSE(projectId, "approved", { projectId });
    void runBuildsWithStreaming(projectId, buildRows, origBuilds, typeConfig, project.name, project.goal, undefined, project.designMd);

    return res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to approve";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/projects/:id/deploy — Vercel deploy
router.post("/projects/:id/deploy", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const vercelToken = process.env.VERCEL_TOKEN;

  if (!vercelToken) {
    return res.status(500).json({ error: "VERCEL_TOKEN not configured" });
  }

  try {
    const project = await db.query.projectsTable.findFirst({
      where: eq(projectsTable.id, projectId),
      with: { builds: true },
    });
    if (!project) return res.status(404).json({ error: "not found" });

    // Collect code from completed builds
    const completedBuilds = project.builds.filter(b => b.status === "completed" && b.code);
    if (completedBuilds.length === 0) {
      return res.status(400).json({ error: "No completed builds to deploy" });
    }

    // Build a minimal deployable file tree
    const files: Array<{ file: string; data: string; encoding: "utf8" }> = [
      {
        file: "index.html",
        encoding: "utf8",
        data: buildIndexHTML(project.name, completedBuilds),
      },
    ];

    // Add each build's code as a JS module
    for (const build of completedBuilds) {
      if (build.code) {
        files.push({
          file: `src/${build.slug}.ts`,
          encoding: "utf8",
          data: build.code,
        });
      }
    }

    // POST to Vercel
    const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 52),
        files,
        projectSettings: { framework: null },
        target: "production",
      }),
    });

    const deployData = await deployRes.json() as { url?: string; error?: { message: string } };

    if (!deployRes.ok || deployData.error) {
      return res.status(500).json({ error: deployData.error?.message || "Deploy failed" });
    }

    const previewUrl = `https://${deployData.url}`;
    await db.update(projectsTable)
      .set({ previewUrl })
      .where(eq(projectsTable.id, projectId));

    pushSSE(projectId, "deployed", { previewUrl });
    return res.json({ previewUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "deploy failed";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/projects/:id/chat
router.post("/projects/:id/chat", async (req, res) => {
  const { message, buildId, model } = req.body;
  const projectId = parseInt(req.params.id);

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message required" });
  }

  try {
    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
    if (!project) return res.status(404).json({ error: "project not found" });

    let build = null;
    if (buildId) {
      build = await db.query.buildsTable.findFirst({ where: eq(buildsTable.id, parseInt(buildId)) });
    }

    const history = await db.query.projectMessagesTable.findMany({
      where: eq(projectMessagesTable.projectId, projectId),
      orderBy: [desc(projectMessagesTable.createdAt)],
    });
    const recentHistory = history.slice(0, 20).reverse();

    await db.insert(projectMessagesTable).values({
      projectId,
      buildId: build?.id ?? null,
      role: "user",
      content: message,
    });

    const agentName = build?.agent ?? "MASSA AI";
    const agentRole = build?.agentRole ?? "the MASSA OS orchestration AI";

    const systemPrompt = `You are ${agentName}, ${agentRole}. Working on "${project.name}" — ${project.goal}.
${build ? `\nYour module: "${build.title}" — ${build.summary}` : ""}
${build?.plan ? `\nYour plan:\n${build.plan}` : ""}
${build?.code ? `\nYour code (excerpt):\n${build.code.slice(0, 800)}` : ""}

Be helpful, direct, and technical. You are an expert engineer focused on delivering results.`;

    const historyMessages = recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const raw = await complete({
      model,
      maxTokens: 1500,
      system: systemPrompt,
      user: `${historyMessages.map((m) => `${m.role === "user" ? "User" : agentName}: ${m.content}`).join("\n\n")}\n\nUser: ${message}`,
    });

    await db.insert(projectMessagesTable).values({
      projectId,
      buildId: build?.id ?? null,
      role: "assistant",
      content: raw,
    });

    return res.json({ message: raw, agent: agentName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "chat failed";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/projects/:id/messages
router.get("/projects/:id/messages", async (req, res) => {
  const projectId = parseInt(req.params.id);
  const buildId = req.query.buildId ? parseInt(req.query.buildId as string) : undefined;

  try {
    const messages = await db.query.projectMessagesTable.findMany({
      where: buildId
        ? eq(projectMessagesTable.buildId, buildId)
        : eq(projectMessagesTable.projectId, projectId),
      orderBy: [projectMessagesTable.createdAt],
    });
    return res.json({ messages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to fetch messages";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/projects/clone-site — clone a site's design into a new project
router.post("/projects/clone-site", async (req, res) => {
  const { url, projectType = "landing-page", goal } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url required" });
  }

  try {
    // Fetch the site HTML
    let html = "";
    try {
      const fetchRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (MASSA OS design extractor)" },
        signal: AbortSignal.timeout(10000),
      });
      html = await fetchRes.text();
    } catch {
      return res.status(400).json({ error: "Could not fetch URL. Make sure it is publicly accessible." });
    }

    // Truncate HTML to save tokens
    const htmlExcerpt = html.slice(0, 12000);

    // Extract design tokens via Claude
    const designMdRaw = await complete({
      model: undefined,
      maxTokens: 2500,
      system: `You are a design system extractor. Given raw HTML/CSS from a website, extract the design tokens and patterns into a structured design.md document.

Return a markdown document with exactly these sections:
# Design System: [Brand Name]

## Brand Colors
- Primary: #hex — [usage]
- Secondary: #hex — [usage]
- Background: #hex
- Text: #hex
- Accent: #hex

## Typography
- Heading font: [name] ([weight range])
- Body font: [name] ([size range])
- Tracking: [tight/normal/wide]

## Spacing & Layout
- Base grid: [Xpx]
- Section padding: [vertical/horizontal values]
- Component gap: [Xpx]

## Visual Style
- [3-5 bullet points describing the overall aesthetic]

## Component Patterns
- [List key UI components and their visual treatment]

## Tone of Voice
- [2-3 sentences describing the brand's communication style]

## Animations
- [Describe any animation patterns present or implied]`,
      user: `Extract the design system from this website HTML:\n\nURL: ${url}\n\n${htmlExcerpt}`,
    });

    const designMd = designMdRaw.trim();

    // Create the project with design.md attached
    const typeConfig = PROJECT_TYPE_CONFIG[projectType] ?? DEFAULT_TYPE_CONFIG;
    const projectName = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]?.split(".")[0] ?? "Cloned Site";

    const [project] = await db.insert(projectsTable).values({
      name: `${projectName} Clone`,
      goal: goal || `Clone the design and UX patterns of ${url} into a new ${projectType}`,
      status: "queued",
      projectType,
      designMd,
    }).returning();

    return res.json({ project, designMd });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "clone failed";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/skills/massa — list MASSA built-in skills
router.get("/skills/massa", async (_req, res) => {
  try {
    const skills = await db.query.massaSkillsTable.findMany({ orderBy: [massaSkillsTable.category, massaSkillsTable.name] });
    return res.json({ skills });
  } catch (err) {
    return res.status(500).json({ error: "failed to fetch skills" });
  }
});

// POST /api/skills/massa — create a custom skill
router.post("/skills/massa", async (req, res) => {
  const { slug, name, description, content, category } = req.body;
  if (!slug || !name || !content) return res.status(400).json({ error: "slug, name, content required" });
  try {
    const [skill] = await db.insert(massaSkillsTable).values({ slug, name, description: description || "", content, category: category || "custom" }).returning();
    return res.json({ skill });
  } catch (err) {
    return res.status(500).json({ error: "failed to create skill" });
  }
});

// DELETE /api/skills/massa/:id — delete a skill
router.delete("/skills/massa/:id", async (req, res) => {
  try {
    await db.delete(massaSkillsTable).where(eq(massaSkillsTable.id, parseInt(req.params.id)));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "failed to delete skill" });
  }
});

// ── Streaming build runner ────────────────────────────────────────────────────

const VISUAL_PROJECT_TYPES = ["landing-page", "marketing-site", "ecommerce", "dashboard", "mobile-app"];

async function webSearch(query: string): Promise<string> {
  try {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return "";
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 5, scrapeOptions: { formats: ["markdown"] } }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json() as { data?: Array<{ url: string; markdown?: string; title?: string }> };
    if (!data.data?.length) return "";
    return data.data.map(r => `## ${r.title ?? r.url}\nSource: ${r.url}\n\n${(r.markdown ?? "").slice(0, 800)}`).join("\n\n---\n\n");
  } catch { return ""; }
}

async function runPlanningPipeline(
  projectId: number,
  projectName: string,
  projectGoal: string,
  projectType: string,
  model: string | undefined,
  buildRows: Array<{ id: number; slug: string; title: string; summary: string; agent: string; agentRole?: string | null; stack: string[] }>,
  origBuilds: Array<{ slug: string; dependsOn: string[] }>,
  typeConfig: typeof DEFAULT_TYPE_CONFIG,
  designMd?: string | null,
) {
  try {
    // Stage 1: Research — real web search first, Claude synthesis second
    pushSSE(projectId, "planning_stage", { stage: "research", status: "running" });

    const searchQueries = [
      `${projectType.replace("-", " ")} SaaS best practices 2025`,
      `${projectGoal.split(" ").slice(0, 6).join(" ")} competitors analysis`,
      `${buildRows.map(b => b.stack).flat().slice(0, 3).join(" ")} integration patterns`,
    ];

    const searchResults = await Promise.all(searchQueries.map(q => webSearch(q)));
    const rawResearch = searchResults.filter(Boolean).join("\n\n===\n\n");

    const researchPrompt = rawResearch
      ? `You are a senior product strategist. Synthesize the following real web research into a structured research brief for building "${projectName}" (${projectType}).\n\nGoal: ${projectGoal}\n\n## Web Research\n${rawResearch}\n\nReturn a structured markdown document covering: market context, key competitors and their differentiators, technical patterns used in the space, and 3-5 strategic recommendations for this specific build. Ground everything in the research above — no generic advice.`
      : `You are a senior product strategist. Write a research brief for building "${projectName}" (${projectType}). Goal: ${projectGoal}. Cover: market context, competitors, technical patterns, and 3-5 strategic recommendations.`;

    const research = await complete({ model, maxTokens: 2000, system: "You are a senior product strategist.", user: researchPrompt });
    await db.update(projectsTable).set({ research }).where(eq(projectsTable.id, projectId));
    pushSSE(projectId, "planning_stage", { stage: "research", status: "done", content: research });

    // Stage 2: Architecture
    pushSSE(projectId, "planning_stage", { stage: "architecture", status: "running" });
    const architecture = await complete({
      model,
      maxTokens: 2000,
      system: "You are a senior software architect.",
      user: `Based on this research, design the architecture for "${projectName}" (${projectType}).\n\nGoal: ${projectGoal}\n\nResearch:\n${research.slice(0, 1500)}\n\nBuild modules planned:\n${buildRows.map(b => `- ${b.title}: ${b.summary} [${b.stack.join(", ")}]`).join("\n")}\n\nReturn a markdown architecture document covering: system overview, data models, API surface, infrastructure decisions, and how the build modules fit together. Be specific and opinionated.`,
    });
    await db.update(projectsTable).set({ architecture }).where(eq(projectsTable.id, projectId));
    pushSSE(projectId, "planning_stage", { stage: "architecture", status: "done", content: architecture });

    // Stage 3: Wireframes
    pushSSE(projectId, "planning_stage", { stage: "wireframes", status: "running" });
    const wireframes = await complete({
      model,
      maxTokens: 2000,
      system: "You are a senior UX designer who communicates in ASCII wireframes and precise layout specs.",
      user: `Create wireframes for the key screens of "${projectName}" (${projectType}).\n\nGoal: ${projectGoal}\n\nArchitecture context:\n${architecture.slice(0, 800)}\n\nFor each major screen: draw an ASCII wireframe, list the components on the page, and note key interactions. Focus on the 3-4 most important views.`,
    });
    await db.update(projectsTable).set({ wireframes, status: "awaiting_approval" }).where(eq(projectsTable.id, projectId));
    pushSSE(projectId, "planning_stage", { stage: "wireframes", status: "done", content: wireframes });
    pushSSE(projectId, "awaiting_approval", { projectId });
  } catch (err) {
    // If planning fails, fall straight into builds
    const msg = err instanceof Error ? err.message : "planning failed";
    pushSSE(projectId, "planning_error", { error: msg });
    await db.update(projectsTable).set({ status: "in_progress" }).where(eq(projectsTable.id, projectId));
    void runBuildsWithStreaming(projectId, buildRows, origBuilds, typeConfig, projectName, projectGoal, model, designMd);
  }
}

async function generateHeroImage(prompt: string): Promise<string | null> {
  try {
    const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!openaiKey) return null;
    const res = await fetch(`${process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1792x1024", quality: "standard", response_format: "url" }),
    });
    const data = await res.json() as { data?: Array<{ url: string }> };
    return data.data?.[0]?.url ?? null;
  } catch { return null; }
}

async function runBuildsWithStreaming(
  projectId: number,
  builds: Array<{ id: number; slug: string; title: string; summary: string; agent: string; agentRole?: string | null; stack: string[] }>,
  origBuilds: Array<{ slug: string; dependsOn: string[] }>,
  typeConfig: typeof DEFAULT_TYPE_CONFIG,
  projectName: string,
  projectGoal: string,
  model: string | undefined,
  designMd?: string | null,
) {
  const completed = new Set<string>();
  const remaining = new Set(builds.map((b) => b.slug));

  // Try to use managed agent session for the whole project
  const coordinatorId = await getCoordinatorId();
  let managedSessionId: string | null = null;
  if (coordinatorId) {
    try {
      const sessionResult = await createProjectSession(projectId, projectName, projectGoal, typeConfig.description, designMd);
      managedSessionId = sessionResult?.sessionId ?? null;
      if (managedSessionId) {
        await db.update(projectsTable).set({ sessionId: managedSessionId }).where(eq(projectsTable.id, projectId));
        pushSSE(projectId, "session_created", { sessionId: managedSessionId });
      }
    } catch { managedSessionId = null; }
  }

  async function processBuild(build: typeof builds[0]) {
    await db.update(buildsTable).set({ status: "in_progress", progress: 5, log: "" }).where(eq(buildsTable.id, build.id));
    pushSSE(projectId, "build_start", { buildId: build.id, slug: build.slug });

    let fullLog = "";

    function appendLog(text: string) {
      fullLog += text;
      pushSSE(projectId, "log", { buildId: build.id, text });
    }

    try {
      // Inject skills relevant to this agent/project type
      const relevantSkills = await db.query.massaSkillsTable.findMany({
        where: or(
          like(massaSkillsTable.category, `%${build.agent}%`),
          like(massaSkillsTable.category, `%${typeConfig.description.split(" ")[0]}%`),
        ),
        limit: 3,
      });
      const skillsContext = relevantSkills.length > 0
        ? `\n\n## Injected Skills\n${relevantSkills.map(s => `### ${s.name}\n${s.content}`).join("\n\n")}`
        : "";
      if (relevantSkills.length > 0) {
        appendLog(`[${build.agent}] Skills injected: ${relevantSkills.map(s => s.name).join(", ")}\n`);
      }

      appendLog(`[${build.agent}] Starting "${build.title}"...\n`);

      // If managed agent session is active, stream its events for this build
      if (managedSessionId) {
        try {
          appendLog(`[${build.agent}] Running via Managed Agent session...\n`);
          const { anthropicClient } = await import("../lib/massaAgents.js");
          const stream = (anthropicClient.beta as any).sessions.events.stream(managedSessionId, {
            filter: { types: ["message_delta", "agent_message_delta", "subagent_turn_start"] },
          });
          let code = "";
          let plan = "";
          for await (const event of stream) {
            if (event.type === "subagent_turn_start") {
              appendLog(`\n[${event.agent_name ?? build.agent}] Taking over...\n`);
              pushSSE(projectId, "agent_handoff", { buildId: build.id, agentName: event.agent_name });
            } else if (event.type === "message_delta" || event.type === "agent_message_delta") {
              const text = event.delta?.text ?? "";
              if (text) { code += text; appendLog(text); }
            }
          }
          await db.update(buildsTable).set({ code, plan, status: "completed", progress: 100, log: fullLog }).where(eq(buildsTable.id, build.id));
          pushSSE(projectId, "build_done", { buildId: build.id, slug: build.slug });
          return;
        } catch {
          appendLog(`\n[${build.agent}] Managed session unavailable — falling back to streaming mode.\n`);
        }
      }

      // Fallback: 3-phase streaming
      // Phase 1: Thinking (streaming)
      appendLog(`[${build.agent}] Analyzing requirements...\n`);
      let thinking = "";

      const thinkStream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: `You are ${build.agent}, ${build.agentRole ?? "a specialist engineer"}. Think through your approach to building the "${build.title}" module for "${projectName}". Be concise and technical.${skillsContext}`,
        messages: [{ role: "user", content: `Module: ${build.title}\nSummary: ${build.summary}\nStack: ${build.stack.join(", ")}\nProject goal: ${projectGoal}` }],
      });

      for await (const chunk of thinkStream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          thinking += chunk.delta.text;
          appendLog(chunk.delta.text);
        }
      }

      await db.update(buildsTable).set({ thinkingLog: thinking, progress: 25 }).where(eq(buildsTable.id, build.id));
      pushSSE(projectId, "progress", { buildId: build.id, progress: 25 });
      appendLog(`\n\n[${build.agent}] Planning implementation...\n`);

      // Phase 2: Plan (streaming)
      let plan = "";
      const planStream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: `You are ${build.agent}. Write a clear, numbered implementation plan for the "${build.title}" module. Be specific and actionable.${skillsContext}`,
        messages: [{ role: "user", content: `Module: ${build.title}\nStack: ${build.stack.join(", ")}\nGoal: ${build.summary}\n\nThinking:\n${thinking.slice(0, 400)}` }],
      });

      for await (const chunk of planStream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          plan += chunk.delta.text;
          appendLog(chunk.delta.text);
        }
      }

      await db.update(buildsTable).set({ plan, progress: 55 }).where(eq(buildsTable.id, build.id));
      pushSSE(projectId, "progress", { buildId: build.id, progress: 55 });
      appendLog(`\n\n[${build.agent}] Writing code...\n`);

      // Inject design.md context if available
      const designContext = designMd ? `\n\n## Cloned Design System\n${designMd}\n\nImportant: Apply the above design tokens (colors, fonts, spacing) faithfully throughout your code.` : "";

      // Generate hero image for visual builds
      let heroImageUrl: string | null = null;
      const isVisualBuild = VISUAL_PROJECT_TYPES.includes(typeConfig.description.toLowerCase().split(" ")[0] ?? "");
      if (isVisualBuild && (build.slug.includes("hero") || build.slug.includes("landing") || build.slug.includes("home"))) {
        appendLog(`\n[${build.agent}] Generating hero image...\n`);
        heroImageUrl = await generateHeroImage(`Premium ${projectName} hero image: ${projectGoal}. Photorealistic, modern, corporate, wide format, no text.`);
        if (heroImageUrl) {
          appendLog(`[${build.agent}] ✓ Hero image generated\n`);
        }
      }

      const heroImageNote = heroImageUrl ? `\n\nA hero image has been generated for you at this URL — use it in the hero section as an <img> or CSS background:\n${heroImageUrl}` : "";

      // Phase 3: Code generation (streaming) — type-aware prompts
      let code = "";
      const codeStream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: typeConfig.systemPrompt(projectName, projectGoal) + designContext + skillsContext + `\n\nYou are specifically the ${build.agent}. Write production-quality code for the "${build.title}" module. Include all necessary files, TypeScript types, and comments. Make it look INCREDIBLE.`,
        messages: [{ role: "user", content: `Module: ${build.title}\nSummary: ${build.summary}\nStack: ${build.stack.join(", ")}\nPlan:\n${plan}${heroImageNote}` }],
      });

      for await (const chunk of codeStream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          code += chunk.delta.text;
          appendLog(chunk.delta.text);
        }
      }

      appendLog(`\n\n[${build.agent}] ✓ "${build.title}" complete.\n`);

      await db.update(buildsTable).set({
        code,
        status: "completed",
        progress: 100,
        log: fullLog,
      }).where(eq(buildsTable.id, build.id));

      pushSSE(projectId, "build_done", { buildId: build.id, slug: build.slug });
      completed.add(build.slug);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      appendLog(`\n[ERROR] ${errMsg}\n`);
      await db.update(buildsTable).set({ status: "failed", progress: 0, log: fullLog }).where(eq(buildsTable.id, build.id));
      pushSSE(projectId, "build_error", { buildId: build.id, error: errMsg });
      completed.add(build.slug);
    }
  }

  // Process in dependency waves
  while (remaining.size > 0) {
    const wave = builds.filter((b) => {
      if (!remaining.has(b.slug)) return false;
      const orig = origBuilds.find((o) => o.slug === b.slug);
      return !orig || orig.dependsOn.every((dep) => completed.has(dep));
    });
    if (wave.length === 0) break;
    await Promise.all(wave.map((b) => processBuild(b)));
    wave.forEach((b) => remaining.delete(b.slug));
  }

  const allBuilds = await db.query.buildsTable.findMany({ where: eq(buildsTable.projectId, projectId) });
  const anyFailed = allBuilds.some((b) => b.status === "failed");
  const finalStatus = anyFailed ? "failed" : "completed";

  await db.update(projectsTable).set({ status: finalStatus }).where(eq(projectsTable.id, projectId));
  pushSSE(projectId, "project_done", { projectId, status: finalStatus });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFallbackBuilds(projectType: string, prompt: string) {
  const fallbacks: Record<string, Array<{ slug: string; title: string; summary: string; agent: string; agentRole: string; stack: string[]; dependsOn: string[] }>> = {
    "landing-page": [
      { slug: "hero-section", title: "Hero Section", summary: "Above-the-fold hero with headline, subtext, CTA", agent: "UI/UX Designer", agentRole: "Designs the hero", stack: ["React", "Tailwind"], dependsOn: [] },
      { slug: "features-section", title: "Features", summary: "Feature highlights with icons and descriptions", agent: "Frontend Engineer", agentRole: "Builds feature grid", stack: ["React", "Tailwind"], dependsOn: ["hero-section"] },
      { slug: "social-proof", title: "Social Proof", summary: "Testimonials, logos, metrics", agent: "Copywriter Agent", agentRole: "Writes and designs social proof", stack: ["React", "Tailwind"], dependsOn: ["hero-section"] },
      { slug: "cta-footer", title: "CTA + Footer", summary: "Final CTA, navigation, footer links", agent: "Frontend Engineer", agentRole: "Builds CTA and footer", stack: ["React", "Tailwind"], dependsOn: ["features-section"] },
    ],
    "crm": [
      { slug: "data-models", title: "Data Models", summary: "Contact, deal, activity schemas", agent: "System Architect", agentRole: "Designs the data layer", stack: ["TypeScript", "PostgreSQL"], dependsOn: [] },
      { slug: "api-endpoints", title: "API Layer", summary: "REST endpoints for contacts, deals, activities", agent: "Backend Engineer", agentRole: "Builds the API", stack: ["Express", "Drizzle"], dependsOn: ["data-models"] },
      { slug: "pipeline-ui", title: "Deal Pipeline", summary: "Kanban board with drag-and-drop stages", agent: "Frontend Engineer", agentRole: "Builds the Kanban UI", stack: ["React", "TypeScript"], dependsOn: ["api-endpoints"] },
      { slug: "dashboard", title: "CRM Dashboard", summary: "KPIs, charts, recent activity feed", agent: "Frontend Engineer", agentRole: "Builds the dashboard", stack: ["React", "Recharts"], dependsOn: ["api-endpoints"] },
    ],
    "saas": [
      { slug: "core-engine", title: "Core Engine", summary: "Business logic and data models", agent: "System Architect", agentRole: "Designs the foundation", stack: ["TypeScript", "Node.js"], dependsOn: [] },
      { slug: "api-layer", title: "API Layer", summary: "REST API endpoints and auth", agent: "Backend Engineer", agentRole: "Builds the API", stack: ["Express", "Zod"], dependsOn: ["core-engine"] },
      { slug: "frontend-ui", title: "Frontend UI", summary: "React app with routing and state", agent: "Frontend Engineer", agentRole: "Builds the UI", stack: ["React", "TypeScript"], dependsOn: ["api-layer"] },
      { slug: "data-layer", title: "Data Layer", summary: "Database schema and migrations", agent: "Data Engineer", agentRole: "Manages persistence", stack: ["PostgreSQL", "Drizzle"], dependsOn: ["core-engine"] },
      { slug: "auth-billing", title: "Auth + Billing", summary: "Authentication and Stripe billing", agent: "Security Engineer", agentRole: "Handles auth and payments", stack: ["JWT", "Stripe"], dependsOn: ["api-layer"] },
    ],
  };

  return fallbacks[projectType] ?? fallbacks["saas"];
}

function buildIndexHTML(projectName: string, builds: Array<{ title: string; code?: string | null; slug: string }>) {
  const sections = builds.map(b => `
    <section id="${b.slug}" style="padding: 40px; border-bottom: 1px solid #eee;">
      <h2>${b.title}</h2>
      <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; overflow: auto; font-size: 12px;">${(b.code || "// No code generated").replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 2000)}</pre>
    </section>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; }
    header { padding: 32px 40px; background: #000; color: #fff; }
    h1 { font-size: 28px; font-weight: 800; }
    p { color: #aaa; margin-top: 8px; font-size: 14px; }
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
    .badge { display: inline-block; background: #34d399; color: #000; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; margin-top: 8px; }
  </style>
</head>
<body>
  <header>
    <h1>${projectName}</h1>
    <p>Generated by MASSA OS</p>
    <span class="badge">✓ ${builds.length} modules built</span>
  </header>
  ${sections}
</body>
</html>`;
}

export default router;

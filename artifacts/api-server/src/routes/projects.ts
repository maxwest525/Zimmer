import { Router } from "express";
import { complete } from "../lib/models.js";
import { db, projectsTable, buildsTable, projectMessagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/projects — list all projects with their builds
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

// GET /api/projects/:id — single project
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

// POST /api/projects — create project, decompose into builds, kick off AI generation
router.post("/projects", async (req, res) => {
  const { prompt, clarifications, model } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.status(400).json({ error: "prompt required" });
  }

  // Decompose the prompt into build modules via AI
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

  const clarificationContext = Array.isArray(clarifications) && clarifications.length > 0
    ? `\n\nUser clarifications:\n${clarifications.map((c: { question: string; answer: string }) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n")}`
    : "";

  try {
    const raw = await complete({
      model,
      maxTokens: 2000,
      system: `You are MASSA, an AI orchestration system. The user wants to build a software project. Your job is to:
1. Give the project a concise name (2-4 words)
2. Decompose it into 4-6 parallel build modules, each handled by a specialized AI agent

Each build module should represent a distinct layer or feature of the system. Return ONLY valid JSON:
{
  "name": "Project Name",
  "goal": "One-sentence project goal",
  "builds": [
    {
      "slug": "core-engine",
      "title": "Core Engine",
      "summary": "Brief description of this module",
      "agent": "System Architect",
      "agentRole": "Designs and implements the core data models and business logic",
      "stack": ["TypeScript", "Node.js"],
      "dependsOn": []
    },
    {
      "slug": "api-layer",
      "title": "API Layer",
      "summary": "REST API endpoints and middleware",
      "agent": "Backend Engineer",
      "agentRole": "Builds the API routes, authentication, and data validation",
      "stack": ["Express", "Zod"],
      "dependsOn": ["core-engine"]
    }
  ]
}

Agents should be: System Architect, Backend Engineer, Frontend Engineer, AI/ML Engineer, DevOps Engineer, QA Engineer, Security Engineer, Data Engineer, UI/UX Agent, Integration Specialist. Pick the most appropriate ones.`,
      user: `Project: "${prompt.trim()}"${clarificationContext}`,
    });

    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    decomposition = JSON.parse(cleaned);
  } catch {
    // Fallback decomposition
    decomposition = {
      name: prompt.trim().split(" ").slice(0, 3).join(" "),
      goal: prompt.trim(),
      builds: [
        { slug: "core-engine", title: "Core Engine", summary: "Core business logic and data models", agent: "System Architect", agentRole: "Designs the foundation", stack: ["TypeScript"], dependsOn: [] },
        { slug: "api-layer", title: "API Layer", summary: "REST API endpoints", agent: "Backend Engineer", agentRole: "Builds the API", stack: ["Node.js", "Express"], dependsOn: ["core-engine"] },
        { slug: "frontend-ui", title: "Frontend UI", summary: "User interface and interactions", agent: "Frontend Engineer", agentRole: "Builds the UI", stack: ["React", "TypeScript"], dependsOn: ["api-layer"] },
        { slug: "data-layer", title: "Data Layer", summary: "Database schema and queries", agent: "Data Engineer", agentRole: "Manages data persistence", stack: ["PostgreSQL"], dependsOn: ["core-engine"] },
      ],
    };
  }

  // Persist project and builds
  const [project] = await db.insert(projectsTable).values({
    name: decomposition.name,
    goal: decomposition.goal,
    status: "in_progress",
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

  // Respond immediately with the skeleton
  res.json({ project: { ...project, builds: buildRows } });

  // Fire-and-forget: generate AI content for each build
  void generateBuildsInBackground(project.id, buildRows, decomposition.builds, model);
  return;
});

async function generateBuildsInBackground(
  projectId: number,
  builds: Array<{ id: number; slug: string; title: string; summary: string; agent: string; agentRole?: string | null; stack: string[] }>,
  origBuilds: Array<{ slug: string; dependsOn: string[] }>,
  model: string | undefined
) {
  // Build a map for dependency tracking
  const buildBySlug = new Map(builds.map((b) => [b.slug, b]));

  // Process builds respecting dependsOn order
  const completed = new Set<string>();

  async function processBuild(build: typeof builds[0]) {
    await db.update(buildsTable).set({ status: "in_progress", progress: 10 }).where(eq(buildsTable.id, build.id));

    try {
      // Generate thinking log
      const thinking = await complete({
        model,
        maxTokens: 600,
        system: `You are ${build.agent}, ${build.agentRole ?? "a specialist agent"}. Think through your approach to building the "${build.title}" module. Be concise — this is your internal reasoning before writing code.`,
        user: `Module: ${build.title}\nSummary: ${build.summary}\nStack: ${build.stack.join(", ")}`,
      });

      await db.update(buildsTable).set({ thinkingLog: thinking, progress: 30 }).where(eq(buildsTable.id, build.id));

      // Generate plan
      const plan = await complete({
        model,
        maxTokens: 800,
        system: `You are ${build.agent}. Write a clear, structured implementation plan for the "${build.title}" module. Use markdown with numbered steps and sub-tasks. Be specific and technical.`,
        user: `Module: ${build.title}\nSummary: ${build.summary}\nStack: ${build.stack.join(", ")}\n\nYour thinking:\n${thinking}`,
      });

      await db.update(buildsTable).set({ plan, progress: 60 }).where(eq(buildsTable.id, build.id));

      // Generate code
      const code = await complete({
        model,
        maxTokens: 2000,
        system: `You are ${build.agent}. Write production-quality code for the "${build.title}" module. Include proper TypeScript types, error handling, and comments where needed. Return the key files/code for this module.`,
        user: `Module: ${build.title}\nSummary: ${build.summary}\nStack: ${build.stack.join(", ")}\n\nPlan:\n${plan}`,
      });

      await db.update(buildsTable).set({ code, status: "completed", progress: 100 }).where(eq(buildsTable.id, build.id));
      completed.add(build.slug);
    } catch {
      await db.update(buildsTable).set({ status: "failed", progress: 0 }).where(eq(buildsTable.id, build.id));
      completed.add(build.slug);
    }
  }

  // Process in waves based on dependencies
  const remaining = new Set(builds.map((b) => b.slug));

  while (remaining.size > 0) {
    const wave = builds.filter((b) => {
      if (!remaining.has(b.slug)) return false;
      const orig = origBuilds.find((o) => o.slug === b.slug);
      return !orig || orig.dependsOn.every((dep) => completed.has(dep));
    });

    if (wave.length === 0) break; // safety: avoid infinite loop

    await Promise.all(wave.map((b) => processBuild(b)));
    wave.forEach((b) => remaining.delete(b.slug));
  }

  // Mark project completed if all builds done
  const allBuilds = await db.query.buildsTable.findMany({ where: eq(buildsTable.projectId, projectId) });
  const allDone = allBuilds.every((b) => b.status === "completed" || b.status === "failed");
  if (allDone) {
    const anyFailed = allBuilds.some((b) => b.status === "failed");
    await db.update(projectsTable).set({ status: anyFailed ? "failed" : "completed" }).where(eq(projectsTable.id, projectId));
  }
  buildBySlug; // satisfy unused warning
}

// POST /api/projects/:id/chat — chat with the agent for a specific build
router.post("/projects/:id/chat", async (req, res) => {
  const { message, buildId, model } = req.body;
  const projectId = parseInt(req.params.id);

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message required" });
  }

  try {
    // Fetch context
    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
    if (!project) return res.status(404).json({ error: "project not found" });

    let build = null;
    if (buildId) {
      build = await db.query.buildsTable.findFirst({ where: eq(buildsTable.id, parseInt(buildId)) });
    }

    // Load recent message history
    const history = await db.query.projectMessagesTable.findMany({
      where: eq(projectMessagesTable.projectId, projectId),
      orderBy: [desc(projectMessagesTable.createdAt)],
    });
    const recentHistory = history.slice(0, 20).reverse();

    // Save user message
    await db.insert(projectMessagesTable).values({
      projectId,
      buildId: build?.id ?? null,
      role: "user",
      content: message,
    });

    const agentName = build?.agent ?? "MASSA AI";
    const agentRole = build?.agentRole ?? "the project orchestration AI";

    const systemPrompt = `You are ${agentName}, ${agentRole}. You are working on the "${project.name}" project.
${build ? `Your current module: "${build.title}" — ${build.summary}` : ""}
${build?.plan ? `\nYour implementation plan:\n${build.plan}` : ""}

Be helpful, technical, and concise. You can discuss code, architecture, implementation details, and progress.`;

    const historyMessages = recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const raw = await complete({
      model,
      maxTokens: 1000,
      system: systemPrompt,
      user: `${historyMessages.map((m) => `${m.role === "user" ? "User" : agentName}: ${m.content}`).join("\n\n")}\n\nUser: ${message}`,
    });

    // Save assistant response
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

// GET /api/projects/:id/messages — fetch chat history
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

export default router;

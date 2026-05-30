import { Router } from "express";
import { complete } from "../lib/models.js";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/workflows/analyze-image — Claude vision analyzes a loop diagram
router.post("/workflows/analyze-image", async (req, res) => {
  const { imageBase64, mimeType = "image/png", model } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
                data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
              },
            },
            {
              type: "text",
              text: `Analyze this marketing/automation loop diagram and extract it as a structured workflow.

Return ONLY valid JSON in this exact format:
{
  "title": "Workflow name based on the diagram",
  "description": "Brief description of what this loop does",
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger",
      "label": "Node label",
      "subtitle": "brief description",
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2", "label": "optional edge label" }
  ]
}

Node types available: trigger, action, condition, ai_agent, integration, delay, webhook
- trigger: starting event (user signs up, form submitted, scheduled, webhook received)
- action: do something (send email, post to social, create record, call API)
- condition: if/else branch (check value, filter audience, A/B split)
- ai_agent: AI processes something (generate content, analyze sentiment, score lead)
- integration: connect to external service (CRM, analytics, ad platform)
- delay: wait (time delay, wait for event)
- webhook: send/receive HTTP

Position nodes in a left-to-right or top-to-bottom layout with ~200px spacing.
Extract EVERY step visible in the diagram. If the diagram is circular/loop, connect the last node back to the first.`,
            },
          ],
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const workflow = JSON.parse(cleaned);
    return res.json({ workflow });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "analysis failed";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/workflows/generate — generate a workflow from a text description
router.post("/workflows/generate", async (req, res) => {
  const { description, model } = req.body;
  if (!description) return res.status(400).json({ error: "description required" });

  try {
    const raw = await complete({
      model,
      maxTokens: 2000,
      system: `You are a workflow automation expert. Generate a complete marketing/automation workflow from a description.

Return ONLY valid JSON:
{
  "title": "Workflow name",
  "description": "What this workflow does",
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger",
      "label": "Node label",
      "subtitle": "brief description",
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2" }
  ]
}

Node types: trigger, action, condition, ai_agent, integration, delay, webhook
Create 5-10 nodes. Position left-to-right, 220px apart horizontally, center vertically at y=250.`,
      user: description,
    });

    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const workflow = JSON.parse(cleaned);
    return res.json({ workflow });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "generation failed";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/workflows/save — persist a workflow
router.post("/workflows/save", async (req, res) => {
  const { title, description, nodes, edges } = req.body;
  // For now return success — will persist to DB when schema is extended
  return res.json({
    id: `wf-${Date.now()}`,
    title,
    description,
    nodes,
    edges,
    savedAt: new Date().toISOString(),
  });
});

// GET /api/workflows/templates — pre-built workflow templates
router.get("/workflows/templates", (_req, res) => {
  return res.json({
    templates: [
      {
        id: "lead-nurture",
        title: "Lead Nurture Loop",
        description: "Capture leads, score them, and nurture via email + ads",
        category: "Marketing",
        nodes: [
          { id: "n1", type: "trigger", label: "Lead Captured", subtitle: "Form submit / ad click", position: { x: 50, y: 250 } },
          { id: "n2", type: "ai_agent", label: "Score Lead", subtitle: "AI scores intent 0-100", position: { x: 270, y: 250 } },
          { id: "n3", type: "condition", label: "High Intent?", subtitle: "Score > 70", position: { x: 490, y: 250 } },
          { id: "n4", type: "action", label: "Sales Alert", subtitle: "Notify sales team", position: { x: 710, y: 150 } },
          { id: "n5", type: "integration", label: "Email Sequence", subtitle: "Mailchimp drip campaign", position: { x: 710, y: 350 } },
          { id: "n6", type: "integration", label: "Retargeting Ads", subtitle: "Meta & Google ads", position: { x: 930, y: 350 } },
          { id: "n7", type: "delay", label: "Wait 7 days", subtitle: "Re-evaluation window", position: { x: 930, y: 150 } },
          { id: "n8", type: "action", label: "Convert / Re-enter", subtitle: "Loop back or close", position: { x: 1150, y: 250 } },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2" },
          { id: "e2", source: "n2", target: "n3" },
          { id: "e3", source: "n3", target: "n4", label: "Yes" },
          { id: "e4", source: "n3", target: "n5", label: "No" },
          { id: "e5", source: "n5", target: "n6" },
          { id: "e6", source: "n4", target: "n7" },
          { id: "e7", source: "n7", target: "n8" },
          { id: "e8", source: "n6", target: "n8" },
        ],
      },
      {
        id: "content-loop",
        title: "Autonomous Content Loop",
        description: "AI generates, publishes, and repurposes content across channels",
        category: "Content",
        nodes: [
          { id: "n1", type: "trigger", label: "Scheduled Trigger", subtitle: "Every Monday 9am", position: { x: 50, y: 250 } },
          { id: "n2", type: "ai_agent", label: "Research Topics", subtitle: "Trending keywords + gaps", position: { x: 270, y: 250 } },
          { id: "n3", type: "ai_agent", label: "Generate Content", subtitle: "Blog post + social copy", position: { x: 490, y: 250 } },
          { id: "n4", type: "action", label: "Publish Blog", subtitle: "WordPress / Ghost", position: { x: 710, y: 150 } },
          { id: "n5", type: "integration", label: "Social Scheduler", subtitle: "Buffer / Hootsuite", position: { x: 710, y: 350 } },
          { id: "n6", type: "ai_agent", label: "Repurpose", subtitle: "Thread, newsletter, clips", position: { x: 930, y: 250 } },
          { id: "n7", type: "integration", label: "Analytics", subtitle: "Track performance", position: { x: 1150, y: 250 } },
          { id: "n8", type: "condition", label: "High Performer?", subtitle: "Views > 1k", position: { x: 1370, y: 250 } },
          { id: "n9", type: "action", label: "Boost with Ads", subtitle: "Promote top content", position: { x: 1590, y: 150 } },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2" },
          { id: "e2", source: "n2", target: "n3" },
          { id: "e3", source: "n3", target: "n4" },
          { id: "e4", source: "n3", target: "n5" },
          { id: "e5", source: "n4", target: "n6" },
          { id: "e6", source: "n5", target: "n6" },
          { id: "e7", source: "n6", target: "n7" },
          { id: "e8", source: "n7", target: "n8" },
          { id: "e9", source: "n8", target: "n9", label: "Yes" },
          { id: "e10", source: "n8", target: "n1", label: "Next cycle" },
        ],
      },
      {
        id: "seo-loop",
        title: "SEO Ranking Loop",
        description: "Monitor rankings, identify gaps, generate optimized content",
        category: "SEO",
        nodes: [
          { id: "n1", type: "trigger", label: "Weekly Check", subtitle: "Cron: every Sunday", position: { x: 50, y: 250 } },
          { id: "n2", type: "integration", label: "Rank Tracker", subtitle: "SEMrush / Ahrefs pull", position: { x: 270, y: 250 } },
          { id: "n3", type: "ai_agent", label: "Gap Analysis", subtitle: "Find ranking opportunities", position: { x: 490, y: 250 } },
          { id: "n4", type: "ai_agent", label: "Content Brief", subtitle: "Generate optimized outline", position: { x: 710, y: 250 } },
          { id: "n5", type: "ai_agent", label: "Write Article", subtitle: "Full SEO article draft", position: { x: 930, y: 250 } },
          { id: "n6", type: "action", label: "Publish", subtitle: "CMS auto-publish", position: { x: 1150, y: 250 } },
          { id: "n7", type: "webhook", label: "Index Request", subtitle: "Google Search Console", position: { x: 1370, y: 250 } },
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2" },
          { id: "e2", source: "n2", target: "n3" },
          { id: "e3", source: "n3", target: "n4" },
          { id: "e4", source: "n4", target: "n5" },
          { id: "e5", source: "n5", target: "n6" },
          { id: "e6", source: "n6", target: "n7" },
          { id: "e7", source: "n7", target: "n1", label: "Loop" },
        ],
      },
    ],
  });
});

export default router;

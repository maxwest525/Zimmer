import { Router } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { complete, MODEL_CATALOG } from "../lib/models.js";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const router = Router();

router.get("/ai/models", (_req, res) => {
  res.json({
    models: MODEL_CATALOG.map(({ id, label, provider }) => ({ id, label, provider })),
  });
});

router.post("/ai/suggest", async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.json({ suggestions: [] });
  }

  try {
    const raw = await complete({
      model,
      maxTokens: 300,
      system: `You are a sharp product coach. The user just typed a rough idea for a project. Your job is to ask 2-3 SHORT clarifying questions that help narrow down what they actually need — things they haven't specified yet.

Rules:
- Ask questions, NOT feature suggestions. Frame as "What type of X?" or "Should it support Y or Z?" or "Who's the target user?"
- Each question should probe a DIFFERENT missing detail: target audience, core workflow, key constraints, scope boundaries, platform, integrations, etc.
- Be specific to their idea. For "help me find a doctor" ask about specialty type, insurance filtering, booking vs directory. For "build a CRM" ask about sales vs support, team size, communication channels.
- Keep each question under 80 characters
- Write casually — like a smart colleague asking for clarity, not a form
- Do NOT reword, summarize, or rephrase what they already said
- Do NOT suggest features or say "Add X" or "Include Y" or "Integrate Z"

Return ONLY a JSON array of question strings, nothing else.`,
      user: prompt.trim(),
    });

    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const suggestions = JSON.parse(cleaned);
    return res.json({ suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [] });
  } catch {
    return res.json({ suggestions: [] });
  }
});

router.post("/ai/autocomplete", async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return res.json({ completions: [] });
  }

  try {
    const raw = await complete({
      model,
      maxTokens: 80,
      system: `You are an autocomplete engine, like the predictive-text bar on a phone keyboard. The user is typing a prompt describing an app they want to build. Predict the next few words that would naturally continue their sentence.

Rules:
- Return 3 SHORT continuations — each just the NEXT 1-4 words that come after what they typed, NOT a full sentence or rewrite.
- Continue their exact phrasing and grammar. Do not rephrase or restart their sentence.
- If their text ends mid-word, complete that word.
- If their text ends with a space, predict the next word(s).
- Offer 3 DIFFERENT plausible directions when possible.
- No punctuation unless it naturally belongs. No quotes. No numbering.

Return ONLY a JSON array of 3 short strings, nothing else.`,
      user: prompt,
    });

    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const completions = Array.isArray(parsed)
      ? parsed
          .filter((s) => typeof s === "string" && s.trim().length > 0)
          .map((s) => s.trim())
          .slice(0, 3)
      : [];
    return res.json({ completions });
  } catch {
    return res.json({ completions: [] });
  }
});

router.post("/ai/clarify", async (req, res) => {
  const { prompt, previousAnswers, model } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt required" });
  }

  const answers = Array.isArray(previousAnswers) ? previousAnswers : [];
  const answersContext = answers.length > 0
    ? `\n\nPrevious answers:\n${answers.map((a: { question: string; answer: string }) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`
    : "";

  // Hard cap: after 2 answers we always wrap up
  if (answers.length >= 2) {
    return res.json({
      question: "",
      options: [],
      done: true,
      summary: `Building: ${prompt.trim()}`,
    });
  }

  try {
    const raw = await complete({
      model,
      maxTokens: 400,
      system: `You are MASSA AI, a build orchestration system. The user submitted a project prompt. Ask ONE clarifying question — the single most important thing you still need to know. Provide 3-4 multiple choice options. Be concise.

Return ONLY valid JSON in this format:
{
  "question": "Your single clarifying question",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "done": false
}

If the prompt is already specific enough, return:
{
  "question": "",
  "options": [],
  "done": true,
  "summary": "Brief 1-sentence summary of what will be built"
}

You may ask at most 1 question total (the caller enforces a hard cap of 2). Focus on the most critical unknown: target platform, primary user, or core feature priority. Don't repeat questions already answered.`,
      user: `Project prompt: "${prompt.trim()}"${answersContext}`,
    });

    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    return res.json(result);
  } catch {
    return res.json({
      question: "What type of application are you building?",
      options: ["Web app", "Mobile app", "API / Backend service", "Full-stack platform"],
      done: false,
    });
  }
});

router.post("/ai/enhance-prompt", async (req, res) => {
  const { content, mode, model } = req.body;
  if (!content || typeof content !== "string" || content.trim().length < 3) {
    return res.json({ prompt: content || "" });
  }

  const mvpSystem = `You take a rough idea and reframe it as a tightly-scoped MVP (minimum viable product) prompt for an AI coding assistant. Strip it down to the single core feature that proves the concept.

Rules:
- Preserve the original intent, but ruthlessly cut scope to the ONE essential feature
- Start with "Build an MVP that..." and describe only what's needed to validate the core idea
- Explicitly defer nice-to-haves (auth, settings, integrations) unless they ARE the core idea
- Stay under 220 characters total
- Do NOT add tech stack, architecture, or framework choices
- Do NOT add bullet points or numbered lists
- Return ONLY the scoped prompt text, nothing else`;

  const enhanceSystem = `You take a rough idea and turn it into a slightly more detailed, actionable prompt for an AI coding assistant. Keep it concise — add a sentence or two of useful specificity without overcomplicating things.

Rules:
- Preserve the original intent completely
- Add just enough detail to make it actionable (target platform, key features, data handling)
- Write it as a direct instruction to an AI builder, starting with "Build" or a clear verb
- Stay under 200 characters total
- Do NOT add tech stack, architecture, or framework choices
- Do NOT add bullet points or numbered lists
- Return ONLY the enhanced prompt text, nothing else`;

  try {
    const enhanced = await complete({
      model,
      maxTokens: 250,
      system: mode === "mvp" ? mvpSystem : enhanceSystem,
      user: content.trim(),
    });
    return res.json({ prompt: enhanced || content });
  } catch {
    return res.json({ prompt: content });
  }
});

router.post("/ai/image", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return res.status(400).json({ error: "prompt required" });
  }
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.trim(),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });
    const url = response.data?.[0]?.url;
    if (!url) return res.status(500).json({ error: "no image returned" });
    return res.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "image generation failed";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/ai/image-to-html — convert screenshot/image to pixel-perfect HTML
router.post("/ai/image-to-html", async (req, res) => {
  const { imageBase64, imageUrl, mimeType = "image/png" } = req.body;
  if (!imageBase64 && !imageUrl) {
    return res.status(400).json({ error: "imageBase64 or imageUrl required" });
  }

  try {
    const imageSource = imageBase64
      ? { type: "base64" as const, media_type: mimeType as "image/png" | "image/jpeg" | "image/webp", data: imageBase64 }
      : { type: "url" as const, url: imageUrl };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: imageSource },
            {
              type: "text",
              text: `Convert this image/screenshot into pixel-perfect, production-ready HTML.

Requirements:
1. Match every visual detail exactly: colors (use exact hex values), spacing, typography, layout, borders, shadows
2. Use Tailwind CSS (CDN) for utility classes, inline styles for precise values
3. Add Framer Motion-style animations via CSS @keyframes where motion is implied (hover effects, transitions, entrance animations)
4. Make it fully responsive (mobile-first)
5. Use semantic HTML5 elements
6. Include the full Tailwind CDN script tag
7. Add smooth CSS transitions on interactive elements

Return ONLY the complete HTML file, starting with <!DOCTYPE html>. No explanation, no markdown, just the raw HTML.`,
            },
          ],
        },
      ],
    });

    const html = response.content.find(c => c.type === "text")?.text ?? "";

    // Extract tailwind config if present
    const tailwindMatch = html.match(/tailwind\.config\s*=\s*({[\s\S]+?})/);
    const tailwindConfig = tailwindMatch?.[1] ?? "{}";

    return res.json({ html, tailwindConfig });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "image-to-html failed";
    return res.status(500).json({ error: msg });
  }
});

// POST /api/ai/video — generate video via Replicate
router.post("/ai/video", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return res.status(400).json({ error: "prompt required" });
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    return res.json({
      url: null,
      placeholder: true,
      message: "Video generation requires REPLICATE_API_TOKEN. Configure it to enable this feature.",
    });
  }

  try {
    // Use Wan2.1 (fast video gen model)
    const startRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "wan-ai/wan2.1-t2v-480p",
        input: { prompt: prompt.trim(), num_frames: 81, fps: 16 },
      }),
    });

    const prediction = await startRes.json() as { id?: string; error?: string };
    if (!startRes.ok || prediction.error) {
      return res.status(500).json({ error: prediction.error || "Failed to start video generation" });
    }

    return res.json({ predictionId: prediction.id, status: "started" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "video generation failed";
    return res.status(500).json({ error: msg });
  }
});

// GET /api/ai/video/:id — poll Replicate prediction status
router.get("/ai/video/:id", async (req, res) => {
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) return res.status(400).json({ error: "REPLICATE_API_TOKEN not set" });

  try {
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: { Authorization: `Token ${replicateToken}` },
    });
    const data = await pollRes.json() as { status?: string; output?: string | string[]; error?: string };
    const url = Array.isArray(data.output) ? data.output[0] : data.output;
    return res.json({ status: data.status, url: url ?? null, error: data.error });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "poll failed";
    return res.status(500).json({ error: msg });
  }
});

export default router;

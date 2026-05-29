import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

router.post("/ai/suggest", async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
    return res.json({ suggestions: [] });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a sharp product coach. The user just typed a rough idea for a project. Your job is to ask 2-3 SHORT clarifying questions that help narrow down what they actually need — things they haven't specified yet.

Rules:
- Ask questions, NOT feature suggestions. Frame as "What type of X?" or "Should it support Y or Z?" or "Who's the target user?"
- Each question should probe a DIFFERENT missing detail: target audience, core workflow, key constraints, scope boundaries, platform, integrations, etc.
- Be specific to their idea. For "help me find a doctor" ask about specialty type, insurance filtering, booking vs directory. For "build a CRM" ask about sales vs support, team size, communication channels.
- Keep each question under 80 characters
- Write casually — like a smart colleague asking for clarity, not a form
- Do NOT reword, summarize, or rephrase what they already said
- Do NOT suggest features or say "Add X" or "Include Y" or "Integrate Z"

Return ONLY a JSON array of question strings, nothing else.`,
        },
        { role: "user", content: prompt.trim() },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const suggestions = JSON.parse(cleaned);
    res.json({ suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [] });
  } catch {
    res.json({ suggestions: [] });
  }
});

router.post("/ai/clarify", async (req, res) => {
  const { prompt, previousAnswers } = req.body;
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are MASSA AI, a build orchestration system. The user submitted a project prompt. Ask ONE clarifying question — the single most important thing you still need to know. Provide 3-4 multiple choice options. Be concise.

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
        },
        {
          role: "user",
          content: `Project prompt: "${prompt.trim()}"${answersContext}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch {
    res.json({
      question: "What type of application are you building?",
      options: ["Web app", "Mobile app", "API / Backend service", "Full-stack platform"],
      done: false,
    });
  }
});

router.post("/ai/enhance-prompt", async (req, res) => {
  const { content, mode } = req.body;
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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 250,
      messages: [
        {
          role: "system",
          content: mode === "mvp" ? mvpSystem : enhanceSystem,
        },
        { role: "user", content: content.trim() },
      ],
    });

    const enhanced = completion.choices[0]?.message?.content?.trim() || content;
    res.json({ prompt: enhanced });
  } catch {
    res.json({ prompt: content });
  }
});

export default router;

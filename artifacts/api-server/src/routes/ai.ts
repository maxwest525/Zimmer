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
          content: `You are a product strategist helping someone scope a software project. Given their initial idea, suggest 2-3 smart follow-up directions that would help refine and advance the project — NOT rephrased versions of what they already said.

Rules:
- Each suggestion should explore a DIFFERENT dimension the user hasn't specified yet (e.g. communication channels, user roles, integrations, workflow steps, data handling, monetization)
- Frame each as a specific decision or feature addition, like: "Add email + SMS notification channels for client updates" or "Include role-based access for sales reps vs managers"
- Do NOT just reword or summarize what they typed — push the idea FORWARD
- Keep each suggestion under 100 characters
- Be practical and concrete — suggest things they'll actually need
- Do NOT mention tech stacks, frameworks, or architecture

Return ONLY a JSON array of strings, nothing else.`,
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

  const answersContext = previousAnswers && Array.isArray(previousAnswers) && previousAnswers.length > 0
    ? `\n\nPrevious answers:\n${previousAnswers.map((a: { question: string; answer: string }) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`
    : "";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are MASSA AI, a build orchestration system. The user submitted a vague project prompt. Ask ONE clarifying question to better understand what they want to build. Provide 3-4 multiple choice options plus an "Other" option. The question should be the most important thing you don't yet know.

Return ONLY valid JSON in this format:
{
  "question": "Your single clarifying question",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "done": false
}

If you have enough information from the prompt and previous answers to build confidently, return:
{
  "question": "",
  "options": [],
  "done": true,
  "summary": "Brief 1-sentence summary of what will be built"
}

Ask about things like: target platform, primary user, core feature priority, data storage needs, integration requirements, scale expectations. Don't repeat questions already answered.`,
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
  const { content } = req.body;
  if (!content || typeof content !== "string" || content.trim().length < 3) {
    return res.json({ prompt: content || "" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 250,
      messages: [
        {
          role: "system",
          content: `You take a rough idea and turn it into a slightly more detailed, actionable prompt for an AI coding assistant. Keep it concise — add a sentence or two of useful specificity without overcomplicating things.

Rules:
- Preserve the original intent completely
- Add just enough detail to make it actionable (target platform, key features, data handling)
- Write it as a direct instruction to an AI builder, starting with "Build" or a clear verb
- Stay under 200 characters total
- Do NOT add tech stack, architecture, or framework choices
- Do NOT add bullet points or numbered lists
- Return ONLY the enhanced prompt text, nothing else`,
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

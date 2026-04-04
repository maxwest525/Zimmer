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

  const modelContext = model
    ? `The user is building with ${model}. Tailor suggestions to what works best with that tool — keep it practical, not theoretical.`
    : "";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You help people write better prompts for AI coding tools. Given a user's idea, suggest 2-3 clearer, more specific versions of what they typed. ${modelContext}

Rules:
- Write like a human talking to an AI assistant, not like a technical spec
- Focus on WHAT they want built and HOW it should work for the end user
- Add useful details they might have forgotten (like "with mobile support" or "that saves to a database")
- Do NOT mention architecture, frameworks, tech stacks, or implementation details
- Keep each suggestion under 100 characters
- Be conversational and clear — if a non-technical person reads it, they should understand it

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

export default router;

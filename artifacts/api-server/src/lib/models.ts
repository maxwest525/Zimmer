import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as gemini } from "@workspace/integrations-gemini-ai";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export type ModelProvider = "openai" | "anthropic" | "gemini" | "openrouter";

export interface ModelDef {
  id: string;
  label: string;
  provider: ModelProvider;
  providerModel: string;
}

export const MODEL_CATALOG: ModelDef[] = [
  { id: "gpt-4o", label: "GPT-4o", provider: "openai", providerModel: "gpt-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai", providerModel: "gpt-4o-mini" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "anthropic", providerModel: "claude-sonnet-4-6" },
  { id: "claude-opus-4-7", label: "Claude Opus 4.7", provider: "anthropic", providerModel: "claude-opus-4-7" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic", providerModel: "claude-haiku-4-5" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini", providerModel: "gemini-2.5-pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini", providerModel: "gemini-2.5-flash" },
  { id: "qwen", label: "Qwen3.6 Plus", provider: "openrouter", providerModel: "qwen/qwen3.6-plus" },
  { id: "grok", label: "Grok 4.3", provider: "openrouter", providerModel: "x-ai/grok-4.3" },
  { id: "mistral", label: "Mistral Large", provider: "openrouter", providerModel: "mistralai/mistral-large-2512" },
  { id: "llama", label: "Llama 3.3 70B", provider: "openrouter", providerModel: "meta-llama/llama-3.3-70b-instruct" },
  { id: "gemma", label: "Gemma 4 31B", provider: "openrouter", providerModel: "google/gemma-4-31b-it" },
];

const DEFAULT_MODEL_ID = "claude-sonnet-4-6";

export function resolveModel(id: string | undefined): ModelDef {
  return MODEL_CATALOG.find((m) => m.id === id) ?? MODEL_CATALOG.find((m) => m.id === DEFAULT_MODEL_ID)!;
}

export interface CompleteParams {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
}

export async function complete({ model, system, user, maxTokens = 8192 }: CompleteParams): Promise<string> {
  const def = resolveModel(model);

  if (def.provider === "anthropic") {
    const message = await anthropic.messages.create({
      model: def.providerModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
  }

  if (def.provider === "gemini") {
    const response = await gemini.models.generateContent({
      model: def.providerModel,
      contents: [{ role: "user", parts: [{ text: user }] }],
      config: { systemInstruction: system, maxOutputTokens: maxTokens },
    });
    return (response.text ?? "").trim();
  }

  const client = def.provider === "openrouter" ? openrouter : openai;
  const completion = await client.chat.completions.create({
    model: def.providerModel,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return (completion.choices[0]?.message?.content ?? "").trim();
}

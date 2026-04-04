import OpenAI from "openai";
import { db, ideasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { detectInstagramUrl, fetchInstagramMetadata } from "./instagram";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface EnrichmentResult {
  summary: string;
  urls: string[];
  technologies: string[];
}

async function aiEnrich(text: string, instagramUrl: string): Promise<EnrichmentResult> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 500,
    messages: [
      {
        role: "system",
        content: `You analyze Instagram post content and extract structured information. Given text extracted from an Instagram post, produce a JSON response with:
- "summary": A concise 2-3 sentence summary of what the post is about
- "urls": An array of any websites or URLs mentioned in the text (extract full URLs if present, or note domain names)
- "technologies": An array of any technologies, tools, software, frameworks, platforms, or technical concepts discussed

If no URLs are found, return an empty array for "urls".
If no technologies are discussed, return an empty array for "technologies".

Return ONLY valid JSON, nothing else.`,
      },
      {
        role: "user",
        content: `Instagram URL: ${instagramUrl}\n\nExtracted text:\n${text}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const result = JSON.parse(cleaned);

  return {
    summary: result.summary || "",
    urls: Array.isArray(result.urls) ? result.urls : [],
    technologies: Array.isArray(result.technologies) ? result.technologies : [],
  };
}

export async function enrichIdea(ideaId: number, content: string): Promise<void> {
  const instagramUrl = detectInstagramUrl(content);
  if (!instagramUrl) return;

  console.log(`[enrichment] Processing Instagram URL for idea ${ideaId}: ${instagramUrl}`);

  try {
    const metadata = await fetchInstagramMetadata(instagramUrl);

    if (!metadata || !metadata.text.trim()) {
      await db
        .update(ideasTable)
        .set({
          enrichmentError: "Could not extract text from Instagram post",
          updatedAt: new Date(),
        })
        .where(eq(ideasTable.id, ideaId));
      console.log(`[enrichment] No metadata found for idea ${ideaId}`);
      return;
    }

    const combinedText = content + "\n\n---\nInstagram metadata:\n" + metadata.text;
    const result = await aiEnrich(combinedText, instagramUrl);

    await db
      .update(ideasTable)
      .set({
        enrichmentSummary: result.summary || null,
        enrichmentUrls: result.urls.length > 0 ? JSON.stringify(result.urls) : null,
        enrichmentTechnologies: result.technologies.length > 0 ? JSON.stringify(result.technologies) : null,
        enrichmentError: null,
        updatedAt: new Date(),
      })
      .where(eq(ideasTable.id, ideaId));

    console.log(`[enrichment] Successfully enriched idea ${ideaId}`);
  } catch (err) {
    console.error(`[enrichment] Failed to enrich idea ${ideaId}:`, err);
    await db
      .update(ideasTable)
      .set({
        enrichmentError: `Enrichment failed: ${(err as Error).message}`,
        updatedAt: new Date(),
      })
      .where(eq(ideasTable.id, ideaId));
  }
}

import { Router } from "express";

const router = Router();

const TEMPLATES_BASE = "https://www.hyperfx.ai/templates";
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

const cache = new Map<string, { expires: number; value: unknown }>();
function cacheGet<T>(key: string): T | null {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  if (hit) cache.delete(key);
  return null;
}
function cacheSet(key: string, value: unknown, ttlMs: number) {
  cache.set(key, { expires: Date.now() + ttlMs, value });
}

async function fetchWithTimeout(url: string, ms = 12000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { "User-Agent": "MASSA-AI" },
      redirect: "follow",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!--\s*-->/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&hellip;/g, "…")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

function htmlToMarkdown(h: string): string {
  let s = h;
  s = s.replace(/<\/(p|div|section)>/gi, "\n\n");
  s = s.replace(
    /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
    (_m, t) => `\n\n## ${stripTags(t)}\n\n`,
  );
  s = s.replace(
    /<h3[^>]*>([\s\S]*?)<\/h3>/gi,
    (_m, t) => `\n\n### ${stripTags(t)}\n\n`,
  );
  s = s.replace(
    /<h4[^>]*>([\s\S]*?)<\/h4>/gi,
    (_m, t) => `\n\n#### ${stripTags(t)}\n\n`,
  );
  s = s.replace(
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    (_m, t) => `- ${stripTags(t).replace(/^[•\u2022]\s*/, "")}\n`,
  );
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  s = s
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
  // Drop the leading "Description" eyebrow label.
  s = s.replace(/^Description\s*\n+/, "");
  return s;
}

type TemplateCard = {
  slug: string;
  name: string;
  category: string;
  description: string;
  integrations: string[];
};

router.get("/templates", async (_req, res) => {
  const cacheKey = "templates:list";
  const cached = cacheGet<{ templates: TemplateCard[] }>(cacheKey);
  if (cached) return res.json(cached);

  try {
    const r = await fetchWithTimeout(TEMPLATES_BASE);
    if (!r.ok) {
      return res.status(502).json({ error: "templates_fetch_failed" });
    }
    const html = await r.text();
    const cardRe =
      /<a class="bg-white rounded-lg[^"]*" href="\/templates\/([a-z0-9-]+)">([\s\S]*?)<\/a>/g;
    const templates: TemplateCard[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = cardRe.exec(html))) {
      const slug = m[1];
      if (seen.has(slug)) continue;
      seen.add(slug);
      const inner = m[2];
      const integrations = [
        ...new Set(
          [...inner.matchAll(/<img alt="([^"]+)"/g)].map((x) =>
            decodeEntities(x[1]),
          ),
        ),
      ];
      const category =
        (inner.match(/<span class="inline-flex[^"]*">([^<]+)<\/span>/) ||
          [])[1] || "";
      const name = stripTags(
        (inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || "",
      );
      const description = stripTags(
        (inner.match(/<p class="text-sm text-gray-600[^"]*">([\s\S]*?)<\/p>/) ||
          [])[1] || "",
      );
      if (slug && name) {
        templates.push({ slug, name, category, description, integrations });
      }
    }

    if (templates.length === 0) {
      // Fetched OK but parsed nothing — upstream markup likely changed.
      // Fail loudly instead of serving a silent empty list.
      return res.status(502).json({ error: "templates_parse_empty" });
    }

    const payload = { templates };
    cacheSet(cacheKey, payload, 60 * 60 * 1000);
    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "templates_list_error" });
  }
});

type TemplateDetail = {
  slug: string;
  name: string;
  category: string;
  prompt: string;
  integrations: string[];
  content: string;
  url: string;
  useUrl: string;
};

router.get("/templates/:slug", async (req, res) => {
  const slug = String(req.params.slug || "").trim();
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: "invalid_slug" });
  }

  const cacheKey = `templates:detail:${slug}`;
  const cached = cacheGet<TemplateDetail>(cacheKey);
  if (cached) return res.json(cached);

  try {
    const url = `${TEMPLATES_BASE}/${slug}`;
    const r = await fetchWithTimeout(url);
    if (r.status === 404) return res.status(404).json({ error: "not_found" });
    if (!r.ok) return res.status(502).json({ error: "template_fetch_failed" });
    const html = await r.text();

    const name = stripTags(
      (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "",
    )
      .replace(/\s*\|\s*Hyper AI\s*$/, "")
      .trim();

    const prompt = stripTags(
      (html.match(/bg-\[#f4f4f5\][^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || "",
    );

    const descIdx = html.indexOf(">Description<");
    const topRegion = descIdx > -1 ? html.slice(0, descIdx) : html;
    const integrations = [
      ...new Set(
        [
          ...topRegion.matchAll(
            /<img alt="([^"]+)"[^>]*src="\/logo-icons\/[^"]+"/g,
          ),
        ].map((x) => decodeEntities(x[1])),
      ),
    ];

    let content = "";
    if (descIdx > -1) {
      const startDiv = html.lastIndexOf("<div", descIdx);
      let end = html.indexOf("Similar Templates", descIdx);
      if (end === -1) end = html.indexOf("Explore", descIdx);
      const region = html.slice(
        startDiv > -1 ? startDiv : descIdx,
        end > -1 ? end : descIdx + 16000,
      );
      content = htmlToMarkdown(region).replace(/\n*##\s*Similar Templates\s*$/, "");
    }

    const category =
      stripTags(
        (html.match(/•\s*([A-Za-z]+)\s*•/) || [])[1] || "",
      ) || "";

    const payload: TemplateDetail = {
      slug,
      name,
      category,
      prompt,
      integrations,
      content,
      url,
      useUrl: "https://app.hyperfx.ai/",
    };
    if (content) cacheSet(cacheKey, payload, 60 * 60 * 1000);
    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "template_detail_error" });
  }
});

export default router;

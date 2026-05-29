import { Router } from "express";

const router = Router();

const GITHUB_API = "https://api.github.com";

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MASSA-AI-Skills",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// GitHub naming rules: owners/repos are alphanumeric plus - _ . (no slashes/traversal)
const GH_NAME = /^[A-Za-z0-9._-]{1,100}$/;

// Simple in-memory TTL cache to avoid burning GitHub rate limits
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

type TrendingRepo = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string;
  stars: number;
  language: string | null;
  url: string;
  pushedAt: string;
  topics: string[];
};

router.get("/skills/trending", async (_req, res) => {
  try {
    // "for the day" — repos with skill-related signal pushed in the last 2 days, ranked by stars
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const cacheKey = `trending:${since}`;
    const cached = cacheGet<{ repos: TrendingRepo[]; since: string }>(cacheKey);
    if (cached) return res.json(cached);

    const query = `skill in:name,description,topics pushed:>=${since}`;
    const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(
      query,
    )}&sort=stars&order=desc&per_page=10`;

    const ghRes = await fetch(url, { headers: ghHeaders() });
    if (!ghRes.ok) {
      const body = await ghRes.text();
      const rateLimited =
        ghRes.status === 403 || ghRes.status === 429;
      return res.status(rateLimited ? 429 : 502).json({
        error: rateLimited ? "github_rate_limited" : "github_search_failed",
        status: ghRes.status,
        detail: body.slice(0, 300),
      });
    }

    const data = (await ghRes.json()) as {
      items?: Array<Record<string, unknown>>;
    };

    const repos: TrendingRepo[] = (data.items || []).slice(0, 10).map((r) => ({
      id: r.id as number,
      name: r.name as string,
      fullName: r.full_name as string,
      owner: (r.owner as { login: string })?.login ?? "",
      description: (r.description as string) ?? "",
      stars: (r.stargazers_count as number) ?? 0,
      language: (r.language as string | null) ?? null,
      url: r.html_url as string,
      pushedAt: r.pushed_at as string,
      topics: (r.topics as string[]) ?? [],
    }));

    const payload = { repos, since };
    cacheSet(cacheKey, payload, 10 * 60 * 1000);
    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "trending_failed" });
  }
});

const SKILL_FILE_CANDIDATES = [
  "SKILL.md",
  "skill.md",
  "skills/SKILL.md",
  ".claude/skills/SKILL.md",
  "AGENTS.md",
  "AGENT.md",
  "README.md",
];

router.get("/skills/file", async (req, res) => {
  const owner = String(req.query.owner || "").trim();
  const repo = String(req.query.repo || "").trim();
  if (!owner || !repo) {
    return res.status(400).json({ error: "owner and repo required" });
  }
  if (!GH_NAME.test(owner) || !GH_NAME.test(repo)) {
    return res.status(400).json({ error: "invalid owner or repo" });
  }

  const cacheKey = `file:${owner}/${repo}`;
  const cached = cacheGet<{ path: string; content: string; htmlUrl: string }>(
    cacheKey,
  );
  if (cached) return res.json(cached);

  try {
    for (const path of SKILL_FILE_CANDIDATES) {
      const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
      const ghRes = await fetch(url, { headers: ghHeaders() });
      if (!ghRes.ok) continue;

      const data = (await ghRes.json()) as {
        content?: string;
        encoding?: string;
        html_url?: string;
      };
      if (!data.content) continue;

      const content =
        data.encoding === "base64"
          ? Buffer.from(data.content, "base64").toString("utf-8")
          : data.content;

      const payload = {
        path,
        content: content.slice(0, 20000),
        htmlUrl: data.html_url ?? "",
      };
      cacheSet(cacheKey, payload, 30 * 60 * 1000);
      return res.json(payload);
    }

    return res.status(404).json({ error: "no_skill_file_found" });
  } catch {
    return res.status(500).json({ error: "file_fetch_failed" });
  }
});

export default router;

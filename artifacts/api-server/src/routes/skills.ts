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

// --- HyperFX official marketing skills (github.com/hyperfx-ai/marketing-skills) ---
// These skills run on the Hyper MCP that MASSA is already connected to, so they
// are surfaced as a first-class, curated catalog rather than via trending search.
const HFX_OWNER = "hyperfx-ai";
const HFX_REPO = "marketing-skills";
const HFX_BRANCH = "main";
const HFX_RAW = `https://raw.githubusercontent.com/${HFX_OWNER}/${HFX_REPO}/${HFX_BRANCH}`;
// Strict skill-slug shape: starts alphanumeric, then lowercase/digits/hyphens.
// Rejects "." / ".." path segments that GH_NAME would otherwise allow.
const HFX_SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

function parseFrontmatter(md: string): Record<string, string> {
  const m = /^---\s*\n([\s\S]*?)\n---/.exec(md);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

type HfxSkill = {
  slug: string;
  name: string;
  description: string;
  htmlUrl: string;
};

router.get("/skills/hyperfx", async (_req, res) => {
  const cacheKey = "hyperfx:catalog";
  const cached = cacheGet<{ skills: HfxSkill[]; repoUrl: string }>(cacheKey);
  if (cached) return res.json(cached);

  try {
    const dirUrl = `${GITHUB_API}/repos/${HFX_OWNER}/${HFX_REPO}/contents/skills?ref=${HFX_BRANCH}`;
    const dirRes = await fetch(dirUrl, { headers: ghHeaders() });
    if (!dirRes.ok) {
      const rateLimited = dirRes.status === 403 || dirRes.status === 429;
      return res.status(rateLimited ? 429 : 502).json({
        error: rateLimited ? "github_rate_limited" : "github_list_failed",
        status: dirRes.status,
      });
    }
    const entries = (await dirRes.json()) as Array<{
      name: string;
      type: string;
    }>;
    const slugs = entries
      .filter((e) => e.type === "dir" && HFX_SLUG.test(e.name))
      .map((e) => e.name)
      .sort();

    const results = await Promise.all(
      slugs.map(async (slug): Promise<HfxSkill | null> => {
        try {
          const r = await fetch(`${HFX_RAW}/skills/${slug}/SKILL.md`);
          if (!r.ok) return null;
          const md = await r.text();
          const fm = parseFrontmatter(md);
          return {
            slug,
            name: fm.name || slug,
            description: fm.description || "",
            htmlUrl: `https://github.com/${HFX_OWNER}/${HFX_REPO}/blob/${HFX_BRANCH}/skills/${slug}/SKILL.md`,
          };
        } catch {
          return null;
        }
      }),
    );

    const skills = results.filter((s): s is HfxSkill => s !== null);
    const payload = {
      skills,
      repoUrl: `https://github.com/${HFX_OWNER}/${HFX_REPO}`,
    };
    // Only cache a complete snapshot. If any per-skill fetch failed (transient
    // upstream error / rate-limit), serve what we have but don't persist a
    // partial catalog that would stick around for an hour.
    if (skills.length === slugs.length && skills.length > 0) {
      cacheSet(cacheKey, payload, 60 * 60 * 1000);
    }
    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "hyperfx_catalog_failed" });
  }
});

router.get("/skills/hyperfx/file", async (req, res) => {
  const skill = String(req.query.skill || "").trim();
  if (!skill) return res.status(400).json({ error: "skill required" });
  if (!HFX_SLUG.test(skill)) return res.status(400).json({ error: "invalid skill" });

  const cacheKey = `hyperfx:file:${skill}`;
  const cached = cacheGet<{ path: string; content: string; htmlUrl: string }>(
    cacheKey,
  );
  if (cached) return res.json(cached);

  try {
    const r = await fetch(`${HFX_RAW}/skills/${skill}/SKILL.md`);
    if (r.status === 404) return res.status(404).json({ error: "skill_not_found" });
    if (!r.ok) return res.status(502).json({ error: "github_fetch_failed" });
    const content = await r.text();
    const payload = {
      path: `skills/${skill}/SKILL.md`,
      content: content.slice(0, 40000),
      htmlUrl: `https://github.com/${HFX_OWNER}/${HFX_REPO}/blob/${HFX_BRANCH}/skills/${skill}/SKILL.md`,
    };
    cacheSet(cacheKey, payload, 30 * 60 * 1000);
    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "hyperfx_file_failed" });
  }
});

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

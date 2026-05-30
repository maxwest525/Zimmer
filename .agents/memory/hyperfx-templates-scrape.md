---
name: HyperFX templates scrape
description: How MASSA sources the Hyper agent "templates" shown in the Agents tab.
---

The Agents tab lists Hyper agent **templates** (real agents with prompts/connectors/skills),
sourced live from the public marketing site `https://www.hyperfx.ai/templates` (NOT the MCP —
no marketplace/templates list tool exists on the Hyper MCP).

**Why scrape:** user requires REAL data; there is no API/JSON endpoint. Pages are Next.js RSC
(`self.__next_f`, no `__NEXT_DATA__`), but the cards and detail prose are fully server-rendered
HTML, so the backend parses them with regex (no parser deps).

**How to apply:** backend route `templates.ts` (mounted under `/api`).
- `GET /api/templates` — list cards; detail at `GET /api/templates/:slug`.
- Parsing is class/anchor-text dependent (`<a class="bg-white rounded-lg...">`, `>Description<`,
  cut at `Similar Templates`/`Explore`). Brittle to upstream markup changes — if HyperFX
  restyles the site, these selectors break. List endpoint fails loudly (502 `templates_parse_empty`)
  rather than serving an empty 200, so breakage is visible.
- 1h in-memory cache; fetches use AbortController timeout. Slug validated against `SLUG_RE`,
  host hardcoded (SSRF-safe).

The old throwaway Hyper `agents_list`/`agents_run` UI and their `/skills/hyperfx/agents` +
`/skills/hyperfx/run` endpoints were removed. The Skills page is now ONLY the top-10 trending
GitHub repos; the `hyperfx-ai/marketing-skills` catalog moved to the Agents tab as
"HyperFX Agent Skills".

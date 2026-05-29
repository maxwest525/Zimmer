---
name: HyperFX MCP integration
description: How MASSA connects to HyperFX's Marketing MCP — real endpoint, auth, and seeding policy.
---

# HyperFX (Hyper AI) Marketing MCP

HyperFX is a "Marketing MCP" provider: one MCP server exposing 160+ integrations, marketing skills, agents, sandbox/browser tools (~282 tools). MASSA imports it by registering it in its existing DB-backed MCP system (mcp_servers), so its tools flow into the normal MCP tool layer.

- **Real MCP endpoint:** `https://backend.hyperfx.ai/mcp/` (trailing slash), transport = streamable-http.
- **`https://www.hyperfx.ai/mcp` is the MARKETING landing page, NOT the MCP server** — POST returns 405 HTML, GET returns the page. The `app.hyperfx.ai/mcp` URL is the dashboard view that 307-redirects to login. Only `backend.hyperfx.ai/mcp/` answers MCP (dummy bearer → 401 `Invalid access token`, `WWW-Authenticate: Bearer realm="Hyper MCP"`).
- **Auth:** Bearer API key. The key is an "MCP API key" created in the HyperFX dashboard under Settings > API Keys (distinct from the account password). MASSA's MCP client auto-applies `Bearer ` when the stored token has no scheme.
- **The authoritative source for the endpoint is the user's HyperFX dashboard** (Server details / Connect screen). Web search hallucinated `www.hyperfx.ai/mcp`; don't trust it.

## Seeding policy (MASSA)
On api-server startup, `seedHyperFxMcp()` upserts one row when `HYPERFX_API_KEY` is set. Endpoint comes from `HYPERFX_MCP_URL` env override, default `backend.hyperfx.ai/mcp/`.

**Why match the existing row by `name` ("HyperFX Marketing"), not by endpoint:** matching on endpoint left a stale errored duplicate when the URL changed (www → backend). Name-keyed upsert updates endpoint + token in place, so a rotated key or migrated URL never spawns duplicate connections.

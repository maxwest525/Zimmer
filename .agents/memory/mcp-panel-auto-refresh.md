---
name: MCP panel auto-refresh
description: How MCP server connection status stays fresh and why it is client-driven
---

# MCP panel auto-refresh

MCP connection status is kept fresh by the client, not a backend scheduler.
The McpPanel polls `POST /api/mcp/refresh` (re-checks every stored server in
parallel and persists connected/error) on mount, every 30s while the tab is
visible, and on tab re-focus. A useRef in-flight guard prevents the three
triggers from overlapping.

**Why:** the api-server has no background job runner; a cron/scheduler would add
moving parts for a panel that only needs fresh data while someone is looking at
it. Visibility-gated polling avoids hammering remote MCP servers when no tab is
open.

**How to apply:** if status must update without an open panel (e.g. alerts), a
real server-side scheduler is needed — do not assume one exists. To change cadence
or add backoff, edit the polling effect in McpPanel; to coalesce concurrent
clients, add a short server-side TTL lock around /mcp/refresh.

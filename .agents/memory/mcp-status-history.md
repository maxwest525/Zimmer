---
name: MCP status history
description: How per-server up/down history is recorded and served.
---

The `mcp_status_events` table records MCP server up/down transitions.

**Rule:** A transition row is written only when the new status differs from the
previous status (`recordTransition` in api-server mcp route). Health-check ticks
that keep the same status do NOT create rows — otherwise repeated polls (every
30s) would flood the table.

**Why:** History should reflect genuine flips ("went offline", "recovered"),
not every poll. Dedup happens by passing the pre-refresh `server.status` as
`prevStatus` into `refreshServer`.

**How to apply:** Every endpoint that calls `refreshServer` must pass the
current row's status as prevStatus. Server payloads include `history` (last N,
newest first) via `withHistory()`. Events cascade-delete with their server
(FK `onDelete: cascade`).

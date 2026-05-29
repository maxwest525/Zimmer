---
name: MCP client transport
description: How the api-server talks to remote MCP servers and why every call must route through the shared session helper
---

# MCP client transport (artifacts/api-server)

The MCP client is hand-rolled (no @modelcontextprotocol/sdk) over the Streamable
HTTP transport. `openSession()` validates the endpoint, runs initialize +
notifications/initialized, and returns reusable endpoint+headers (carrying any
mcp-session-id). Both `connectAndListTools()` (tools/list) and `callTool()`
(tools/call) build on it.

**Rule:** any new MCP request (tools/call, resources, prompts, etc.) must issue
through `openSession()` + `safeFetch()`, never a bare `fetch`.

**Why:** the SSRF protection (assertPublicEndpoint blocking private/loopback/
link-local/metadata IPs) and manual redirect revalidation live only in
`safeFetch`/`openSession`. A direct fetch would let a user-supplied endpoint
reach internal services or bounce via redirect to a private address.

**How to apply:** when adding MCP capabilities, add a function that calls
`openSession(endpoint)` then `safeFetch(session.endpoint, { headers: session.headers, ... })`
and parse with `readJsonRpcResponse`. Servers respond as either application/json
or text/event-stream — readJsonRpcResponse already handles both; match on the
JSON-RPC request id.

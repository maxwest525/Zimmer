import { Router } from "express";
import { db, mcpServersTable, mcpStatusEventsTable } from "@workspace/db";
import type { McpServer, McpStatusEvent } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { connectAndListTools, callTool } from "../lib/mcpClient";

const router = Router();

// How many recent status transitions to keep/return per server.
const HISTORY_LIMIT = 10;

/**
 * Strips the stored credential before returning a server to the client.
 * Replaces it with a boolean flag so the UI can show whether auth is set
 * without ever exposing the secret value.
 */
function toPublicServer(server: McpServer) {
  const { authToken, ...rest } = server;
  return { ...rest, hasAuthToken: Boolean(authToken) };
}

/**
 * Records a status transition for a server. Only writes an event when the new
 * status differs from the previous one, so the history reflects genuine
 * up/down flips rather than every health-check tick.
 */
async function recordTransition(
  serverId: number,
  prevStatus: string | undefined,
  nextStatus: string,
  error: string | null,
) {
  if (prevStatus === nextStatus) return;
  try {
    await db.insert(mcpStatusEventsTable).values({
      serverId,
      status: nextStatus,
      error,
    });
  } catch (err) {
    // History is best-effort; never let it break a refresh.
    console.error("Failed to record MCP status transition:", err);
  }
}

/**
 * Fetches the most recent status transitions for the given servers, grouped by
 * server id and capped at HISTORY_LIMIT each (newest first).
 */
async function historyForServers(
  serverIds: number[],
): Promise<Map<number, McpStatusEvent[]>> {
  const byServer = new Map<number, McpStatusEvent[]>();
  if (serverIds.length === 0) return byServer;
  const events = await db
    .select()
    .from(mcpStatusEventsTable)
    .where(inArray(mcpStatusEventsTable.serverId, serverIds))
    .orderBy(desc(mcpStatusEventsTable.createdAt));
  for (const event of events) {
    const list = byServer.get(event.serverId) ?? [];
    if (list.length < HISTORY_LIMIT) {
      list.push(event);
      byServer.set(event.serverId, list);
    }
  }
  return byServer;
}

/**
 * Attaches the recent status history to each public server payload.
 */
async function withHistory(servers: McpServer[]) {
  const history = await historyForServers(servers.map((s) => s.id));
  return servers.map((server) => ({
    ...toPublicServer(server),
    history: history.get(server.id) ?? [],
  }));
}

async function refreshServer(
  id: number,
  endpoint: string,
  authToken: string | null,
  prevStatus?: string,
) {
  try {
    const tools = await connectAndListTools(endpoint, authToken);
    const [updated] = await db
      .update(mcpServersTable)
      .set({
        status: "connected",
        tools,
        toolCount: tools.length,
        lastError: null,
        lastConnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mcpServersTable.id, id))
      .returning();
    await recordTransition(id, prevStatus, "connected", null);
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    const [updated] = await db
      .update(mcpServersTable)
      .set({
        status: "error",
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(mcpServersTable.id, id))
      .returning();
    await recordTransition(id, prevStatus, "error", message);
    return updated;
  }
}

router.get("/mcp", async (_req, res) => {
  try {
    const servers = await db
      .select()
      .from(mcpServersTable)
      .orderBy(desc(mcpServersTable.createdAt));
    res.json(await withHistory(servers));
  } catch (err) {
    console.error("Failed to fetch MCP servers:", err);
    res.status(500).json({ error: "Failed to fetch MCP servers" });
  }
});

router.post("/mcp", async (req, res) => {
  try {
    const { name, endpoint, authToken } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (!endpoint || typeof endpoint !== "string" || endpoint.trim().length === 0) {
      res.status(400).json({ error: "Endpoint is required" });
      return;
    }
    if (authToken !== undefined && typeof authToken !== "string") {
      res.status(400).json({ error: "Auth token must be a string" });
      return;
    }
    const trimmedToken =
      typeof authToken === "string" && authToken.trim().length > 0
        ? authToken.trim()
        : null;
    let parsed: URL;
    try {
      parsed = new URL(endpoint.trim());
    } catch {
      res.status(400).json({ error: "Endpoint must be a valid URL" });
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Endpoint must use http or https" });
      return;
    }

    const [server] = await db
      .insert(mcpServersTable)
      .values({
        name: name.trim(),
        endpoint: endpoint.trim(),
        authToken: trimmedToken,
        status: "disconnected",
      })
      .returning();

    const connected = await refreshServer(
      server.id,
      server.endpoint,
      server.authToken,
      server.status,
    );
    const [withHist] = await withHistory([connected ?? server]);
    res.json(withHist);
  } catch (err) {
    console.error("Failed to create MCP server:", err);
    res.status(500).json({ error: "Failed to create MCP server" });
  }
});

router.post("/mcp/refresh", async (_req, res) => {
  try {
    const servers = await db
      .select()
      .from(mcpServersTable)
      .orderBy(desc(mcpServersTable.createdAt));

    const refreshed = await Promise.all(
      servers.map((server) =>
        refreshServer(
          server.id,
          server.endpoint,
          server.authToken,
          server.status,
        ).then((updated) => updated ?? server),
      ),
    );

    res.json(await withHistory(refreshed));
  } catch (err) {
    console.error("Failed to refresh MCP servers:", err);
    res.status(500).json({ error: "Failed to refresh MCP servers" });
  }
});

router.post("/mcp/:id/connect", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid server ID" });
      return;
    }
    const [server] = await db
      .select()
      .from(mcpServersTable)
      .where(eq(mcpServersTable.id, id));
    if (!server) {
      res.status(404).json({ error: "Server not found" });
      return;
    }
    const updated = await refreshServer(
      server.id,
      server.endpoint,
      server.authToken,
      server.status,
    );
    const [withHist] = await withHistory([updated ?? server]);
    res.json(withHist);
  } catch (err) {
    console.error("Failed to connect MCP server:", err);
    res.status(500).json({ error: "Failed to connect MCP server" });
  }
});

router.post("/mcp/:id/call", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid server ID" });
      return;
    }
    const { tool, args } = req.body ?? {};
    if (!tool || typeof tool !== "string" || tool.trim().length === 0) {
      res.status(400).json({ error: "Tool name is required" });
      return;
    }
    let toolArgs: Record<string, unknown> = {};
    if (args !== undefined && args !== null) {
      if (typeof args !== "object" || Array.isArray(args)) {
        res.status(400).json({ error: "Arguments must be a JSON object" });
        return;
      }
      toolArgs = args as Record<string, unknown>;
    }

    const [server] = await db
      .select()
      .from(mcpServersTable)
      .where(eq(mcpServersTable.id, id));
    if (!server) {
      res.status(404).json({ error: "Server not found" });
      return;
    }
    const toolName = tool.trim();
    const hasTool = (server.tools ?? []).some((t) => t.name === toolName);
    if (!hasTool) {
      res.status(400).json({ error: "Server does not expose that tool" });
      return;
    }

    try {
      const result = await callTool(
        server.endpoint,
        toolName,
        toolArgs,
        server.authToken,
      );
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tool call failed";
      res.status(502).json({ error: message });
    }
  } catch (err) {
    console.error("Failed to call MCP tool:", err);
    res.status(500).json({ error: "Failed to call MCP tool" });
  }
});

router.delete("/mcp/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid server ID" });
      return;
    }
    const [server] = await db
      .delete(mcpServersTable)
      .where(eq(mcpServersTable.id, id))
      .returning();
    if (!server) {
      res.status(404).json({ error: "Server not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete MCP server:", err);
    res.status(500).json({ error: "Failed to delete MCP server" });
  }
});

export default router;

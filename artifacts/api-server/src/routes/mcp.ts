import { Router } from "express";
import { db, mcpServersTable } from "@workspace/db";
import type { McpServer } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { connectAndListTools, callTool } from "../lib/mcpClient";

const router = Router();

/**
 * Strips the stored credential before returning a server to the client.
 * Replaces it with a boolean flag so the UI can show whether auth is set
 * without ever exposing the secret value.
 */
function toPublicServer(server: McpServer) {
  const { authToken, ...rest } = server;
  return { ...rest, hasAuthToken: Boolean(authToken) };
}

async function refreshServer(id: number, endpoint: string, authToken: string | null) {
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
    return updated;
  }
}

router.get("/mcp", async (_req, res) => {
  try {
    const servers = await db
      .select()
      .from(mcpServersTable)
      .orderBy(desc(mcpServersTable.createdAt));
    res.json(servers.map(toPublicServer));
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
    );
    res.json(toPublicServer(connected ?? server));
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
        refreshServer(server.id, server.endpoint, server.authToken).then(
          (updated) => updated ?? server,
        ),
      ),
    );

    res.json(refreshed.map(toPublicServer));
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
    );
    res.json(toPublicServer(updated ?? server));
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

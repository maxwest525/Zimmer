import { Router } from "express";
import { db, mcpServersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { connectAndListTools } from "../lib/mcpClient";

const router = Router();

async function refreshServer(id: number, endpoint: string) {
  try {
    const tools = await connectAndListTools(endpoint);
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
    res.json(servers);
  } catch (err) {
    console.error("Failed to fetch MCP servers:", err);
    res.status(500).json({ error: "Failed to fetch MCP servers" });
  }
});

router.post("/mcp", async (req, res) => {
  try {
    const { name, endpoint } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (!endpoint || typeof endpoint !== "string" || endpoint.trim().length === 0) {
      res.status(400).json({ error: "Endpoint is required" });
      return;
    }
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
        status: "disconnected",
      })
      .returning();

    const connected = await refreshServer(server.id, server.endpoint);
    res.json(connected ?? server);
  } catch (err) {
    console.error("Failed to create MCP server:", err);
    res.status(500).json({ error: "Failed to create MCP server" });
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
    const updated = await refreshServer(server.id, server.endpoint);
    res.json(updated ?? server);
  } catch (err) {
    console.error("Failed to connect MCP server:", err);
    res.status(500).json({ error: "Failed to connect MCP server" });
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

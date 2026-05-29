import { db, mcpServersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { connectAndListTools } from "./mcpClient";
import { logger } from "./logger";

const DEFAULT_HYPERFX_ENDPOINT = "https://www.hyperfx.ai/mcp";
const HYPERFX_NAME = "HyperFX Marketing";

function resolveEndpoint(): string {
  const override = process.env["HYPERFX_MCP_URL"]?.trim();
  return override && override.length > 0 ? override : DEFAULT_HYPERFX_ENDPOINT;
}

/**
 * Auto-registers the HyperFX Marketing MCP server as a connection whenever a
 * HYPERFX_API_KEY secret is present. The key stays in the environment and is
 * mirrored into the connection's authToken so the existing MCP client can
 * authenticate. On boot we upsert the row (creating it, or refreshing a
 * rotated key) and perform an initial connect so its tools are available
 * immediately rather than waiting for the next refresh tick.
 */
export async function seedHyperFxMcp(): Promise<void> {
  const key = process.env["HYPERFX_API_KEY"]?.trim();
  if (!key) return;

  const endpoint = resolveEndpoint();

  let serverId: number;
  try {
    const existing = await db
      .select()
      .from(mcpServersTable)
      .where(eq(mcpServersTable.endpoint, endpoint));

    if (existing.length === 0) {
      const [created] = await db
        .insert(mcpServersTable)
        .values({
          name: HYPERFX_NAME,
          endpoint,
          authToken: key,
          status: "disconnected",
        })
        .returning();
      serverId = created.id;
      logger.info("Seeded HyperFX MCP connection");
    } else {
      serverId = existing[0].id;
      if (existing[0].authToken !== key) {
        await db
          .update(mcpServersTable)
          .set({ authToken: key, updatedAt: new Date() })
          .where(eq(mcpServersTable.id, serverId));
        logger.info("Updated HyperFX MCP API key");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed HyperFX MCP connection");
    return;
  }

  try {
    const tools = await connectAndListTools(endpoint, key);
    await db
      .update(mcpServersTable)
      .set({
        status: "connected",
        tools,
        toolCount: tools.length,
        lastError: null,
        lastConnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mcpServersTable.id, serverId));
    logger.info({ toolCount: tools.length }, "Connected HyperFX MCP");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    await db
      .update(mcpServersTable)
      .set({ status: "error", lastError: message, updatedAt: new Date() })
      .where(eq(mcpServersTable.id, serverId))
      .catch(() => {});
    logger.warn({ err }, "HyperFX MCP initial connect failed (will retry on refresh)");
  }
}

import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface McpTool {
  name: string;
  description?: string;
}

export const mcpServersTable = pgTable("mcp_servers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  authToken: text("auth_token"),
  status: text("status").default("disconnected").notNull(),
  toolCount: integer("tool_count").default(0).notNull(),
  tools: jsonb("tools").$type<McpTool[]>(),
  lastError: text("last_error"),
  lastConnectedAt: timestamp("last_connected_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMcpServerSchema = createInsertSchema(mcpServersTable).omit({
  id: true,
  status: true,
  toolCount: true,
  tools: true,
  lastError: true,
  lastConnectedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMcpServer = z.infer<typeof insertMcpServerSchema>;
export type McpServer = typeof mcpServersTable.$inferSelect;

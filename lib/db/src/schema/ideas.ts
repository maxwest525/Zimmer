import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ideasTable = pgTable("ideas", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  category: text("category").default("general"),
  source: text("source").default("web"),
  starred: boolean("starred").default(false),
  archived: boolean("archived").default(false),
  enrichmentSummary: text("enrichment_summary"),
  enrichmentUrls: text("enrichment_urls"),
  enrichmentTechnologies: text("enrichment_technologies"),
  videoPath: text("video_path"),
  transcript: text("transcript"),
  enrichmentError: text("enrichment_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIdeaSchema = createInsertSchema(ideasTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIdea = z.infer<typeof insertIdeaSchema>;
export type Idea = typeof ideasTable.$inferSelect;

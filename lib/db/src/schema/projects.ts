import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("queued"),
  lifecycle: text("lifecycle").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const buildsTable = pgTable("builds", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  agent: text("agent").notNull(),
  agentRole: text("agent_role"),
  stack: jsonb("stack").$type<string[]>().notNull().default([]),
  dependsOn: jsonb("depends_on").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  plan: text("plan"),
  code: text("code"),
  thinkingLog: text("thinking_log"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectMessagesTable = pgTable("project_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  buildId: integer("build_id").references(() => buildsTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { relations } from "drizzle-orm";

export const projectsRelations = relations(projectsTable, ({ many }) => ({
  builds: many(buildsTable),
  messages: many(projectMessagesTable),
}));

export const buildsRelations = relations(buildsTable, ({ one, many }) => ({
  project: one(projectsTable, { fields: [buildsTable.projectId], references: [projectsTable.id] }),
  messages: many(projectMessagesTable),
}));

export const projectMessagesRelations = relations(projectMessagesTable, ({ one }) => ({
  project: one(projectsTable, { fields: [projectMessagesTable.projectId], references: [projectsTable.id] }),
  build: one(buildsTable, { fields: [projectMessagesTable.buildId], references: [buildsTable.id] }),
}));

export type Project = typeof projectsTable.$inferSelect;
export type Build = typeof buildsTable.$inferSelect;
export type ProjectMessage = typeof projectMessagesTable.$inferSelect;

import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("queued"),
  lifecycle: text("lifecycle").notNull().default("active"),
  projectType: text("project_type").notNull().default("saas"),
  previewUrl: text("preview_url"),
  designMd: text("design_md"),
  sessionId: text("session_id"),
  research: text("research"),
  architecture: text("architecture"),
  wireframes: text("wireframes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentRegistryTable = pgTable("agent_registry", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  agentId: text("agent_id").notNull(),
  environmentId: text("environment_id"),
  version: text("version"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const massaSkillsTable = pgTable("massa_skills", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  log: text("log"),
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

export const agentRegistryRelations = relations(agentRegistryTable, ({ }) => ({}));
export const massaSkillsRelations = relations(massaSkillsTable, ({ }) => ({}));

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
export type AgentRegistry = typeof agentRegistryTable.$inferSelect;
export type MassaSkill = typeof massaSkillsTable.$inferSelect;

export const PROJECT_TYPES = [
  "landing-page",
  "crm",
  "saas",
  "marketing-site",
  "ecommerce",
  "dashboard",
  "mobile-app",
  "api",
  "automation",
  "data-pipeline",
] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

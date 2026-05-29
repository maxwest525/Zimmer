export type ProjectStatus = "running" | "idle" | "needs-review" | "failed" | "completed";
export type ProjectLifecycle = "active" | "completed" | "archived" | "deleted";
export type TaskStatus = "running" | "queued" | "completed" | "failed" | "needs-review";
export type ActivityStatus = "running" | "completed" | "failed" | "waiting";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  taskCount: number;
  lastActive: string;
  lifecycle: ProjectLifecycle;
}

export type DeployStatus = "not-started" | "in-progress" | "deployed" | "failed";
export type PublishStatus = "unpublished" | "publishing" | "live";

export interface CompletedProduct {
  id: string;
  projectId: string;
  name: string;
  summary: string;
  completedAt: string;
  domain: string;
  domainConnected: boolean;
  deployStatus: DeployStatus;
  publishStatus: PublishStatus;
}

export interface ExecutionCard {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  progress: number;
  stack: string[];
  outputs: string[];
  startedAt?: string;
}

export interface ActivityItem {
  id: string;
  label: string;
  sublabel?: string;
  status: ActivityStatus;
  timestamp: string;
}

export const PROJECTS: Project[] = [];

export const PROJECT_CARDS: Record<string, ExecutionCard[]> = {};

export const PROJECT_ACTIVITY: Record<string, ActivityItem[]> = {};

export const INITIAL_COMPLETED_PRODUCTS: CompletedProduct[] = [];

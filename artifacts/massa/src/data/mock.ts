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

export const PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Trading Platform",
    status: "running",
    taskCount: 4,
    lastActive: "2m ago",
    lifecycle: "active",
  },
  {
    id: "p2",
    name: "Analytics Dashboard",
    status: "needs-review",
    taskCount: 2,
    lastActive: "1h ago",
    lifecycle: "active",
  },
  {
    id: "p3",
    name: "Alert Automation",
    status: "idle",
    taskCount: 0,
    lastActive: "3h ago",
    lifecycle: "active",
  },
  {
    id: "p4",
    name: "Data Pipeline",
    status: "failed",
    taskCount: 1,
    lastActive: "5h ago",
    lifecycle: "active",
  },
  {
    id: "p5",
    name: "User Portal",
    status: "idle",
    taskCount: 0,
    lastActive: "1d ago",
    lifecycle: "active",
  },
];

export const PROJECT_CARDS: Record<string, ExecutionCard[]> = {
  p1: [
    {
      id: "ec1",
      title: "Trading Bot Backend",
      goal: "Build a high-frequency trading engine with WebSocket market feeds, order execution, and risk management modules.",
      status: "running",
      progress: 65,
      stack: ["Claude", "Claude Code", "Node.js", "PostgreSQL"],
      outputs: ["src/engine/order-executor.ts", "src/feeds/market-ws.ts", "src/risk/position-limits.ts"],
      startedAt: "4m ago",
    },
    {
      id: "ec2",
      title: "Dashboard UI",
      goal: "Generate a real-time analytics dashboard with P&L charts, open positions, and trade history.",
      status: "running",
      progress: 40,
      stack: ["Claude", "Lovable", "React", "Recharts"],
      outputs: ["src/pages/Dashboard.tsx", "src/components/PnLChart.tsx"],
      startedAt: "4m ago",
    },
    {
      id: "ec3",
      title: "Alert Automation",
      goal: "Set up automated price-threshold alerts routed through n8n with email and Slack delivery.",
      status: "queued",
      progress: 0,
      stack: ["n8n", "Claude"],
      outputs: ["Slack integration", "Email templates", "Trigger workflows"],
    },
    {
      id: "ec4",
      title: "Data Connection Setup",
      goal: "Connect to Alpaca and Polygon.io APIs, normalize market data, and persist to time-series tables.",
      status: "completed",
      progress: 100,
      stack: ["Claude Code", "PostgreSQL", "TimescaleDB"],
      outputs: ["lib/alpaca-client.ts", "lib/polygon-client.ts", "db/schema/market-data.ts"],
      startedAt: "22m ago",
    },
  ],
  p2: [
    {
      id: "ec5",
      title: "Metrics Aggregation",
      goal: "Build aggregation queries to roll up page views, session durations, and conversion events by cohort.",
      status: "completed",
      progress: 100,
      stack: ["Claude Code", "PostgreSQL"],
      outputs: ["db/queries/metrics.sql", "src/api/metrics.ts"],
      startedAt: "1h ago",
    },
    {
      id: "ec6",
      title: "Chart Component Library",
      goal: "Create reusable Recharts components for bar, line, and funnel visualizations with shared theming.",
      status: "needs-review",
      progress: 90,
      stack: ["Claude", "React", "Recharts"],
      outputs: ["src/components/charts/BarChart.tsx", "src/components/charts/Funnel.tsx"],
      startedAt: "55m ago",
    },
  ],
  p3: [],
  p4: [
    {
      id: "ec7",
      title: "ETL Pipeline",
      goal: "Extract data from S3, transform with dbt models, and load into the analytics warehouse.",
      status: "failed",
      progress: 35,
      stack: ["Claude Code", "dbt", "Airflow"],
      outputs: ["dbt/models/staging/", "airflow/dags/etl_pipeline.py"],
      startedAt: "5h ago",
    },
  ],
  p5: [],
};

export const PROJECT_ACTIVITY: Record<string, ActivityItem[]> = {
  p1: [
    { id: "a1", label: "Building backend logic", sublabel: "Trading Bot Backend", status: "running", timestamp: "now" },
    { id: "a2", label: "Generating dashboard layout", sublabel: "Dashboard UI", status: "running", timestamp: "now" },
    { id: "a3", label: "Alert automation queued", sublabel: "Alert Automation", status: "waiting", timestamp: "just now" },
    { id: "a4", label: "Data connection complete", sublabel: "Data Connection Setup", status: "completed", timestamp: "22m ago" },
    { id: "a5", label: "Routing automation workflow", sublabel: "n8n trigger config", status: "completed", timestamp: "25m ago" },
    { id: "a6", label: "Build packet initialized", sublabel: "Trading Platform", status: "completed", timestamp: "26m ago" },
  ],
  p2: [
    { id: "a7", label: "Chart component needs review", sublabel: "Chart Component Library", status: "waiting", timestamp: "5m ago" },
    { id: "a8", label: "Metrics aggregation complete", sublabel: "Metrics Aggregation", status: "completed", timestamp: "1h ago" },
    { id: "a9", label: "API schema generated", sublabel: "Analytics Dashboard", status: "completed", timestamp: "1h ago" },
    { id: "a10", label: "Build packet completed", sublabel: "Analytics Dashboard", status: "completed", timestamp: "2h ago" },
  ],
  p3: [
    { id: "a11", label: "Project initialized", sublabel: "Alert Automation", status: "completed", timestamp: "3h ago" },
  ],
  p4: [
    { id: "a12", label: "ETL pipeline failed", sublabel: "dbt transform error", status: "failed", timestamp: "5h ago" },
    { id: "a13", label: "Pipeline started", sublabel: "Data Pipeline", status: "completed", timestamp: "5h ago" },
  ],
  p5: [
    { id: "a14", label: "Project initialized", sublabel: "User Portal", status: "completed", timestamp: "1d ago" },
  ],
};

export const INITIAL_COMPLETED_PRODUCTS: CompletedProduct[] = [
  {
    id: "cp1",
    projectId: "cp-proj-1",
    name: "Invoice Generator",
    summary: "Automated invoice creation with PDF export, client management, and Stripe integration.",
    completedAt: "Mar 28, 2026",
    domain: "invoices.acme.com",
    domainConnected: true,
    deployStatus: "deployed",
    publishStatus: "live",
  },
  {
    id: "cp2",
    projectId: "cp-proj-2",
    name: "Customer Feedback Portal",
    summary: "Real-time feedback collection with sentiment analysis, NPS scoring, and team dashboards.",
    completedAt: "Mar 25, 2026",
    domain: "",
    domainConnected: false,
    deployStatus: "deployed",
    publishStatus: "unpublished",
  },
];

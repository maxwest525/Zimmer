export type ProjectStatus = "running" | "idle" | "needs-review" | "failed";
export type TaskStatus = "running" | "queued" | "completed" | "failed";
export type ActivityStatus = "running" | "completed" | "failed" | "waiting";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  taskCount: number;
  lastActive: string;
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
  },
  {
    id: "p2",
    name: "Analytics Dashboard",
    status: "needs-review",
    taskCount: 2,
    lastActive: "1h ago",
  },
  {
    id: "p3",
    name: "Alert Automation",
    status: "idle",
    taskCount: 0,
    lastActive: "3h ago",
  },
  {
    id: "p4",
    name: "Data Pipeline",
    status: "failed",
    taskCount: 1,
    lastActive: "5h ago",
  },
  {
    id: "p5",
    name: "User Portal",
    status: "idle",
    taskCount: 0,
    lastActive: "1d ago",
  },
];

export const EXECUTION_CARDS_ACTIVE: ExecutionCard[] = [
  {
    id: "ec1",
    title: "Trading Bot Backend",
    goal:
      "Build a high-frequency trading engine with WebSocket market feeds, order execution, and risk management modules.",
    status: "running",
    progress: 65,
    stack: ["Claude", "Claude Code", "Node.js", "PostgreSQL"],
    outputs: [
      "src/engine/order-executor.ts",
      "src/feeds/market-ws.ts",
      "src/risk/position-limits.ts",
    ],
    startedAt: "4m ago",
  },
  {
    id: "ec2",
    title: "Dashboard UI",
    goal:
      "Generate a real-time analytics dashboard with P&L charts, open positions, and trade history.",
    status: "running",
    progress: 40,
    stack: ["Claude", "Lovable", "React", "Recharts"],
    outputs: ["src/pages/Dashboard.tsx", "src/components/PnLChart.tsx"],
    startedAt: "4m ago",
  },
  {
    id: "ec3",
    title: "Alert Automation",
    goal:
      "Set up automated price-threshold alerts routed through n8n with email and Slack delivery.",
    status: "queued",
    progress: 0,
    stack: ["n8n", "Claude"],
    outputs: ["Slack integration", "Email templates", "Trigger workflows"],
    startedAt: undefined,
  },
  {
    id: "ec4",
    title: "Data Connection Setup",
    goal:
      "Connect to Alpaca and Polygon.io APIs, normalize market data, and persist to time-series tables.",
    status: "completed",
    progress: 100,
    stack: ["Claude Code", "PostgreSQL", "TimescaleDB"],
    outputs: [
      "lib/alpaca-client.ts",
      "lib/polygon-client.ts",
      "db/schema/market-data.ts",
    ],
    startedAt: "22m ago",
  },
];

export const EXECUTION_CARDS_IDLE: ExecutionCard[] = [];

export const ACTIVITY_ACTIVE: ActivityItem[] = [
  {
    id: "a1",
    label: "Building backend logic",
    sublabel: "Trading Bot Backend",
    status: "running",
    timestamp: "now",
  },
  {
    id: "a2",
    label: "Generating dashboard layout",
    sublabel: "Dashboard UI",
    status: "running",
    timestamp: "now",
  },
  {
    id: "a3",
    label: "Alert automation queued",
    sublabel: "Alert Automation",
    status: "waiting",
    timestamp: "just now",
  },
  {
    id: "a4",
    label: "Data connection complete",
    sublabel: "Data Connection Setup",
    status: "completed",
    timestamp: "22m ago",
  },
  {
    id: "a5",
    label: "Routing automation workflow",
    sublabel: "n8n trigger config",
    status: "completed",
    timestamp: "25m ago",
  },
  {
    id: "a6",
    label: "Build packet initialized",
    sublabel: "Trading Platform",
    status: "completed",
    timestamp: "26m ago",
  },
];

export const ACTIVITY_IDLE: ActivityItem[] = [
  {
    id: "a1",
    label: "Dashboard UI completed",
    sublabel: "Analytics Dashboard",
    status: "completed",
    timestamp: "1h ago",
  },
  {
    id: "a2",
    label: "API schema generated",
    sublabel: "Analytics Dashboard",
    status: "completed",
    timestamp: "1h ago",
  },
  {
    id: "a3",
    label: "Build packet completed",
    sublabel: "Analytics Dashboard",
    status: "completed",
    timestamp: "2h ago",
  },
];

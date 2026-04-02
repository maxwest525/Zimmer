import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  PROJECTS,
  PROJECT_CARDS,
  Project,
  ProjectStatus,
  ExecutionCard,
  TaskStatus,
} from "@/data/mock";
import {
  AlertCircle,
  Circle,
  XCircle,
  Loader2,
  CheckCircle2,
  Clock,
  LayoutGrid,
} from "lucide-react";

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<
    ProjectStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    running: {
      label: "Running",
      className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    "needs-review": {
      label: "Needs Review",
      className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      icon: <AlertCircle className="w-3 h-3" />,
    },
    idle: {
      label: "Idle",
      className: "bg-muted text-muted-foreground border-border",
      icon: <Circle className="w-3 h-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const { label, className, icon } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border whitespace-nowrap",
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function ProjectStatusDot({ status }: { status: ProjectStatus }) {
  if (status === "running") {
    return (
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
    );
  }
  if (status === "needs-review") {
    return <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={2} />;
  }
  if (status === "failed") {
    return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" strokeWidth={2} />;
  }
  return <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" strokeWidth={2} />;
}

function AgentStatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<
    TaskStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    running: {
      label: "Running",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: <Loader2 className="w-2.5 h-2.5 animate-spin" />,
    },
    queued: {
      label: "Queued",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: <Clock className="w-2.5 h-2.5" />,
    },
    completed: {
      label: "Done",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: <CheckCircle2 className="w-2.5 h-2.5" />,
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
      icon: <XCircle className="w-2.5 h-2.5" />,
    },
    "needs-review": {
      label: "Review",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: <AlertCircle className="w-2.5 h-2.5" />,
    },
  };
  const { label, className, icon } = config[status] ?? config.queued;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border whitespace-nowrap",
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function AgentProgressBar({ value, status }: { value: number; status: TaskStatus }) {
  const colorMap: Record<TaskStatus, string> = {
    running: "bg-emerald-500",
    queued: "bg-amber-400",
    completed: "bg-blue-500",
    failed: "bg-red-500",
    "needs-review": "bg-amber-400",
  };
  return (
    <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-2">
      <div
        className={cn("h-full rounded-full transition-all duration-300", colorMap[status])}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

interface AgentCardProps {
  card: ExecutionCard;
  onClick: () => void;
}

function AgentCard({ card, onClick }: AgentCardProps) {
  const isRunning = card.status === "running";
  const isFailed = card.status === "failed";
  const isDone = card.status === "completed";

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col text-left rounded-lg border bg-card p-3 w-44 shrink-0 transition-all duration-150 hover:shadow-md hover:border-foreground/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isRunning && "border-emerald-500/40 shadow-emerald-500/10 shadow-sm",
        isFailed && "border-red-500/30",
        isDone && "opacity-60"
      )}
    >
      {isRunning && (
        <span
          className="absolute -top-px -left-px -right-px -bottom-px rounded-lg pointer-events-none animate-pulse"
          style={{
            boxShadow: "0 0 0 1.5px rgba(16,185,129,0.25)",
          }}
        />
      )}

      <div className="flex items-start justify-between gap-1 mb-1.5">
        <p
          className={cn(
            "text-xs font-semibold leading-tight line-clamp-2 flex-1",
            isDone ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {card.title}
        </p>
      </div>

      <AgentStatusBadge status={card.status} />

      {card.status !== "queued" && (
        <AgentProgressBar value={card.progress} status={card.status} />
      )}

      {card.status === "queued" && (
        <div className="mt-2 h-1" />
      )}
    </button>
  );
}

interface ProjectRowProps {
  project: Project;
  cards: ExecutionCard[];
  onNavigate: (projectId: string) => void;
}

function ProjectRow({ project, cards, onNavigate }: ProjectRowProps) {
  const isIdle = project.status === "idle";
  const hasCards = cards.length > 0;

  return (
    <div
      className={cn(
        "flex items-start gap-4 py-5 px-6 border-b border-border last:border-b-0 transition-colors",
        isIdle && "opacity-60"
      )}
    >
      <button
        onClick={() => onNavigate(project.id)}
        className="flex flex-col gap-1.5 min-w-[180px] max-w-[200px] shrink-0 text-left group"
      >
        <div className="flex items-center gap-2">
          <ProjectStatusDot status={project.status} />
          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {project.name}
          </span>
        </div>
        <ProjectStatusBadge status={project.status} />
        <span className="text-[10px] text-muted-foreground">
          {project.taskCount > 0
            ? `${project.taskCount} task${project.taskCount !== 1 ? "s" : ""} · `
            : ""}
          {project.lastActive}
        </span>
      </button>

      <div className="flex-1 min-w-0">
        {hasCards ? (
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {cards.map((card) => (
              <AgentCard
                key={card.id}
                card={card}
                onClick={() => onNavigate(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center h-16">
            <span className="text-xs text-muted-foreground/50 italic">No active builds</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Overview() {
  const [, navigate] = useLocation();

  function handleNavigateToProject(projectId: string) {
    navigate(`/workspace/${projectId}`);
  }

  const runningCount = PROJECTS.filter((p) => p.status === "running").length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground tracking-tight">MASSA</span>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm text-muted-foreground">Overview</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {runningCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              {runningCount} project{runningCount !== 1 ? "s" : ""} running
            </span>
          )}
          <span className="ml-2 text-muted-foreground/50">{PROJECTS.length} total</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {PROJECTS.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              cards={PROJECT_CARDS[project.id] ?? []}
              onNavigate={handleNavigateToProject}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

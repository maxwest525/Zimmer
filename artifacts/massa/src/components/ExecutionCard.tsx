import { useState } from "react";
import { cn } from "@/lib/utils";
import { ExecutionCard as ExecutionCardData, TaskStatus } from "@/data/mock";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  FileOutput,
} from "lucide-react";

interface StatusBadgeProps {
  status: TaskStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<
    TaskStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    running: {
      label: "Running",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    queued: {
      label: "Queued",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: <Clock className="w-3 h-3" />,
    },
    completed: {
      label: "Completed",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: <CheckCircle2 className="w-3 h-3" />,
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
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
  status: TaskStatus;
}

function ProgressBar({ value, status }: ProgressBarProps) {
  const colorMap: Record<TaskStatus, string> = {
    running: "bg-emerald-500",
    queued: "bg-amber-400",
    completed: "bg-blue-500",
    failed: "bg-red-500",
  };
  return (
    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          colorMap[status]
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

interface ExecutionCardProps {
  card: ExecutionCardData;
}

export function ExecutionCard({ card }: ExecutionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {card.title}
              </h3>
              <StatusBadge status={card.status} />
              {card.startedAt && (
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                  {card.status === "queued" ? "Queued" : `Started ${card.startedAt}`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {card.goal}
        </p>

        {card.status !== "queued" && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{card.progress}%</span>
            </div>
            <ProgressBar value={card.progress} status={card.status} />
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/30">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stack
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {card.stack.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground border border-border"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileOutput className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Outputs
              </span>
            </div>
            <ul className="space-y-1">
              {card.outputs.map((o) => (
                <li key={o} className="text-xs text-muted-foreground font-mono leading-tight">
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

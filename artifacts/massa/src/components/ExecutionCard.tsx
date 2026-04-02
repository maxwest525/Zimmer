import { useState } from "react";
import { cn } from "@/lib/utils";
import { ExecutionCard as ExecutionCardData, TaskStatus } from "@/data/mock";
import { InlineCompanyLogo } from "@/components/CompanyLogo";
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
      className: "bg-white/5 text-white border-white/10",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    queued: {
      label: "Queued",
      className: "bg-white/5 text-white border-white/10",
      icon: <Clock className="w-3 h-3" />,
    },
    completed: {
      label: "Completed",
      className: "bg-white/5 text-white border-white/10",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-white/5 text-white border-white/10",
      icon: <XCircle className="w-3 h-3" />,
    },
    "needs-review": {
      label: "Needs Review",
      className: "bg-white/5 text-white border-white/10",
      icon: <Clock className="w-3 h-3" />,
    },
  };

  const { label, className, icon } = config[status] ?? config.queued;
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
    running: "bg-muted-foreground/50",
    queued: "bg-muted-foreground/50",
    completed: "bg-muted-foreground/50",
    failed: "bg-muted-foreground/50",
    "needs-review": "bg-muted-foreground/50",
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-white border border-border"
                >
                  <InlineCompanyLogo name={s} size={12} />
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

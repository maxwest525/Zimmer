import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Project, ProjectStatus } from "@/data/mock";
import { AlertCircle, Loader2, Circle, XCircle, Settings2, Activity, LayoutGrid } from "lucide-react";
import { TenantSelector } from "@/components/TenantSelector";

interface WorkspaceHeaderProps {
  project: Project;
  onOpenActivity?: () => void;
  activityCount?: number;
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { label: string; className: string; icon: React.ReactNode }> = {
    running: {
      label: "Running",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_6px_rgba(52,211,153,0.15)]",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    "needs-review": {
      label: "Needs Review",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: <AlertCircle className="w-3 h-3" />,
    },
    idle: {
      label: "Idle",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: <Circle className="w-3 h-3" />,
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const { label, className, icon } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export function WorkspaceHeader({ project, onOpenActivity, activityCount = 0 }: WorkspaceHeaderProps) {
  const [, navigate] = useLocation();

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Back to Overview"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Overview</span>
        </button>
        <span className="text-muted-foreground/70 text-sm">/</span>
        <h1 className="text-base font-semibold text-foreground">{project.name}</h1>
        <StatusPill status={project.status} />
      </div>
      <div className="flex items-center gap-2">
        <TenantSelector />
        {onOpenActivity && (
          <button
            onClick={onOpenActivity}
            className="lg:hidden relative p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Open activity panel"
          >
            <Activity className="w-4 h-4" />
            {activityCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        )}
        <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

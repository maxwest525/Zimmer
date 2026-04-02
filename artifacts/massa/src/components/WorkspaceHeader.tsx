import { cn } from "@/lib/utils";
import { Project, ProjectStatus } from "@/data/mock";
import { AlertCircle, CheckCircle2, Loader2, Circle, XCircle, Settings2 } from "lucide-react";

interface WorkspaceHeaderProps {
  project: Project;
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, { label: string; className: string; icon: React.ReactNode }> = {
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
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
        className
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export function WorkspaceHeader({ project }: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground">{project.name}</h1>
        <StatusPill status={project.status} />
      </div>
      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
        <Settings2 className="w-4 h-4" />
      </button>
    </div>
  );
}

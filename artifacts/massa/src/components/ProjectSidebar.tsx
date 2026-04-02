import { useState } from "react";
import { cn } from "@/lib/utils";
import { Project, ProjectStatus } from "@/data/mock";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Circle,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface StatusIconProps {
  status: ProjectStatus;
  className?: string;
}

function StatusIcon({ status, className }: StatusIconProps) {
  if (status === "running") {
    return (
      <span
        className={cn(
          "inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse",
          className
        )}
      />
    );
  }
  if (status === "needs-review") {
    return (
      <AlertCircle
        className={cn("w-3.5 h-3.5 text-amber-500", className)}
        strokeWidth={2}
      />
    );
  }
  if (status === "failed") {
    return (
      <XCircle
        className={cn("w-3.5 h-3.5 text-red-500", className)}
        strokeWidth={2}
      />
    );
  }
  return (
    <Circle
      className={cn("w-3.5 h-3.5 text-muted-foreground/40", className)}
      strokeWidth={2}
    />
  );
}

function statusLabel(status: ProjectStatus) {
  if (status === "running") return "Running";
  if (status === "needs-review") return "Needs review";
  if (status === "failed") return "Failed";
  return "Idle";
}

interface ProjectSidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
}

export function ProjectSidebar({
  projects,
  activeProjectId,
  onSelectProject,
}: ProjectSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-full border-r border-border bg-sidebar transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-border shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground select-none">
            Projects
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors",
            collapsed && "mx-auto"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <button
        onClick={() => {}}
        className={cn(
          "flex items-center gap-2 mx-2 mt-2 mb-1 px-2 py-1.5 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent/50 transition-colors text-xs font-medium shrink-0",
          collapsed && "justify-center"
        )}
        title="New Project"
      >
        <Plus className="w-3.5 h-3.5 shrink-0" />
        {!collapsed && <span>New Project</span>}
      </button>

      <nav className="flex-1 overflow-y-auto py-1 px-1.5 space-y-0.5">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          return (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              title={collapsed ? project.name : undefined}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition-colors group",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <StatusIcon status={project.status} className="shrink-0" />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {project.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 truncate">
                    {statusLabel(project.status)}
                    {project.taskCount > 0 && (
                      <> &middot; {project.taskCount} task{project.taskCount !== 1 ? "s" : ""}</>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

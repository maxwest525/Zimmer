import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, ProjectStatus } from "@/data/mock";

function StatusDot({ status }: { status: ProjectStatus }) {
  if (status === "running") {
    return (
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
    );
  }
  if (status === "needs-review") {
    return (
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
    );
  }
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
  );
}

interface OpenProjectsTabBarProps {
  openProjects: Project[];
  activeProjectId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

export function OpenProjectsTabBar({
  openProjects,
  activeProjectId,
  onSelectTab,
  onCloseTab,
}: OpenProjectsTabBarProps) {
  return (
    <div className="flex items-end gap-0 px-2 pt-1.5 border-b border-border bg-sidebar/60 overflow-x-auto shrink-0 scrollbar-none">
      {openProjects.map((project) => {
        const isActive = project.id === activeProjectId;
        return (
          <div
            key={project.id}
            className={cn(
              "group relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-md border border-b-0 cursor-pointer select-none min-w-0 shrink-0 transition-colors",
              isActive
                ? "bg-background border-border text-foreground font-medium"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
            onClick={() => onSelectTab(project.id)}
          >
            <StatusDot status={project.status} />
            <span className="truncate max-w-[120px]">{project.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(project.id);
              }}
              className={cn(
                "flex items-center justify-center w-3.5 h-3.5 rounded-sm transition-colors shrink-0",
                isActive
                  ? "text-muted-foreground hover:text-foreground hover:bg-accent"
                  : "text-transparent group-hover:text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={`Close ${project.name}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

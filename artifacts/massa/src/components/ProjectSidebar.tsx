import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Project, ProjectStatus } from "@/data/mock";
import { useIsNarrow } from "@/hooks/use-narrow";
import { useProjects } from "@/contexts/ProjectContext";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Circle,
  AlertCircle,
  XCircle,
  LayoutGrid,
  ImagePlus,
  Film,
  Layers,
  PackageCheck,
  CheckCircle2,
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
          "inline-block w-2 h-2 rounded-full bg-emerald-500",
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
  if (status === "completed") {
    return (
      <CheckCircle2
        className={cn("w-3.5 h-3.5 text-emerald-500", className)}
        strokeWidth={2}
      />
    );
  }
  return (
    <Circle
      className={cn("w-3.5 h-3.5 text-muted-foreground/70", className)}
      strokeWidth={2}
    />
  );
}

function statusLabel(status: ProjectStatus) {
  if (status === "running") return "Running";
  if (status === "needs-review") return "Needs review";
  if (status === "failed") return "Failed";
  if (status === "completed") return "Completed";
  return "Idle";
}

interface ProjectSidebarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onMarkComplete?: (id: string) => void;
}

export function ProjectSidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onMarkComplete,
}: ProjectSidebarProps) {
  const [, navigate] = useLocation();
  const isNarrow = useIsNarrow();
  const { completedProducts } = useProjects();
  const [manualCollapsed, setManualCollapsed] = useState<boolean | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const dismissMenu = useCallback(() => setContextMenuId(null), []);

  useEffect(() => {
    if (!contextMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        dismissMenu();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissMenu();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenuId, dismissMenu]);

  const collapsed = manualCollapsed !== null ? manualCollapsed : isNarrow;

  useEffect(() => {
    setManualCollapsed(null);
  }, [isNarrow]);

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
          onClick={() => setManualCollapsed((c) => (c === null ? !isNarrow : !c))}
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
        onClick={() => navigate("/")}
        className={cn(
          "flex items-center gap-2 mx-2 mt-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-xs font-medium shrink-0",
          collapsed && "justify-center"
        )}
        title="Overview"
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
        {!collapsed && <span>Overview</span>}
      </button>

      <button
        onClick={() => {}}
        className={cn(
          "flex items-center gap-2 mx-2 mt-1 mb-1 px-2 py-1.5 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent/50 transition-colors text-xs font-medium shrink-0",
          collapsed && "justify-center"
        )}
        title="New Project"
      >
        <Plus className="w-3.5 h-3.5 shrink-0" />
        {!collapsed && <span>New Project</span>}
      </button>

      <div className="mx-2 mt-1 mb-1 space-y-0.5 shrink-0">
        <button
          onClick={() => navigate("/image-generator")}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-xs font-medium",
            collapsed && "justify-center"
          )}
          title="Image Generator"
        >
          <ImagePlus className="w-3.5 h-3.5 shrink-0 text-violet-400" />
          {!collapsed && <span>Image Generator</span>}
        </button>
        <button
          onClick={() => navigate("/video-generator")}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-xs font-medium",
            collapsed && "justify-center"
          )}
          title="Video Generator"
        >
          <Film className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
          {!collapsed && <span>Video Generator</span>}
        </button>
        <button
          onClick={() => navigate("/figma")}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-xs font-medium",
            collapsed && "justify-center"
          )}
          title="Figma"
        >
          <Layers className="w-3.5 h-3.5 shrink-0 text-pink-400" />
          {!collapsed && <span>Figma</span>}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-1 px-1.5 space-y-0.5">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const showCtx = contextMenuId === project.id;
          return (
            <div key={project.id} className="relative">
              <button
                onClick={() => onSelectProject(project.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuId(showCtx ? null : project.id);
                }}
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
                {!collapsed && onMarkComplete && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuId(showCtx ? null : project.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        setContextMenuId(showCtx ? null : project.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-all cursor-pointer"
                    title="More actions"
                  >
                    <CheckCircle2 className="w-3 h-3 text-muted-foreground/70 hover:text-emerald-500" />
                  </span>
                )}
              </button>
              {showCtx && !collapsed && onMarkComplete && (
                <div ref={menuRef} className="absolute right-0 top-full mt-0.5 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                  <button
                    onClick={() => {
                      onMarkComplete(project.id);
                      setContextMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors"
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Push to Completed</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border px-1.5 py-2 shrink-0">
        <button
          onClick={() => navigate("/completed")}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors text-xs font-medium",
            collapsed && "justify-center"
          )}
          title="Completed Products"
        >
          <PackageCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Completed Products</span>
              {completedProducts.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 rounded-full">
                  {completedProducts.length}
                </span>
              )}
            </>
          )}
          {collapsed && completedProducts.length > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full" />
          )}
        </button>
      </div>
    </aside>
  );
}

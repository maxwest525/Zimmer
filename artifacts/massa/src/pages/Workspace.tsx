import { useState, useEffect } from "react";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { WritingCanvas } from "@/components/WritingCanvas";
import { ExecutionCardsPanel } from "@/components/ExecutionCardsPanel";
import { ActivitySidebar } from "@/components/ActivitySidebar";
import { ActivityDrawer } from "@/components/ActivityDrawer";
import { OpenProjectsTabBar } from "@/components/OpenProjectsTabBar";
import { PROJECTS, PROJECT_CARDS, PROJECT_ACTIVITY, ActivityItem } from "@/data/mock";

type Tab = "canvas" | "builds" | "history";

function timestampToSortKey(ts: string): number {
  if (ts === "now") return 0;
  if (ts === "just now") return 1;
  const minMatch = ts.match(/^(\d+)m ago$/);
  if (minMatch) return Number(minMatch[1]) * 60;
  const hrMatch = ts.match(/^(\d+)h ago$/);
  if (hrMatch) return Number(hrMatch[1]) * 3600;
  const dayMatch = ts.match(/^(\d+)d ago$/);
  if (dayMatch) return Number(dayMatch[1]) * 86400;
  return 999999;
}

function buildGlobalActivity(openProjectIds: string[]): (ActivityItem & { projectName?: string })[] {
  const items: (ActivityItem & { projectName?: string })[] = [];
  for (const projectId of openProjectIds) {
    const project = PROJECTS.find((p) => p.id === projectId);
    const projectActivity = PROJECT_ACTIVITY[projectId] ?? [];
    for (const item of projectActivity) {
      items.push({ ...item, projectName: project?.name });
    }
  }
  const statusOrder: Record<string, number> = { running: 0, waiting: 1, failed: 2, completed: 3 };
  items.sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
    if (statusDiff !== 0) return statusDiff;
    return timestampToSortKey(a.timestamp) - timestampToSortKey(b.timestamp);
  });
  return items;
}

interface WorkspaceProps {
  initialProjectId?: string;
}

export function Workspace({ initialProjectId }: WorkspaceProps) {
  const defaultIds = initialProjectId ? [initialProjectId] : ["p1", "p2"];
  const [openProjectIds, setOpenProjectIds] = useState<string[]>(defaultIds);
  const [activeProjectId, setActiveProjectId] = useState(defaultIds[0]);
  const [activeTab, setActiveTab] = useState<Tab>("canvas");
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    if (!initialProjectId) return;
    setOpenProjectIds((prev) => {
      if (prev.includes(initialProjectId)) return prev;
      return [initialProjectId, ...prev];
    });
    setActiveProjectId(initialProjectId);
  }, [initialProjectId]);

  const openProjects = openProjectIds.map((id) => PROJECTS.find((p) => p.id === id)!).filter(Boolean);

  const resolvedActiveId = openProjectIds.includes(activeProjectId)
    ? activeProjectId
    : openProjectIds[0] ?? PROJECTS[0].id;

  const activeProject = PROJECTS.find((p) => p.id === resolvedActiveId) ?? PROJECTS[0];
  const cards = PROJECT_CARDS[resolvedActiveId] ?? [];
  const isActive = activeProject.status === "running";

  const globalActivity = buildGlobalActivity(openProjectIds);
  const runningCount = globalActivity.filter((a) => a.status === "running").length;

  function handleSubmit(_value: string) {
  }

  function handleSelectProject(id: string) {
    if (!openProjectIds.includes(id)) {
      setOpenProjectIds((prev) => [...prev, id]);
    }
    setActiveProjectId(id);
  }

  function handleCloseTab(id: string) {
    const nextIds = openProjectIds.filter((pid) => pid !== id);
    setOpenProjectIds(nextIds);
    if (activeProjectId === id && nextIds.length > 0) {
      const closedIndex = openProjectIds.indexOf(id);
      const nextActive = nextIds[Math.min(closedIndex, nextIds.length - 1)];
      setActiveProjectId(nextActive);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <ProjectSidebar
        projects={PROJECTS}
        activeProjectId={resolvedActiveId}
        onSelectProject={handleSelectProject}
      />

      {/* Center workspace: fixed top region + independently scrolling cards below */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab bar above workspace header */}
        {openProjects.length > 0 && (
          <OpenProjectsTabBar
            openProjects={openProjects}
            activeProjectId={resolvedActiveId}
            onSelectTab={setActiveProjectId}
            onCloseTab={handleCloseTab}
          />
        )}

        {/* Fixed top region: header, tabs, writing canvas, action bar */}
        <WorkspaceHeader
          project={activeProject}
          onOpenActivity={() => setActivityOpen(true)}
          activityCount={runningCount}
        />
        <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="shrink-0">
          <WritingCanvas onSubmit={handleSubmit} isActive={isActive} />
        </div>

        {/* Independently scrolling execution cards region */}
        <div className="flex-1 overflow-y-auto border-t border-border/50">
          <ExecutionCardsPanel cards={cards} />
        </div>
      </main>

      {/* Desktop: persistent right sidebar */}
      <div className="hidden lg:flex">
        <ActivitySidebar items={globalActivity} isGlobal />
      </div>

      {/* Tablet/narrow: slide-over drawer triggered from header */}
      <ActivityDrawer
        items={globalActivity}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        isGlobal
      />
    </div>
  );
}

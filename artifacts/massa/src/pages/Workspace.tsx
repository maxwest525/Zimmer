import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { ExecutionCardsPanel } from "@/components/ExecutionCardsPanel";
import { ActivitySidebar } from "@/components/ActivitySidebar";
import { ActivityDrawer } from "@/components/ActivityDrawer";
import { OpenProjectsTabBar } from "@/components/OpenProjectsTabBar";
import { KnowledgePanel, type KnowledgeFile } from "@/components/KnowledgePanel";
import { McpPanel } from "@/components/McpPanel";
import { PROJECTS, PROJECT_CARDS, PROJECT_ACTIVITY, ActivityItem } from "@/data/mock";
import { useTenant } from "@/contexts/TenantContext";
import { useProjects } from "@/contexts/ProjectContext";

type Tab = "canvas" | "builds" | "history" | "knowledge" | "mcp";

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
  const { selectedTenantId } = useTenant();
  const { activeProjects, pushToCompleted } = useProjects();
  const [, navigate] = useLocation();

  const effectiveProjectId = selectedTenantId || initialProjectId;
  const defaultIds = effectiveProjectId ? [effectiveProjectId] : ["p1", "p2"];
  const [openProjectIds, setOpenProjectIds] = useState<string[]>(defaultIds);
  const [activeProjectId, setActiveProjectId] = useState(defaultIds[0]);
  const [activeTab, setActiveTab] = useState<Tab>("canvas");
  const [activityOpen, setActivityOpen] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<Record<string, KnowledgeFile[]>>({});

  const handleAddFiles = useCallback((projectId: string, newFiles: KnowledgeFile[]) => {
    setKnowledgeFiles((prev) => ({
      ...prev,
      [projectId]: [...(prev[projectId] ?? []), ...newFiles],
    }));
  }, []);

  const handleRemoveFile = useCallback((projectId: string, fileId: string) => {
    setKnowledgeFiles((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] ?? []).filter((f) => f.id !== fileId),
    }));
  }, []);

  useEffect(() => {
    if (!initialProjectId) return;
    if (selectedTenantId) return;
    setOpenProjectIds((prev) => {
      if (prev.includes(initialProjectId)) return prev;
      return [initialProjectId, ...prev];
    });
    setActiveProjectId(initialProjectId);
  }, [initialProjectId, selectedTenantId]);

  const prevTenantRef = useRef(selectedTenantId);
  useEffect(() => {
    const prevTenant = prevTenantRef.current;
    prevTenantRef.current = selectedTenantId;

    if (selectedTenantId) {
      const validProject = activeProjects.find((p) => p.id === selectedTenantId);
      if (!validProject) return;
      setOpenProjectIds([selectedTenantId]);
      setActiveProjectId(selectedTenantId);
    } else if (prevTenant && !selectedTenantId) {
      const restored = initialProjectId ? [initialProjectId] : ["p1", "p2"];
      setOpenProjectIds(restored);
      setActiveProjectId(restored[0]);
    }
  }, [selectedTenantId, initialProjectId]);

  const sidebarProjects = selectedTenantId
    ? activeProjects.filter((p) => p.id === selectedTenantId)
    : activeProjects;

  const openProjects = openProjectIds.map((id) => activeProjects.find((p) => p.id === id)!).filter(Boolean);

  const resolvedActiveId = openProjectIds.includes(activeProjectId)
    ? activeProjectId
    : openProjectIds[0] ?? activeProjects[0]?.id;

  const activeProject = activeProjects.find((p) => p.id === resolvedActiveId) ?? activeProjects[0];

  useEffect(() => {
    if (!activeProject) {
      navigate("/completed");
    }
  }, [activeProject, navigate]);

  if (!activeProject) {
    return null;
  }

  const cards = PROJECT_CARDS[resolvedActiveId] ?? [];

  const globalActivity = buildGlobalActivity(openProjectIds);
  const filteredActivity = selectedTenantId
    ? globalActivity.filter((a) => {
        const project = activeProjects.find((p) => p.id === selectedTenantId);
        return project && a.projectName === project.name;
      })
    : globalActivity;
  const runningCount = filteredActivity.filter((a) => a.status === "running").length;

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

  function handleMarkComplete(projectId: string) {
    const project = activeProjects.find((p) => p.id === projectId);
    if (!project) return;
    const projectCards = PROJECT_CARDS[projectId] ?? [];
    const summary = projectCards.length > 0
      ? projectCards.map((c) => c.title).join(", ")
      : `${project.name} — completed project`;
    pushToCompleted(projectId, summary);
    handleCloseTab(projectId);
    if (activeProjects.length <= 1) {
      navigate("/completed");
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <ProjectSidebar
        projects={sidebarProjects}
        activeProjectId={resolvedActiveId}
        onSelectProject={handleSelectProject}
        onMarkComplete={handleMarkComplete}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {openProjects.length > 0 && (
          <OpenProjectsTabBar
            openProjects={openProjects}
            activeProjectId={resolvedActiveId}
            onSelectTab={setActiveProjectId}
            onCloseTab={handleCloseTab}
          />
        )}

        <WorkspaceHeader
          project={activeProject}
          onOpenActivity={() => setActivityOpen(true)}
          activityCount={runningCount}
        />
        <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "knowledge" ? (
          <div className="flex-1 overflow-y-auto border-t border-border/50">
            <KnowledgePanel
              projectId={resolvedActiveId}
              files={knowledgeFiles[resolvedActiveId] ?? []}
              onAddFiles={handleAddFiles}
              onRemoveFile={handleRemoveFile}
            />
          </div>
        ) : activeTab === "mcp" ? (
          <div className="flex-1 overflow-y-auto border-t border-border/50">
            <McpPanel />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto border-t border-border/50">
            <ExecutionCardsPanel cards={cards} />
          </div>
        )}
      </main>

      <div className="hidden lg:flex">
        <ActivitySidebar items={filteredActivity} isGlobal />
      </div>

      <ActivityDrawer
        items={filteredActivity}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        isGlobal
      />
    </div>
  );
}

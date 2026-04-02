import { useState } from "react";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { WritingCanvas } from "@/components/WritingCanvas";
import { ExecutionCardsPanel } from "@/components/ExecutionCardsPanel";
import { ActivitySidebar } from "@/components/ActivitySidebar";
import { ActivityDrawer } from "@/components/ActivityDrawer";
import {
  PROJECTS,
  EXECUTION_CARDS_ACTIVE,
  EXECUTION_CARDS_IDLE,
  ACTIVITY_ACTIVE,
  ACTIVITY_IDLE,
} from "@/data/mock";

type Tab = "canvas" | "builds" | "history";

export function Workspace() {
  const [activeProjectId, setActiveProjectId] = useState(PROJECTS[0].id);
  const [activeTab, setActiveTab] = useState<Tab>("canvas");
  const [isActive, setIsActive] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);

  const activeProject = PROJECTS.find((p) => p.id === activeProjectId) ?? PROJECTS[0];
  const cards = isActive ? EXECUTION_CARDS_ACTIVE : EXECUTION_CARDS_IDLE;
  const activity = isActive ? ACTIVITY_ACTIVE : ACTIVITY_IDLE;

  function handleSubmit(_value: string) {
    if (!isActive) {
      setIsActive(true);
    }
  }

  function handleSelectProject(id: string) {
    setActiveProjectId(id);
    const found = PROJECTS.find((pr) => pr.id === id);
    setIsActive(found ? found.status === "running" : false);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <ProjectSidebar
        projects={PROJECTS}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
      />

      {/* Center workspace: fixed top region + independently scrolling cards below */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Fixed top region: header, tabs, writing canvas, action bar */}
        <WorkspaceHeader
          project={activeProject}
          onOpenActivity={() => setActivityOpen(true)}
          activityCount={activity.filter((a) => a.status === "running").length}
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
        <ActivitySidebar items={activity} />
      </div>

      {/* Tablet/narrow: slide-over drawer triggered from header */}
      <ActivityDrawer
        items={activity}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
    </div>
  );
}

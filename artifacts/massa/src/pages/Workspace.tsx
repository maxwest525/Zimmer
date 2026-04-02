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

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkspaceHeader
          project={activeProject}
          onOpenActivity={() => setActivityOpen(true)}
          activityCount={activity.filter((a) => a.status === "running").length}
        />
        <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 overflow-y-auto">
          <WritingCanvas onSubmit={handleSubmit} isActive={isActive} />

          <div className="border-t border-border/50">
            <ExecutionCardsPanel cards={cards} />
          </div>
        </div>
      </main>

      {/* Desktop: persistent right sidebar */}
      <div className="hidden lg:flex">
        <ActivitySidebar items={activity} />
      </div>

      {/* Tablet/narrow: slide-over drawer */}
      <ActivityDrawer
        items={activity}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
      />
    </div>
  );
}

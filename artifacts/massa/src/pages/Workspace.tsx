import { useState } from "react";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { WorkspaceHeader } from "@/components/WorkspaceHeader";
import { ProjectTabs } from "@/components/ProjectTabs";
import { WritingCanvas } from "@/components/WritingCanvas";
import { ExecutionCardsPanel } from "@/components/ExecutionCardsPanel";
import { ActivitySidebar } from "@/components/ActivitySidebar";
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

  const activeProject = PROJECTS.find((p) => p.id === activeProjectId) ?? PROJECTS[0];
  const cards = isActive ? EXECUTION_CARDS_ACTIVE : EXECUTION_CARDS_IDLE;
  const activity = isActive ? ACTIVITY_ACTIVE : ACTIVITY_IDLE;

  function handleSubmit(value: string) {
    if (!isActive) {
      setIsActive(true);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <ProjectSidebar
        projects={PROJECTS}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          const p = PROJECTS.find((pr) => pr.id === id);
          setIsActive(p?.status === "running" ?? false);
        }}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkspaceHeader project={activeProject} />
        <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 overflow-y-auto">
          <WritingCanvas onSubmit={handleSubmit} isActive={isActive} />

          <div className="border-t border-border/50">
            <ExecutionCardsPanel cards={cards} />
          </div>
        </div>
      </main>

      <ActivitySidebar items={activity} />
    </div>
  );
}

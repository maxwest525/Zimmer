import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  Project,
  CompletedProduct,
  PROJECTS,
  INITIAL_COMPLETED_PRODUCTS,
  DeployStatus,
  PublishStatus,
  ProjectLifecycle,
} from "@/data/mock";

interface ProjectContextValue {
  activeProjects: Project[];
  completedProducts: CompletedProduct[];
  pushToCompleted: (projectId: string, summary: string) => void;
  updateCompletedProduct: (id: string, updates: Partial<CompletedProduct>) => void;
  archiveProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  restoreProject: (projectId: string) => void;
  completeProject: (projectId: string) => void;
  projectLifecycles: Record<string, ProjectLifecycle>;
}

const ProjectContext = createContext<ProjectContextValue>({
  activeProjects: PROJECTS,
  completedProducts: INITIAL_COMPLETED_PRODUCTS,
  pushToCompleted: () => {},
  updateCompletedProduct: () => {},
  archiveProject: () => {},
  deleteProject: () => {},
  restoreProject: () => {},
  completeProject: () => {},
  projectLifecycles: {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjects, setActiveProjects] = useState<Project[]>(PROJECTS);
  const [completedProducts, setCompletedProducts] = useState<CompletedProduct[]>(INITIAL_COMPLETED_PRODUCTS);
  const [projectLifecycles, setProjectLifecycles] = useState<Record<string, ProjectLifecycle>>({});

  const setLifecycle = useCallback((projectId: string, lifecycle: ProjectLifecycle) => {
    setProjectLifecycles(prev => ({ ...prev, [projectId]: lifecycle }));
  }, []);

  const pushToCompleted = useCallback((projectId: string, summary: string) => {
    const project = activeProjects.find((p) => p.id === projectId);
    if (!project) return;

    const today = new Date();
    const completedAt = today.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const newProduct: CompletedProduct = {
      id: `cp-${Date.now()}`,
      projectId: project.id,
      name: project.name,
      summary,
      completedAt,
      domain: "",
      domainConnected: false,
      deployStatus: "not-started" as DeployStatus,
      publishStatus: "unpublished" as PublishStatus,
    };

    setCompletedProducts((prev) => {
      if (prev.some(p => p.projectId === projectId)) return prev;
      return [newProduct, ...prev];
    });
    setLifecycle(projectId, "completed");
  }, [activeProjects, setLifecycle]);

  const updateCompletedProduct = useCallback((id: string, updates: Partial<CompletedProduct>) => {
    setCompletedProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const archiveProject = useCallback((projectId: string) => {
    setLifecycle(projectId, "archived");
  }, [setLifecycle]);

  const deleteProject = useCallback((projectId: string) => {
    setLifecycle(projectId, "deleted");
  }, [setLifecycle]);

  const restoreProject = useCallback((projectId: string) => {
    setLifecycle(projectId, "active");
  }, [setLifecycle]);

  const completeProject = useCallback((projectId: string) => {
    const project = activeProjects.find((p) => p.id === projectId);
    if (project) {
      pushToCompleted(projectId, "");
    } else {
      setLifecycle(projectId, "completed");
    }
  }, [activeProjects, pushToCompleted, setLifecycle]);

  return (
    <ProjectContext.Provider
      value={{
        activeProjects,
        completedProducts,
        pushToCompleted,
        updateCompletedProduct,
        archiveProject,
        deleteProject,
        restoreProject,
        completeProject,
        projectLifecycles,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectContext);
}

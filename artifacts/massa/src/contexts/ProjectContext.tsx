import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  Project,
  CompletedProduct,
  PROJECTS,
  INITIAL_COMPLETED_PRODUCTS,
  DeployStatus,
  PublishStatus,
} from "@/data/mock";

interface ProjectContextValue {
  activeProjects: Project[];
  completedProducts: CompletedProduct[];
  pushToCompleted: (projectId: string, summary: string) => void;
  updateCompletedProduct: (id: string, updates: Partial<CompletedProduct>) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  activeProjects: PROJECTS,
  completedProducts: INITIAL_COMPLETED_PRODUCTS,
  pushToCompleted: () => {},
  updateCompletedProduct: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProjects, setActiveProjects] = useState<Project[]>(PROJECTS);
  const [completedProducts, setCompletedProducts] = useState<CompletedProduct[]>(INITIAL_COMPLETED_PRODUCTS);

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

    setCompletedProducts((prev) => [newProduct, ...prev]);
    setActiveProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, [activeProjects]);

  const updateCompletedProduct = useCallback((id: string, updates: Partial<CompletedProduct>) => {
    setCompletedProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  return (
    <ProjectContext.Provider
      value={{ activeProjects, completedProducts, pushToCompleted, updateCompletedProduct }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  return useContext(ProjectContext);
}

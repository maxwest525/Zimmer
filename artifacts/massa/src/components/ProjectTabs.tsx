import { cn } from "@/lib/utils";

type Tab = "canvas" | "builds" | "history";

interface ProjectTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "canvas", label: "Canvas" },
  { id: "builds", label: "Builds" },
  { id: "history", label: "History" },
];

export function ProjectTabs({ activeTab, onTabChange }: ProjectTabsProps) {
  return (
    <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-border shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-3 py-2 text-sm font-medium rounded-t transition-colors -mb-px border-b-2",
            activeTab === tab.id
              ? "text-emerald-400 border-emerald-500"
              : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

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
    <div className="flex items-center gap-0 px-6 pt-0 pb-0 border-b border-[#252a35] shrink-0 bg-[#0a0d10]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-xs font-mono font-medium tracking-wide transition-colors -mb-px border-b-2 rounded-none uppercase",
            activeTab === tab.id
              ? "text-emerald-400 border-emerald-400 bg-emerald-400/[0.04]"
              : "text-[#7a8294] border-transparent hover:text-[#c0c5cf] hover:bg-white/[0.02]"
          )}
        >
          {activeTab === tab.id && <span className="text-emerald-400 mr-1.5 opacity-70">{">"}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

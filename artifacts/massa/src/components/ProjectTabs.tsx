import { cn } from "@/lib/utils";
import { useMcp } from "@/contexts/McpContext";
import { CompanyLogo } from "@/components/CompanyLogo";
import { resolveMcpBrand } from "@/lib/logos";

type Tab = "canvas" | "builds" | "history" | "knowledge" | "mcp";

interface ProjectTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "canvas", label: "Canvas" },
  { id: "builds", label: "Builds" },
  { id: "history", label: "History" },
  { id: "knowledge", label: "Knowledge" },
  { id: "mcp", label: "MCP" },
];

export function ProjectTabs({ activeTab, onTabChange }: ProjectTabsProps) {
  const { errorCount, servers } = useMcp();
  const offlineServers = servers.filter((s) => s.status === "error");
  return (
    <div className="flex items-center gap-0 px-6 pt-0 pb-0 border-b border-border shrink-0 bg-background">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-xs font-mono font-medium tracking-wide transition-colors -mb-px border-b-2 rounded-none uppercase",
            activeTab === tab.id
              ? "text-emerald-400 border-emerald-400 bg-emerald-400/[0.04]"
              : "text-muted-foreground border-transparent hover:text-foreground hover:bg-foreground/[0.03]"
          )}
        >
          {activeTab === tab.id && <span className="text-emerald-400 mr-1.5 opacity-70">{">"}</span>}
          {tab.label}
          {tab.id === "mcp" && errorCount > 0 && (
            <span
              title={`Offline: ${offlineServers
                .map((s) => resolveMcpBrand(s.name, s.endpoint).label)
                .join(", ")}`}
              className="ml-1.5 inline-flex items-center gap-1 align-middle"
            >
              {offlineServers.slice(0, 3).map((s) => {
                const brand = resolveMcpBrand(s.name, s.endpoint);
                return <CompanyLogo key={s.id} name={brand.label} info={brand.info} size={14} />;
              })}
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-md bg-red-500/20 text-red-400 text-[9px] font-mono leading-none">
                {errorCount}
              </span>
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

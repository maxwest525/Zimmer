import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ActivityItem, ActivityStatus, PROJECTS } from "@/data/mock";
import { useTenant } from "@/contexts/TenantContext";
import { getActivityIcon } from "@/lib/actionIcons";

interface ActivityItemProps {
  item: ActivityItem & { projectName?: string };
}

function statusIcon(status: ActivityStatus, label: string) {
  const activityIcon = (
    <span className="w-3.5 h-3.5 shrink-0 inline-flex items-center justify-center" style={{ color: status === 'running' ? '#34d399' : status === 'completed' ? '#3b82f6' : status === 'failed' ? '#ef4444' : '#f59e0b' }}>
      {getActivityIcon(label, 13)}
    </span>
  );
  return activityIcon;
}

function ActivityItemRow({ item }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 px-3">
      <div className="mt-0.5">{statusIcon(item.status, item.label)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground leading-snug">{item.label}</div>
        {item.projectName && (
          <div className="text-[10px] text-emerald-400/80 font-medium mt-0.5 truncate">
            {item.projectName}
          </div>
        )}
        {item.sublabel && (
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {item.sublabel}
          </div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground/80 shrink-0 mt-0.5">
        {item.timestamp}
      </span>
    </div>
  );
}

interface ActivitySidebarProps {
  items: (ActivityItem & { projectName?: string })[];
  isGlobal?: boolean;
}

export function ActivitySidebar({ items, isGlobal }: ActivitySidebarProps) {
  const { selectedTenantId } = useTenant();

  const tenantProject = selectedTenantId ? PROJECTS.find((p) => p.id === selectedTenantId) : null;

  const filteredItems = useMemo(() => {
    if (!selectedTenantId || !tenantProject) return items;
    return items.filter((item) => item.projectName === tenantProject.name);
  }, [items, selectedTenantId, tenantProject]);

  const headerLabel = tenantProject
    ? tenantProject.name
    : isGlobal
      ? "All Activity"
      : "Activity";

  return (
    <aside className="flex flex-col h-full w-64 shrink-0 border-l border-border bg-sidebar">
      <div className="px-3 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground select-none">
            {headerLabel}
          </span>
          {filteredItems.some((i) => i.status === "running") && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground px-4 text-center">
            No activity yet. Submit work to get started.
          </div>
        ) : (
          filteredItems.map((item) => <ActivityItemRow key={item.id} item={item} />)
        )}
      </div>
    </aside>
  );
}

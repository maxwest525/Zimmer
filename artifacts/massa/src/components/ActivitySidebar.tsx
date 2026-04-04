import { cn } from "@/lib/utils";
import { ActivityItem, ActivityStatus } from "@/data/mock";
import { Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useLocation } from "wouter";

export type EnrichedActivityItem = ActivityItem & { projectName?: string; projectId?: string };

interface ActivityItemProps {
  item: EnrichedActivityItem;
}

function statusIcon(status: ActivityStatus) {
  if (status === "running") {
    return <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />;
  }
  if (status === "completed") {
    return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  }
  if (status === "failed") {
    return <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  }
  return <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
}

function displayLabel(item: EnrichedActivityItem): string {
  if (item.status === "waiting") {
    return "Response ready — click to view";
  }
  return item.label;
}

function ActivityItemRow({ item }: ActivityItemProps) {
  const [, setLocation] = useLocation();
  const isClickable = item.status === "waiting" && item.projectId;

  function handleClick() {
    if (isClickable) {
      const hash = item.cardId ? `#card-${item.cardId}` : "";
      setLocation(`/workspace/${item.projectId}${hash}`);
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 py-2.5 px-3",
        isClickable && "cursor-pointer hover:bg-accent/50 transition-colors rounded-sm"
      )}
      onClick={handleClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } } : undefined}
    >
      <div className="mt-0.5">{statusIcon(item.status)}</div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-xs leading-snug",
          isClickable ? "text-amber-400 font-medium" : "text-foreground"
        )}>
          {displayLabel(item)}
        </div>
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
      <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
        {item.timestamp}
      </span>
    </div>
  );
}

interface ActivitySidebarProps {
  items: EnrichedActivityItem[];
  isGlobal?: boolean;
}

export function ActivitySidebar({ items, isGlobal }: ActivitySidebarProps) {
  return (
    <aside className="flex flex-col h-full w-64 shrink-0 border-l border-border bg-sidebar">
      <div className="px-3 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground select-none">
            {isGlobal ? "All Activity" : "Activity"}
          </span>
          {items.some((i) => i.status === "running") && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground px-4 text-center">
            No activity yet. Submit work to get started.
          </div>
        ) : (
          items.map((item) => <ActivityItemRow key={item.id} item={item} />)
        )}
      </div>
    </aside>
  );
}

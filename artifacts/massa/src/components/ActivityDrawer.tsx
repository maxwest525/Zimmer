import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { ActivitySidebar, EnrichedActivityItem } from "./ActivitySidebar";

interface ActivityDrawerProps {
  items: EnrichedActivityItem[];
  open: boolean;
  onClose: () => void;
  isGlobal?: boolean;
}

export function ActivityDrawer({ items, open, onClose, isGlobal }: ActivityDrawerProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-50 lg:hidden transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="relative h-full flex">
          <button
            onClick={onClose}
            className="absolute top-3 left-0 -translate-x-full bg-background border border-border rounded-l-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <ActivitySidebar items={items} isGlobal={isGlobal} />
        </div>
      </div>
    </>
  );
}

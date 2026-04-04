import { ExecutionCard as ExecutionCardData } from "@/data/mock";
import { ExecutionCard } from "./ExecutionCard";
import { Inbox } from "lucide-react";

interface ExecutionCardsPanelProps {
  cards: ExecutionCardData[];
}

export function ExecutionCardsPanel({ cards }: ExecutionCardsPanelProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-36 text-center px-6 text-muted-foreground">
        <Inbox className="w-8 h-8 mb-2 text-muted-foreground/70" />
        <p className="text-sm font-medium">No tasks running</p>
        <p className="text-xs text-muted-foreground/80 mt-0.5">
          Describe your goal above and hit Architect & Build to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6 pt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Execution Cards
        </span>
        <span className="text-[10px] text-muted-foreground">
          {cards.filter((c) => c.status === "running").length} running ·{" "}
          {cards.filter((c) => c.status === "queued").length} queued ·{" "}
          {cards.filter((c) => c.status === "completed").length} completed
        </span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {cards.map((card) => (
          <ExecutionCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

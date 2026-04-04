import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface WritingCanvasProps {
  onSubmit: (value: string) => void;
  isActive: boolean;
}

export function WritingCanvas({ onSubmit, isActive }: WritingCanvasProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    if (!value.trim()) return;
    onSubmit(value);
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-4 shrink-0">
      <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden focus-within:ring-1 focus-within:ring-emerald-500/30 focus-within:border-emerald-500/30 transition-all shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <span className="text-emerald-500/40 font-mono text-xs">{'>'}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Command Input</span>
        </div>
        <textarea
          className="w-full min-h-[120px] resize-none px-4 pt-2 pb-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none leading-relaxed"
          placeholder="Describe what you want to architect and build. Be direct — this is your command."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            {value.length > 0 ? `${value.length} chars · ` : ""}
            <span className="text-muted-foreground/70">⌘ + Enter to submit</span>
          </span>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              value.trim()
                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Architect & Build
          </button>
        </div>
      </div>
      {isActive && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
          System is working on your build. Tasks are running below.
        </div>
      )}
    </div>
  );
}

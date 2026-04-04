import { useLocation } from "wouter";
import { Film, ArrowLeft } from "lucide-react";

export function VideoGenerator() {
  const [, navigate] = useLocation();

  return (
    <div className="dark flex flex-col h-screen w-screen bg-background text-foreground">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Film className="w-5 h-5 text-cyan-400" />
        <h1 className="text-sm font-semibold tracking-tight">Video Generator</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Coming Soon
        </span>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-5">
            <Film className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Create videos with AI</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Generate short-form videos, animations, and motion graphics from text descriptions. Perfect for demos, social content, and explainers.
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            In Development
          </span>
        </div>
      </div>
    </div>
  );
}

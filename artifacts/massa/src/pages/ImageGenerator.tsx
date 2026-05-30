import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ImagePlus, ArrowLeft, Sparkles } from "lucide-react";

const PLACEHOLDER_IMAGES = [
  { prompt: "Futuristic cityscape at sunset", color: "#7c3aed" },
  { prompt: "Abstract data visualization", color: "#2563eb" },
  { prompt: "Minimalist logo design", color: "#059669" },
  { prompt: "Product mockup on dark background", color: "#d97706" },
  { prompt: "Isometric 3D illustration", color: "#dc2626" },
  { prompt: "Geometric pattern with gradients", color: "#0891b2" },
];

export function ImageGenerator() {
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
        <ImagePlus className="w-5 h-5 text-violet-400" />
        <h1 className="text-sm font-semibold tracking-tight">Image Generator</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
          Coming Soon
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
              <ImagePlus className="w-7 h-7 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Generate images with AI</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create stunning visuals from text prompts. Generate product mockups, illustrations, logos, and more — all powered by AI.
            </p>
          </div>

          <div className="relative mb-8">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-card">
              <Sparkles className="w-4 h-4 text-muted-foreground/70 shrink-0" />
              <input
                type="text"
                placeholder="Describe the image you want to create..."
                disabled
                className="flex-1 bg-transparent text-sm text-muted-foreground/70 placeholder:text-muted-foreground/60 outline-none cursor-not-allowed"
              />
              <button
                disabled
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500/20 text-violet-400/50 cursor-not-allowed"
              >
                Generate
              </button>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-background/40 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PLACEHOLDER_IMAGES.map((img, i) => (
              <div
                key={i}
                className="group relative aspect-square rounded-lg border border-border overflow-hidden cursor-not-allowed"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, ${img.color}15 0%, ${img.color}08 50%, ${img.color}20 100%)`,
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div
                    className="w-10 h-10 rounded-lg mb-3 opacity-30"
                    style={{
                      background: `linear-gradient(135deg, ${img.color}40, ${img.color}20)`,
                      border: `1px solid ${img.color}30`,
                    }}
                  />
                  <span className="text-[11px] text-muted-foreground/70 text-center leading-tight">
                    {img.prompt}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center",
                    "bg-muted/30"
                  )}>
                    <ImagePlus className="w-3 h-3 text-muted-foreground/60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ImagePlus, ArrowLeft, Sparkles, Download, Loader2, X } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const EXAMPLE_PROMPTS = [
  "Futuristic cityscape at sunset, cinematic lighting",
  "Abstract data visualization glowing on dark background",
  "Minimalist logo design with geometric shapes",
  "Product mockup on dark textured background",
  "Isometric 3D illustration of a city block",
  "Geometric gradient pattern with neon colors",
];

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
}

export function ImageGenerator() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [expanded, setExpanded] = useState<GeneratedImage | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function generate(text?: string) {
    const p = (text ?? prompt).trim();
    if (!p || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed");
      setImages((prev) => [
        { id: crypto.randomUUID(), prompt: p, url: data.url },
        ...prev,
      ]);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark flex flex-col h-screen w-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <ImagePlus className="w-5 h-5 text-violet-400" />
        <h1 className="text-sm font-semibold tracking-tight">Image Generator</h1>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
          DALL·E 3
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Prompt input */}
          <div className="mb-8">
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-card focus-within:border-violet-500/50 transition-colors">
              <Sparkles className="w-4 h-4 text-muted-foreground/70 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                placeholder="Describe the image you want to create..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
              />
              <button
                onClick={() => generate()}
                disabled={loading || !prompt.trim()}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  loading || !prompt.trim()
                    ? "bg-violet-500/20 text-violet-400/50 cursor-not-allowed"
                    : "bg-violet-500/30 text-violet-300 hover:bg-violet-500/40 cursor-pointer"
                )}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Generate"
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400 px-1">{error}</p>
            )}
          </div>

          {/* Example prompts (shown when no images yet) */}
          {images.length === 0 && !loading && (
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-widest">Try an example</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrompt(ex); inputRef.current?.focus(); }}
                    className="text-left px-3 py-2.5 rounded-lg border border-border hover:border-violet-500/40 bg-card hover:bg-violet-500/5 transition-all"
                  >
                    <span className="text-[11px] text-muted-foreground leading-tight block">{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground">Generating your image…</p>
            </div>
          )}

          {/* Generated images grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-lg border border-border overflow-hidden cursor-pointer hover:border-violet-500/40 transition-colors"
                  onClick={() => setExpanded(img)}
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-[11px] text-white/90 line-clamp-2 leading-snug">{img.prompt}</p>
                  </div>
                  <a
                    href={img.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setExpanded(null)}
        >
          <button
            className="absolute top-4 right-4 w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            onClick={() => setExpanded(null)}
          >
            <X className="w-4 h-4" />
          </button>
          <div
            className="max-w-2xl w-full rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={expanded.url} alt={expanded.prompt} className="w-full" />
            <div className="bg-card border-t border-border p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground flex-1">{expanded.prompt}</p>
              <a
                href={expanded.url}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useProjects } from "@/contexts/ProjectContext";
import { CompletedProduct } from "@/data/mock";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Globe,
  Rocket,
  Radio,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ExternalLink,
  Link2,
} from "lucide-react";

function DomainStep({
  product,
  onUpdate,
}: {
  product: CompletedProduct;
  onUpdate: (updates: Partial<CompletedProduct>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(product.domain);

  const handleSave = () => {
    onUpdate({ domain: draft, domainConnected: draft.trim().length > 0 });
    setEditing(false);
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          product.domainConnected
            ? "bg-muted/80 text-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Globe className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Domain</span>
          {product.domainConnected && (
            <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. app.yoursite.com"
              className="flex-1 px-2.5 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <button
              onClick={handleSave}
              className="px-2.5 py-1.5 text-xs font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              onClick={() => {
                setDraft(product.domain);
                setEditing(false);
              }}
              className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {product.domain ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                {product.domain}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No domain connected</span>
            )}
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {product.domain ? "Change" : "Connect"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeployStep({
  product,
  onUpdate,
}: {
  product: CompletedProduct;
  onUpdate: (updates: Partial<CompletedProduct>) => void;
}) {
  const handleDeploy = () => {
    onUpdate({ deployStatus: "in-progress" });
    setTimeout(() => {
      onUpdate({ deployStatus: "deployed" });
    }, 2000);
  };

  const statusConfig = {
    "not-started": {
      icon: <Circle className="w-4 h-4" />,
      label: "Not deployed",
      color: "bg-muted text-muted-foreground",
    },
    "in-progress": {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: "Deploying...",
      color: "bg-muted/80 text-muted-foreground",
    },
    deployed: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "Deployed",
      color: "bg-muted/80 text-foreground",
    },
    failed: {
      icon: <XCircle className="w-4 h-4" />,
      label: "Deploy failed",
      color: "bg-red-500/15 text-red-400",
    },
  };

  const config = statusConfig[product.deployStatus];

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          config.color
        )}
      >
        <Rocket className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Deploy</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {config.icon}
            {config.label}
          </span>
        </div>
        {product.deployStatus === "not-started" || product.deployStatus === "failed" ? (
          <button
            onClick={handleDeploy}
            className="px-3 py-1.5 text-xs font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
          >
            {product.deployStatus === "failed" ? "Retry Deploy" : "Deploy Now"}
          </button>
        ) : product.deployStatus === "in-progress" ? (
          <div className="h-1.5 w-32 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-foreground rounded-full animate-pulse w-2/3" />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Ready for publishing
          </span>
        )}
      </div>
    </div>
  );
}

function PublishStep({
  product,
  onUpdate,
}: {
  product: CompletedProduct;
  onUpdate: (updates: Partial<CompletedProduct>) => void;
}) {
  const canPublish = product.deployStatus === "deployed";

  const handleToggle = () => {
    if (product.publishStatus === "live") {
      onUpdate({ publishStatus: "unpublished" });
    } else {
      onUpdate({ publishStatus: "publishing" });
      setTimeout(() => {
        onUpdate({ publishStatus: "live" });
      }, 1500);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          product.publishStatus === "live"
            ? "bg-muted/80 text-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Radio className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Publish</span>
          {product.publishStatus === "live" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-muted text-foreground rounded-full">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
              Live
            </span>
          )}
          {product.publishStatus === "publishing" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground rounded-full">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              Publishing
            </span>
          )}
        </div>
        {!canPublish ? (
          <span className="text-xs text-muted-foreground">Deploy first to publish</span>
        ) : (
          <button
            onClick={handleToggle}
            disabled={product.publishStatus === "publishing"}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50",
              product.publishStatus === "live"
                ? "bg-muted text-foreground hover:bg-muted/80"
                : "bg-foreground text-background hover:opacity-90"
            )}
          >
            {product.publishStatus === "live"
              ? "Unpublish"
              : product.publishStatus === "publishing"
                ? "Publishing..."
                : "Go Live"}
          </button>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: CompletedProduct }) {
  const { updateCompletedProduct } = useProjects();

  const handleUpdate = (updates: Partial<CompletedProduct>) => {
    updateCompletedProduct(product.id, updates);
  };

  const stepsCompleted = [
    product.domainConnected,
    product.deployStatus === "deployed",
    product.publishStatus === "live",
  ].filter(Boolean).length;

  return (
    <div className="border border-border rounded-xl bg-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold truncate">{product.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{product.summary}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">
            Completed
          </span>
          <div className="text-xs text-muted-foreground">{product.completedAt}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-500"
            style={{ width: `${(stepsCompleted / 3) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{stepsCompleted}/3</span>
      </div>

      <div className="space-y-4">
        <DomainStep product={product} onUpdate={handleUpdate} />
        <div className="ml-4 border-l border-border/50 h-3" />
        <DeployStep product={product} onUpdate={handleUpdate} />
        <div className="ml-4 border-l border-border/50 h-3" />
        <PublishStep product={product} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}

export function CompletedProducts() {
  const [, navigate] = useLocation();
  const { completedProducts } = useProjects();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Completed Products</h1>
            <p className="text-xs text-muted-foreground">
              {completedProducts.length} product{completedProducts.length !== 1 ? "s" : ""} &middot; Manage domains, deployments & publishing
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {completedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-medium mb-1">No completed products yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              When you mark a project as complete, it will appear here with tools to connect a domain, deploy, and publish.
            </p>
          </div>
        ) : (
          completedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </main>
    </div>
  );
}

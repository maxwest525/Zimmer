import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useProjects } from "@/contexts/ProjectContext";
import { useThemeColors } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompletedProduct, ProjectLifecycle } from "@/data/mock";
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
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-muted text-foreground rounded-md">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
              Live
            </span>
          )}
          {product.publishStatus === "publishing" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground rounded-md">
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

type LifecycleTab = 'completed' | 'archived' | 'deleted' | 'published';

const TABS: { key: LifecycleTab; label: string; icon: string }[] = [
  { key: 'completed', label: 'Completed', icon: '✓' },
  { key: 'archived', label: 'Archived', icon: '▪' },
  { key: 'deleted', label: 'Deleted', icon: '✕' },
  { key: 'published', label: 'Published', icon: '◉' },
]

function getInitialTab(): LifecycleTab {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (tab === 'published' || tab === 'completed' || tab === 'archived' || tab === 'deleted') return tab
  return 'completed'
}

function LifecycleProjectCard({ project, lifecycle, onRestore, onArchive, onDelete }: {
  project: { id: string; name: string };
  lifecycle: LifecycleTab;
  onRestore: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const c = useThemeColors();
  return (
    <div style={{
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: '12px 16px',
      background: c.alt,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontFamily: '"JetBrains Mono", Menlo, monospace',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{project.name}</div>
        <div style={{ fontSize: 12, color: c.muted, marginTop: 2, fontFamily: c.fontSans }}>
          {lifecycle === 'completed' ? 'Marked complete' : lifecycle === 'archived' ? 'Archived' : 'Marked for deletion'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onRestore}
          style={{
            border: `1px solid ${c.green}`,
            background: c.greenSoft,
            color: c.green,
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: '"JetBrains Mono", Menlo, monospace',
          }}
        >Restore</button>
        {lifecycle === 'completed' && onArchive && (
          <button
            onClick={onArchive}
            style={{
              border: `1px solid ${c.border}`,
              background: 'transparent',
              color: c.muted,
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: '"JetBrains Mono", Menlo, monospace',
            }}
          >Archive</button>
        )}
        {lifecycle !== 'deleted' && onDelete && (
          <button
            onClick={onDelete}
            style={{
              border: `1px solid ${c.border}`,
              background: 'transparent',
              color: c.red,
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: '"JetBrains Mono", Menlo, monospace',
            }}
          >Delete</button>
        )}
      </div>
    </div>
  )
}

export function CompletedProducts() {
  const c = useThemeColors();
  const [, navigate] = useLocation();
  const { activeProjects, completedProducts, projectLifecycles, restoreProject, archiveProject, deleteProject } = useProjects();
  const [activeTab, setActiveTab] = useState<LifecycleTab>(getInitialTab);

  const publishedProducts = useMemo(() => completedProducts.filter(p => p.publishStatus === 'live'), [completedProducts])

  const projectsByLifecycle = useMemo(() => {
    const result: Record<'completed' | 'archived' | 'deleted', { id: string; name: string }[]> = {
      completed: [],
      archived: [],
      deleted: [],
    }
    for (const p of activeProjects) {
      const lc = projectLifecycles[p.id] || 'active'
      if (lc === 'completed') result.completed.push(p)
      else if (lc === 'archived') result.archived.push(p)
      else if (lc === 'deleted') result.deleted.push(p)
    }
    return result
  }, [activeProjects, projectLifecycles])

  const tabCounts: Record<LifecycleTab, number> = useMemo(() => ({
    completed: projectsByLifecycle.completed.length,
    archived: projectsByLifecycle.archived.length,
    deleted: projectsByLifecycle.deleted.length,
    published: publishedProducts.length,
  }), [projectsByLifecycle, publishedProducts])

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: `1px solid ${c.border}`,
        background: c.panel,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              background: 'transparent',
              color: c.muted,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'color 0.12s, background 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.background = c.alt }}
            onMouseLeave={e => { e.currentTarget.style.color = c.muted; e.currentTarget.style.background = 'transparent' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>Current Projects</h1>
            <p style={{ fontSize: 12, color: c.muted, marginTop: 2, fontFamily: c.fontSans }}>
              Manage completed, archived, and deleted projects
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${c.border}`, marginTop: 8 }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 18px',
                fontSize: 11,
                fontWeight: 600,
                color: activeTab === tab.key ? c.green : c.muted,
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? `2px solid ${c.green}` : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: '"JetBrains Mono", Menlo, monospace',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'color 0.12s',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tabCounts[tab.key] > 0 && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: activeTab === tab.key ? c.greenSoft : 'rgba(107,114,128,0.12)',
                  color: activeTab === tab.key ? c.green : c.muted,
                  padding: '1px 5px',
                  borderRadius: 6,
                }}>{tabCounts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeTab === 'published' ? (
            publishedProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {publishedProducts.map(product => (
                  <div key={product.id} style={{ border: `1px solid ${c.border}`, background: c.alt, borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: c.text }}>{product.name}</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.green, background: c.greenSoft, padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.green, boxShadow: `0 0 4px ${c.green}` }} />
                        LIVE
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: c.muted, marginBottom: 8, fontFamily: c.fontSans, lineHeight: 1.5 }}>{product.summary}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                      {product.domain && (
                        <span style={{ color: c.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Link2 size={12} /> {product.domain}
                        </span>
                      )}
                      <span style={{ color: c.dim }}>Completed {product.completedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>◉</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No published products</div>
                <div style={{ fontSize: 13, color: c.muted, maxWidth: 320, fontFamily: c.fontSans, lineHeight: 1.5 }}>Deploy and publish a completed product to see it here.</div>
              </div>
            )
          ) : (
            <>
              {activeTab === 'completed' && completedProducts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: c.muted, marginBottom: 10, fontWeight: 600 }}>DEPLOY & PUBLISH</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {completedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}

              {projectsByLifecycle[activeTab as 'completed' | 'archived' | 'deleted'].length > 0 ? (
                projectsByLifecycle[activeTab as 'completed' | 'archived' | 'deleted'].map(project => (
                  <LifecycleProjectCard
                    key={project.id}
                    project={project}
                    lifecycle={activeTab}
                    onRestore={() => restoreProject(project.id)}
                    onArchive={activeTab === 'completed' ? () => archiveProject(project.id) : undefined}
                    onDelete={activeTab !== 'deleted' ? () => deleteProject(project.id) : undefined}
                  />
                ))
              ) : (
                completedProducts.length === 0 || activeTab !== 'completed' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>
                      {activeTab === 'completed' ? '✓' : activeTab === 'archived' ? '▪' : '✕'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                      No {activeTab} projects
                    </div>
                    <div style={{ fontSize: 13, color: c.muted, maxWidth: 320, fontFamily: c.fontSans, lineHeight: 1.5 }}>
                      {activeTab === 'completed'
                        ? 'Mark a project complete from the dashboard to move it here.'
                        : activeTab === 'archived'
                          ? 'Archived projects will appear here for safekeeping.'
                          : 'Deleted projects can be restored from here.'}
                    </div>
                  </div>
                ) : null
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

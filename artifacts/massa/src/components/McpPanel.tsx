import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useMcp, type McpServer, type McpStatusEvent } from "@/contexts/McpContext";
import { CompanyLogo, preloadLogo } from "@/components/CompanyLogo";
import { resolveMcpBrand, CURATED_MCP_CONNECTORS } from "@/lib/logos";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function eventLabel(event: McpStatusEvent): string {
  if (event.status === "connected") return "Recovered";
  if (event.status === "error") return "Went offline";
  return "Disconnected";
}

const STATUS_CONFIG: Record<
  McpServer["status"],
  { label: string; dot: string; text: string }
> = {
  connected: { label: "Connected", dot: "bg-emerald-400", text: "text-emerald-400" },
  disconnected: { label: "Disconnected", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  error: { label: "Error", dot: "bg-red-400", text: "text-red-400" },
};

const apiBase = "/api";

interface McpContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface ToolRunState {
  args: string;
  running: boolean;
  error: string | null;
  result: { content: McpContentBlock[]; isError: boolean } | null;
}

function blockToText(block: McpContentBlock): string {
  if (typeof block.text === "string") return block.text;
  return JSON.stringify(block, null, 2);
}

export function McpPanel() {
  const { servers, setServers, loading, refreshing } = useMcp();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const [toolRuns, setToolRuns] = useState<Record<string, ToolRunState>>({});

  // When the Add Server form opens, pre-warm the curated connectors' logos so
  // their brand images render instantly without a Clearbit round-trip or a
  // fallback flash the first time the picker is shown.
  useEffect(() => {
    if (!showForm) return;
    for (const connector of CURATED_MCP_CONNECTORS) {
      preloadLogo(resolveMcpBrand(connector).info);
    }
  }, [showForm]);

  const toolKey = (serverId: number, toolName: string) => `${serverId}:${toolName}`;

  const updateRun = (key: string, patch: Partial<ToolRunState>) => {
    setToolRuns((prev) => ({
      ...prev,
      [key]: {
        args: prev[key]?.args ?? "{}",
        running: prev[key]?.running ?? false,
        error: prev[key]?.error ?? null,
        result: prev[key]?.result ?? null,
        ...patch,
      },
    }));
  };

  const handleRunTool = async (serverId: number, toolName: string) => {
    const key = toolKey(serverId, toolName);
    const raw = (toolRuns[key]?.args ?? "{}").trim();
    let parsedArgs: unknown = {};
    if (raw.length > 0) {
      try {
        parsedArgs = JSON.parse(raw);
      } catch {
        updateRun(key, { error: "Arguments must be valid JSON", result: null });
        return;
      }
      if (
        typeof parsedArgs !== "object" ||
        parsedArgs === null ||
        Array.isArray(parsedArgs)
      ) {
        updateRun(key, { error: "Arguments must be a JSON object", result: null });
        return;
      }
    }
    updateRun(key, { running: true, error: null, result: null });
    try {
      const res = await fetch(`${apiBase}/mcp/${serverId}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolName, args: parsedArgs }),
      });
      const data = await res.json();
      if (!res.ok) {
        updateRun(key, { running: false, error: data?.error || "Tool call failed" });
        return;
      }
      updateRun(key, { running: false, error: null, result: data });
    } catch {
      updateRun(key, { running: false, error: "Network error calling tool" });
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !endpoint.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${apiBase}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          endpoint: endpoint.trim(),
          authToken: authToken.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to add server");
      }
      setServers((prev) => [data, ...prev]);
      setName("");
      setEndpoint("");
      setAuthToken("");
      setShowForm(false);
      if (data.status === "connected") setExpandedId(data.id);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnect = async (id: number) => {
    setConnectingId(id);
    try {
      const res = await fetch(`${apiBase}/mcp/${id}/connect`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setServers((prev) => prev.map((s) => (s.id === id ? data : s)));
      }
    } catch {
      // ignore; status stays as-is
    } finally {
      setConnectingId(null);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/mcp/${id}`, { method: "DELETE" });
      if (res.ok) {
        setServers((prev) => prev.filter((s) => s.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full px-6 py-5 gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Model Context Protocol
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            Connect MCP servers to extend this project with external tools.
          </p>
          {servers.length > 0 && (
            <p className="text-[10px] font-mono text-muted-foreground/70">
              {refreshing ? "Checking connections…" : "Auto-checks every 30s"}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
          className="px-3 py-1.5 text-[10px] font-mono font-medium uppercase tracking-wide rounded-md border border-border bg-card text-foreground hover:border-emerald-400/50 hover:text-emerald-400 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Server"}
        </button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Server Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub Tools"
              className="px-3 py-2 text-xs font-mono rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground/70 focus:border-emerald-400/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Endpoint URL
            </label>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://example.com/mcp"
              className="px-3 py-2 text-xs font-mono rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground/70 focus:border-emerald-400/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Auth Token <span className="text-muted-foreground/70 normal-case">(optional)</span>
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="API key or Bearer token"
              autoComplete="off"
              className="px-3 py-2 text-xs font-mono rounded-md bg-background border border-border text-foreground placeholder:text-muted-foreground/70 focus:border-emerald-400/50 focus:outline-none transition-colors"
            />
            <p className="text-[10px] font-mono text-muted-foreground/70 leading-relaxed">
              Sent as an Authorization header. Stored securely and never shown again.
            </p>
          </div>
          {formError && (
            <p className="text-[10px] font-mono text-red-400">{formError}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdd}
              disabled={submitting || !name.trim() || !endpoint.trim()}
              className="px-3 py-1.5 text-[10px] font-mono font-medium uppercase tracking-wide rounded-md bg-emerald-400 text-[#0a0d10] hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Connecting…" : "Connect"}
            </button>
            <span className="text-[10px] font-mono text-muted-foreground/70">
              Streamable HTTP MCP endpoints
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs font-mono text-muted-foreground">Loading servers…</p>
        </div>
      ) : servers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-card">
          <span className="text-2xl opacity-60">⌥</span>
          <p className="text-xs font-mono text-muted-foreground">No MCP servers connected</p>
          <p className="text-[10px] font-mono text-muted-foreground text-center max-w-xs">
            MCP servers let this project call external tools and data sources.
            Click "Add Server" to connect one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">
            {servers.length} server{servers.length !== 1 ? "s" : ""}
          </p>
          {servers.map((server) => {
            const status = STATUS_CONFIG[server.status] ?? STATUS_CONFIG.disconnected;
            const isExpanded = expandedId === server.id;
            const tools = server.tools ?? [];
            const canExpand = server.status === "connected" && tools.length > 0;
            const brand = resolveMcpBrand(server.name, server.endpoint);
            return (
              <div
                key={server.id}
                className="rounded-md bg-card border border-border hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="relative shrink-0" title={status.label}>
                    <CompanyLogo name={brand.label} info={brand.info} size={24} />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card",
                        status.dot,
                      )}
                    />
                  </span>
                  <button
                    onClick={() => canExpand && setExpandedId(isExpanded ? null : server.id)}
                    className={cn(
                      "flex-1 min-w-0 text-left",
                      canExpand ? "cursor-pointer" : "cursor-default",
                    )}
                  >
                    <p className="text-xs font-mono text-foreground truncate flex items-center gap-1.5">
                      {brand.label}
                      {server.hasAuthToken && (
                        <span title="Authenticated" className="text-muted-foreground">🔒</span>
                      )}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      {server.endpoint}
                    </p>
                  </button>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {server.toolCount} tool{server.toolCount !== 1 ? "s" : ""}
                  </span>
                  <span className={cn("text-[10px] font-mono shrink-0", status.text)}>
                    {status.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleConnect(server.id)}
                      disabled={connectingId === server.id}
                      title="Reconnect / refresh tools"
                      className="px-2 py-1 text-[10px] font-mono rounded border border-border text-muted-foreground hover:border-emerald-400/50 hover:text-emerald-400 disabled:opacity-40 transition-colors"
                    >
                      {connectingId === server.id ? "…" : "↻"}
                    </button>
                    <button
                      onClick={() => handleRemove(server.id)}
                      title="Remove server"
                      className="px-2 py-1 text-[10px] font-mono rounded border border-border text-muted-foreground hover:border-red-400/50 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {server.status === "error" && server.lastError && (
                  <div className="px-3 pb-2.5 -mt-1">
                    <p className="text-[10px] font-mono text-red-400/80">
                      {server.lastError}
                    </p>
                  </div>
                )}

                {server.history.length > 0 && (
                  <div className="px-3 pb-2.5 -mt-0.5 flex flex-col gap-1">
                    <p className="text-[9px] font-mono text-muted-foreground/70 uppercase tracking-widest">
                      Status history
                    </p>
                    {server.history.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 text-[10px] font-mono"
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            event.status === "connected"
                              ? "bg-emerald-400"
                              : event.status === "error"
                                ? "bg-red-400"
                                : "bg-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "shrink-0",
                            event.status === "connected"
                              ? "text-emerald-400/80"
                              : event.status === "error"
                                ? "text-red-400/80"
                                : "text-muted-foreground",
                          )}
                        >
                          {eventLabel(event)}
                        </span>
                        <span className="text-muted-foreground/70 shrink-0">
                          {timeAgo(event.createdAt)}
                        </span>
                        {event.error && (
                          <span className="text-muted-foreground/70 truncate" title={event.error}>
                            — {event.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && canExpand && (
                  <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5 border-t border-border">
                    {tools.map((tool) => {
                      const key = toolKey(server.id, tool.name);
                      const isOpen = openTool === key;
                      const run = toolRuns[key];
                      return (
                        <div key={tool.name} className="flex flex-col gap-0.5 pt-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <p className="text-[11px] font-mono text-emerald-400/90 truncate">
                                {tool.name}
                              </p>
                              {tool.description && (
                                <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                                  {tool.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setOpenTool(isOpen ? null : key)}
                              className="shrink-0 px-2 py-1 text-[10px] font-mono rounded border border-border text-muted-foreground hover:border-emerald-400/50 hover:text-emerald-400 transition-colors"
                            >
                              {isOpen ? "Close" : "Run"}
                            </button>
                          </div>

                          {isOpen && (
                            <div className="flex flex-col gap-2 mt-1.5 rounded-md border border-border bg-background p-2.5">
                              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                Arguments (JSON)
                              </label>
                              <textarea
                                value={run?.args ?? "{}"}
                                onChange={(e) => updateRun(key, { args: e.target.value })}
                                spellCheck={false}
                                rows={3}
                                className="px-2 py-1.5 text-[11px] font-mono rounded bg-card border border-border text-foreground focus:border-emerald-400/50 focus:outline-none transition-colors resize-y"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleRunTool(server.id, tool.name)}
                                  disabled={run?.running}
                                  className="px-3 py-1.5 text-[10px] font-mono font-medium uppercase tracking-wide rounded-md bg-emerald-400 text-[#0a0d10] hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  {run?.running ? "Running…" : "Call tool"}
                                </button>
                              </div>
                              {run?.error && (
                                <p className="text-[10px] font-mono text-red-400">
                                  {run.error}
                                </p>
                              )}
                              {run?.result && (
                                <div className="flex flex-col gap-1.5">
                                  <p
                                    className={cn(
                                      "text-[10px] font-mono uppercase tracking-widest",
                                      run.result.isError ? "text-red-400" : "text-emerald-400/80",
                                    )}
                                  >
                                    {run.result.isError ? "Tool returned an error" : "Result"}
                                  </p>
                                  {run.result.content.length === 0 ? (
                                    <p className="text-[10px] font-mono text-muted-foreground">
                                      (empty result)
                                    </p>
                                  ) : (
                                    run.result.content.map((block, i) => (
                                      <pre
                                        key={i}
                                        className="text-[10px] font-mono text-foreground whitespace-pre-wrap break-words bg-card border border-border rounded p-2 max-h-48 overflow-auto"
                                      >
                                        {blockToText(block)}
                                      </pre>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface McpTool {
  name: string;
  description?: string;
}

interface McpServer {
  id: number;
  name: string;
  endpoint: string;
  hasAuthToken: boolean;
  status: "connected" | "disconnected" | "error";
  toolCount: number;
  tools: McpTool[] | null;
  lastError: string | null;
  lastConnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  McpServer["status"],
  { label: string; dot: string; text: string }
> = {
  connected: { label: "Connected", dot: "bg-emerald-400", text: "text-emerald-400" },
  disconnected: { label: "Disconnected", dot: "bg-[#7a8294]", text: "text-[#7a8294]" },
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
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/mcp`);
      if (!res.ok) throw new Error("Failed to load servers");
      const data = await res.json();
      setServers(data);
    } catch {
      // Keep whatever we have; surfaced via empty state.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

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
          <p className="text-[10px] font-mono text-[#7a8294] uppercase tracking-widest">
            Model Context Protocol
          </p>
          <p className="text-xs font-mono text-[#a0a8b8]">
            Connect MCP servers to extend this project with external tools.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
          className="px-3 py-1.5 text-[10px] font-mono font-medium uppercase tracking-wide rounded-md border border-[#252a35] bg-[#0d1117] text-[#c0c5cf] hover:border-emerald-400/50 hover:text-emerald-400 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Server"}
        </button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 rounded-lg border border-[#252a35] bg-[#0d1117] p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-[#7a8294] uppercase tracking-widest">
              Server Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub Tools"
              className="px-3 py-2 text-xs font-mono rounded-md bg-[#0a0d10] border border-[#1a1f2b] text-[#c0c5cf] placeholder:text-[#5a6172] focus:border-emerald-400/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-[#7a8294] uppercase tracking-widest">
              Endpoint URL
            </label>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://example.com/mcp"
              className="px-3 py-2 text-xs font-mono rounded-md bg-[#0a0d10] border border-[#1a1f2b] text-[#c0c5cf] placeholder:text-[#5a6172] focus:border-emerald-400/50 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-[#7a8294] uppercase tracking-widest">
              Auth Token <span className="text-[#5a6172] normal-case">(optional)</span>
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="API key or Bearer token"
              autoComplete="off"
              className="px-3 py-2 text-xs font-mono rounded-md bg-[#0a0d10] border border-[#1a1f2b] text-[#c0c5cf] placeholder:text-[#5a6172] focus:border-emerald-400/50 focus:outline-none transition-colors"
            />
            <p className="text-[10px] font-mono text-[#5a6172] leading-relaxed">
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
            <span className="text-[10px] font-mono text-[#5a6172]">
              Streamable HTTP MCP endpoints
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs font-mono text-[#7a8294]">Loading servers…</p>
        </div>
      ) : servers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[#252a35] bg-[#0d1117]">
          <span className="text-2xl opacity-60">⌥</span>
          <p className="text-xs font-mono text-[#a0a8b8]">No MCP servers connected</p>
          <p className="text-[10px] font-mono text-[#7a8294] text-center max-w-xs">
            MCP servers let this project call external tools and data sources.
            Click "Add Server" to connect one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          <p className="text-[10px] font-mono text-[#7a8294] uppercase tracking-widest mb-1">
            {servers.length} server{servers.length !== 1 ? "s" : ""}
          </p>
          {servers.map((server) => {
            const status = STATUS_CONFIG[server.status] ?? STATUS_CONFIG.disconnected;
            const isExpanded = expandedId === server.id;
            const tools = server.tools ?? [];
            const canExpand = server.status === "connected" && tools.length > 0;
            return (
              <div
                key={server.id}
                className="rounded-md bg-[#0d1117] border border-[#1a1f2b] hover:border-[#252a35] transition-colors"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", status.dot)} />
                  <button
                    onClick={() => canExpand && setExpandedId(isExpanded ? null : server.id)}
                    className={cn(
                      "flex-1 min-w-0 text-left",
                      canExpand ? "cursor-pointer" : "cursor-default",
                    )}
                  >
                    <p className="text-xs font-mono text-[#c0c5cf] truncate flex items-center gap-1.5">
                      {server.name}
                      {server.hasAuthToken && (
                        <span title="Authenticated" className="text-[#7a8294]">🔒</span>
                      )}
                    </p>
                    <p className="text-[10px] font-mono text-[#7a8294] truncate">
                      {server.endpoint}
                    </p>
                  </button>
                  <span className="text-[10px] font-mono text-[#7a8294] shrink-0">
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
                      className="px-2 py-1 text-[10px] font-mono rounded border border-[#252a35] text-[#a0a8b8] hover:border-emerald-400/50 hover:text-emerald-400 disabled:opacity-40 transition-colors"
                    >
                      {connectingId === server.id ? "…" : "↻"}
                    </button>
                    <button
                      onClick={() => handleRemove(server.id)}
                      title="Remove server"
                      className="px-2 py-1 text-[10px] font-mono rounded border border-[#252a35] text-[#a0a8b8] hover:border-red-400/50 hover:text-red-400 transition-colors"
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

                {isExpanded && canExpand && (
                  <div className="px-3 pb-3 pt-1 flex flex-col gap-1.5 border-t border-[#1a1f2b]">
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
                                <p className="text-[10px] font-mono text-[#7a8294] leading-relaxed">
                                  {tool.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setOpenTool(isOpen ? null : key)}
                              className="shrink-0 px-2 py-1 text-[10px] font-mono rounded border border-[#252a35] text-[#a0a8b8] hover:border-emerald-400/50 hover:text-emerald-400 transition-colors"
                            >
                              {isOpen ? "Close" : "Run"}
                            </button>
                          </div>

                          {isOpen && (
                            <div className="flex flex-col gap-2 mt-1.5 rounded-md border border-[#1a1f2b] bg-[#0a0d10] p-2.5">
                              <label className="text-[10px] font-mono text-[#7a8294] uppercase tracking-widest">
                                Arguments (JSON)
                              </label>
                              <textarea
                                value={run?.args ?? "{}"}
                                onChange={(e) => updateRun(key, { args: e.target.value })}
                                spellCheck={false}
                                rows={3}
                                className="px-2 py-1.5 text-[11px] font-mono rounded bg-[#0d1117] border border-[#1a1f2b] text-[#c0c5cf] focus:border-emerald-400/50 focus:outline-none transition-colors resize-y"
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
                                    <p className="text-[10px] font-mono text-[#7a8294]">
                                      (empty result)
                                    </p>
                                  ) : (
                                    run.result.content.map((block, i) => (
                                      <pre
                                        key={i}
                                        className="text-[10px] font-mono text-[#c0c5cf] whitespace-pre-wrap break-words bg-[#0d1117] border border-[#1a1f2b] rounded p-2 max-h-48 overflow-auto"
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

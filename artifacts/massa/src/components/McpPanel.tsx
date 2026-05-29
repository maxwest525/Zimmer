import { cn } from "@/lib/utils";

interface McpServer {
  id: string;
  name: string;
  endpoint: string;
  status: "connected" | "disconnected" | "error";
  toolCount: number;
}

const STATUS_CONFIG: Record<
  McpServer["status"],
  { label: string; dot: string; text: string }
> = {
  connected: { label: "Connected", dot: "bg-emerald-400", text: "text-emerald-400" },
  disconnected: { label: "Disconnected", dot: "bg-[#7a8294]", text: "text-[#7a8294]" },
  error: { label: "Error", dot: "bg-red-400", text: "text-red-400" },
};

const MOCK_SERVERS: McpServer[] = [];

export function McpPanel() {
  const servers = MOCK_SERVERS;

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
          disabled
          className="px-3 py-1.5 text-[10px] font-mono font-medium uppercase tracking-wide rounded-md border border-[#252a35] bg-[#0d1117] text-[#7a8294] cursor-not-allowed opacity-60"
          title="Coming soon"
        >
          + Add Server
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[#252a35] bg-[#0d1117]">
          <span className="text-2xl opacity-60">⌥</span>
          <p className="text-xs font-mono text-[#a0a8b8]">No MCP servers connected</p>
          <p className="text-[10px] font-mono text-[#7a8294] text-center max-w-xs">
            MCP servers let this project call external tools and data sources.
            Connecting servers will be available here soon.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          <p className="text-[10px] font-mono text-[#7a8294] uppercase tracking-widest mb-1">
            {servers.length} server{servers.length !== 1 ? "s" : ""}
          </p>
          {servers.map((server) => {
            const status = STATUS_CONFIG[server.status];
            return (
              <div
                key={server.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-[#0d1117] border border-[#1a1f2b] hover:border-[#252a35] transition-colors"
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", status.dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-[#c0c5cf] truncate">{server.name}</p>
                  <p className="text-[10px] font-mono text-[#7a8294] truncate">
                    {server.endpoint}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#7a8294]">
                  {server.toolCount} tool{server.toolCount !== 1 ? "s" : ""}
                </span>
                <span className={cn("text-[10px] font-mono", status.text)}>
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

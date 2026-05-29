import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export interface McpTool {
  name: string;
  description?: string;
}

export interface McpServer {
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

const apiBase = "/api";

interface McpContextValue {
  servers: McpServer[];
  setServers: React.Dispatch<React.SetStateAction<McpServer[]>>;
  loading: boolean;
  refreshing: boolean;
  refreshServers: () => Promise<void>;
  errorCount: number;
}

const McpContext = createContext<McpContextValue | null>(null);

interface McpProviderProps {
  children: ReactNode;
  onViewMcp?: () => void;
}

export function McpProvider({ children, onViewMcp }: McpProviderProps) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Last-seen status per server id, used to detect connected -> error flips.
  const prevStatusRef = useRef<Map<number, McpServer["status"]>>(new Map());
  // Servers we've already alerted about while they stay down (no repeat spam).
  const alertedRef = useRef<Set<number>>(new Set());
  const onViewMcpRef = useRef(onViewMcp);
  onViewMcpRef.current = onViewMcp;

  const seedStatuses = useCallback((list: McpServer[]) => {
    const next = new Map<number, McpServer["status"]>();
    for (const s of list) next.set(s.id, s.status);
    prevStatusRef.current = next;
  }, []);

  const detectOutages = useCallback((list: McpServer[]) => {
    const prev = prevStatusRef.current;
    const seenIds = new Set<number>();
    for (const server of list) {
      seenIds.add(server.id);
      const before = prev.get(server.id);
      if (server.status === "connected") {
        // Recovered (or healthy): allow a future outage to alert again.
        alertedRef.current.delete(server.id);
      } else if (
        server.status === "error" &&
        before === "connected" &&
        !alertedRef.current.has(server.id)
      ) {
        alertedRef.current.add(server.id);
        toast({
          variant: "destructive",
          title: `${server.name} went offline`,
          description:
            server.lastError?.trim() ||
            "The connection check failed. Tools from this server are unavailable.",
          action: onViewMcpRef.current ? (
            <ToastAction altText="View MCP servers" onClick={() => onViewMcpRef.current?.()}>
              View
            </ToastAction>
          ) : undefined,
        });
      }
      prev.set(server.id, server.status);
    }
    // Drop bookkeeping for servers that were removed.
    for (const id of Array.from(prev.keys())) {
      if (!seenIds.has(id)) {
        prev.delete(id);
        alertedRef.current.delete(id);
      }
    }
  }, []);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/mcp`);
      if (!res.ok) throw new Error("Failed to load servers");
      const data: McpServer[] = await res.json();
      setServers(data);
      // Seed baseline without alerting on first load.
      seedStatuses(data);
    } catch {
      // Keep whatever we have; surfaced via empty state.
    } finally {
      setLoading(false);
    }
  }, [seedStatuses]);

  const refreshInFlight = useRef(false);
  const refreshServers = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`${apiBase}/mcp/refresh`, { method: "POST" });
      if (!res.ok) return;
      const data: McpServer[] = await res.json();
      detectOutages(data);
      setServers(data);
    } catch {
      // Keep last-known status; a transient failure shouldn't wipe the list.
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  }, [detectOutages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchServers();
      if (!cancelled) await refreshServers();
    })();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refreshServers();
    }, 30000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshServers();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchServers, refreshServers]);

  const errorCount = servers.filter((s) => s.status === "error").length;

  return (
    <McpContext.Provider
      value={{ servers, setServers, loading, refreshing, refreshServers, errorCount }}
    >
      {children}
    </McpContext.Provider>
  );
}

export function useMcp(): McpContextValue {
  const ctx = useContext(McpContext);
  if (!ctx) throw new Error("useMcp must be used within an McpProvider");
  return ctx;
}

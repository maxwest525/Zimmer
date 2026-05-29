import dns from "node:dns/promises";
import net from "node:net";
import type { McpTool } from "@workspace/db";

const PROTOCOL_VERSION = "2025-03-26";
const REQUEST_TIMEOUT_MS = 15000;

function ipv4ToLong(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function isPrivateIPv4(ip: string): boolean {
  const value = ipv4ToLong(ip);
  const inRange = (cidr: string): boolean => {
    const [range, bitsStr] = cidr.split("/");
    const bits = parseInt(bitsStr, 10);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToLong(range) & mask);
  };
  return [
    "0.0.0.0/8",
    "10.0.0.0/8",
    "100.64.0.0/10",
    "127.0.0.0/8",
    "169.254.0.0/16",
    "172.16.0.0/12",
    "192.0.0.0/24",
    "192.168.0.0/16",
    "198.18.0.0/15",
    "224.0.0.0/4",
    "240.0.0.0/4",
  ].some(inRange);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (/^f[cd]/.test(lower)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
  return false;
}

function isPrivateIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) return isPrivateIPv4(ip);
  if (type === 6) return isPrivateIPv6(ip);
  return true; // unknown format -> treat as unsafe
}

/**
 * Guards against SSRF: rejects endpoints whose host is a local name or whose
 * resolved address falls in a private / loopback / link-local range (which
 * would let a user reach internal services or cloud metadata endpoints).
 */
async function assertPublicEndpoint(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const lowered = host.toLowerCase();
  if (
    lowered === "localhost" ||
    lowered.endsWith(".localhost") ||
    lowered.endsWith(".local") ||
    lowered.endsWith(".internal")
  ) {
    throw new Error("Endpoint host is not allowed");
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new Error("Endpoint points to a private address");
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(host, { all: true });
  } catch {
    throw new Error("Could not resolve endpoint host");
  }
  if (addresses.length === 0) {
    throw new Error("Could not resolve endpoint host");
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error("Endpoint resolves to a private address");
    }
  }
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: number | string;
  result?: any;
  error?: { code: number; message: string };
}

const MAX_REDIRECTS = 5;

/**
 * Fetch with a timeout that handles redirects manually so each hop's target is
 * re-validated against the SSRF guard. Default fetch follows redirects
 * automatically, which would let a public URL bounce to a private address.
 */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  let currentUrl = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(currentUrl, {
        ...init,
        signal: controller.signal,
        redirect: "manual",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      let target: URL;
      try {
        target = new URL(location, currentUrl);
      } catch {
        throw new Error("Endpoint returned an invalid redirect");
      }
      if (target.protocol !== "http:" && target.protocol !== "https:") {
        throw new Error("Endpoint redirected to a non-http(s) location");
      }
      await assertPublicEndpoint(target.hostname);
      currentUrl = target.toString();
      continue;
    }

    return res;
  }
  throw new Error("Too many redirects");
}

async function readJsonRpcResponse(
  res: Response,
  expectId: number,
): Promise<JsonRpcResponse> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream")) {
    const raw = await res.text();
    const messages: JsonRpcResponse[] = [];
    for (const block of raw.split(/\r?\n\r?\n/)) {
      const dataLines = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      if (dataLines.length === 0) continue;
      try {
        messages.push(JSON.parse(dataLines.join("\n")));
      } catch {
        // Ignore non-JSON SSE payloads (e.g. ping comments).
      }
    }
    const match = messages.find((m) => m.id === expectId);
    if (match) return match;
    if (messages.length > 0) return messages[messages.length - 1];
    throw new Error("Server returned an empty event stream");
  }

  if (contentType.includes("application/json")) {
    return (await res.json()) as JsonRpcResponse;
  }

  const text = (await res.text()).trim();
  if (!text) return {};
  try {
    return JSON.parse(text) as JsonRpcResponse;
  } catch {
    throw new Error(`Unexpected response (content-type: ${contentType || "unknown"})`);
  }
}

interface McpSession {
  endpoint: string;
  headers: Record<string, string>;
}

/**
 * Validates the endpoint, performs the initialize + notifications/initialized
 * handshake, and returns a reusable session (endpoint + headers carrying any
 * mcp-session-id). Throws an Error with a human-readable message on failure.
 */
async function openSession(endpoint: string): Promise<McpSession> {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Invalid endpoint URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Endpoint must use http or https");
  }

  await assertPublicEndpoint(url.hostname);

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  let initRes: Response;
  try {
    initRes = await safeFetch(endpoint, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "MASSA", version: "1.0.0" },
        },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Connection timed out");
    }
    throw new Error(
      `Could not reach server: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (!initRes.ok) {
    throw new Error(`Server rejected initialize (HTTP ${initRes.status})`);
  }

  const sessionId = initRes.headers.get("mcp-session-id");
  const initMsg = await readJsonRpcResponse(initRes, 1);
  if (initMsg.error) {
    throw new Error(`Initialize failed: ${initMsg.error.message}`);
  }

  const headers: Record<string, string> = { ...baseHeaders };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  try {
    await safeFetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });
  } catch {
    // Some servers respond with 202/empty; ignore notification errors.
  }

  return { endpoint, headers };
}

/**
 * Connects to a remote MCP server over the Streamable HTTP transport,
 * performs the initialize handshake, and returns its advertised tools.
 * Throws an Error with a human-readable message on any failure.
 */
export async function connectAndListTools(endpoint: string): Promise<McpTool[]> {
  const session = await openSession(endpoint);

  let toolsRes: Response;
  try {
    toolsRes = await safeFetch(session.endpoint, {
      method: "POST",
      headers: session.headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Listing tools timed out");
    }
    throw new Error(
      `Failed to list tools: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (!toolsRes.ok) {
    throw new Error(`Server rejected tools/list (HTTP ${toolsRes.status})`);
  }

  const toolsMsg = await readJsonRpcResponse(toolsRes, 2);
  if (toolsMsg.error) {
    throw new Error(`tools/list failed: ${toolsMsg.error.message}`);
  }

  const rawTools = Array.isArray(toolsMsg.result?.tools)
    ? toolsMsg.result.tools
    : [];

  return rawTools
    .filter((t: any) => t && typeof t.name === "string")
    .map((t: any) => ({
      name: t.name as string,
      description:
        typeof t.description === "string" ? t.description : undefined,
    }));
}

export interface McpContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface McpToolResult {
  content: McpContentBlock[];
  isError: boolean;
}

/**
 * Calls a tool on a remote MCP server (tools/call) and returns the structured
 * content blocks of the result. Throws an Error with a human-readable message
 * on transport/protocol failure; a tool that reports a failure is returned with
 * isError set so the caller can still display the content.
 */
export async function callTool(
  endpoint: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const session = await openSession(endpoint);

  let callRes: Response;
  try {
    callRes = await safeFetch(session.endpoint, {
      method: "POST",
      headers: session.headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Tool call timed out");
    }
    throw new Error(
      `Failed to call tool: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (!callRes.ok) {
    throw new Error(`Server rejected tools/call (HTTP ${callRes.status})`);
  }

  const callMsg = await readJsonRpcResponse(callRes, 3);
  if (callMsg.error) {
    throw new Error(`tools/call failed: ${callMsg.error.message}`);
  }

  const result = callMsg.result ?? {};
  const content: McpContentBlock[] = Array.isArray(result.content)
    ? result.content.filter((b: any) => b && typeof b.type === "string")
    : [];

  return { content, isError: result.isError === true };
}

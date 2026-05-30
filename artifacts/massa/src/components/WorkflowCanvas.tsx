import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeProps,
  type ReactFlowProps,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeType =
  | "trigger"
  | "action"
  | "condition"
  | "ai_agent"
  | "integration"
  | "delay"
  | "webhook";

export type WorkflowNode = Node & {
  data: {
    label: string;
    subtitle?: string;
    type: NodeType;
    status?: "active" | "idle" | "error";
  };
};

interface WorkflowCanvasProps {
  nodes?: WorkflowNode[];
  edges?: Edge[];
  onWorkflowChange?: (nodes: WorkflowNode[], edges: Edge[]) => void;
  onSave?: (nodes: WorkflowNode[], edges: Edge[]) => void;
  onRunNow?: () => void;
  title?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, string> = {
  trigger: "#f59e0b",
  action: "#34d399",
  condition: "#818cf8",
  ai_agent: "#06b6d4",
  integration: "#f472b6",
  delay: "#94a3b8",
  webhook: "#fb923c",
};

const NODE_ICONS: Record<NodeType, string> = {
  trigger: "⚡",
  action: "▶",
  condition: "◈",
  ai_agent: "✦",
  integration: "⬡",
  delay: "⏱",
  webhook: "⇄",
};

const NODE_LABELS: Record<NodeType, string> = {
  trigger: "Trigger",
  action: "Action",
  condition: "Condition",
  ai_agent: "AI Agent",
  integration: "Integration",
  delay: "Delay",
  webhook: "Webhook",
};

const PALETTE_ITEMS: { type: NodeType; subtitle: string }[] = [
  { type: "trigger", subtitle: "Start the loop" },
  { type: "action", subtitle: "Execute a task" },
  { type: "condition", subtitle: "Branch logic" },
  { type: "ai_agent", subtitle: "Claude / GPT" },
  { type: "integration", subtitle: "Connect an app" },
  { type: "delay", subtitle: "Wait N seconds" },
  { type: "webhook", subtitle: "HTTP endpoint" },
];

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status?: "active" | "idle" | "error" }) {
  const color =
    status === "active"
      ? "#34d399"
      : status === "error"
      ? "#f87171"
      : "#475569";
  const glow = status === "active" ? `0 0 6px ${color}` : "none";
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: glow,
        flexShrink: 0,
      }}
    />
  );
}

// ─── Custom node renderer ─────────────────────────────────────────────────────

type WorkflowNodeProps = NodeProps & { data: WorkflowNode["data"] };

function WorkflowNodeComponent({ data }: WorkflowNodeProps) {
  const color = NODE_COLORS[data.type] ?? "#94a3b8";
  const icon = NODE_ICONS[data.type] ?? "●";

  return (
    <div
      style={{
        background: "#161b27",
        border: `1.5px solid ${color}44`,
        borderRadius: 10,
        minWidth: 180,
        boxShadow: `0 0 0 1px ${color}22, 0 4px 24px #00000060`,
        position: "relative",
      }}
    >
      {/* accent bar */}
      <div style={{ height: 3, background: color, borderRadius: "8px 8px 0 0" }} />

      {/* target handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          border: "2px solid #0d1117",
          width: 12,
          height: 12,
          top: -7,
        }}
      />

      <div style={{ padding: "10px 14px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 16,
              lineHeight: 1,
              color,
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {icon}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#e2e8f0",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.label}
          </span>
          <StatusDot status={data.status} />
        </div>

        {data.subtitle && (
          <p
            style={{
              fontSize: 11,
              color: "#64748b",
              margin: 0,
              paddingLeft: 28,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.subtitle}
          </p>
        )}
      </div>

      {/* source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          border: "2px solid #0d1117",
          width: 12,
          height: 12,
          bottom: -7,
        }}
      />
    </div>
  );
}

// Stable nodeTypes map — each node type maps to the same renderer
const nodeTypes: NodeTypes = (
  [
    "trigger",
    "action",
    "condition",
    "ai_agent",
    "integration",
    "delay",
    "webhook",
  ] as NodeType[]
).reduce<NodeTypes>((acc, t) => {
  acc[t] = WorkflowNodeComponent as React.ComponentType<NodeProps>;
  return acc;
}, {});

// Concrete alias to satisfy TS — ReactFlow is generic, so we pin the types
const Flow = ReactFlow as React.ComponentType<
  ReactFlowProps<WorkflowNode, Edge>
>;

// ─── Palette item (draggable) ─────────────────────────────────────────────────

function PaletteItem({ type, subtitle }: { type: NodeType; subtitle: string }) {
  const color = NODE_COLORS[type];
  const icon = NODE_ICONS[type];
  const label = NODE_LABELS[type];

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/workflow-node-type", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 8,
        background: "#161b27",
        border: `1px solid ${color}33`,
        cursor: "grab",
        userSelect: "none",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `${color}88`;
        el.style.background = "#1e2530";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `${color}33`;
        el.style.background = "#161b27";
      }}
    >
      <span
        style={{ fontSize: 16, color, minWidth: 20, textAlign: "center" }}
      >
        {icon}
      </span>
      <div style={{ overflow: "hidden" }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 600,
            color: "#cbd5e1",
          }}
        >
          {label}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: "#475569" }}>{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  children: React.ReactNode;
  accent?: boolean;
  onClick?: () => void;
}

function ToolbarButton({ children, accent, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        border: accent ? "none" : "1px solid #1e2530",
        background: accent ? "#34d399" : "#161b27",
        color: accent ? "#0d1117" : "#94a3b8",
        fontSize: 12,
        fontWeight: accent ? 700 : 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = "1";
      }}
    >
      {children}
    </button>
  );
}

// ─── Inner canvas (needs ReactFlowProvider context) ───────────────────────────

let idCounter = 1000;
function uid(): string {
  return `node-${++idCounter}`;
}

interface InnerCanvasProps {
  initialNodes: WorkflowNode[];
  initialEdges: Edge[];
  onWorkflowChange?: (nodes: WorkflowNode[], edges: Edge[]) => void;
}

function InnerCanvas({
  initialNodes,
  initialEdges,
  onWorkflowChange,
}: InnerCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow<WorkflowNode, Edge>();

  const notify = useCallback(
    (ns: WorkflowNode[], es: Edge[]) => onWorkflowChange?.(ns, es),
    [onWorkflowChange]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const next = addEdge(
          {
            ...params,
            style: { stroke: "#34d399", strokeWidth: 2 },
            animated: true,
          },
          eds
        );
        // read latest nodes from state via functional updater pattern
        setNodes((nds) => {
          notify(nds, next);
          return nds;
        });
        return next;
      });
    },
    [setEdges, setNodes, notify]
  );

  const handleNodesChange: OnNodesChange<WorkflowNode> = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Notify parent on node/edge changes (after state settles)
  const [notifyTick, setNotifyTick] = useState(0);
  const prevNodesRef = useRef(nodes);
  const prevEdgesRef = useRef(edges);
  prevNodesRef.current = nodes;
  prevEdgesRef.current = edges;
  void notifyTick; // suppress unused warning

  const onNodeDragStop = useCallback(() => {
    setNotifyTick((t) => t + 1);
    notify(prevNodesRef.current, prevEdgesRef.current);
  }, [notify]);

  // Drop from palette
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData(
        "application/workflow-node-type"
      ) as NodeType;
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      const newNode: WorkflowNode = {
        id: uid(),
        type,
        position,
        data: {
          label: NODE_LABELS[type],
          subtitle: PALETTE_ITEMS.find((p) => p.type === type)?.subtitle,
          type,
          status: "idle",
        },
      };

      setNodes((nds) => {
        const next = [...nds, newNode];
        notify(next, prevEdgesRef.current);
        return next;
      });
    },
    [screenToFlowPosition, setNodes, notify]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div
      ref={reactFlowWrapper}
      style={{ flex: 1, position: "relative" }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <Flow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Backspace"
        style={{ background: "#0d1117" }}
        defaultEdgeOptions={{
          style: { stroke: "#34d399", strokeWidth: 2 },
          animated: true,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1e2530"
        />
        <Controls
          style={{
            background: "#161b27",
            border: "1px solid #1e2530",
            borderRadius: 8,
            overflow: "hidden",
          }}
        />
        <MiniMap
          style={{
            background: "#161b27",
            border: "1px solid #1e2530",
            borderRadius: 8,
          }}
          nodeColor={(n) => {
            const t = (n.data as WorkflowNode["data"])?.type;
            return t ? NODE_COLORS[t] : "#334155";
          }}
          maskColor="#0d111799"
        />
      </Flow>

      {/* Empty state hint */}
      {nodes.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 40, opacity: 0.2 }}>⬡</span>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#334155",
              textAlign: "center",
            }}
          >
            Drag nodes from the palette
            <br />
            or upload a diagram to auto-populate.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export function WorkflowCanvas({
  nodes: initialNodes = [],
  edges: initialEdges = [],
  onWorkflowChange,
  onSave,
  onRunNow,
  title,
}: WorkflowCanvasProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0d1117",
        color: "#e2e8f0",
        fontFamily:
          "'Inter', 'Geist', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid #1e2530",
          background: "#0d1117",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#34d399",
            marginRight: 8,
            letterSpacing: "0.05em",
          }}
        >
          MASSA
        </span>
        <span
          style={{
            fontSize: 12,
            color: "#475569",
            marginRight: "auto",
          }}
        >
          Workflow Builder
        </span>
        <ToolbarButton onClick={() => {}}>
          <span>🗓</span> Schedule
        </ToolbarButton>
        <ToolbarButton onClick={() => {}}>
          <span>▶</span> Run Now
        </ToolbarButton>
        <ToolbarButton accent onClick={() => {}}>
          <span>↑</span> Save Workflow
        </ToolbarButton>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Left palette ── */}
        <div
          style={{
            width: 196,
            flexShrink: 0,
            borderRight: "1px solid #1e2530",
            background: "#0d1117",
            overflowY: "auto",
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p
            style={{
              margin: "0 0 6px 2px",
              fontSize: 10,
              fontWeight: 700,
              color: "#475569",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Node Palette
          </p>
          {PALETTE_ITEMS.map((item) => (
            <PaletteItem key={item.type} {...item} />
          ))}
          <div
            style={{
              marginTop: "auto",
              paddingTop: 16,
              borderTop: "1px solid #1e2530",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                color: "#334155",
                lineHeight: 1.5,
              }}
            >
              Drag nodes onto the canvas to build your marketing loop.
            </p>
          </div>
        </div>

        {/* ── Canvas (wrapped in provider for useReactFlow) ── */}
        <ReactFlowProvider>
          <InnerCanvas
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            onWorkflowChange={onWorkflowChange}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

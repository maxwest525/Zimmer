import { useMemo } from 'react'
import { InlineCompanyLogo } from '@/components/CompanyLogo'

type Status = 'idle' | 'queued' | 'planning' | 'awaiting_approval' | 'running' | 'complete' | 'failed'

type Build = {
  id: string
  title: string
  summary: string
  status: Status
  progress: number
  stack: string[]
  agent: string
  agentRole?: string
  dependsOn?: string[]
}

const SKILL_COLORS: Record<string, string> = {
  'n8n': '#7a9430',
  'Lovable': '#5080b8',
  'Replit': '#5080b8',
  'Claude Code': '#5aad58',
  'APIs': '#9a8030',
  'Claude': '#2d8a32',
}

function skillColor(stack: string[]): string {
  for (const s of ['n8n', 'Lovable', 'Replit', 'Claude Code', 'APIs']) {
    if (stack.includes(s)) return SKILL_COLORS[s]
  }
  return SKILL_COLORS['Claude']
}

function primarySkill(stack: string[]): string {
  for (const s of ['n8n', 'Lovable', 'Replit', 'Claude Code', 'APIs', 'Claude']) {
    if (stack.includes(s)) return s
  }
  return stack[0] || 'Claude'
}

type NodeLayer = 'frontend' | 'backend' | 'data' | 'infra'

function classifyBuild(build: Build): NodeLayer {
  const title = build.title.toLowerCase()
  const summary = build.summary.toLowerCase()
  const combined = title + ' ' + summary
  if (combined.includes('ui') || combined.includes('dashboard') || combined.includes('homepage') || combined.includes('frontend') || combined.includes('marketing') || combined.includes('chart') || combined.includes('component')) return 'frontend'
  if (combined.includes('data') || combined.includes('database') || combined.includes('etl') || combined.includes('pipeline') || combined.includes('backtest') || combined.includes('crawler') || combined.includes('scraper') || combined.includes('aggregat')) return 'data'
  if (combined.includes('alert') || combined.includes('scheduler') || combined.includes('automation') || combined.includes('notification') || combined.includes('deploy') || combined.includes('ops')) return 'infra'
  return 'backend'
}

const LAYER_ORDER: NodeLayer[] = ['frontend', 'backend', 'data', 'infra']
const LAYER_LABELS: Record<NodeLayer, string> = {
  frontend: 'FRONTEND',
  backend: 'BACKEND',
  data: 'DATA',
  infra: 'INFRASTRUCTURE',
}

const NODE_W = 160
const NODE_H = 100
const H_GAP = 24
const V_GAP = 60
const LAYER_LABEL_W = 80

interface NodeGraphProps {
  builds: Build[]
  isDark: boolean
  colors: Record<string, string>
  onBuildClick?: (buildId: string) => void
}

interface PositionedNode {
  build: Build
  x: number
  y: number
  layer: NodeLayer
  color: string
}

export function NodeGraph({ builds, isDark, colors: c, onBuildClick }: NodeGraphProps) {
  const { nodes, edges, svgWidth, svgHeight } = useMemo(() => {
    const grouped: Record<NodeLayer, Build[]> = { frontend: [], backend: [], data: [], infra: [] }
    builds.forEach(b => {
      grouped[classifyBuild(b)].push(b)
    })

    const activeLayers = LAYER_ORDER.filter(l => grouped[l].length > 0)
    const positioned: PositionedNode[] = []
    const nodeMap: Record<string, PositionedNode> = {}

    let maxRowWidth = 0
    activeLayers.forEach(layer => {
      maxRowWidth = Math.max(maxRowWidth, grouped[layer].length)
    })

    const totalContentWidth = maxRowWidth * NODE_W + (maxRowWidth - 1) * H_GAP
    const startX = LAYER_LABEL_W + 16

    activeLayers.forEach((layer, layerIdx) => {
      const layerBuilds = grouped[layer]
      const rowWidth = layerBuilds.length * NODE_W + (layerBuilds.length - 1) * H_GAP
      const offsetX = startX + (totalContentWidth - rowWidth) / 2

      layerBuilds.forEach((build, i) => {
        const node: PositionedNode = {
          build,
          x: offsetX + i * (NODE_W + H_GAP),
          y: 20 + layerIdx * (NODE_H + V_GAP),
          layer,
          color: skillColor(build.stack),
        }
        positioned.push(node)
        nodeMap[build.id] = node
      })
    })

    const edgeList: { from: PositionedNode; to: PositionedNode }[] = []
    builds.forEach(build => {
      if (build.dependsOn) {
        build.dependsOn.forEach(depId => {
          const from = nodeMap[depId]
          const to = nodeMap[build.id]
          if (from && to) {
            edgeList.push({ from, to })
          }
        })
      }
    })

    const w = startX + totalContentWidth + 40
    const h = 20 + activeLayers.length * (NODE_H + V_GAP) - V_GAP + 40

    return { nodes: positioned, edges: edgeList, svgWidth: Math.max(w, 500), svgHeight: Math.max(h, 200), activeLayers, nodeMap }
  }, [builds])

  const statusGlow = (status: Status, color: string) => {
    if (status === 'running') return `0 0 12px ${color}44, 0 0 4px ${color}66`
    if (status === 'failed') return `0 0 8px #b8585844`
    return 'none'
  }

  const statusBorder = (status: Status, color: string) => {
    if (status === 'failed') return '#b85858'
    return color
  }

  return (
    <div style={{ width: '100%', overflow: 'auto' }}>
      <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
        {useMemo(() => {
          const activeLayers = LAYER_ORDER.filter(l => builds.some(b => classifyBuild(b) === l))
          return activeLayers.map((layer, idx) => (
            <text
              key={layer}
              x={8}
              y={20 + idx * (NODE_H + V_GAP) + NODE_H / 2 + 4}
              fill={c.muted}
              fontSize={9}
              fontWeight={700}
              letterSpacing={1}
              fontFamily="inherit"
            >
              {LAYER_LABELS[layer]}
            </text>
          ))
        }, [builds, c.muted])}

        {edges.map((edge, i) => {
          const fromCx = edge.from.x + NODE_W / 2
          const fromCy = edge.from.y + NODE_H
          const toCx = edge.to.x + NODE_W / 2
          const toCy = edge.to.y

          const midY = (fromCy + toCy) / 2
          const d = `M ${fromCx} ${fromCy} C ${fromCx} ${midY}, ${toCx} ${midY}, ${toCx} ${toCy}`

          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke={`${edge.from.color}55`}
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              <polygon
                points={`${toCx},${toCy} ${toCx - 4},${toCy - 8} ${toCx + 4},${toCy - 8}`}
                fill={`${edge.from.color}88`}
              />
            </g>
          )
        })}

        {nodes.map(node => {
          const sc = node.color
          const ps = primarySkill(node.build.stack)
          const isRunning = node.build.status === 'running'

          return (
            <foreignObject
              key={node.build.id}
              x={node.x}
              y={node.y}
              width={NODE_W}
              height={NODE_H}
            >
              <div
                onClick={() => onBuildClick?.(node.build.id)}
                style={{
                  width: NODE_W,
                  height: NODE_H,
                  border: `1px solid ${statusBorder(node.build.status, sc)}66`,
                  borderTop: `2px solid ${statusBorder(node.build.status, sc)}`,
                  background: isDark ? `${sc}0a` : `${sc}08`,
                  borderRadius: 10,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  boxShadow: statusGlow(node.build.status, sc),
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'box-shadow 0.3s',
                  boxSizing: 'border-box',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: sc, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <InlineCompanyLogo name={ps} size={10} />{ps}
                    </span>
                    <span style={{
                      fontSize: 8,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 99,
                      color: node.build.status === 'failed' ? '#b85858' : node.build.status === 'running' ? '#5aad58' : node.build.status === 'complete' ? '#5080b8' : c.muted,
                      background: node.build.status === 'failed' ? '#b858580f' : node.build.status === 'running' ? '#5aad580f' : node.build.status === 'complete' ? '#5080b80f' : '#8c8f8c0a',
                      border: `1px solid ${node.build.status === 'failed' ? '#b8585833' : node.build.status === 'running' ? '#5aad5833' : node.build.status === 'complete' ? '#5080b833' : '#8c8f8c15'}`,
                    }}>
                      {node.build.status === 'running' ? 'Building' : node.build.status === 'complete' ? 'Done' : node.build.status === 'failed' ? 'Failed' : node.build.status === 'queued' ? 'Pending' : 'Idle'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 11, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.build.title}</div>
                </div>
                <div>
                  <div style={{ height: 3, background: isDark ? '#1e1e1e' : '#ddd', borderRadius: 99, overflow: 'hidden', marginBottom: 2 }}>
                    <div style={{ width: `${node.build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ fontSize: 9, color: c.muted }}>{node.build.progress}%</div>
                </div>
              </div>
            </foreignObject>
          )
        })}

        {nodes.filter(n => n.build.status === 'running').map(node => (
          <rect
            key={`pulse-${node.build.id}`}
            x={node.x}
            y={node.y}
            width={NODE_W}
            height={NODE_H}
            rx={10}
            fill="none"
            stroke={node.color}
            strokeWidth={1.5}
            opacity={0}
          >
            <animate attributeName="opacity" values="0.4;0" dur="2s" repeatCount="indefinite" />
            <animate attributeName="strokeWidth" values="1.5;4" dur="2s" repeatCount="indefinite" />
          </rect>
        ))}
      </svg>
    </div>
  )
}

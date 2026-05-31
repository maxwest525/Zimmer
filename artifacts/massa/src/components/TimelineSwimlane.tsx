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

interface TimelineSwimlaneProps {
  builds: Build[]
  isDark: boolean
  colors: Record<string, string>
  onBuildClick?: (buildId: string) => void
}

interface Lane {
  build: Build
  startCol: number
  span: number
  lane: number
  color: string
}

export function TimelineSwimlane({ builds, isDark, colors: c, onBuildClick }: TimelineSwimlaneProps) {
  const { lanes, totalCols, totalLanes, edges } = useMemo(() => {
    const sorted = topoSort(builds)
    const laneAssignments: Lane[] = []
    const buildCols: Record<string, { start: number; end: number }> = {}
    const laneEnds: number[] = []

    sorted.forEach(build => {
      let startCol = 0
      if (build.dependsOn) {
        build.dependsOn.forEach(depId => {
          const dep = buildCols[depId]
          if (dep) startCol = Math.max(startCol, dep.end)
        })
      }

      const span = build.status === 'complete' ? 3 : build.status === 'running' ? 4 : 2
      const endCol = startCol + span

      let assignedLane = -1
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] <= startCol) {
          assignedLane = i
          laneEnds[i] = endCol
          break
        }
      }
      if (assignedLane === -1) {
        assignedLane = laneEnds.length
        laneEnds.push(endCol)
      }

      buildCols[build.id] = { start: startCol, end: endCol }
      laneAssignments.push({
        build,
        startCol,
        span,
        lane: assignedLane,
        color: skillColor(build.stack),
      })
    })

    const maxCol = Math.max(...laneAssignments.map(l => l.startCol + l.span), 1)

    const edgeList: { from: Lane; to: Lane }[] = []
    builds.forEach(build => {
      if (build.dependsOn) {
        build.dependsOn.forEach(depId => {
          const from = laneAssignments.find(l => l.build.id === depId)
          const to = laneAssignments.find(l => l.build.id === build.id)
          if (from && to) edgeList.push({ from, to })
        })
      }
    })

    return { lanes: laneAssignments, totalCols: maxCol, totalLanes: laneEnds.length, edges: edgeList }
  }, [builds])

  const BAR_H = 44
  const LANE_GAP = 10
  const COL_W = 100
  const LABEL_W = 100
  const HEADER_H = 30
  const svgWidth = LABEL_W + totalCols * COL_W + 40
  const svgHeight = HEADER_H + totalLanes * (BAR_H + LANE_GAP) + 20

  return (
    <div style={{ width: '100%', overflow: 'auto' }}>
      <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
        {Array.from({ length: totalCols + 1 }).map((_, i) => (
          <g key={`col-${i}`}>
            <line
              x1={LABEL_W + i * COL_W}
              y1={HEADER_H - 5}
              x2={LABEL_W + i * COL_W}
              y2={svgHeight}
              stroke={c.border}
              strokeWidth={1}
              opacity={0.5}
            />
            {i < totalCols && (
              <text
                x={LABEL_W + i * COL_W + COL_W / 2}
                y={HEADER_H - 10}
                fill={c.muted}
                fontSize={9}
                fontWeight={600}
                textAnchor="middle"
                fontFamily="inherit"
              >
                T{i + 1}
              </text>
            )}
          </g>
        ))}

        {edges.map((edge, i) => {
          const fromX = LABEL_W + (edge.from.startCol + edge.from.span) * COL_W
          const fromY = HEADER_H + edge.from.lane * (BAR_H + LANE_GAP) + BAR_H / 2
          const toX = LABEL_W + edge.to.startCol * COL_W
          const toY = HEADER_H + edge.to.lane * (BAR_H + LANE_GAP) + BAR_H / 2
          const midX = (fromX + toX) / 2

          const d = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`

          return (
            <g key={`edge-${i}`}>
              <path d={d} fill="none" stroke={`${edge.from.color}44`} strokeWidth={1.5} strokeDasharray="4 3" />
              <polygon
                points={`${toX},${toY} ${toX - 6},${toY - 3} ${toX - 6},${toY + 3}`}
                fill={`${edge.from.color}77`}
              />
            </g>
          )
        })}

        {lanes.map(lane => {
          const x = LABEL_W + lane.startCol * COL_W + 4
          const y = HEADER_H + lane.lane * (BAR_H + LANE_GAP)
          const w = lane.span * COL_W - 8
          const sc = lane.color
          const ps = primarySkill(lane.build.stack)

          return (
            <g key={lane.build.id}>
              <foreignObject x={0} y={y} width={LABEL_W - 4} height={BAR_H}>
                <div style={{
                  height: BAR_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lane.build.title}
                  </span>
                </div>
              </foreignObject>

              <rect
                x={x}
                y={y + 2}
                width={w}
                height={BAR_H - 4}
                rx={6}
                fill={isDark ? `${sc}15` : `${sc}10`}
                stroke={`${sc}44`}
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onClick={() => onBuildClick?.(lane.build.id)}
              />

              <rect
                x={x}
                y={y + 2}
                width={w * (lane.build.progress / 100)}
                height={BAR_H - 4}
                rx={6}
                fill={`${sc}30`}
              />

              <foreignObject x={x + 6} y={y + 2} width={w - 12} height={BAR_H - 4}>
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                  onClick={() => onBuildClick?.(lane.build.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                    <InlineCompanyLogo name={ps} size={12} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lane.build.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 8,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 99,
                      color: lane.build.status === 'failed' ? '#b85858' : lane.build.status === 'running' ? '#5aad58' : lane.build.status === 'complete' ? '#5080b8' : c.muted,
                      background: lane.build.status === 'failed' ? '#b858580f' : lane.build.status === 'running' ? '#5aad580f' : lane.build.status === 'complete' ? '#5080b80f' : '#8c8f8c0a',
                    }}>
                      {lane.build.progress}%
                    </span>
                  </div>
                </div>
              </foreignObject>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function topoSort(builds: Build[]): Build[] {
  const buildMap = new Map(builds.map(b => [b.id, b]))
  const visited = new Set<string>()
  const result: Build[] = []

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    const build = buildMap.get(id)
    if (!build) return
    if (build.dependsOn) {
      build.dependsOn.forEach(depId => visit(depId))
    }
    result.push(build)
  }

  builds.forEach(b => visit(b.id))
  return result
}

import { useEffect, useMemo, useState } from 'react'

type Status = 'idle' | 'queued' | 'running' | 'complete' | 'failed'

type Build = {
  id: string
  title: string
  summary: string
  status: Status
  progress: number
  stack: string[]
  agent: string
}

type Project = {
  id: string
  name: string
  goal: string
  status: Status
  builds: Build[]
}

export function Overview() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('trading-bot')

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'trading-bot',
      name: 'Trading Bot',
      goal: 'Automated trading bot with dashboard, risk controls, and alerts',
      status: 'running',
      builds: [
        {
          id: 'core-engine',
          title: 'Core Engine',
          summary: 'Strategy loop, execution logic, and order handling',
          status: 'running',
          progress: 58,
          stack: ['Claude', 'Claude Code', 'APIs'],
          agent: 'System Builder',
        },
        {
          id: 'risk-module',
          title: 'Risk Module',
          summary: 'Position sizing, loss limits, and safety rules',
          status: 'running',
          progress: 46,
          stack: ['Claude', 'Claude Code'],
          agent: 'Risk Agent',
        },
        {
          id: 'dashboard-ui',
          title: 'Dashboard UI',
          summary: 'Bot controls, positions, and performance views',
          status: 'queued',
          progress: 14,
          stack: ['Claude', 'Lovable'],
          agent: 'UI Agent',
        },
        {
          id: 'alerts',
          title: 'Alerts',
          summary: 'Slack, email, and critical event notifications',
          status: 'complete',
          progress: 100,
          stack: ['Claude', 'n8n', 'APIs'],
          agent: 'Ops Agent',
        },
      ],
    },
    {
      id: 'massa-site',
      name: 'Massa Marketing Site',
      goal: 'Homepage, funnel, API settings, and workflow pages',
      status: 'running',
      builds: [
        {
          id: 'homepage',
          title: 'Homepage',
          summary: 'Main marketing page and product explanation',
          status: 'running',
          progress: 71,
          stack: ['Claude', 'Lovable'],
          agent: 'UI Agent',
        },
        {
          id: 'api-settings',
          title: 'API Settings',
          summary: 'Provider cards, keys, and connection states',
          status: 'queued',
          progress: 24,
          stack: ['Claude', 'Replit'],
          agent: 'Settings Agent',
        },
      ],
    },
    {
      id: 'scraper',
      name: 'Web Scraper',
      goal: 'Source intake, parsing, and scheduled export flow',
      status: 'queued',
      builds: [
        {
          id: 'crawler',
          title: 'Crawler',
          summary: 'Fetch pipeline and retry handling',
          status: 'queued',
          progress: 12,
          stack: ['Claude', 'Claude Code'],
          agent: 'Crawler Agent',
        },
      ],
    },
  ])

  useEffect(() => {
    const timer = setInterval(() => {
      setProjects((current) =>
        current.map((project) => {
          const updatedBuilds = project.builds.map((build) => {
            if (build.status === 'running') {
              const next = Math.min(build.progress + Math.floor(Math.random() * 8), 100)
              return {
                ...build,
                progress: next,
                status: (next >= 100 ? 'complete' : 'running') as Status,
              }
            }
            return build
          })

          const firstQueuedIndex = updatedBuilds.findIndex((b) => b.status === 'queued')
          const hasRunningAfterUpdate = updatedBuilds.some((b) => b.status === 'running')

          if (!hasRunningAfterUpdate && firstQueuedIndex !== -1) {
            updatedBuilds[firstQueuedIndex] = {
              ...updatedBuilds[firstQueuedIndex],
              status: 'running',
              progress: Math.max(updatedBuilds[firstQueuedIndex].progress, 18),
            }
          }

          const overallStatus: Status = updatedBuilds.every((b) => b.status === 'complete')
            ? 'complete'
            : updatedBuilds.some((b) => b.status === 'running')
            ? 'running'
            : updatedBuilds.some((b) => b.status === 'queued')
            ? 'queued'
            : project.status

          return {
            ...project,
            status: overallStatus,
            builds: updatedBuilds,
          }
        })
      )
    }, 1800)

    return () => clearInterval(timer)
  }, [])

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0]

  const activity = useMemo(() => {
    const items = projects.flatMap((project) =>
      project.builds.map((build) => ({
        id: `${project.id}-${build.id}`,
        project: project.name,
        label:
          build.status === 'running'
            ? `Building ${build.title}`
            : build.status === 'queued'
            ? `Queued ${build.title}`
            : build.status === 'complete'
            ? `Completed ${build.title}`
            : `Idle ${build.title}`,
        agent: build.agent,
        status: build.status,
        progress: build.progress,
      }))
    )

    const order: Record<Status, number> = {
      running: 0,
      queued: 1,
      complete: 2,
      idle: 3,
      failed: 4,
    }

    return items.sort((a, b) => order[a.status] - order[b.status]).slice(0, 10)
  }, [projects])

  const flowSteps = [
    { label: 'Prompt', active: true },
    { label: 'Enhance', active: true },
    { label: 'Build', active: selectedProject.builds.some((b) => b.status !== 'idle') },
    { label: 'Deploy', active: selectedProject.builds.every((b) => b.status === 'complete') },
  ]

  const isDark = theme === 'dark'

  const colors = {
    bg: isDark ? '#060606' : '#f4f6f2',
    panel: isDark ? '#0d0d0d' : '#ffffff',
    panel2: isDark ? '#111111' : '#f8fbf6',
    border: isDark ? '#1e1e1e' : '#d8e5d7',
    text: isDark ? '#f5f5f5' : '#101410',
    muted: isDark ? '#8c8f8c' : '#556155',
    green: '#38d430',
    greenSoft: isDark ? 'rgba(56,212,48,0.14)' : 'rgba(56,212,48,0.12)',
    blackGreen: isDark ? '#0a140a' : '#eaf5e8',
  }

  const statusColor = (status: Status) => {
    if (status === 'running') return '#38d430'
    if (status === 'queued') return '#d0d45b'
    if (status === 'complete') return '#7ef57a'
    if (status === 'failed') return '#ff6b6b'
    return colors.muted
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: 'Inter, Arial, sans-serif',
        padding: 16,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: 64,
          border: `1px solid ${colors.border}`,
          background: colors.panel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: colors.green,
              color: '#081008',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Massa <span style={{ color: colors.green }}>AI</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              color: colors.text,
              border: `1px solid ${colors.border}`,
              padding: '8px 12px',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: colors.greenSoft,
              color: colors.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              border: `1px solid ${colors.border}`,
            }}
          >
            M
          </div>
        </div>
      </div>

      {/* 3-COLUMN GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr 340px',
          gap: 14,
          minHeight: 'calc(100vh - 110px)',
        }}
      >
        {/* LEFT SIDEBAR */}
        <div
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                color: colors.muted,
                marginBottom: 12,
              }}
            >
              NAVIGATION
            </div>

            {[
              'Dashboard',
              'History',
              'Automations',
              'Marketing',
              'Skills',
              'APIs',
              'Web Scraper',
            ].map((item, i) => {
              const active = i === 0
              return (
                <div
                  key={item}
                  style={{
                    padding: '12px 12px',
                    borderRadius: 10,
                    marginBottom: 8,
                    background: active ? colors.greenSoft : 'transparent',
                    color: active ? colors.green : colors.text,
                    border: active ? `1px solid ${colors.border}` : '1px solid transparent',
                    fontSize: 15,
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {item}
                </div>
              )
            })}
          </div>

          <div>
            <div
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.blackGreen,
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                Active Project
              </div>
              <div style={{ color: colors.green, fontWeight: 700 }}>
                {selectedProject.name}
              </div>
            </div>

            <div style={{ fontSize: 12, color: colors.muted }}>Secret Project</div>
            <div style={{ marginTop: 6, fontSize: 14 }}>Max and Jon</div>
          </div>
        </div>

        {/* MAIN CENTER */}
        <div
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            padding: 18,
            overflow: 'auto',
          }}
        >
          {/* FLOW STEPS */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              padding: '6px 10px',
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              background: colors.panel2,
              width: 'fit-content',
            }}
          >
            {flowSteps.map((step, index) => (
              <div
                key={step.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    border: `1px solid ${step.active ? colors.green : colors.border}`,
                    background: step.active ? colors.greenSoft : 'transparent',
                    color: step.active ? colors.green : colors.muted,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 10,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <span style={{ fontSize: 12, color: step.active ? colors.text : colors.muted }}>
                  {step.label}
                </span>
                {index < flowSteps.length - 1 && (
                  <span style={{ color: colors.border, marginLeft: 2, fontSize: 12 }}>›</span>
                )}
              </div>
            ))}
          </div>

          {/* INPUT AREA */}
          <div
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.panel2,
              borderRadius: 14,
              padding: 16,
              minHeight: 150,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: 1,
                color: colors.muted,
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              RAW INPUT
            </div>
            <div style={{ color: colors.muted, fontSize: 16 }}>
              Describe what you want to build... Be as messy as you want. Massa AI
              will turn it into the perfect prompt.
            </div>
          </div>

          {/* ACTION BAR */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
            <button
              style={{
                background: colors.green,
                color: '#081008',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Enhance
            </button>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                padding: '10px 14px',
                borderRadius: 10,
                color: colors.text,
                background: colors.panel2,
                fontSize: 13,
              }}
            >
              Recommended: Claude
            </div>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                padding: '10px 14px',
                borderRadius: 10,
                color: colors.text,
                background: colors.panel2,
                fontSize: 13,
              }}
            >
              Skill Set
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button
                style={{
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  padding: '10px 18px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Run
              </button>
            </div>
          </div>

          {/* PROJECTS HEADER */}
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                fontSize: 13,
                letterSpacing: 1.1,
                color: colors.muted,
                fontWeight: 700,
              }}
            >
              PROJECTS
            </div>
            <div style={{ fontSize: 13, color: colors.muted, cursor: 'pointer' }}>Find Project</div>
          </div>

          {/* PROJECTS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '250px 1fr',
                  gap: 14,
                  alignItems: 'start',
                }}
              >
                {/* Project card */}
                <div
                  onClick={() => setSelectedProjectId(project.id)}
                  style={{
                    border: `1px solid ${
                      selectedProjectId === project.id ? colors.green : colors.border
                    }`,
                    background: selectedProjectId === project.id ? colors.blackGreen : colors.panel2,
                    borderRadius: 14,
                    padding: 14,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{project.name}</div>
                  <div style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
                    {project.goal}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: statusColor(project.status),
                        border: `1px solid ${colors.border}`,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: colors.panel,
                      }}
                    >
                      {project.status}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: colors.muted,
                        border: `1px solid ${colors.border}`,
                        padding: '4px 8px',
                        borderRadius: 999,
                        background: colors.panel,
                      }}
                    >
                      {project.builds.length} builds
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedProject(expandedProject === project.id ? null : project.id)
                    }}
                    style={{
                      width: '100%',
                      border: `1px solid ${colors.border}`,
                      background: 'transparent',
                      color: colors.text,
                      padding: '10px 12px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {expandedProject === project.id ? 'Collapse Project' : 'Expand Project'}
                  </button>
                </div>

                {/* Build cards — horizontally scrollable */}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    overflowX: 'auto',
                    paddingBottom: 4,
                  }}
                >
                  {project.builds.map((build) => (
                    <div
                      key={build.id}
                      style={{
                        minWidth: 260,
                        maxWidth: 260,
                        border: `1px solid ${colors.border}`,
                        background: colors.panel2,
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{build.title}</div>
                        <div
                          style={{
                            fontSize: 12,
                            color: statusColor(build.status),
                            textTransform: 'capitalize',
                          }}
                        >
                          {build.status}
                        </div>
                      </div>

                      <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
                        {build.summary}
                      </div>

                      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                        Agent
                      </div>
                      <div style={{ marginBottom: 12, fontSize: 13 }}>{build.agent}</div>

                      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
                        Stack
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginBottom: 14,
                        }}
                      >
                        {build.stack.map((item) => (
                          <span
                            key={item}
                            style={{
                              fontSize: 12,
                              border: `1px solid ${colors.border}`,
                              padding: '3px 8px',
                              borderRadius: 999,
                              color: colors.muted,
                            }}
                          >
                            {item}
                          </span>
                        ))}
                      </div>

                      <div style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
                        Progress
                      </div>
                      <div
                        style={{
                          height: 10,
                          background: isDark ? '#1b1b1b' : '#dfe8de',
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            width: `${build.progress}%`,
                            height: '100%',
                            background: colors.green,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted }}>{build.progress}%</div>
                    </div>
                  ))}

                  {/* Add agent placeholder */}
                  <div
                    style={{
                      minWidth: 210,
                      border: `1px dashed ${colors.border}`,
                      borderRadius: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.muted,
                      background: colors.panel2,
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    + Add Agent
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflow: 'auto',
          }}
        >
          {/* Execution Simulation */}
          <div
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.panel2,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Execution Simulation</div>
            <div style={{ color: colors.muted, fontSize: 13, marginBottom: 14 }}>
              MASSA decides the flow and shows what is happening now.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Claude — Brain', 'n8n — Routing', 'Claude Code — Build', 'Lovable — UI'].map(
                (item, index) => (
                  <div
                    key={item}
                    style={{
                      border: `1px solid ${colors.border}`,
                      background: index < 3 ? colors.greenSoft : colors.panel,
                      color: index < 3 ? colors.text : colors.muted,
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Agent Flow */}
          <div
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.panel2,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Agent Flow</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedProject.builds.map((build) => (
                <div
                  key={build.id}
                  style={{
                    borderLeft: `3px solid ${statusColor(build.status)}`,
                    paddingLeft: 10,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{build.agent}</div>
                  <div style={{ fontSize: 12, color: colors.muted }}>{build.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.panel2,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activity.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '10px 1fr auto',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: statusColor(item.status),
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: colors.muted }}>
                      {item.project} · {item.agent}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: colors.muted }}>{item.progress}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDED PROJECT TREE MODAL */}
      {expandedProject && (
        <div
          onClick={() => setExpandedProject(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.18)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            padding: 18,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(1200px, 100%)',
              height: 360,
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: 18,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 16,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>Project Structure</div>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  Expanded project tree and build map
                </div>
              </div>
              <button
                onClick={() => setExpandedProject(null)}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  padding: '8px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
              <div
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: 14,
                  padding: 12,
                  minWidth: 220,
                  background: colors.panel2,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  {projects.find((p) => p.id === expandedProject)?.name}
                </div>
                <div style={{ color: colors.muted, fontSize: 13 }}>
                  {projects.find((p) => p.id === expandedProject)?.goal}
                </div>
              </div>

              <div style={{ fontSize: 15, lineHeight: 1.9, color: colors.text }}>
                <div>├── Backend</div>
                <div style={{ marginLeft: 24 }}>├── Core Engine</div>
                <div style={{ marginLeft: 24 }}>├── Risk Layer</div>
                <div style={{ marginLeft: 24 }}>└── Exchange / API Logic</div>
                <div>├── Interface</div>
                <div style={{ marginLeft: 24 }}>└── Dashboard UI</div>
                <div>└── Operations</div>
                <div style={{ marginLeft: 24 }}>├── Alerts</div>
                <div style={{ marginLeft: 24 }}>└── Monitoring</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

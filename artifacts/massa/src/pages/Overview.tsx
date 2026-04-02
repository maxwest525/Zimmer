import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'wouter'

type Status = 'idle' | 'queued' | 'running' | 'complete' | 'failed'

type Build = {
  id: string
  title: string
  summary: string
  status: Status
  progress: number
  stack: string[]
  agent: string
  agentRole?: string
}

type Project = {
  id: string
  name: string
  goal: string
  status: Status
  builds: Build[]
}

function StatusBadge({
  status,
  colors,
  size = 'sm',
}: {
  status: Status
  colors: Record<string, string>
  size?: 'sm' | 'lg'
}) {
  const fontSize = size === 'lg' ? 13 : 11
  const padding = size === 'lg' ? '5px 12px' : '3px 8px'

  if (status === 'running') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize,
          color: colors.green,
          background: colors.greenSoft,
          border: `1px solid ${colors.green}`,
          padding,
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: colors.green,
            display: 'inline-block',
            animation: 'pulse-green 1.4s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        Building
      </span>
    )
  }
  if (status === 'queued') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize,
          color: '#d0a838',
          background: 'rgba(208,168,56,0.12)',
          border: '1px solid rgba(208,168,56,0.35)',
          padding,
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: '#d0a838',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        Pending
      </span>
    )
  }
  if (status === 'complete') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize,
          color: '#7ef57a',
          background: 'rgba(126,245,122,0.10)',
          border: '1px solid rgba(126,245,122,0.3)',
          padding,
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        ✓ Done
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize,
          color: '#ff6b6b',
          background: 'rgba(255,107,107,0.10)',
          border: '1px solid rgba(255,107,107,0.3)',
          padding,
          borderRadius: 999,
          fontWeight: 600,
        }}
      >
        ✕ Failed
      </span>
    )
  }
  return (
    <span
      style={{
        fontSize,
        color: '#888',
        background: 'rgba(128,128,128,0.10)',
        border: '1px solid rgba(128,128,128,0.2)',
        padding,
        borderRadius: 999,
        fontWeight: 600,
      }}
    >
      Idle
    </span>
  )
}

export function Overview() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('trading-bot')
  const [, navigate] = useLocation()

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
          agentRole: 'Backend Architect',
        },
        {
          id: 'risk-module',
          title: 'Risk Module',
          summary: 'Position sizing, loss limits, and safety rules',
          status: 'running',
          progress: 46,
          stack: ['Claude', 'Claude Code'],
          agent: 'Risk Agent',
          agentRole: 'Safety Engineer',
        },
        {
          id: 'dashboard-ui',
          title: 'Dashboard UI',
          summary: 'Bot controls, positions, and performance views',
          status: 'queued',
          progress: 14,
          stack: ['Claude', 'Lovable'],
          agent: 'UI Agent',
          agentRole: 'Frontend Designer',
        },
        {
          id: 'alerts',
          title: 'Alerts',
          summary: 'Slack, email, and critical event notifications',
          status: 'complete',
          progress: 100,
          stack: ['Claude', 'n8n', 'APIs'],
          agent: 'Ops Agent',
          agentRole: 'DevOps Engineer',
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
          agentRole: 'Frontend Designer',
        },
        {
          id: 'api-settings',
          title: 'API Settings',
          summary: 'Provider cards, keys, and connection states',
          status: 'queued',
          progress: 24,
          stack: ['Claude', 'Replit'],
          agent: 'Settings Agent',
          agentRole: 'Integration Engineer',
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
          agentRole: 'Data Engineer',
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

  const expandedBuild = useMemo(() => {
    for (const project of projects) {
      const build = project.builds.find((b) => b.id === expandedBuildId)
      if (build) return { build, project }
    }
    return null
  }, [projects, expandedBuildId])

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
    if (status === 'queued') return '#d0a838'
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
      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>

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

      {/* 2-COLUMN GRID: sidebar | center */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
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
              { label: 'Dashboard', path: '/' },
              { label: 'History', path: '' },
              { label: 'Automations', path: '' },
              { label: 'Marketing', path: '' },
              { label: 'Skills', path: '' },
              { label: 'APIs', path: '' },
              { label: 'Web Scraper', path: '' },
              { label: 'Inside MASSA', path: '/inside' },
            ].map((item) => {
              const active = item.label === 'Dashboard'
              return (
                <div
                  key={item.label}
                  onClick={() => item.path && navigate(item.path)}
                  style={{
                    padding: '12px 12px',
                    borderRadius: 10,
                    marginBottom: 8,
                    background: active ? colors.greenSoft : 'transparent',
                    color: active ? colors.green : colors.text,
                    border: active ? `1px solid ${colors.border}` : '1px solid transparent',
                    fontSize: 15,
                    fontWeight: active ? 600 : 500,
                    cursor: item.path ? 'pointer' : 'default',
                  }}
                >
                  {item.label}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {projects.map((project, projectIndex) => {
              const isSelected = selectedProjectId === project.id
              return (
                <div key={project.id}>
                  {/* Row separator */}
                  {projectIndex > 0 && (
                    <div
                      style={{
                        height: 1,
                        background: colors.border,
                        margin: '18px 0',
                        opacity: 0.6,
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '240px 1fr',
                      gap: 16,
                      alignItems: 'start',
                    }}
                  >
                    {/* Project card */}
                    <div
                      onClick={() => setSelectedProjectId(project.id)}
                      style={{
                        border: `1px solid ${isSelected ? colors.green : colors.border}`,
                        background: isSelected ? colors.blackGreen : colors.panel2,
                        borderRadius: 14,
                        padding: '14px 14px 14px 0',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Green left accent bar for selected */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: 4,
                          background: isSelected ? colors.green : 'transparent',
                          borderRadius: '14px 0 0 14px',
                        }}
                      />

                      <div style={{ paddingLeft: 18 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: isSelected ? 800 : 700,
                              fontSize: isSelected ? 15 : 14,
                              color: isSelected ? colors.text : colors.text,
                            }}
                          >
                            {project.name}
                          </div>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: colors.green,
                                background: colors.greenSoft,
                                border: `1px solid ${colors.green}`,
                                padding: '2px 7px',
                                borderRadius: 999,
                                letterSpacing: 0.5,
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>

                        <div style={{ color: colors.muted, fontSize: 12, marginBottom: 12, lineHeight: 1.4 }}>
                          {project.goal}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                          <StatusBadge status={project.status} colors={colors} />
                          <span
                            style={{
                              fontSize: 11,
                              color: colors.muted,
                              border: `1px solid ${colors.border}`,
                              padding: '3px 8px',
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
                            padding: '8px 12px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          {expandedProject === project.id ? 'Collapse Project' : 'Expand Project'}
                        </button>
                      </div>
                    </div>

                    {/* Builds column */}
                    <div>
                      {/* Builds label */}
                      <div
                        style={{
                          fontSize: 11,
                          color: colors.muted,
                          fontWeight: 600,
                          letterSpacing: 0.8,
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Builds <span style={{ opacity: 0.5 }}>→</span>
                      </div>

                      {/* Build cards — horizontally scrollable */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 10,
                          overflowX: 'auto',
                          paddingBottom: 6,
                        }}
                      >
                        {project.builds.map((build) => {
                          const isRunning = build.status === 'running'
                          const isFailed = build.status === 'failed'
                          const isComplete = build.status === 'complete'

                          return (
                            <div
                              key={build.id}
                              style={{
                                minWidth: 180,
                                maxWidth: 180,
                                height: 130,
                                border: `1px solid ${isFailed ? '#ff6b6b' : colors.border}`,
                                borderLeft: isFailed
                                  ? '3px solid #ff6b6b'
                                  : isRunning
                                  ? `3px solid ${colors.green}`
                                  : `1px solid ${colors.border}`,
                                background: colors.panel2,
                                borderRadius: 12,
                                padding: '11px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                opacity: isComplete ? 0.7 : 1,
                                position: 'relative',
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              {/* Running animated dot on left edge */}
                              {isRunning && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: -2,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 8,
                                    height: 8,
                                    borderRadius: 999,
                                    background: colors.green,
                                    animation: 'pulse-green 1.4s ease-in-out infinite',
                                  }}
                                />
                              )}

                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 6,
                                    marginBottom: 7,
                                  }}
                                >
                                  <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
                                    {build.title}
                                  </div>
                                  <StatusBadge status={build.status} colors={colors} />
                                </div>

                                {/* Progress bar */}
                                <div
                                  style={{
                                    height: 4,
                                    background: isDark ? '#1b1b1b' : '#dfe8de',
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                    marginBottom: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${build.progress}%`,
                                      height: '100%',
                                      background: isComplete
                                        ? '#7ef57a'
                                        : isFailed
                                        ? '#ff6b6b'
                                        : colors.green,
                                      transition: 'width 0.6s ease',
                                    }}
                                  />
                                </div>
                                <div style={{ fontSize: 10, color: colors.muted }}>{build.progress}%</div>
                              </div>

                              <button
                                onClick={() => setExpandedBuildId(build.id)}
                                style={{
                                  width: '100%',
                                  border: `1px solid ${colors.border}`,
                                  background: 'transparent',
                                  color: colors.muted,
                                  padding: '5px 0',
                                  borderRadius: 7,
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                Expand
                              </button>
                            </div>
                          )
                        })}

                        {/* Add agent placeholder */}
                        <div
                          style={{
                            minWidth: 100,
                            height: 130,
                            border: `1px dashed ${colors.border}`,
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.muted,
                            background: colors.panel2,
                            cursor: 'pointer',
                            fontSize: 13,
                            flexShrink: 0,
                          }}
                        >
                          + Add
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
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

      {/* BUILD DETAIL MODAL */}
      {expandedBuild && (
        <div
          onClick={() => setExpandedBuildId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            padding: 18,
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(900px, 100%)',
              maxHeight: '75vh',
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              overflow: 'auto',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 22 }}>
                    {expandedBuild.build.title}
                  </div>
                  <StatusBadge status={expandedBuild.build.status} colors={colors} size="lg" />
                </div>
                <div style={{ fontSize: 13, color: colors.muted }}>
                  {expandedBuild.project.name}
                </div>
              </div>
              <button
                onClick={() => setExpandedBuildId(null)}
                style={{
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.text,
                  padding: '8px 14px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Close
              </button>
            </div>

            {/* Progress */}
            <div
              style={{
                background: colors.panel2,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  fontSize: 13,
                  color: colors.muted,
                }}
              >
                <span>Progress</span>
                <span style={{ fontWeight: 700, color: colors.text }}>
                  {expandedBuild.build.progress}%
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: isDark ? '#1b1b1b' : '#dfe8de',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${expandedBuild.build.progress}%`,
                    height: '100%',
                    background: expandedBuild.build.status === 'complete'
                      ? '#7ef57a'
                      : expandedBuild.build.status === 'failed'
                      ? '#ff6b6b'
                      : colors.green,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>

            {/* Agent + Stack */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, letterSpacing: 0.8, marginBottom: 8 }}>
                  AGENT
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                  {expandedBuild.build.agent}
                </div>
                <div style={{ fontSize: 12, color: colors.muted }}>
                  {expandedBuild.build.agentRole || 'Agent'}
                </div>
              </div>

              <div
                style={{
                  background: colors.panel2,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, letterSpacing: 0.8, marginBottom: 10 }}>
                  STACK
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {expandedBuild.build.stack.map((item) => (
                    <span
                      key={item}
                      style={{
                        fontSize: 12,
                        border: `1px solid ${colors.border}`,
                        padding: '4px 10px',
                        borderRadius: 999,
                        color: colors.text,
                        background: colors.panel,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div
              style={{
                background: colors.panel2,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, letterSpacing: 0.8, marginBottom: 10 }}>
                SUMMARY
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: colors.text }}>
                {expandedBuild.build.summary}. This build handles the core logic
                and integrates with the rest of the system through defined interfaces.
                Current progress reflects completed scaffolding and initial integration passes.
              </div>
            </div>

            {/* Activity log */}
            <div
              style={{
                background: colors.panel2,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, letterSpacing: 0.8, marginBottom: 14 }}>
                ACTIVITY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, opacity: 0.7 }}>💬</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>24 messages &amp; 12 actions</div>
                    <div style={{ fontSize: 12, color: colors.muted }}>Agent communication log</div>
                  </div>
                </div>
                <div style={{ height: 1, background: colors.border, opacity: 0.5 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, opacity: 0.7 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Checkpoint made 3 minutes ago</div>
                    <div style={{ fontSize: 12, color: colors.muted }}>Last saved state</div>
                  </div>
                </div>
                <div style={{ height: 1, background: colors.border, opacity: 0.5 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, opacity: 0.7 }}>⏱</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      Worked for {Math.round(expandedBuild.build.progress * 1.4)} seconds
                    </div>
                    <div style={{ fontSize: 12, color: colors.muted }}>Total active compute time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

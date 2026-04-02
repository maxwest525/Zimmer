import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'

type Status = 'idle' | 'queued' | 'running' | 'complete' | 'failed'
type Phase = 'thinking' | 'building' | 'deploying' | 'done' | 'queued'

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

const SKILL_COLORS: Record<string, string> = {
  'n8n': '#d0d45b',
  'Lovable': '#60a5fa',
  'Replit': '#60a5fa',
  'Claude Code': '#7ef57a',
  'APIs': '#f59e0b',
  'Claude': '#39d632',
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

function getPhase(builds: Build[]): Phase {
  if (builds.every(b => b.status === 'complete')) return 'done'
  if (!builds.some(b => b.status === 'running')) return 'queued'
  const running = builds.filter(b => b.status === 'running')
  const avg = running.reduce((s, b) => s + b.progress, 0) / running.length
  if (avg < 30) return 'thinking'
  if (avg < 75) return 'building'
  return 'deploying'
}

const PHASE_META: Record<Phase, { label: string; color: string; desc: string }> = {
  thinking: { label: 'Thinking', color: '#a78bfa', desc: 'Claude is interpreting and planning the work' },
  building: { label: 'Building', color: '#39d632', desc: 'Claude Code is executing the build' },
  deploying: { label: 'Deploying', color: '#60a5fa', desc: 'Lovable / Replit is rendering the interface' },
  done: { label: 'Complete', color: '#7ef57a', desc: 'All builds finished successfully' },
  queued: { label: 'Queued', color: '#d0a838', desc: 'Waiting to start' },
}

function StatusBadge({ status, colors, size = 'sm' }: { status: Status; colors: Record<string, string>; size?: 'sm' | 'lg' }) {
  const fs = size === 'lg' ? 13 : 11
  const pad = size === 'lg' ? '5px 12px' : '3px 8px'
  if (status === 'running') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: colors.green, background: colors.greenSoft, border: `1px solid ${colors.green}`, padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: colors.green, display: 'inline-block', animation: 'pg 1.4s ease-in-out infinite', flexShrink: 0 }} />
      Building
    </span>
  )
  if (status === 'queued') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#d0a838', background: 'rgba(208,168,56,0.12)', border: '1px solid rgba(208,168,56,0.35)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#d0a838', display: 'inline-block', flexShrink: 0 }} /> Pending
    </span>
  )
  if (status === 'complete') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#7ef57a', background: 'rgba(126,245,122,0.10)', border: '1px solid rgba(126,245,122,0.3)', padding: pad, borderRadius: 999, fontWeight: 600 }}>✓ Done</span>
  )
  if (status === 'failed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#ff6b6b', background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.3)', padding: pad, borderRadius: 999, fontWeight: 600 }}>✕ Failed</span>
  )
  return <span style={{ fontSize: fs, color: '#888', background: 'rgba(128,128,128,0.10)', border: '1px solid rgba(128,128,128,0.2)', padding: pad, borderRadius: 999, fontWeight: 600 }}>Idle</span>
}

export function Overview() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('trading-bot')
  const [draggedBuild, setDraggedBuild] = useState<{ buildId: string; projectId: string } | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [, navigate] = useLocation()

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'trading-bot',
      name: 'Trading Bot',
      goal: 'Automated trading bot with dashboard, risk controls, and alerts',
      status: 'running',
      builds: [
        { id: 'core-engine', title: 'Core Engine', summary: 'Strategy loop, execution logic, and order handling', status: 'running', progress: 58, stack: ['Claude', 'Claude Code', 'APIs'], agent: 'System Builder', agentRole: 'Backend Architect' },
        { id: 'risk-module', title: 'Risk Module', summary: 'Position sizing, loss limits, and safety rules', status: 'running', progress: 46, stack: ['Claude', 'Claude Code'], agent: 'Risk Agent', agentRole: 'Safety Engineer' },
        { id: 'dashboard-ui', title: 'Dashboard UI', summary: 'Bot controls, positions, and performance views', status: 'queued', progress: 14, stack: ['Claude', 'Lovable'], agent: 'UI Agent', agentRole: 'Frontend Designer' },
        { id: 'alerts', title: 'Alerts', summary: 'Slack, email, and critical event notifications', status: 'complete', progress: 100, stack: ['Claude', 'n8n', 'APIs'], agent: 'Ops Agent', agentRole: 'DevOps Engineer' },
        { id: 'backtester', title: 'Backtester', summary: 'Historical simulation engine and result reporter', status: 'queued', progress: 0, stack: ['Claude', 'Claude Code'], agent: 'Data Agent', agentRole: 'Data Engineer' },
      ],
    },
    {
      id: 'massa-site',
      name: 'Massa Marketing Site',
      goal: 'Homepage, funnel, API settings, and workflow pages',
      status: 'running',
      builds: [
        { id: 'homepage', title: 'Homepage', summary: 'Main marketing page and product explanation', status: 'running', progress: 71, stack: ['Claude', 'Lovable'], agent: 'UI Agent', agentRole: 'Frontend Designer' },
        { id: 'api-settings', title: 'API Settings', summary: 'Provider cards, keys, and connection states', status: 'queued', progress: 24, stack: ['Claude', 'Replit'], agent: 'Settings Agent', agentRole: 'Integration Engineer' },
      ],
    },
    {
      id: 'scraper',
      name: 'Web Scraper',
      goal: 'Source intake, parsing, and scheduled export flow',
      status: 'queued',
      builds: [
        { id: 'crawler', title: 'Crawler', summary: 'Fetch pipeline and retry handling', status: 'queued', progress: 12, stack: ['Claude', 'Claude Code'], agent: 'Crawler Agent', agentRole: 'Data Engineer' },
        { id: 'scheduler', title: 'Scheduler', summary: 'Daily export and email delivery', status: 'queued', progress: 0, stack: ['Claude', 'n8n'], agent: 'Ops Agent', agentRole: 'DevOps Engineer' },
      ],
    },
  ])

  // Live progress simulation
  useEffect(() => {
    const t = setInterval(() => {
      setProjects(cur => cur.map(project => {
        const builds = project.builds.map(b => {
          if (b.status !== 'running') return b
          const next = Math.min(b.progress + Math.floor(Math.random() * 7) + 1, 100)
          return { ...b, progress: next, status: (next >= 100 ? 'complete' : 'running') as Status }
        })
        const hasRunning = builds.some(b => b.status === 'running')
        const firstQueued = builds.findIndex(b => b.status === 'queued')
        if (!hasRunning && firstQueued !== -1) {
          builds[firstQueued] = { ...builds[firstQueued], status: 'running', progress: Math.max(builds[firstQueued].progress, 12) }
        }
        const overall: Status = builds.every(b => b.status === 'complete') ? 'complete'
          : builds.some(b => b.status === 'running') ? 'running'
          : builds.some(b => b.status === 'queued') ? 'queued'
          : project.status
        return { ...project, status: overall, builds }
      }))
    }, 1800)
    return () => clearInterval(t)
  }, [])

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0]
  const expandedBuild = useMemo(() => {
    for (const p of projects) {
      const b = p.builds.find(b => b.id === expandedBuildId)
      if (b) return { build: b, project: p }
    }
    return null
  }, [projects, expandedBuildId])

  const isDark = theme === 'dark'
  const c = {
    bg: isDark ? '#060606' : '#f4f6f2',
    panel: isDark ? '#0d0d0d' : '#ffffff',
    alt: isDark ? '#111111' : '#f8fbf6',
    border: isDark ? '#1e1e1e' : '#d8e5d7',
    text: isDark ? '#f5f5f5' : '#101410',
    muted: isDark ? '#8c8f8c' : '#556155',
    green: '#38d430',
    greenSoft: isDark ? 'rgba(56,212,48,0.14)' : 'rgba(56,212,48,0.12)',
    blackGreen: isDark ? '#0a140a' : '#eaf5e8',
  }

  const phase = getPhase(selectedProject.builds)
  const phaseMeta = PHASE_META[phase]

  // Active layers from running builds of selected project
  const activeLayers = useMemo(() => {
    const layers = new Set<string>()
    selectedProject.builds.filter(b => b.status === 'running').forEach(b => b.stack.forEach(s => layers.add(s)))
    return [...layers]
  }, [selectedProject])

  // Drag handlers
  const handleDragStart = (buildId: string, projectId: string) => setDraggedBuild({ buildId, projectId })
  const handleDragOver = (e: React.DragEvent, buildId: string) => { e.preventDefault(); setDragOverId(buildId) }
  const handleDrop = (e: React.DragEvent, targetBuildId: string, projectId: string) => {
    e.preventDefault()
    if (!draggedBuild || draggedBuild.projectId !== projectId) { setDraggedBuild(null); setDragOverId(null); return }
    setProjects(cur => cur.map(p => {
      if (p.id !== projectId) return p
      const builds = [...p.builds]
      const fromIdx = builds.findIndex(b => b.id === draggedBuild.buildId)
      const toIdx = builds.findIndex(b => b.id === targetBuildId)
      if (fromIdx === -1 || toIdx === -1) return p
      const [moved] = builds.splice(fromIdx, 1)
      builds.splice(toIdx, 0, moved)
      return { ...p, builds }
    }))
    setDraggedBuild(null)
    setDragOverId(null)
  }
  const handleDragEnd = () => { setDraggedBuild(null); setDragOverId(null) }

  const expandProject = projects.find(p => p.id === expandedProject)

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, Arial, sans-serif', padding: 16 }}>
      <style>{`
        @keyframes pg { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
        @keyframes phase-pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 99px; }
      `}</style>

      {/* HEADER */}
      <div style={{ height: 60, border: `1px solid ${c.border}`, background: c.panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: c.green, color: '#081008', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>M</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Massa <span style={{ color: c.green }}>AI</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={{ background: 'transparent', color: c.text, border: `1px solid ${c.border}`, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>{isDark ? 'Light' : 'Dark'}</button>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: c.greenSoft, color: c.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: `1px solid ${c.border}`, fontSize: 13 }}>M</div>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 300px', gap: 12, minHeight: 'calc(100vh - 96px)' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: c.muted, marginBottom: 10, fontWeight: 700 }}>NAVIGATION</div>
            {[
              { label: 'Dashboard', path: '/' },
              { label: 'History', path: '' },
              { label: 'Automations', path: '' },
              { label: 'Marketing', path: '' },
              { label: 'Skills', path: '' },
              { label: 'APIs', path: '' },
              { label: 'Web Scraper', path: '' },
              { label: 'Inside MASSA', path: '/inside' },
            ].map(item => {
              const active = item.label === 'Dashboard'
              return (
                <div key={item.label} onClick={() => item.path && navigate(item.path)} style={{ padding: '10px 11px', borderRadius: 8, marginBottom: 3, background: active ? c.greenSoft : 'transparent', color: active ? c.green : c.text, border: active ? `1px solid ${c.border}` : '1px solid transparent', fontSize: 14, fontWeight: active ? 600 : 400, cursor: item.path ? 'pointer' : 'default' }}>
                  {item.label}
                </div>
              )
            })}
          </div>
          <div>
            <div style={{ border: `1px solid ${c.border}`, background: c.blackGreen, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, color: c.muted, marginBottom: 3 }}>Active Project</div>
              <div style={{ color: c.green, fontWeight: 700, fontSize: 13 }}>{selectedProject.name}</div>
            </div>
          </div>
        </div>

        {/* CENTER MAIN */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 16, overflow: 'auto', borderRadius: 2 }}>

          {/* Input area */}
          <div style={{ border: `1px solid ${c.border}`, background: c.panel, borderRadius: 12, padding: 16, marginBottom: 12, minHeight: 130, position: 'relative' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: c.green, marginBottom: 12, fontWeight: 700 }}>RAW INPUT</div>
            <div style={{ color: isDark ? '#4a5e4a' : '#7a9878', fontSize: 15, lineHeight: 1.6 }}>Describe what you want to build... Be as messy as you want. MASSA will turn it into the right execution.</div>
            <div style={{ position: 'absolute', top: 12, right: 14, width: 6, height: 6, borderRadius: 999, background: c.green, animation: 'pg 2s ease-in-out infinite' }} />
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button style={{ background: 'transparent', color: c.green, border: `1px solid ${c.green}`, padding: '9px 18px', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Architect &amp; Build</button>
            <div style={{ border: `1px solid ${c.border}`, padding: '9px 12px', borderRadius: 9, color: c.text, background: c.alt, fontSize: 12 }}>Claude recommended</div>
            <div style={{ marginLeft: 'auto' }}>
              <button style={{ border: `1px solid ${c.green}`, background: c.greenSoft, color: c.green, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Run</button>
            </div>
          </div>

          {/* Projects header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.1, color: c.muted, fontWeight: 700 }}>PROJECTS</div>
            <div style={{ fontSize: 12, color: c.muted, cursor: 'pointer', border: `1px solid ${c.border}`, padding: '4px 10px', borderRadius: 6 }}>Find Project</div>
          </div>

          {/* Projects list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {projects.map((project, pi) => {
              const isSel = selectedProjectId === project.id
              return (
                <div key={project.id}>
                  {pi > 0 && <div style={{ height: 1, background: c.border, margin: '16px 0', opacity: 0.5 }} />}
                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, alignItems: 'start' }}>

                    {/* Project card */}
                    <div onClick={() => setSelectedProjectId(project.id)} style={{ border: `1px solid ${isSel ? c.green : c.border}`, background: isSel ? c.blackGreen : c.alt, borderRadius: 12, padding: '12px 12px 12px 0', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                      {/* Left accent */}
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: isSel ? c.green : 'transparent', borderRadius: '12px 0 0 12px' }} />
                      <div style={{ paddingLeft: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontWeight: 800, fontSize: isSel ? 14 : 13 }}>{project.name}</div>
                          {isSel && <span style={{ fontSize: 10, fontWeight: 700, color: c.green, background: c.greenSoft, border: `1px solid ${c.green}`, padding: '2px 6px', borderRadius: 999 }}>Active</span>}
                        </div>
                        <div style={{ color: c.muted, fontSize: 11, marginBottom: 10, lineHeight: 1.4 }}>{project.goal}</div>

                        {/* Mini build preview */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: c.muted, marginBottom: 5, letterSpacing: 0.8 }}>BUILDS</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {project.builds.slice(0, 3).map(b => {
                              const sc = skillColor(b.stack)
                              return (
                                <div key={b.id}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ fontSize: 10, color: c.muted }}>{b.title}</span>
                                    <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>{b.progress}%</span>
                                  </div>
                                  <div style={{ height: 3, background: isDark ? '#1e1e1e' : '#ddd', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{ width: `${b.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                                  </div>
                                </div>
                              )
                            })}
                            {project.builds.length > 3 && <div style={{ fontSize: 10, color: c.muted }}>+{project.builds.length - 3} more</div>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                          <StatusBadge status={project.status} colors={c} />
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); setExpandedProject(expandedProject === project.id ? null : project.id) }}
                          style={{ width: '100%', border: `1px solid ${c.green}`, background: isSel ? c.greenSoft : 'transparent', color: isSel ? c.green : c.muted, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          {expandedProject === project.id ? 'Close Map' : 'Architecture Map'}
                        </button>
                      </div>
                    </div>

                    {/* Builds column */}
                    <div>
                      <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 7 }}>BUILDS</div>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                        {project.builds.map((build) => {
                          const sc = skillColor(build.stack)
                          const ps = primarySkill(build.stack)
                          const isRunning = build.status === 'running'
                          const isFailed = build.status === 'failed'
                          const isComplete = build.status === 'complete'
                          const isDragging = draggedBuild?.buildId === build.id
                          const isDragOver = dragOverId === build.id && draggedBuild?.buildId !== build.id

                          return (
                            <div key={build.id} draggable onDragStart={() => handleDragStart(build.id, project.id)} onDragOver={e => handleDragOver(e, build.id)} onDrop={e => handleDrop(e, build.id, project.id)} onDragEnd={handleDragEnd}
                              style={{ minWidth: 176, maxWidth: 176, height: 148, border: `1px solid ${isDragOver ? sc : isFailed ? '#ff6b6b' : c.border}`, borderLeft: isFailed ? '3px solid #ff6b6b' : isRunning ? `3px solid ${sc}` : `1px solid ${c.border}`, background: c.alt, borderRadius: 12, padding: '11px 11px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: isDragging ? 0.4 : isComplete ? 0.75 : 1, position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: 'grab', transition: 'opacity 0.2s, border 0.2s' }}>

                              {/* Skill color top pip */}
                              <div style={{ position: 'absolute', top: 0, left: 16, width: 28, height: 2, background: sc, borderRadius: '0 0 3px 3px' }} />

                              {/* Running pulse dot */}
                              {isRunning && <div style={{ position: 'absolute', left: -2, top: '50%', transform: 'translateY(-50%)', width: 7, height: 7, borderRadius: 999, background: sc, animation: 'pg 1.4s ease-in-out infinite' }} />}

                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 5 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{build.title}</div>
                                  <span style={{ fontSize: 9, color: sc, fontWeight: 700, border: `1px solid ${sc}44`, padding: '1px 5px', borderRadius: 4, background: `${sc}15`, flexShrink: 0 }}>{ps}</span>
                                </div>
                                <StatusBadge status={build.status} colors={c} />
                              </div>

                              <div>
                                <div style={{ height: 3, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden', marginBottom: 3 }}>
                                  <div style={{ width: `${build.progress}%`, height: '100%', background: isComplete ? '#7ef57a' : isFailed ? '#ff6b6b' : sc, transition: 'width 0.6s ease' }} />
                                </div>
                                <div style={{ fontSize: 10, color: c.muted, marginBottom: 7 }}>{build.progress}%</div>
                                <button onClick={() => setExpandedBuildId(build.id)}
                                  style={{ width: '100%', border: `1px solid ${c.border}`, background: isDark ? '#181818' : '#f0f4ef', color: c.text, padding: '5px 0', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                  View Build
                                </button>
                              </div>
                            </div>
                          )
                        })}


                        {/* Add agent */}
                        <div style={{ minWidth: 90, height: 148, border: `1px dashed ${c.border}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: c.muted, background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, lineHeight: 1 }}>+</div>
                          <div style={{ fontSize: 11 }}>Add Agent</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL — System Awareness */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto', borderRadius: 2 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, color: c.muted, fontWeight: 700 }}>SYSTEM AWARENESS</div>

          {/* Current phase */}
          <div style={{ border: `1px solid ${phaseMeta.color}44`, background: isDark ? `${phaseMeta.color}0d` : `${phaseMeta.color}15`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>CURRENT PHASE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {phase !== 'done' && phase !== 'queued' && (
                <div style={{ width: 8, height: 8, borderRadius: 999, background: phaseMeta.color, animation: 'pg 1.4s ease-in-out infinite', flexShrink: 0 }} />
              )}
              <div style={{ fontSize: 18, fontWeight: 800, color: phaseMeta.color }}>{phaseMeta.label}</div>
            </div>
            <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.4 }}>{phaseMeta.desc}</div>
          </div>

          {/* Phase flow */}
          <div style={{ border: `1px solid ${c.border}`, background: c.alt, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>FLOW</div>
            {(['thinking', 'building', 'deploying', 'done'] as Phase[]).map((p, i) => {
              const pm = PHASE_META[p]
              const isActive = phase === p
              const isDone = ['thinking', 'building', 'deploying', 'done'].indexOf(phase) > i
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 999, border: `1.5px solid ${isActive || isDone ? pm.color : c.border}`, background: isDone ? pm.color : isActive ? `${pm.color}20` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isDone ? <span style={{ fontSize: 11, color: isDark ? '#0d0d0d' : '#fff', fontWeight: 800 }}>✓</span>
                      : <span style={{ fontSize: 10, color: isActive ? pm.color : c.muted, fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 400, color: isActive ? pm.color : isDone ? c.text : c.muted }}>{pm.label}</div>
                  </div>
                  {isActive && <div style={{ width: 6, height: 6, borderRadius: 999, background: pm.color, marginLeft: 'auto', animation: 'pg 1.4s ease-in-out infinite' }} />}
                </div>
              )
            })}
          </div>

          {/* Active layers */}
          <div style={{ border: `1px solid ${c.border}`, background: c.alt, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>ACTIVE LAYERS</div>
            {activeLayers.length === 0
              ? <div style={{ fontSize: 12, color: c.muted }}>No layers currently active</div>
              : activeLayers.map(layer => {
                const lc = SKILL_COLORS[layer] || c.muted
                return (
                  <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, padding: '7px 10px', border: `1px solid ${lc}44`, borderRadius: 8, background: `${lc}0d` }}>
                    <div style={{ width: 7, height: 7, borderRadius: 999, background: lc, animation: 'pg 1.4s ease-in-out infinite' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: lc }}>{layer}</span>
                    <span style={{ fontSize: 11, color: c.muted, marginLeft: 'auto' }}>
                      {layer === 'Claude' ? 'Thinking' : layer === 'Claude Code' ? 'Building' : layer === 'Lovable' || layer === 'Replit' ? 'UI' : layer === 'n8n' ? 'Routing' : 'Active'}
                    </span>
                  </div>
                )
              })}
          </div>

          {/* Live signals */}
          <div style={{ border: `1px solid ${c.border}`, background: c.alt, borderRadius: 12, padding: 12, flex: 1 }}>
            <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>LIVE SIGNALS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedProject.builds.filter(b => b.status === 'running' || b.status === 'complete').map(b => {
                const sc = skillColor(b.stack)
                return (
                  <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: b.status === 'running' ? sc : '#7ef57a', marginTop: 4, flexShrink: 0, animation: b.status === 'running' ? 'pg 1.4s ease-in-out infinite' : 'none' }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{b.title}</div>
                      <div style={{ fontSize: 11, color: c.muted }}>{b.status === 'running' ? `${b.progress}% — ${primarySkill(b.stack)}` : 'Done'}</div>
                    </div>
                  </div>
                )
              })}
              {!selectedProject.builds.some(b => b.status === 'running') && (
                <div style={{ fontSize: 12, color: c.muted }}>Waiting for builds to start</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ARCHITECTURE MAP MODAL */}
      {expandedProject && expandProject && (
        <div onClick={() => setExpandedProject(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '82vh', background: c.panel, border: `1px solid ${c.border}`, borderRadius: 18, padding: 24, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ARCHITECTURE MAP</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{expandProject.name}</div>
                <div style={{ color: c.muted, fontSize: 13 }}>{expandProject.goal}</div>
              </div>
              <button onClick={() => setExpandedProject(null)} style={{ border: `1px solid ${c.border}`, background: c.alt, color: c.text, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Close</button>
            </div>

            {/* Root node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ border: `2px solid ${c.green}`, background: c.blackGreen, borderRadius: 12, padding: '12px 20px', marginBottom: 0, textAlign: 'center', minWidth: 200 }}>
                <div style={{ fontSize: 10, color: c.green, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>PROJECT</div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{expandProject.name}</div>
              </div>

              {/* Connector */}
              <div style={{ width: 2, height: 24, background: c.border }} />

              {/* Layer groupings */}
              <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                {expandProject.builds.map((build, i) => {
                  const sc = skillColor(build.stack)
                  const ps = primarySkill(build.stack)
                  return (
                    <div key={build.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {/* Vertical line up */}
                      <div style={{ width: 2, height: 20, background: c.border }} />
                      <div style={{ border: `1px solid ${sc}66`, borderTop: `3px solid ${sc}`, background: isDark ? `${sc}0a` : `${sc}08`, borderRadius: 12, padding: 14, width: 160, cursor: 'pointer' }} onClick={() => { setExpandedBuildId(build.id); setExpandedProject(null) }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: sc, fontWeight: 700 }}>{ps}</span>
                          <StatusBadge status={build.status} colors={c} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{build.title}</div>
                        <div style={{ fontSize: 11, color: c.muted, marginBottom: 8, lineHeight: 1.4 }}>{build.summary}</div>
                        {/* Mini progress */}
                        <div style={{ height: 3, background: isDark ? '#1e1e1e' : '#ddd', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s' }} />
                        </div>
                        <div style={{ fontSize: 10, color: c.muted, marginTop: 3 }}>{build.progress}%</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {build.stack.map(s => <span key={s} style={{ fontSize: 9, border: `1px solid ${c.border}`, padding: '1px 5px', borderRadius: 4, color: SKILL_COLORS[s] || c.muted, background: c.panel }}>{s}</span>)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ marginTop: 24, borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>SKILL LEGEND</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(SKILL_COLORS).map(([skill, color]) => (
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                    <span style={{ fontSize: 12, color: c.muted }}>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUILD DETAIL MODAL */}
      {expandedBuild && (
        <div onClick={() => setExpandedBuildId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: 18, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(860px, 100%)', maxHeight: '78vh', background: c.panel, border: `1px solid ${c.border}`, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, overflow: 'auto' }}>
            {(() => {
              const sc = skillColor(expandedBuild.build.stack)
              const ps = primarySkill(expandedBuild.build.stack)
              return (
                <>
                  <div style={{ height: 3, background: sc, borderRadius: 99, marginBottom: 20, width: 60 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontWeight: 800, fontSize: 22 }}>{expandedBuild.build.title}</div>
                        <StatusBadge status={expandedBuild.build.status} colors={c} size="lg" />
                        <span style={{ fontSize: 11, color: sc, fontWeight: 700, border: `1px solid ${sc}44`, padding: '2px 7px', borderRadius: 6, background: `${sc}14` }}>{ps}</span>
                      </div>
                      <div style={{ fontSize: 13, color: c.muted }}>{expandedBuild.project.name}</div>
                    </div>
                    <button onClick={() => setExpandedBuildId(null)} style={{ border: `1px solid ${c.border}`, background: c.alt, color: c.text, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Close</button>
                  </div>

                  {/* Progress */}
                  <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: c.muted }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 700, color: c.text }}>{expandedBuild.build.progress}%</span>
                    </div>
                    <div style={{ height: 7, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${expandedBuild.build.progress}%`, height: '100%', background: expandedBuild.build.status === 'complete' ? '#7ef57a' : expandedBuild.build.status === 'failed' ? '#ff6b6b' : sc, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>

                  {/* Agent + Stack */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>AGENT</div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{expandedBuild.build.agent}</div>
                      <div style={{ fontSize: 12, color: c.muted }}>{expandedBuild.build.agentRole}</div>
                    </div>
                    <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>STACK</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {expandedBuild.build.stack.map(s => <span key={s} style={{ fontSize: 12, border: `1px solid ${(SKILL_COLORS[s] || c.border)}44`, padding: '4px 10px', borderRadius: 999, color: SKILL_COLORS[s] || c.text, background: `${SKILL_COLORS[s] || c.green}12` }}>{s}</span>)}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>SUMMARY</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>{expandedBuild.build.summary}</div>
                  </div>

                  {/* Activity */}
                  <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>ACTIVITY</div>
                    {[
                      { icon: '◎', label: '24 messages · 12 actions', sub: 'Agent communication log' },
                      { icon: '◈', label: 'Checkpoint 3 min ago', sub: 'Last saved state' },
                      { icon: '◷', label: `${Math.round(expandedBuild.build.progress * 1.4)}s compute`, sub: 'Total active time' },
                    ].map((row, i, arr) => (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 16, color: sc }}>{row.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</div>
                            <div style={{ fontSize: 12, color: c.muted }}>{row.sub}</div>
                          </div>
                        </div>
                        {i < arr.length - 1 && <div style={{ height: 1, background: c.border, opacity: 0.5, margin: '10px 0' }} />}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

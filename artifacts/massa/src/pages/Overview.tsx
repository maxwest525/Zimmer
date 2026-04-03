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
  thinking: { label: 'Thinking', color: '#7a6aad', desc: 'Claude is interpreting and planning the work' },
  building: { label: 'Building', color: '#2d8a32', desc: 'Claude Code is executing the build' },
  deploying: { label: 'Deploying', color: '#5080b8', desc: 'Lovable / Replit is rendering the interface' },
  done: { label: 'Complete', color: '#5aad58', desc: 'All builds finished successfully' },
  queued: { label: 'Queued', color: '#9a8030', desc: 'Waiting to start' },
}

function StatusBadge({ status, colors, size = 'sm' }: { status: Status; colors: Record<string, string>; size?: 'sm' | 'lg' }) {
  const fs = size === 'lg' ? 13 : 11
  const pad = size === 'lg' ? '5px 12px' : '3px 8px'
  if (status === 'running') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#ffffff', background: 'rgba(45,138,50,0.10)', border: '1px solid rgba(45,138,50,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#2d8a32', display: 'inline-block', flexShrink: 0 }} />
      Building
    </span>
  )
  if (status === 'queued') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#9a8030', background: 'rgba(154,128,48,0.10)', border: '1px solid rgba(154,128,48,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#9a8030', display: 'inline-block', flexShrink: 0 }} /> Pending
    </span>
  )
  if (status === 'complete') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#5080b8', background: 'rgba(80,128,184,0.10)', border: '1px solid rgba(80,128,184,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>✓ Done</span>
  )
  if (status === 'failed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#b85858', background: 'rgba(184,88,88,0.10)', border: '1px solid rgba(184,88,88,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>✕ Failed</span>
  )
  return <span style={{ fontSize: fs, color: '#6a6d6a', background: 'rgba(106,109,106,0.08)', border: '1px solid rgba(106,109,106,0.15)', padding: pad, borderRadius: 999, fontWeight: 600 }}>Idle</span>
}

const KEYWORDS = ['async', 'function', 'await', 'const', 'let', 'if', 'return', 'export', 'import', 'from', 'throw', 'new', 'type', 'interface']

function renderCodeLine(code: string, isDark: boolean) {
  const kw = isDark ? '#c792ea' : '#7c3aed'
  const str = isDark ? '#c3e88d' : '#166534'
  const cmt = isDark ? '#546e7a' : '#9ca3af'
  const def = isDark ? '#82aaff' : '#1e40af'
  if (code.trim().startsWith('//') || code.trim().startsWith('#')) {
    return <span style={{ color: cmt }}>{code}</span>
  }
  const tokens = code.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:async|function|await|const|let|if|return|export|import|from|throw|new|type|interface)\b)/)
  return (
    <>
      {tokens.map((t, i) => {
        if ((t.startsWith('"') || t.startsWith("'") || t.startsWith('`')) && t.length > 1) return <span key={i} style={{ color: str }}>{t}</span>
        if (KEYWORDS.includes(t)) return <span key={i} style={{ color: kw, fontWeight: 600 }}>{t}</span>
        return <span key={i} style={{ color: def }}>{t}</span>
      })}
    </>
  )
}

export function Overview() {
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('trading-bot')
  const [draggedBuild, setDraggedBuild] = useState<{ buildId: string; projectId: string } | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'row' | 'card'>('row')
  const [hoveredArchBtn, setHoveredArchBtn] = useState<string | null>(null)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [vagueMode, setVagueMode] = useState(false)
  const [showClarifyModal, setShowClarifyModal] = useState(false)
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({})
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

  const isDark = true
  const c = {
    bg: isDark ? '#060606' : '#f4f6f2',
    panel: isDark ? '#0d0d0d' : '#ffffff',
    alt: isDark ? '#111111' : '#f8fbf6',
    border: isDark ? '#1e1e1e' : '#d8e5d7',
    text: isDark ? '#f5f5f5' : '#101410',
    muted: isDark ? '#8c8f8c' : '#556155',
    green: isDark ? '#2d8a32' : '#1a7a18',
    greenSoft: isDark ? 'rgba(45,138,50,0.08)' : 'rgba(56,212,48,0.06)',
    blackGreen: isDark ? '#1a1a1a' : '#f0f0f0',
  }

  const readyBuildsCount = useMemo(
    () => selectedProject.builds.filter(b => b.status === 'queued').length,
    [selectedProject.builds]
  )

  const handleStartAll = () => {
    setProjects(cur => cur.map(p => {
      if (p.id !== selectedProjectId) return p
      const builds = p.builds.map(b =>
        b.status === 'queued' ? { ...b, status: 'running' as Status, progress: Math.max(b.progress, 5) } : b
      )
      const overall: Status = builds.every(b => b.status === 'complete') ? 'complete'
        : builds.some(b => b.status === 'running') ? 'running'
        : builds.some(b => b.status === 'queued') ? 'queued'
        : p.status
      return { ...p, builds, status: overall }
    }))
  }

  // Build activity feed
  type FeedEntry = { id: number; time: string; buildName: string; phase: Phase; agent: string; status: string }
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([])
  const [feedHovered, setFeedHovered] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const feedCounter = useRef(0)
  const projectsRef = useRef(projects)
  const feedHoveredRef = useRef(feedHovered)
  useEffect(() => { projectsRef.current = projects }, [projects])
  useEffect(() => { feedHoveredRef.current = feedHovered }, [feedHovered])

  useEffect(() => {
    const statuses = [
      'Parsing AST and extracting symbols',
      'Running type checker on module',
      'Generating boilerplate from schema',
      'Writing integration test suite',
      'Resolving dependency graph',
      'Compiling to target format',
      'Optimising bundle size',
      'Streaming output to preview',
      'Verifying API contract',
      'Staging build artefacts',
      'Linking shared utilities',
      'Deploying to ephemeral env',
      'Running smoke test suite',
      'Refreshing asset hashes',
    ]
    const tick = () => {
      const allRunning = projectsRef.current.flatMap(p => p.builds.filter(b => b.status === 'running').map(b => ({ b, p })))
      if (allRunning.length === 0) return
      const { b, p } = allRunning[Math.floor(Math.random() * allRunning.length)]
      const phaseVal = getPhase([b])
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      feedCounter.current += 1
      const entry: FeedEntry = {
        id: feedCounter.current,
        time,
        buildName: `${p.name} / ${b.title}`,
        phase: phaseVal,
        agent: b.agent,
        status: statuses[Math.floor(Math.random() * statuses.length)],
      }
      setFeedEntries(prev => [...prev.slice(-39), entry])
    }
    tick()
    const t = setInterval(tick, 1600)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!feedHovered && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [feedEntries, feedHovered])

  // Code stream
  type CodeLine = { id: number; kind: 'code' | 'qa'; content: string; file?: string; lineNo?: number; qa?: 'pass' | 'warn' }
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [flowHovered, setFlowHovered] = useState(false)
  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const sectionHeader = (label: string, key: string, extra?: React.ReactNode) => (
    <div
      onClick={() => toggleSection(key)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ fontSize: 8, color: '#ffffff', transform: collapsedSections[key] ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, color: '#ffffff' }}>{label}</span>
      {extra}
    </div>
  )
  const [codeLines, setCodeLines] = useState<CodeLine[]>([])
  const [codeHovered, setCodeHovered] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)
  const codeCounter = useRef(0)

  const CODE_POOL = [
    { file: 'src/engine/strategy.ts', line: 42, code: 'async function evaluateSignal(ctx: Context): Promise<Signal> {' },
    { file: 'src/engine/strategy.ts', line: 43, code: '  const price = await ctx.market.getLatestPrice(ctx.symbol)' },
    { file: 'src/risk/limits.ts', line: 17, code: 'if (exposure > MAX_EXPOSURE) throw new RiskError("limit exceeded")' },
    { file: 'src/api/client.ts', line: 88, code: 'const res = await fetch(`${BASE_URL}/v1/orders`, { method: "POST", body })' },
    { file: 'src/db/schema.ts', line: 5, code: 'export const orders = pgTable("orders", { id: serial("id").primaryKey(),' },
    { file: 'src/ui/Dashboard.tsx', line: 14, code: 'const { data, isLoading } = useQuery(["positions"], fetchPositions)' },
    { file: 'src/ui/Dashboard.tsx', line: 31, code: '  return <Chart series={data?.series ?? []} height={320} />' },
    { file: 'src/workers/scheduler.ts', line: 6, code: 'cron.schedule("0 9 * * 1-5", () => runDailyExport())' },
    { file: 'src/engine/backtest.ts', line: 77, code: 'const equity = positions.reduce((s, p) => s + p.unrealised, initialCapital)' },
    { file: 'src/scraper/crawler.ts', line: 23, code: 'const $ = cheerio.load(await axios.get(url).then(r => r.data))' },
    { file: 'src/notifications/slack.ts', line: 11, code: '// Send alert to #trading-alerts channel' },
    { file: 'src/notifications/slack.ts', line: 12, code: 'await slackClient.chat.postMessage({ channel, text: message })' },
    { file: 'src/engine/order.ts', line: 55, code: 'export type Order = { id: string; side: "buy" | "sell"; qty: number }' },
  ]
  const QA_POOL = [
    { qa: 'pass' as const, content: '✓ Unit test passed: strategy.evaluateSignal' },
    { qa: 'pass' as const, content: '✓ Type check: src/engine/order.ts — no errors' },
    { qa: 'pass' as const, content: '✓ Code review: logic approved by QA agent' },
    { qa: 'pass' as const, content: '✓ Lint: 0 warnings, 0 errors' },
    { qa: 'warn' as const, content: '⚠ Type mismatch on line 42 — Signal | undefined' },
    { qa: 'warn' as const, content: '⚠ Unused import: Logger in risk/limits.ts' },
    { qa: 'warn' as const, content: '⚠ Missing null check before API call on line 88' },
    { qa: 'pass' as const, content: '✓ Integration test: /v1/orders endpoint — 200 OK' },
    { qa: 'pass' as const, content: '✓ Schema migration dry-run succeeded' },
    { qa: 'warn' as const, content: '⚠ Bundle size increased by 4.2 kB — review imports' },
    { qa: 'pass' as const, content: '✓ Snapshot test: Dashboard renders correctly' },
  ]

  useEffect(() => {
    const tick = () => {
      codeCounter.current += 1
      const isQA = Math.random() < 0.3
      let entry: CodeLine
      if (isQA) {
        const q = QA_POOL[Math.floor(Math.random() * QA_POOL.length)]
        entry = { id: codeCounter.current, kind: 'qa', content: q.content, qa: q.qa }
      } else {
        const c = CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)]
        entry = { id: codeCounter.current, kind: 'code', content: c.code, file: c.file, lineNo: c.line }
      }
      setCodeLines(prev => [...prev.slice(-79), entry])
    }
    tick()
    const t = setInterval(tick, 900)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!codeHovered && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [codeLines, codeHovered])

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
        @keyframes phase-pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 99px; }
      `}</style>

      {/* HEADER */}
      <div style={{ height: 60, border: `1px solid ${c.border}`, background: c.panel, display: 'flex', alignItems: 'center', padding: '0 18px', marginBottom: 12, position: 'relative' }}>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: '#ffffff' }}>MASSA</span>
          <span style={{ background: c.green, color: '#081008', fontWeight: 800, fontSize: 20, padding: '3px 10px', borderRadius: 6 }}>AI</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: c.greenSoft, color: c.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: `1px solid ${c.border}`, fontSize: 13 }}>M</div>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: rightPanelCollapsed ? '240px 1fr 0px' : '240px 1fr 300px', gap: rightPanelCollapsed ? '12px 0px' : 12, minHeight: 'calc(100vh - 96px)', transition: 'grid-template-columns 0.3s ease, gap 0.3s ease' }}>

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

          {/* Pizza tracker — flow steps */}
          {(() => {
            const flowSteps = [
              { label: 'Prompt', active: true },
              { label: 'Enhance', active: true },
              { label: 'Build', active: selectedProject.builds.some(b => b.status !== 'idle') },
              { label: 'Deploy', active: selectedProject.builds.every(b => b.status === 'complete') },
            ]
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 30px 20px', position: 'relative' }}>
                {/* connecting line */}
                <div style={{ position: 'absolute', left: 19, right: 19, top: 18, height: 2, background: c.border, zIndex: 0 }} />
                {flowSteps.map((step, i) => (
                  <div key={step.label} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 999,
                      border: `1.5px solid ${step.active ? c.green : '#2e2e2e'}`,
                      background: '#060606',
                      color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 11, color: '#ffffff', fontWeight: step.active ? 600 : 400 }}>{step.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Input area */}
          {(() => {
            const suggestions = rawInput.trim().length > 10 ? [
              rawInput.length < 60
                ? `${rawInput.trim()} — with React frontend, Node.js backend, PostgreSQL, REST API, and deployment via Replit`
                : rawInput.trim().replace(/\.$/, '') + ', structured as modular builds with clear agent routing per layer',
              'Scope into 3 parallel builds: UI agent (Lovable), backend agent (Claude Code), and integration agent (n8n) — optimized for speed',
            ] : []

            return (
              <div style={{ border: `1px solid #2a2a2a`, background: '#0e0e0e', borderRadius: 12, padding: 16, marginBottom: 12, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.2, color: '#ffffff', fontWeight: 700 }}>Ask us for anything</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {rawInput.trim().length > 0 && <div style={{ fontSize: 10, color: c.muted }}>{rawInput.length} chars</div>}
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: c.green }} />
                  </div>
                </div>
                <textarea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder="Describe what you want to build. Be as specific or as vague as you want — MASSA will handle the rest."
                  style={{ width: '100%', minHeight: 90, background: 'transparent', border: 'none', outline: 'none', color: '#ffffff', fontSize: 14, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {suggestions.length > 0 && (
                  <div style={{ borderTop: `1px solid #1e1e1e`, marginTop: 10, paddingTop: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: c.muted, marginBottom: 6 }}>MASSA SUGGESTS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => setRawInput(s)}
                          style={{ fontSize: 11, color: '#a0a0a0', background: '#151515', border: `1px solid #252525`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', lineHeight: 1.5, transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#151515')}>
                          <span style={{ color: c.green, fontWeight: 700, marginRight: 5 }}>+</span>{s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}


          {/* Action bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            <button
              onMouseEnter={() => setHoveredArchBtn('arch-build')}
              onMouseLeave={() => setHoveredArchBtn(null)}
              onClick={() => { if (vagueMode && rawInput.trim().length > 0) setShowClarifyModal(true) }}
              style={{ background: hoveredArchBtn === 'arch-build' ? '#242424' : '#1a1a1a', color: '#ffffff', border: '1px solid #2e2e2e', padding: '9px 18px', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>Architect &amp; Build</button>
            <div
              onMouseEnter={() => setHoveredArchBtn('claude-rec')}
              onMouseLeave={() => setHoveredArchBtn(null)}
              style={{ border: '1px solid #2e2e2e', padding: '9px 12px', borderRadius: 9, color: c.text, background: hoveredArchBtn === 'claude-rec' ? '#242424' : '#1a1a1a', fontSize: 12, cursor: 'default', boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>Claude recommended</div>
            {/* Vague mode toggle */}
            <button
              onClick={() => setVagueMode(v => !v)}
              title={vagueMode ? 'Vague mode on — MASSA will ask clarifying questions' : 'Enable vague mode to get clarifying questions'}
              style={{ width: 32, height: 32, borderRadius: 999, border: vagueMode ? `1px solid ${c.green}` : '1px solid #2e2e2e', background: vagueMode ? c.greenSoft : '#1a1a1a', color: vagueMode ? c.green : c.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>?</button>
            <div style={{ marginLeft: 'auto' }}>
              <button
                onMouseEnter={() => setHoveredArchBtn('run')}
                onMouseLeave={() => setHoveredArchBtn(null)}
                style={{ border: '1px solid #2e2e2e', background: hoveredArchBtn === 'run' ? '#242424' : '#1a1a1a', color: '#ffffff', padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>Run</button>
            </div>
          </div>

          {/* Projects header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.1, color: c.muted, fontWeight: 700 }}>PROJECTS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* View mode toggles */}
              <div style={{ display: 'flex', border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('row')}
                  title="Row view"
                  aria-label="Row view"
                  aria-pressed={viewMode === 'row'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 26, border: 'none', cursor: 'pointer', background: viewMode === 'row' ? c.greenSoft : 'transparent', color: viewMode === 'row' ? c.green : c.muted, borderRight: `1px solid ${c.border}`, transition: 'background 0.15s, color 0.15s' }}>
                  {/* Row icon: three horizontal lines */}
                  <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                    <rect x="0" y="0" width="13" height="3" rx="1" fill="currentColor" />
                    <rect x="0" y="4" width="13" height="3" rx="1" fill="currentColor" />
                    <rect x="0" y="8" width="13" height="3" rx="1" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  title="Card view"
                  aria-label="Card view"
                  aria-pressed={viewMode === 'card'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 26, border: 'none', cursor: 'pointer', background: viewMode === 'card' ? c.greenSoft : 'transparent', color: viewMode === 'card' ? c.green : c.muted, transition: 'background 0.15s, color 0.15s' }}>
                  {/* Grid icon: 2x2 squares */}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="0" y="0" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="7" y="0" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="0" y="7" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="7" y="7" width="5" height="5" rx="1" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#ffffff', cursor: 'pointer', border: `1px solid ${c.border}`, padding: '4px 10px', borderRadius: 6 }}>Find Project</div>
            </div>
          </div>

          {/* Projects list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {projects.map((project, pi) => {
              const isSel = selectedProjectId === project.id

              /* Shared build cards renderer: column=true → vertical stack (card view), column=false → horizontal scroll (row view) */
              const buildCards = (column: boolean, wrap = false) => (
                <div style={{ display: 'flex', flexDirection: column ? 'column' : 'row', gap: 10, ...(column ? {} : wrap ? { flexWrap: 'wrap' } : { overflowX: 'auto', paddingBottom: 6 }) }}>
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
                        style={{ ...(column ? { width: '100%' } : { minWidth: 176, maxWidth: 176, flexShrink: 0 }), border: `1px solid ${isDragOver ? sc : isFailed ? '#ff6b6b' : c.border}`, borderLeft: isFailed ? '1px solid #ff6b6b' : isRunning ? `1px solid ${sc}` : `1px solid ${c.border}`, background: c.alt, borderRadius: 12, padding: '11px 11px', display: 'flex', flexDirection: column ? 'row' : 'column', justifyContent: 'space-between', alignItems: column ? 'center' : undefined, opacity: isDragging ? 0.4 : isComplete ? 0.75 : 1, position: 'relative', overflow: 'hidden', cursor: 'grab', transition: 'opacity 0.2s, border 0.2s' }}>

                        {/* Skill color left pip (column) / top pip (row) */}
                        {column
                          ? <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: sc, borderRadius: '12px 0 0 12px' }} />
                          : <div style={{ position: 'absolute', top: 0, left: 16, width: 28, height: 2, background: sc, borderRadius: '0 0 3px 3px' }} />
                        }

                        {/* Title + skill badge + status */}
                        <div style={{ flex: column ? 1 : undefined, paddingLeft: column ? 8 : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 5 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{build.title}</div>
                            <span style={{ fontSize: 9, color: '#ffffff', fontWeight: 700, border: `1px solid ${sc}99`, padding: '1px 5px', borderRadius: 4, background: `${sc}12`, flexShrink: 0 }}>{ps}</span>
                          </div>
                          <StatusBadge status={build.status} colors={c} />
                        </div>

                        {/* Progress + actions */}
                        <div style={{ ...(column ? { display: 'flex', alignItems: 'center', gap: 12, minWidth: 180 } : {}) }}>
                          {!column && (
                            <>
                              <div style={{ height: 3, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden', marginBottom: 3 }}>
                                <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                              </div>
                              <div style={{ fontSize: 10, color: c.muted, marginBottom: 7 }}>{build.progress}%</div>
                            </>
                          )}
                          {column && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 80, height: 4, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                              </div>
                              <span style={{ fontSize: 10, color: c.muted, minWidth: 28 }}>{build.progress}%</span>
                            </div>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setExpandedBuildId(build.id) }}
                            style={{ ...(column ? {} : { width: '100%' }), border: `1px solid ${c.border}`, background: isDark ? '#181818' : '#f0f4ef', color: c.text, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            View Build
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add agent */}
                  <div style={{ ...(column ? { width: '100%', height: 40, flexDirection: 'row', justifyContent: 'center' } : { minWidth: 90, height: 148, flexDirection: 'column', flexShrink: 0 }), border: `1px dashed ${c.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: c.muted, background: 'transparent', cursor: 'pointer' }}>
                    <div style={{ fontSize: 16, lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 11 }}>Add Agent</div>
                  </div>
                </div>
              )

              return (
                <div key={project.id}>
                  {pi > 0 && <div style={{ height: 2, background: c.border, margin: '12px 0' }} />}

                  {viewMode === 'row' ? (
                    /* ── ROW VIEW (default) ── */
                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, alignItems: 'start' }}>

                      {/* Project info panel */}
                      <div onClick={() => setSelectedProjectId(project.id)} style={{ background: isSel ? c.blackGreen : 'transparent', borderRadius: 8, padding: '12px 12px 12px 0', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 1, background: isSel ? `${c.green}88` : 'transparent', borderRadius: '8px 0 0 8px' }} />
                        <div style={{ paddingLeft: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.1, color: '#ffffff' }}>{project.name}</div>
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
                            onMouseEnter={() => setHoveredArchBtn(project.id)}
                            onMouseLeave={() => setHoveredArchBtn(null)}
                            style={{ width: '100%', border: `1px solid #2e2e2e`, background: hoveredArchBtn === project.id ? '#242424' : '#1a1a1a', color: '#ffffff', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>
                            {expandedProject === project.id ? 'Close Map' : 'Architecture Map'}
                          </button>
                        </div>
                      </div>

                      {/* Builds strip (horizontal scroll) */}
                      <div>
                        <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 7 }}>BUILDS</div>
                        {buildCards(false)}
                      </div>
                    </div>
                  ) : (
                    /* ── CARD VIEW ── */
                    <div onClick={() => setSelectedProjectId(project.id)}
                      style={{ border: `1px solid ${isSel ? c.green : c.border}`, borderRadius: 12, padding: 16, cursor: 'pointer', background: isSel ? c.blackGreen : c.alt, position: 'relative', overflow: 'hidden' }}>
                      {/* Left accent */}
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: isSel ? c.green : 'transparent', borderRadius: '12px 0 0 12px' }} />

                      {/* Card header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.1, color: '#ffffff' }}>{project.name}</div>
                          <StatusBadge status={project.status} colors={c} />
                          {isSel && <span style={{ fontSize: 10, fontWeight: 700, color: c.green, background: c.greenSoft, border: `1px solid ${c.green}`, padding: '2px 6px', borderRadius: 999 }}>Active</span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setExpandedProject(expandedProject === project.id ? null : project.id) }}
                          onMouseEnter={() => setHoveredArchBtn(project.id + '-card')}
                          onMouseLeave={() => setHoveredArchBtn(null)}
                          style={{ border: `1px solid #2e2e2e`, background: hoveredArchBtn === project.id + '-card' ? '#242424' : '#1a1a1a', color: '#ffffff', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>
                          {expandedProject === project.id ? 'Close Map' : 'Architecture Map'}
                        </button>
                      </div>

                      <div style={{ color: c.muted, fontSize: 11, marginBottom: 14, lineHeight: 1.4 }}>{project.goal}</div>

                      {/* Build cards — wrapping grid */}
                      <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>BUILDS</div>
                      {buildCards(false, true)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL — Live Feed */}
        {rightPanelCollapsed && (
          <button
            onClick={() => setRightPanelCollapsed(false)}
            style={{
              position: 'fixed',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
              background: c.panel,
              border: `1px solid ${c.border}`,
              borderRight: 'none',
              borderRadius: '8px 0 0 8px',
              padding: '16px 8px',
              cursor: 'pointer',
              color: c.text,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'color 0.15s, border-color 0.15s',
              letterSpacing: 1,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = c.green; e.currentTarget.style.borderColor = c.green }}
            onMouseLeave={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.border }}
            title="Show right panel"
          >
            <span style={{ fontSize: 14, writingMode: 'horizontal-tb' }}>‹</span>
            <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>FEED</span>
          </button>
        )}
        <div style={{
          border: rightPanelCollapsed ? 'none' : `1px solid ${c.border}`,
          background: rightPanelCollapsed ? 'transparent' : c.panel,
          padding: rightPanelCollapsed ? 0 : 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflow: 'hidden',
          borderRadius: 2,
          position: 'relative',
          opacity: rightPanelCollapsed ? 0 : 1,
          transition: 'opacity 0.3s ease, padding 0.3s ease',
          pointerEvents: rightPanelCollapsed ? 'none' : 'auto',
        }}>
          <button
            onClick={() => setRightPanelCollapsed(true)}
            style={{
              background: c.alt,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              color: c.text,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              lineHeight: 1,
              transition: 'color 0.15s, background 0.15s, border-color 0.15s',
              alignSelf: 'flex-end',
              marginBottom: -4,
              letterSpacing: 0.5,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.green; e.currentTarget.style.color = c.green }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.text }}
            title="Collapse right panel"
          >
            HIDE <span style={{ fontSize: 14 }}>›</span>
          </button>

          {/* Ready Builds KPI */}
          <div style={{ border: `1px solid ${c.border}`, background: c.alt, borderRadius: 12, padding: 12 }}>
            {sectionHeader('READY BUILDS', 'readyBuilds')}
            {!collapsedSections.readyBuilds && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: readyBuildsCount > 0 ? '#9a8030' : c.text, lineHeight: 1 }}>{readyBuildsCount}</span>
                    <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 500 }}>queued</span>
                  </div>
                </div>
                <button
                  onClick={handleStartAll}
                  disabled={readyBuildsCount === 0}
                  style={{
                    background: readyBuildsCount > 0 ? '#1a1a1a' : (isDark ? '#1e1e1e' : '#e8e8e8'),
                    color: readyBuildsCount > 0 ? '#9a8030' : c.muted,
                    border: `1px solid ${readyBuildsCount > 0 ? '#9a803044' : c.border}`,
                    borderRadius: 8,
                    padding: '7px 13px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: readyBuildsCount > 0 ? 'pointer' : 'default',
                    letterSpacing: 0.3,
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Start All
                </button>
              </div>
            )}
          </div>

          {/* FLOW Metrics Panel */}
          {(() => {
            const allBuilds = projects.flatMap(p => p.builds)
            const totalProjects = projects.length
            const runningBuilds = allBuilds.filter(b => b.status === 'running').length
            const completedBuilds = allBuilds.filter(b => b.status === 'complete').length
            const queuedBuilds = allBuilds.filter(b => b.status === 'queued').length
            const failedBuilds = allBuilds.filter(b => b.status === 'failed').length

            const kpis: { label: string; value: number; color: string; bg: string }[] = [
              { label: 'Total Projects', value: totalProjects, color: c.text, bg: c.alt },
              { label: 'Running', value: runningBuilds, color: '#2d8a32', bg: c.greenSoft },
              { label: 'Completed', value: completedBuilds, color: '#5080b8', bg: 'rgba(80,128,184,0.06)' },
              { label: 'Queued', value: queuedBuilds, color: '#9a8030', bg: 'rgba(154,128,48,0.06)' },
              { label: 'Failed', value: failedBuilds, color: '#b85858', bg: 'rgba(184,88,88,0.06)' },
            ]

            return (
              <div>
                {sectionHeader('FLOW', 'flow')}
                {!collapsedSections.flow && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      onMouseEnter={() => setFlowHovered(true)}
                      onMouseLeave={() => setFlowHovered(false)}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}
                    >
                      {kpis.map(kpi => (
                        <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: '#ffffff', marginBottom: 3 }}>{kpi.label.toUpperCase()}</div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden', maxHeight: flowHovered ? 500 : 0, opacity: flowHovered ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.25s ease' }}>
                      {projects.map(p => {
                        const running = p.builds.filter(b => b.status === 'running').length
                        const done = p.builds.filter(b => b.status === 'complete').length
                        const queued = p.builds.filter(b => b.status === 'queued').length
                        const failed = p.builds.filter(b => b.status === 'failed').length
                        const parts: string[] = []
                        if (running > 0) parts.push(`${running} running`)
                        if (done > 0) parts.push(`${done} done`)
                        if (queued > 0) parts.push(`${queued} queued`)
                        if (failed > 0) parts.push(`${failed} failed`)
                        return (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: c.alt, borderRadius: 7, border: `1px solid ${c.border}` }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>{p.name}</span>
                            <span style={{ fontSize: 10, color: c.muted, flexShrink: 0 }}>{parts.join(', ') || 'no builds'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Build Activity Feed */}
          <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: collapsedSections.buildActivity ? 'none' : `1px solid ${c.border}` }}>
              {sectionHeader('BUILD ACTIVITY', 'buildActivity')}
            </div>
            {!collapsedSections.buildActivity && (
              <div
                ref={feedRef}
                onMouseEnter={() => setFeedHovered(true)}
                onMouseLeave={() => setFeedHovered(false)}
                style={{ position: 'relative', height: 210, overflowY: 'auto', scrollBehavior: 'smooth', padding: '8px 0 4px' }}
              >
                <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: 28, background: `linear-gradient(to bottom, ${isDark ? '#0d0d0d' : '#ffffff'} 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 1 }} />
                {feedEntries.map(entry => {
                  const pm = PHASE_META[entry.phase]
                  return (
                    <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 12px', borderBottom: `1px solid ${c.border}33` }}>
                      <span style={{ fontSize: 10, color: c.muted, fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginTop: 1 }}>{entry.time}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: pm.color, background: `${pm.color}18`, border: `1px solid ${pm.color}44`, padding: '1px 6px', borderRadius: 999, flexShrink: 0, alignSelf: 'center' }}>{pm.label}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.buildName}</div>
                        <div style={{ fontSize: 10, color: c.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.agent} — {entry.status}</div>
                      </div>
                    </div>
                  )
                })}
                {feedEntries.length === 0 && (
                  <div style={{ padding: '12px', fontSize: 12, color: c.muted }}>Waiting for activity…</div>
                )}
              </div>
            )}
          </div>

          {/* Code Stream */}
          <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, display: 'flex', flexDirection: 'column', flex: collapsedSections.codeStream ? 'none' : 1, minHeight: 0 }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: collapsedSections.codeStream ? 'none' : `1px solid ${c.border}` }}>
              {sectionHeader('CODE STREAM', 'codeStream', <span style={{ width: 6, height: 6, borderRadius: 999, background: '#2d8a32', display: 'inline-block' }} />)}
            </div>
            {!collapsedSections.codeStream && (
              <div
                ref={codeRef}
                onMouseEnter={() => setCodeHovered(true)}
                onMouseLeave={() => setCodeHovered(false)}
                style={{ flex: 1, overflowY: 'auto', background: isDark ? '#1a1a1a' : '#f0f0f0', padding: '8px 0 4px', fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', fontSize: 11, scrollBehavior: 'smooth', minHeight: 0 }}
              >
                <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: 28, background: `linear-gradient(to bottom, ${isDark ? '#1a1a1a' : '#f0f0f0'} 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 1 }} />
                {codeLines.map(line => {
                  if (line.kind === 'qa') {
                    const isPass = line.qa === 'pass'
                    return (
                      <div key={line.id} style={{ padding: '3px 12px', color: isPass ? '#5aad58' : '#b8801a', lineHeight: 1.5 }}>
                        {line.content}
                      </div>
                    )
                  }
                  return (
                    <div key={line.id} style={{ padding: '2px 12px', lineHeight: 1.5 }}>
                      <span style={{ color: isDark ? '#555' : '#aaa' }}>{line.file}:{line.lineNo} </span>
                      {renderCodeLine(line.content, isDark)}
                    </div>
                  )
                })}
              </div>
            )}
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
              <button onClick={() => setExpandedProject(null)} style={{ border: `1px solid rgba(255,255,255,0.35)`, background: c.alt, color: c.text, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Close</button>
            </div>

            {/* Root node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ border: `1px solid ${c.green}`, background: c.blackGreen, borderRadius: 12, padding: '12px 20px', marginBottom: 0, textAlign: 'center', minWidth: 200 }}>
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
                      <div style={{ border: `1px solid ${sc}66`, borderTop: `1px solid ${sc}`, background: isDark ? `${sc}0a` : `${sc}08`, borderRadius: 12, padding: 14, width: 160, cursor: 'pointer' }} onClick={() => { setExpandedBuildId(build.id); setExpandedProject(null) }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 700 }}>{ps}</span>
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
                          {build.stack.map(s => <span key={s} style={{ fontSize: 9, border: `1px solid ${(SKILL_COLORS[s] || c.border)}44`, padding: '1px 5px', borderRadius: 4, color: '#ffffff', background: SKILL_COLORS[s] || c.green }}>{s}</span>)}
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
                        <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 700, border: `1px solid ${sc}44`, padding: '2px 7px', borderRadius: 6, background: `${sc}14` }}>{ps}</span>
                      </div>
                      <div style={{ fontSize: 13, color: c.muted }}>{expandedBuild.project.name}</div>
                    </div>
                    <button onClick={() => setExpandedBuildId(null)} style={{ border: `1px solid rgba(255,255,255,0.35)`, background: c.alt, color: c.text, padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Close</button>
                  </div>

                  {/* Progress */}
                  <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: c.muted }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 700, color: c.text }}>{expandedBuild.build.progress}%</span>
                    </div>
                    <div style={{ height: 7, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${expandedBuild.build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
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
                        {expandedBuild.build.stack.map(s => <span key={s} style={{ fontSize: 12, border: `1px solid ${(SKILL_COLORS[s] || c.border)}44`, padding: '4px 10px', borderRadius: 999, color: '#ffffff', background: SKILL_COLORS[s] || c.green }}>{s}</span>)}
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

      {/* Clarify Modal */}
      {showClarifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowClarifyModal(false) }}>
          <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Let's refine your build</div>
                <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.5 }}>Answer a few quick questions so MASSA can build exactly what you need.</div>
              </div>
              <button onClick={() => setShowClarifyModal(false)} style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            {/* Original input preview */}
            <div style={{ background: '#151515', border: '1px solid #222', borderRadius: 8, padding: '8px 12px', marginBottom: 20, marginTop: 14 }}>
              <div style={{ fontSize: 9, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>YOUR INPUT</div>
              <div style={{ fontSize: 12, color: '#b0b0b0', lineHeight: 1.5 }}>{rawInput}</div>
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { id: 'goal', label: "What's the main goal? What problem does this solve?", placeholder: 'e.g. Help our sales team track leads without switching tools' },
                { id: 'user', label: 'Who is the end user — internal team, customers, or just you?', placeholder: 'e.g. Internal ops team of 5 people' },
                { id: 'backend', label: 'Do you need a backend, database, or external integrations?', placeholder: 'e.g. Yes — needs Stripe, a database, and Slack notifications' },
                { id: 'existing', label: 'Any existing systems, APIs, or codebases this connects to?', placeholder: 'e.g. Our existing CRM API at api.ourcompany.com' },
                { id: 'constraints', label: 'Any timeline or hard constraints we should know about?', placeholder: 'e.g. Need an MVP in 2 weeks, no budget for paid APIs' },
              ].map(q => (
                <div key={q.id}>
                  <div style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 600, marginBottom: 6 }}>{q.label}</div>
                  <textarea
                    value={clarifyAnswers[q.id] || ''}
                    onChange={e => setClarifyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    rows={2}
                    style={{ width: '100%', background: '#151515', border: '1px solid #272727', borderRadius: 8, padding: '8px 10px', color: '#ffffff', fontSize: 12, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setShowClarifyModal(false)}
                style={{ flex: 1, background: c.green, color: '#081008', border: 'none', borderRadius: 9, padding: '10px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Build with answers
              </button>
              <button
                onClick={() => setShowClarifyModal(false)}
                style={{ background: '#1a1a1a', color: c.muted, border: '1px solid #2e2e2e', borderRadius: 9, padding: '10px 16px', fontSize: 12, cursor: 'pointer' }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

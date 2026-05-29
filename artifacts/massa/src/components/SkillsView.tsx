import { useState, useEffect, useCallback } from 'react'

type TrendingRepo = {
  id: number
  name: string
  fullName: string
  owner: string
  description: string
  stars: number
  language: string | null
  url: string
  pushedAt: string
  topics: string[]
}

const c = {
  bg: '#0a0d10',
  panel: '#080a0e',
  panelAlt: '#0c0f14',
  border: '#252a35',
  borderDim: '#1e2330',
  text: '#e8eaed',
  muted: '#9ca3af',
  dim: '#6b7280',
  green: '#34d399',
  blue: '#60a5fa',
  amber: '#f59e0b',
  font: '"JetBrains Mono", Menlo, monospace',
}

const apiBase = '/api'

type Platform = {
  id: string
  name: string
  docLabel: string
  url: string
}

// Platforms / LLMs that consume "skills" (rules, prompts, instructions) and
// their official docs for authoring the ideal skill and uploading it.
const PLATFORMS: Platform[] = [
  { id: 'claude', name: 'Claude (Anthropic)', docLabel: 'agent skills documentation', url: 'https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview' },
  { id: 'replit', name: 'Replit Agent', docLabel: 'agent guide documentation', url: 'https://docs.replit.com/replitai/agent' },
  { id: 'cursor', name: 'Cursor', docLabel: 'rules documentation', url: 'https://docs.cursor.com/context/rules' },
  { id: 'lovable', name: 'Lovable', docLabel: 'prompt documentation', url: 'https://docs.lovable.dev/tips-tricks/prompting' },
  { id: 'windsurf', name: 'Windsurf', docLabel: 'rules & memories documentation', url: 'https://docs.windsurf.com/windsurf/cascade/memories' },
  { id: 'copilot', name: 'GitHub Copilot', docLabel: 'custom instructions documentation', url: 'https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot' },
  { id: 'v0', name: 'v0 (Vercel)', docLabel: 'documentation', url: 'https://v0.dev/docs' },
  { id: 'bolt', name: 'Bolt.new', docLabel: 'prompting documentation', url: 'https://support.bolt.new/' },
  { id: 'cline', name: 'Cline', docLabel: 'custom instructions documentation', url: 'https://docs.cline.bot/features/cline-rules' },
  { id: 'openai', name: 'OpenAI (ChatGPT / GPTs)', docLabel: 'prompt engineering documentation', url: 'https://platform.openai.com/docs/guides/prompt-engineering' },
  { id: 'gemini', name: 'Google Gemini', docLabel: 'prompting documentation', url: 'https://ai.google.dev/gemini-api/docs/prompting-strategies' },
  { id: 'aider', name: 'Aider', docLabel: 'conventions documentation', url: 'https://aider.chat/docs/usage/conventions.html' },
  { id: 'continue', name: 'Continue', docLabel: 'rules documentation', url: 'https://docs.continue.dev/customize/deep-dives/rules' },
  { id: 'devin', name: 'Devin', docLabel: 'knowledge documentation', url: 'https://docs.devin.ai/product-guides/knowledge-onboarding' },
]

type HfxSkill = {
  slug: string
  name: string
  description: string
  htmlUrl: string
}

type HfxAgent = {
  id: string
  name: string
  description?: string
  model?: string | null
  toolkits?: string[]
  is_default?: boolean
}

type DeployedAgent = {
  skillSlug: string
  skillName: string
  agentId: string
}

type RunResult = {
  status?: string
  result?: string
  threadId?: string
  agentName?: string
  error?: string
}

const ROSTER_KEY = 'massa.hfx.roster.v1'

function loadRoster(): DeployedAgent[] {
  try {
    const raw = localStorage.getItem(ROSTER_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const HFX_REPO_URL = 'https://github.com/hyperfx-ai/marketing-skills'

const HFX_IMPORT_STEPS: string[] = [
  'Open the Files page in Hyper, then the Skills tab',
  'Click Import skill',
  `Paste the repo URL: ${HFX_REPO_URL}`,
  'Review the skills, then Save',
]

const HFX_INSTALL: { label: string; cmd: string }[] = [
  { label: 'install all 19 skills', cmd: 'npx skills add hyperfx-ai/marketing-skills --all' },
  { label: 'install one skill', cmd: 'npx skills add hyperfx-ai/marketing-skills --skill google-ads' },
  { label: 'install globally', cmd: 'npx skills add hyperfx-ai/marketing-skills -s seo-research -g' },
  { label: 'claude code plugin', cmd: '/plugin marketplace add hyperfx-ai/marketing-skills' },
  { label: 'git submodule', cmd: 'git submodule add https://github.com/hyperfx-ai/marketing-skills.git .agents/marketing-skills' },
]

export function SkillsView({ onBack }: { onBack: () => void }) {
  const [repos, setRepos] = useState<TrendingRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [since, setSince] = useState('')

  const [hfx, setHfx] = useState<HfxSkill[]>([])
  const [hfxLoading, setHfxLoading] = useState(true)
  const [hfxError, setHfxError] = useState<string | null>(null)
  const [hfxRepoUrl, setHfxRepoUrl] = useState('https://github.com/hyperfx-ai/marketing-skills')
  const [hfxSelected, setHfxSelected] = useState<HfxSkill | null>(null)
  const [hfxFileLoading, setHfxFileLoading] = useState(false)
  const [hfxFileError, setHfxFileError] = useState<string | null>(null)
  const [hfxFileContent, setHfxFileContent] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const [agents, setAgents] = useState<HfxAgent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [roster, setRoster] = useState<DeployedAgent[]>(() => loadRoster())
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, RunResult>>({})

  const [platformId, setPlatformId] = useState<string>(PLATFORMS[0].id)
  const platform = PLATFORMS.find(p => p.id === platformId) ?? PLATFORMS[0]

  const [selected, setSelected] = useState<TrendingRepo | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [filePath, setFilePath] = useState('')
  const [fileHtmlUrl, setFileHtmlUrl] = useState('')

  const fetchTrending = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/skills/trending`)
      if (res.status === 429) {
        setError('GitHub rate limit hit. Results are cached for 10 min — try again shortly.')
        return
      }
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setRepos(data.repos || [])
      setSince(data.since || '')
    } catch {
      setError('Could not reach GitHub. Rate limit or network issue — try again shortly.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrending()
  }, [fetchTrending])

  const pullSkillFile = useCallback(async (repo: TrendingRepo) => {
    setSelected(repo)
    setFileLoading(true)
    setFileError(null)
    setFileContent('')
    setFilePath('')
    setFileHtmlUrl('')
    try {
      const res = await fetch(`${apiBase}/skills/file?owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.name)}`)
      if (res.status === 404) {
        setFileError('No SKILL.md / AGENTS.md / README found in this repo.')
        return
      }
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setFileContent(data.content || '')
      setFilePath(data.path || '')
      setFileHtmlUrl(data.htmlUrl || '')
    } catch {
      setFileError('Could not pull the skill file. Try again shortly.')
    } finally {
      setFileLoading(false)
    }
  }, [])

  const fetchHfx = useCallback(async () => {
    setHfxLoading(true)
    setHfxError(null)
    try {
      const res = await fetch(`${apiBase}/skills/hyperfx`)
      if (res.status === 429) {
        setHfxError('GitHub rate limit hit. Catalog is cached for 1 hour — try again shortly.')
        return
      }
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setHfx(data.skills || [])
      if (data.repoUrl) setHfxRepoUrl(data.repoUrl)
    } catch {
      setHfxError('Could not reach the HyperFX skills repo. Try again shortly.')
    } finally {
      setHfxLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHfx()
  }, [fetchHfx])

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true)
    setAgentsError(null)
    try {
      const res = await fetch(`${apiBase}/skills/hyperfx/agents`)
      if (res.status === 503) {
        setAgentsError('Hyper is not connected to this workspace.')
        return
      }
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setAgents(Array.isArray(data.agents) ? data.agents : [])
    } catch {
      setAgentsError('Could not load Hyper agents. Try again shortly.')
    } finally {
      setAgentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const persistRoster = useCallback((next: DeployedAgent[]) => {
    setRoster(next)
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify(next))
    } catch {
      // best-effort persistence
    }
  }, [])

  const defaultAgentId = useCallback(() => {
    const def = agents.find(a => a.is_default) ?? agents[0]
    return def?.id ?? ''
  }, [agents])

  const deploySkill = useCallback((skill: HfxSkill) => {
    if (roster.some(r => r.skillSlug === skill.slug)) return
    const agentId = defaultAgentId()
    if (!agentId) return
    persistRoster([
      ...roster,
      { skillSlug: skill.slug, skillName: skill.name, agentId },
    ])
  }, [roster, defaultAgentId, persistRoster])

  const undeploySkill = useCallback((slug: string) => {
    persistRoster(roster.filter(r => r.skillSlug !== slug))
    setResults(prev => {
      const next = { ...prev }
      delete next[slug]
      return next
    })
  }, [roster, persistRoster])

  const bindAgent = useCallback((slug: string, agentId: string) => {
    persistRoster(roster.map(r => (r.skillSlug === slug ? { ...r, agentId } : r)))
  }, [roster, persistRoster])

  const runAgent = useCallback(async (entry: DeployedAgent) => {
    const prompt = (prompts[entry.skillSlug] ?? '').trim()
    if (!prompt || running[entry.skillSlug]) return
    setRunning(prev => ({ ...prev, [entry.skillSlug]: true }))
    setResults(prev => {
      const next = { ...prev }
      delete next[entry.skillSlug]
      return next
    })
    try {
      const res = await fetch(`${apiBase}/skills/hyperfx/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: entry.agentId,
          instructions: `Use the "${entry.skillName}" skill. ${prompt}`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResults(prev => ({
          ...prev,
          [entry.skillSlug]: { error: data.detail || data.error || 'Run failed.' },
        }))
        return
      }
      setResults(prev => ({
        ...prev,
        [entry.skillSlug]: {
          status: data.status,
          result: data.result,
          threadId: data.thread_id,
          agentName: data.agent_name,
        },
      }))
    } catch {
      setResults(prev => ({
        ...prev,
        [entry.skillSlug]: { error: 'Could not reach Hyper. Try again shortly.' },
      }))
    } finally {
      setRunning(prev => ({ ...prev, [entry.skillSlug]: false }))
    }
  }, [prompts, running])

  const pullHfxFile = useCallback(async (skill: HfxSkill) => {
    setHfxSelected(skill)
    setHfxFileLoading(true)
    setHfxFileError(null)
    setHfxFileContent('')
    try {
      const res = await fetch(`${apiBase}/skills/hyperfx/file?skill=${encodeURIComponent(skill.slug)}`)
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setHfxFileContent(data.content || '')
    } catch {
      setHfxFileError('Could not pull this skill. Try again shortly.')
    } finally {
      setHfxFileLoading(false)
    }
  }, [])

  const copyCmd = useCallback((cmd: string) => {
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopied(cmd)
      setTimeout(() => setCopied(prev => (prev === cmd ? null : prev)), 1400)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ gridColumn: '2 / -1', border: `1px solid ${c.border}`, background: c.bg, padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0f0', fontFamily: c.font }}>Skills</div>
          <div style={{ fontSize: 10, color: c.muted, fontFamily: c.font }}>MASSA://sys/skills/discover</div>
        </div>
        <button
          onClick={fetchTrending}
          disabled={loading}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#141e14' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0c1210' }}
          style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.2)`, background: '#0c1210', color: c.green, fontWeight: 700, fontSize: 10, cursor: loading ? 'default' : 'pointer', fontFamily: c.font, transition: 'all 0.2s ease' }}>
          {loading ? 'SCANNING…' : '↻ REFRESH'}
        </button>
      </div>

      {/* Platform skill-authoring docs */}
      <div style={{ background: c.panel, border: `1px solid ${c.borderDim}`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: c.green, fontFamily: c.font, fontWeight: 700, marginBottom: 4 }}>$ massa skills --write-for &lt;platform&gt;</div>
        <div style={{ fontSize: 10, color: c.muted, fontFamily: c.font, marginBottom: 10 }}>
          Pick a platform to open its docs for writing the ideal skill and uploading it.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={platformId}
            onChange={e => setPlatformId(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 4, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontFamily: c.font, fontSize: 11, cursor: 'pointer', minWidth: 220 }}>
            {PLATFORMS.map(p => (
              <option key={p.id} value={p.id} style={{ background: c.bg, color: c.text }}>{p.name}</option>
            ))}
          </select>
          <span style={{ color: c.dim, fontFamily: c.font, fontSize: 11 }}>—</span>
          <a
            href={platform.url}
            target="_blank"
            rel="noreferrer"
            style={{ color: c.green, fontFamily: c.font, fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
            {platform.docLabel} <span style={{ color: c.dim }}>→</span>
          </a>
        </div>
      </div>

      {/* HyperFX official marketing skills */}
      <div style={{ background: c.panel, border: `1px solid rgba(52,211,153,0.18)`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: c.green, fontFamily: c.font, fontWeight: 700 }}>$ massa skills --catalog hyperfx-marketing</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href={hfxRepoUrl} target="_blank" rel="noreferrer" style={{ color: c.dim, fontFamily: c.font, fontSize: 10, textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = c.green }}
              onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>hyperfx-ai/marketing-skills ↗</a>
            <button onClick={fetchHfx} disabled={hfxLoading}
              style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.2)`, background: '#0c1210', color: c.green, fontWeight: 700, fontSize: 10, cursor: hfxLoading ? 'default' : 'pointer', fontFamily: c.font }}>
              {hfxLoading ? 'SYNCING…' : '↻ SYNC'}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10, color: c.muted, fontFamily: c.font, marginBottom: 12, lineHeight: 1.6 }}>
          <span style={{ color: c.green, fontWeight: 700 }}>Official</span> Hyper skills — reusable SOPs that turn agents into domain experts. Hyper agents auto-pick them from the library when relevant, so you don't have to attach them. Pulled live from the repo and run on the Hyper MCP this workspace is connected to.
        </div>

        {/* Hyper-native import flow */}
        <div style={{ background: c.bg, border: `1px solid rgba(52,211,153,0.2)`, borderRadius: 4, padding: '11px 12px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: c.green, fontFamily: c.font, fontSize: 10, fontWeight: 700 }}>import into hyper</span>
              <span style={{ color: '#0a0a0a', background: c.green, fontFamily: c.font, fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em' }}>RECOMMENDED</span>
            </div>
            <button onClick={() => copyCmd(HFX_REPO_URL)} title="copy repo url"
              style={{ padding: '3px 9px', borderRadius: 3, border: `1px solid ${c.borderDim}`, background: 'transparent', color: copied === HFX_REPO_URL ? c.green : c.dim, fontWeight: 700, fontSize: 9, cursor: 'pointer', fontFamily: c.font }}>
              {copied === HFX_REPO_URL ? 'copied url' : 'copy repo url'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {HFX_IMPORT_STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ color: c.green, fontFamily: c.font, fontSize: 10, flexShrink: 0, width: 14 }}>{i + 1}.</span>
                <span style={{ color: c.text, fontFamily: c.font, fontSize: 10, lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Other install options (from the repo, for other coding agents) */}
        <div style={{ color: c.dim, fontFamily: c.font, fontSize: 9, marginBottom: 6, letterSpacing: '0.04em' }}>OTHER INSTALL OPTIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {HFX_INSTALL.map(opt => (
            <div key={opt.cmd} onClick={() => copyCmd(opt.cmd)} title="click to copy"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: c.bg, border: `1px solid ${c.borderDim}`, borderRadius: 4, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.borderDim }}>
              <span style={{ color: c.dim, fontFamily: c.font, fontSize: 9, width: 130, flexShrink: 0 }}>{opt.label}</span>
              <code style={{ color: c.text, fontFamily: c.font, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{opt.cmd}</code>
              <span style={{ color: copied === opt.cmd ? c.green : c.dim, fontFamily: c.font, fontSize: 9, flexShrink: 0, width: 52, textAlign: 'right' }}>{copied === opt.cmd ? 'copied' : 'copy'}</span>
            </div>
          ))}
        </div>

        {/* Catalog grid + viewer */}
        <div style={{ display: 'grid', gridTemplateColumns: hfxSelected ? '1fr 1fr' : '1fr', gap: 12, alignItems: 'start' }}>
          <div>
            {hfxLoading ? (
              <div style={{ padding: 16, color: c.muted, fontFamily: c.font, fontSize: 11 }}>Loading marketing skills…</div>
            ) : hfxError ? (
              <div style={{ padding: 16, color: c.amber, fontFamily: c.font, fontSize: 11, lineHeight: 1.6 }}>{hfxError}</div>
            ) : hfx.length === 0 ? (
              <div style={{ padding: 16, color: c.muted, fontFamily: c.font, fontSize: 11 }}>No skills found.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: hfxSelected ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {hfx.map(s => {
                  const active = hfxSelected?.slug === s.slug
                  return (
                    <div key={s.slug} onClick={() => pullHfxFile(s)} title={s.description}
                      style={{ padding: '9px 11px', background: active ? 'rgba(52,211,153,0.06)' : c.bg, border: `1px solid ${active ? 'rgba(52,211,153,0.3)' : c.borderDim}`, borderRadius: 4, cursor: 'pointer' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = c.panelAlt }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = c.bg }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span style={{ color: c.text, fontFamily: c.font, fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          <span title="Official Hyper skill" style={{ color: c.green, border: `1px solid rgba(52,211,153,0.4)`, fontFamily: c.font, fontSize: 8, fontWeight: 700, padding: '0 4px', borderRadius: 3, flexShrink: 0, letterSpacing: '0.03em' }}>OFFICIAL</span>
                        </div>
                        <span style={{ color: active && hfxFileLoading ? c.green : c.dim, fontFamily: c.font, fontSize: 11, flexShrink: 0 }}>{active && hfxFileLoading ? '…' : '↓'}</span>
                      </div>
                      <div style={{ color: c.muted, fontFamily: c.font, fontSize: 10, lineHeight: 1.5, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</div>
                      {(() => {
                        const deployed = roster.some(r => r.skillSlug === s.slug)
                        const canDeploy = agents.length > 0
                        return (
                          <button
                            onClick={e => { e.stopPropagation(); deploySkill(s) }}
                            disabled={deployed || !canDeploy}
                            title={!canDeploy ? 'No Hyper agent available' : deployed ? 'Already deployed' : 'Deploy as a Hyper agent'}
                            style={{ marginTop: 8, width: '100%', padding: '5px 0', borderRadius: 4, border: `1px solid ${deployed ? c.borderDim : 'rgba(52,211,153,0.35)'}`, background: deployed ? 'transparent' : '#0c1210', color: deployed ? c.dim : c.green, fontWeight: 700, fontSize: 9, letterSpacing: '0.04em', cursor: deployed || !canDeploy ? 'default' : 'pointer', fontFamily: c.font }}>
                            {deployed ? '✓ DEPLOYED' : '+ DEPLOY'}
                          </button>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {hfxSelected && (
            <div style={{ background: '#080808', border: `1px solid ${c.borderDim}`, borderRadius: 6, overflow: 'hidden', position: 'sticky', top: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${c.borderDim}`, gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: c.text, fontFamily: c.font, fontSize: 11, fontWeight: 700 }}>{hfxSelected.name}</div>
                  <div style={{ color: c.green, fontFamily: c.font, fontSize: 9, marginTop: 2 }}>skills/{hfxSelected.slug}/SKILL.md</div>
                </div>
                <button onClick={() => setHfxSelected(null)} style={{ border: 'none', background: 'transparent', color: c.dim, cursor: 'pointer', fontSize: 14, padding: '2px 6px', fontFamily: c.font, flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = c.text }}
                  onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>✕</button>
              </div>
              <div style={{ maxHeight: 480, overflow: 'auto', padding: 14 }}>
                {hfxFileLoading ? (
                  <div style={{ color: c.muted, fontFamily: c.font, fontSize: 11 }}>Pulling skill…</div>
                ) : hfxFileError ? (
                  <div style={{ color: c.amber, fontFamily: c.font, fontSize: 11, lineHeight: 1.6 }}>{hfxFileError}</div>
                ) : (
                  <pre style={{ color: '#ccc', fontFamily: c.font, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{hfxFileContent}</pre>
                )}
              </div>
              <div style={{ padding: '8px 14px', borderTop: `1px solid ${c.borderDim}` }}>
                <a href={hfxSelected.htmlUrl} target="_blank" rel="noreferrer" style={{ color: c.green, fontFamily: c.font, fontSize: 10, textDecoration: 'none' }}>view on github ↗</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deployed agents roster */}
      <div style={{ background: c.panel, border: `1px solid rgba(52,211,153,0.18)`, borderRadius: 6, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: c.green, fontFamily: c.font, fontWeight: 700 }}>$ massa agents --deployed</div>
          <button onClick={fetchAgents} disabled={agentsLoading}
            style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.2)`, background: '#0c1210', color: c.green, fontWeight: 700, fontSize: 10, cursor: agentsLoading ? 'default' : 'pointer', fontFamily: c.font }}>
            {agentsLoading ? 'LOADING…' : '↻ AGENTS'}
          </button>
        </div>
        <div style={{ fontSize: 10, color: c.muted, fontFamily: c.font, marginBottom: 12, lineHeight: 1.6 }}>
          Deploy a skill above to add it here as an agent. Each runs live through the Hyper agent it's bound to — give it a prompt for the task and hit Run.
        </div>

        {agentsError && (
          <div style={{ padding: '8px 10px', marginBottom: 10, color: c.amber, fontFamily: c.font, fontSize: 10, lineHeight: 1.6, border: `1px solid ${c.borderDim}`, borderRadius: 4 }}>{agentsError}</div>
        )}

        {roster.length === 0 ? (
          <div style={{ padding: 16, color: c.dim, fontFamily: c.font, fontSize: 11, border: `1px dashed ${c.borderDim}`, borderRadius: 4, textAlign: 'center' }}>
            No agents deployed yet. Click + DEPLOY on any skill above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {roster.map(entry => {
              const isRunning = !!running[entry.skillSlug]
              const result = results[entry.skillSlug]
              const bound = agents.find(a => a.id === entry.agentId)
              return (
                <div key={entry.skillSlug} style={{ background: c.bg, border: `1px solid ${c.borderDim}`, borderRadius: 4, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ color: c.text, fontFamily: c.font, fontSize: 11, fontWeight: 700 }}>{entry.skillName}</span>
                      <span style={{ color: c.green, border: `1px solid rgba(52,211,153,0.4)`, fontFamily: c.font, fontSize: 8, fontWeight: 700, padding: '0 4px', borderRadius: 3, letterSpacing: '0.03em' }}>AGENT</span>
                    </div>
                    <button onClick={() => undeploySkill(entry.skillSlug)}
                      style={{ border: 'none', background: 'transparent', color: c.dim, cursor: 'pointer', fontSize: 9, fontWeight: 700, fontFamily: c.font, letterSpacing: '0.04em' }}
                      onMouseEnter={e => { e.currentTarget.style.color = c.amber }}
                      onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>UNDEPLOY</button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: c.dim, fontFamily: c.font, fontSize: 9 }}>runs on</span>
                    <select value={entry.agentId} onChange={e => bindAgent(entry.skillSlug, e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: 4, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontFamily: c.font, fontSize: 10, cursor: 'pointer', maxWidth: 280 }}>
                      {agents.map(a => (
                        <option key={a.id} value={a.id} style={{ background: c.bg, color: c.text }}>{a.name}{a.is_default ? ' (default)' : ''}</option>
                      ))}
                    </select>
                    {bound && bound.toolkits && bound.toolkits.length > 0 && (
                      <span style={{ color: c.dim, fontFamily: c.font, fontSize: 9 }}>toolkits: {bound.toolkits.join(', ')}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <textarea
                      value={prompts[entry.skillSlug] ?? ''}
                      onChange={e => setPrompts(prev => ({ ...prev, [entry.skillSlug]: e.target.value }))}
                      placeholder={`What should this agent do? e.g. "Run a competitor analysis for example.com"`}
                      rows={2}
                      style={{ flex: 1, minWidth: 220, resize: 'vertical', padding: '8px 10px', borderRadius: 4, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontFamily: c.font, fontSize: 11, lineHeight: 1.5 }} />
                    <button
                      onClick={() => runAgent(entry)}
                      disabled={isRunning || !(prompts[entry.skillSlug] ?? '').trim()}
                      style={{ padding: '8px 16px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.35)`, background: isRunning ? 'transparent' : '#0c1210', color: c.green, fontWeight: 700, fontSize: 10, letterSpacing: '0.04em', cursor: isRunning || !(prompts[entry.skillSlug] ?? '').trim() ? 'default' : 'pointer', fontFamily: c.font, flexShrink: 0 }}>
                      {isRunning ? 'RUNNING…' : '▶ RUN'}
                    </button>
                  </div>

                  {result && (
                    <div style={{ marginTop: 10, border: `1px solid ${result.error ? c.borderDim : 'rgba(52,211,153,0.2)'}`, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: `1px solid ${c.borderDim}`, background: c.panelAlt }}>
                        <span style={{ color: result.error ? c.amber : c.green, fontFamily: c.font, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}>
                          {result.error ? 'RUN FAILED' : `COMPLETED${result.agentName ? ` · ${result.agentName}` : ''}`}
                        </span>
                        {result.threadId && <span style={{ color: c.dim, fontFamily: c.font, fontSize: 8 }}>thread {result.threadId.slice(0, 8)}</span>}
                      </div>
                      <pre style={{ color: result.error ? c.amber : '#ccc', fontFamily: c.font, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: 12, maxHeight: 360, overflow: 'auto' }}>{result.error || result.result || '(no output returned)'}</pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: c.green, fontFamily: c.font, fontWeight: 700 }}>$ massa skills --trending --top 10 (today)</div>
        {since && <div style={{ fontSize: 10, color: c.dim, fontFamily: c.font }}>pushed since {since}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 12, alignItems: 'start' }}>
        {/* Repo list */}
        <div style={{ background: c.panel, border: `1px solid ${c.borderDim}`, borderRadius: 6, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, color: c.muted, fontFamily: c.font, fontSize: 11 }}>Scanning GitHub for today's top skill repositories…</div>
          ) : error ? (
            <div style={{ padding: 24, color: c.amber, fontFamily: c.font, fontSize: 11, lineHeight: 1.6 }}>{error}</div>
          ) : repos.length === 0 ? (
            <div style={{ padding: 24, color: c.muted, fontFamily: c.font, fontSize: 11 }}>No trending skill repos found for today.</div>
          ) : (
            repos.map((repo, i) => {
              const active = selected?.id === repo.id
              return (
                <div
                  key={repo.id}
                  onClick={() => pullSkillFile(repo)}
                  title={repo.description || repo.fullName}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < repos.length - 1 ? `1px solid ${c.borderDim}` : 'none', background: active ? 'rgba(52,211,153,0.05)' : 'transparent', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#0c0f14' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ color: c.dim, fontFamily: c.font, fontSize: 12, fontWeight: 700, width: 22, flexShrink: 0, textAlign: 'right' }}>{i + 1}</div>
                  <a href={repo.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.color = c.green }}
                    onMouseLeave={e => { e.currentTarget.style.color = c.text }}>{repo.fullName}</a>
                  {repo.description && <span style={{ color: c.muted, fontFamily: c.font, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{repo.description}</span>}
                  <span style={{ color: c.amber, fontFamily: c.font, fontSize: 10, flexShrink: 0 }}>★ {repo.stars.toLocaleString()}</span>
                  {repo.language && <span style={{ color: c.blue, fontFamily: c.font, fontSize: 10, flexShrink: 0, width: 70, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.language}</span>}
                  <span style={{ color: active && fileLoading ? c.green : c.dim, fontFamily: c.font, fontSize: 11, flexShrink: 0, width: 16, textAlign: 'center' }}>{active && fileLoading ? '…' : '↓'}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Skill file viewer */}
        {selected && (
          <div style={{ background: '#080808', border: `1px solid ${c.borderDim}`, borderRadius: 6, overflow: 'hidden', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${c.borderDim}`, gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: c.text, fontFamily: c.font, fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.fullName}</div>
                {filePath && <div style={{ color: c.green, fontFamily: c.font, fontSize: 9, marginTop: 2 }}>{filePath}</div>}
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', color: c.dim, cursor: 'pointer', fontSize: 14, padding: '2px 6px', fontFamily: c.font, flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = c.text }}
                onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>✕</button>
            </div>
            <div style={{ maxHeight: 520, overflow: 'auto', padding: 14 }}>
              {fileLoading ? (
                <div style={{ color: c.muted, fontFamily: c.font, fontSize: 11 }}>Pulling skill file…</div>
              ) : fileError ? (
                <div style={{ color: c.amber, fontFamily: c.font, fontSize: 11, lineHeight: 1.6 }}>{fileError}</div>
              ) : (
                <pre style={{ color: '#ccc', fontFamily: c.font, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{fileContent}</pre>
              )}
            </div>
            {fileHtmlUrl && !fileLoading && !fileError && (
              <div style={{ padding: '8px 14px', borderTop: `1px solid ${c.borderDim}` }}>
                <a href={fileHtmlUrl} target="_blank" rel="noreferrer" style={{ color: c.green, fontFamily: c.font, fontSize: 10, textDecoration: 'none' }}>view on github ↗</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

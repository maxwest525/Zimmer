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

export function SkillsView({ onBack }: { onBack: () => void }) {
  const [repos, setRepos] = useState<TrendingRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [since, setSince] = useState('')

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

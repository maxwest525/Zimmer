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

export function SkillsView({ onBack }: { onBack: () => void }) {
  const [repos, setRepos] = useState<TrendingRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [since, setSince] = useState('')

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

      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: c.green, fontFamily: c.font, fontWeight: 700 }}>$ massa skills --trending --top 10</div>
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
                  style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: i < repos.length - 1 ? `1px solid ${c.borderDim}` : 'none', background: active ? 'rgba(52,211,153,0.05)' : 'transparent', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#0c0f14' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ color: c.dim, fontFamily: c.font, fontSize: 12, fontWeight: 700, width: 22, flexShrink: 0, textAlign: 'right' }}>{i + 1}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <a href={repo.url} target="_blank" rel="noreferrer" style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.color = c.green }}
                        onMouseLeave={e => { e.currentTarget.style.color = c.text }}>{repo.fullName}</a>
                      <span style={{ color: c.amber, fontFamily: c.font, fontSize: 10 }}>★ {repo.stars.toLocaleString()}</span>
                      {repo.language && <span style={{ color: c.blue, fontFamily: c.font, fontSize: 10 }}>{repo.language}</span>}
                    </div>
                    {repo.description && <div style={{ color: c.muted, fontFamily: c.font, fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>{repo.description}</div>}
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => pullSkillFile(repo)}
                        disabled={fileLoading && active}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.4)'; e.currentTarget.style.color = c.green }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = c.borderDim; e.currentTarget.style.color = c.muted }}
                        style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid ${c.borderDim}`, background: 'transparent', color: c.muted, fontWeight: 700, fontSize: 9, cursor: 'pointer', fontFamily: c.font, transition: 'all 0.15s' }}>
                        {fileLoading && active ? 'PULLING…' : '↓ PULL SKILL FILE'}
                      </button>
                    </div>
                  </div>
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

import { useState, useEffect, useCallback } from 'react'
import { useThemeColors } from '@/contexts/ThemeContext'

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

const apiBase = '/api'

export function SkillsView({ onBack }: { onBack: () => void }) {
  const c = useThemeColors()
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
          onMouseEnter={e => { e.currentTarget.style.color = c.text }}
          onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: c.text, fontFamily: c.font }}>Skills</div>
          <div style={{ fontSize: 11, color: c.muted, fontFamily: c.font }}>MASSA://sys/skills/trending</div>
        </div>
        <button
          onClick={fetchTrending}
          disabled={loading}
          style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.2)`, background: c.greenDark, color: c.green, fontWeight: 700, fontSize: 11, cursor: loading ? 'default' : 'pointer', fontFamily: c.font, transition: 'all 0.2s ease' }}>
          {loading ? 'SCANNING…' : '↻ REFRESH'}
        </button>
      </div>

      {/* Section title */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: c.green, fontFamily: c.font, fontWeight: 700 }}>$ massa skills --trending --top 10 (today)</div>
        {since && <div style={{ fontSize: 11, color: c.dim, fontFamily: c.font }}>pushed since {since}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 12, alignItems: 'start' }}>
        {/* Repo list */}
        <div style={{ background: c.panel, border: `1px solid ${c.borderDim}`, borderRadius: 6, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, color: c.muted, fontFamily: c.fontSans, fontSize: 13 }}>Scanning GitHub for today's top skill repositories…</div>
          ) : error ? (
            <div style={{ padding: 24, color: c.amber, fontFamily: c.fontSans, fontSize: 13, lineHeight: 1.6 }}>{error}</div>
          ) : repos.length === 0 ? (
            <div style={{ padding: 24, color: c.muted, fontFamily: c.fontSans, fontSize: 13 }}>No trending skill repos found for today.</div>
          ) : (
            repos.map((repo, i) => {
              const active = selected?.id === repo.id
              return (
                <div
                  key={repo.id}
                  onClick={() => pullSkillFile(repo)}
                  title={repo.description || repo.fullName}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: i < repos.length - 1 ? `1px solid ${c.borderDim}` : 'none', background: active ? 'rgba(52,211,153,0.05)' : 'transparent', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = c.panelAlt }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ color: c.dim, fontFamily: c.font, fontSize: 12, fontWeight: 700, width: 22, flexShrink: 0, textAlign: 'right' }}>{i + 1}</div>
                  <a href={repo.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ color: c.text, fontFamily: c.font, fontSize: 13, fontWeight: 700, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.color = c.green }}
                    onMouseLeave={e => { e.currentTarget.style.color = c.text }}>{repo.fullName}</a>
                  {repo.description && <span style={{ color: c.muted, fontFamily: c.fontSans, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{repo.description}</span>}
                  <span style={{ color: c.amber, fontFamily: c.font, fontSize: 11, flexShrink: 0 }}>★ {repo.stars.toLocaleString()}</span>
                  {repo.language && <span style={{ color: c.blue, fontFamily: c.font, fontSize: 11, flexShrink: 0, width: 70, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repo.language}</span>}
                  <span style={{ color: active && fileLoading ? c.green : c.dim, fontFamily: c.font, fontSize: 12, flexShrink: 0, width: 16, textAlign: 'center' }}>{active && fileLoading ? '…' : '↓'}</span>
                </div>
              )
            })
          )}
        </div>

        {/* Skill file viewer */}
        {selected && (
          <div style={{ background: c.panel, border: `1px solid ${c.borderDim}`, borderRadius: 6, overflow: 'hidden', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${c.borderDim}`, gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.fullName}</div>
                {filePath && <div style={{ color: c.green, fontFamily: c.font, fontSize: 11, marginTop: 2 }}>{filePath}</div>}
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', color: c.dim, cursor: 'pointer', fontSize: 14, padding: '2px 6px', fontFamily: c.font, flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = c.text }}
                onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>✕</button>
            </div>
            <div style={{ maxHeight: 520, overflow: 'auto', padding: 14 }}>
              {fileLoading ? (
                <div style={{ color: c.muted, fontFamily: c.fontSans, fontSize: 13 }}>Pulling skill file…</div>
              ) : fileError ? (
                <div style={{ color: c.amber, fontFamily: c.fontSans, fontSize: 13, lineHeight: 1.6 }}>{fileError}</div>
              ) : (
                <pre style={{ color: c.text, fontFamily: c.font, fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{fileContent}</pre>
              )}
            </div>
            {fileHtmlUrl && !fileLoading && !fileError && (
              <div style={{ padding: '8px 14px', borderTop: `1px solid ${c.borderDim}` }}>
                <a href={fileHtmlUrl} target="_blank" rel="noreferrer" style={{ color: c.green, fontFamily: c.font, fontSize: 11, textDecoration: 'none' }}>view on github ↗</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

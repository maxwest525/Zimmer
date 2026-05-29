import { useState, useEffect, useCallback } from 'react'

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

const HYPER_AGENTS_URL = 'https://app.hyperfx.ai/agents'
const HFX_REPO_URL = 'https://github.com/hyperfx-ai/marketing-skills'

const HFX_IMPORT_STEPS: string[] = [
  'Open the Files page in Hyper, then the Skills tab',
  'Click Import skill',
  `Paste the repo URL: ${HFX_REPO_URL}`,
  'Review the skills, then Save',
]

type HfxSkill = {
  slug: string
  name: string
  description: string
  htmlUrl: string
}

type TemplateCard = {
  slug: string
  name: string
  category: string
  description: string
  integrations: string[]
}

type TemplateDetail = {
  slug: string
  name: string
  category: string
  prompt: string
  integrations: string[]
  content: string
  url: string
  useUrl: string
}

function MarkdownView({ md }: { md: string }) {
  const lines = md.split('\n')
  const blocks: React.ReactNode[] = []
  let list: string[] = []
  const flush = (key: string) => {
    if (list.length === 0) return
    blocks.push(
      <ul key={key} style={{ margin: '6px 0 12px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {list.map((it, i) => (
          <li key={i} style={{ color: c.muted, fontFamily: c.font, fontSize: 12, lineHeight: 1.6 }}>{it}</li>
        ))}
      </ul>,
    )
    list = []
  }
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (line.startsWith('- ')) {
      list.push(line.slice(2).trim())
      return
    }
    flush(`ul-${i}`)
    if (!line) return
    if (line.startsWith('#### ')) {
      blocks.push(<div key={i} style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700, margin: '12px 0 4px' }}>{line.slice(5)}</div>)
    } else if (line.startsWith('### ')) {
      blocks.push(<div key={i} style={{ color: c.green, fontFamily: c.font, fontSize: 13, fontWeight: 700, margin: '16px 0 6px' }}>{line.slice(4)}</div>)
    } else if (line.startsWith('## ')) {
      blocks.push(<div key={i} style={{ color: c.text, fontFamily: c.font, fontSize: 15, fontWeight: 700, margin: '20px 0 8px', paddingBottom: 6, borderBottom: `1px solid ${c.borderDim}` }}>{line.slice(3)}</div>)
    } else {
      blocks.push(<p key={i} style={{ color: c.muted, fontFamily: c.font, fontSize: 12, lineHeight: 1.7, margin: '0 0 10px' }}>{line}</p>)
    }
  })
  flush('ul-end')
  return <div>{blocks}</div>
}

export function AgentsView({ onBack }: { onBack: () => void }) {
  // --- HyperFX Agent Skills (github.com/hyperfx-ai/marketing-skills) ---
  const [hfx, setHfx] = useState<HfxSkill[]>([])
  const [hfxLoading, setHfxLoading] = useState(true)
  const [hfxError, setHfxError] = useState<string | null>(null)
  const [hfxRepoUrl, setHfxRepoUrl] = useState(HFX_REPO_URL)
  const [hfxSelected, setHfxSelected] = useState<HfxSkill | null>(null)
  const [hfxFileLoading, setHfxFileLoading] = useState(false)
  const [hfxFileError, setHfxFileError] = useState<string | null>(null)
  const [hfxFileContent, setHfxFileContent] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // --- Templates (hyperfx.ai/templates) as the agents ---
  const [templates, setTemplates] = useState<TemplateCard[]>([])
  const [tplLoading, setTplLoading] = useState(true)
  const [tplError, setTplError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [selected, setSelected] = useState<TemplateCard | null>(null)
  const [detail, setDetail] = useState<TemplateDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

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

  const fetchTemplates = useCallback(async () => {
    setTplLoading(true)
    setTplError(null)
    try {
      const res = await fetch(`${apiBase}/templates`)
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setTemplates(Array.isArray(data.templates) ? data.templates : [])
    } catch {
      setTplError('Could not load the Hyper agent templates. Try again shortly.')
    } finally {
      setTplLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHfx()
    fetchTemplates()
  }, [fetchHfx, fetchTemplates])

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

  const openTemplate = useCallback(async (tpl: TemplateCard) => {
    setSelected(tpl)
    setDetail(null)
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await fetch(`${apiBase}/templates/${encodeURIComponent(tpl.slug)}`)
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setDetail(data)
    } catch {
      setDetailError('Could not load this agent. Try again shortly.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const copyCmd = useCallback((cmd: string) => {
    navigator.clipboard?.writeText(cmd).then(() => {
      setCopied(cmd)
      setTimeout(() => setCopied(prev => (prev === cmd ? null : prev)), 1400)
    }).catch(() => {})
  }, [])

  const categories = ['All', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))]
  const visible = category === 'All' ? templates : templates.filter(t => t.category === category)

  return (
    <div style={{ gridColumn: '2 / -1', border: `1px solid ${c.border}`, background: c.bg, padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0f0', fontFamily: c.font }}>Agents</div>
          <div style={{ fontSize: 10, color: c.muted, fontFamily: c.font }}>MASSA://sys/agents/hyper</div>
        </div>
      </div>

      {/* HyperFX Agent Skills */}
      <div style={{ background: c.panel, border: `1px solid rgba(52,211,153,0.18)`, borderRadius: 6, padding: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, color: c.text, fontFamily: c.font, fontWeight: 700 }}>HyperFX Agent Skills</div>
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
          <span style={{ color: c.green, fontWeight: 700 }}>Official</span> Hyper skills — reusable SOPs that turn agents into domain experts. Hyper agents auto-pick them from the library when relevant. Pulled live from the repo. Click any skill to read it.
        </div>

        {/* Import into Hyper */}
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

        {hfxLoading ? (
          <div style={{ padding: 12, color: c.muted, fontFamily: c.font, fontSize: 11 }}>Loading agent skills…</div>
        ) : hfxError ? (
          <div style={{ padding: 12, color: c.amber, fontFamily: c.font, fontSize: 11, lineHeight: 1.6 }}>{hfxError}</div>
        ) : hfx.length === 0 ? (
          <div style={{ padding: 12, color: c.muted, fontFamily: c.font, fontSize: 11 }}>No skills found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {hfx.map(s => (
              <div key={s.slug} onClick={() => pullHfxFile(s)} title={s.description}
                style={{ padding: '9px 11px', background: c.bg, border: `1px solid ${c.borderDim}`, borderRadius: 4, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = c.borderDim }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ color: c.text, fontFamily: c.font, fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span title="Official Hyper skill" style={{ color: c.green, border: `1px solid rgba(52,211,153,0.4)`, fontFamily: c.font, fontSize: 8, fontWeight: 700, padding: '0 4px', borderRadius: 3, flexShrink: 0, letterSpacing: '0.03em' }}>OFFICIAL</span>
                </div>
                <div style={{ color: c.muted, fontFamily: c.font, fontSize: 10, lineHeight: 1.5, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agents = Hyper templates */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: c.text, fontFamily: c.font, fontWeight: 700 }}>Hyper Agents</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="https://www.hyperfx.ai/templates" target="_blank" rel="noreferrer" style={{ color: c.dim, fontFamily: c.font, fontSize: 10, textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.color = c.green }}
            onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>hyperfx.ai/templates ↗</a>
          <button onClick={fetchTemplates} disabled={tplLoading}
            style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.2)`, background: '#0c1210', color: c.green, fontWeight: 700, fontSize: 10, cursor: tplLoading ? 'default' : 'pointer', fontFamily: c.font }}>
            {tplLoading ? 'LOADING…' : '↻ REFRESH'}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 10, color: c.muted, fontFamily: c.font, marginBottom: 12, lineHeight: 1.6 }}>
        Ready-to-use Hyper agents — each comes with its own prompts, connectors, and skills. Click one to see everything it does.
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {categories.map(cat => {
            const active = cat === category
            return (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{ padding: '4px 12px', borderRadius: 4, border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : c.borderDim}`, background: active ? 'rgba(52,211,153,0.08)' : 'transparent', color: active ? c.green : c.muted, fontFamily: c.font, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {tplLoading ? (
        <div style={{ padding: 24, color: c.muted, fontFamily: c.font, fontSize: 11 }}>Loading Hyper agents…</div>
      ) : tplError ? (
        <div style={{ padding: 24, color: c.amber, fontFamily: c.font, fontSize: 11, lineHeight: 1.6 }}>{tplError}</div>
      ) : visible.length === 0 ? (
        <div style={{ padding: 24, color: c.muted, fontFamily: c.font, fontSize: 11 }}>No agents found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {visible.map(tpl => (
            <div key={tpl.slug} onClick={() => openTemplate(tpl)}
              style={{ background: c.panel, border: `1px solid ${c.borderDim}`, borderRadius: 6, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 150 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.borderDim }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: c.text, fontFamily: c.font, fontSize: 13, fontWeight: 700 }}>{tpl.name}</span>
                {tpl.category && <span style={{ color: c.dim, border: `1px solid ${c.borderDim}`, fontFamily: c.font, fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 3, flexShrink: 0, letterSpacing: '0.03em' }}>{tpl.category}</span>}
              </div>
              <div style={{ color: c.muted, fontFamily: c.font, fontSize: 11, lineHeight: 1.6, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{tpl.description}</div>
              {tpl.integrations.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tpl.integrations.slice(0, 4).map(it => (
                    <span key={it} style={{ color: c.blue, border: `1px solid rgba(96,165,250,0.25)`, background: 'rgba(96,165,250,0.05)', fontFamily: c.font, fontSize: 8, padding: '1px 5px', borderRadius: 3 }}>{it}</span>
                  ))}
                </div>
              )}
              <span style={{ color: c.green, fontFamily: c.font, fontSize: 9, fontWeight: 700 }}>view agent →</span>
            </div>
          ))}

          {/* Build a custom agent */}
          <a href={HYPER_AGENTS_URL} target="_blank" rel="noreferrer"
            style={{ textDecoration: 'none', background: c.panel, border: `1px dashed ${c.border}`, borderRadius: 6, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8, minHeight: 150 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.green }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = c.border }}>
            <span style={{ color: c.green, fontFamily: c.font, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700 }}>Build a custom agent</span>
            <span style={{ color: c.muted, fontFamily: c.font, fontSize: 10, lineHeight: 1.5, maxWidth: 240 }}>Start blank in Hyper and give it any job, tools, tasks, and schedule.</span>
            <span style={{ color: c.green, fontFamily: c.font, fontSize: 10, fontWeight: 700 }}>open in hyper ↗</span>
          </a>
        </div>
      )}

      {/* Template detail modal */}
      {selected && (
        <div onClick={() => { setSelected(null); setDetail(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflow: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, width: '100%', maxWidth: 760, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '16px 18px', borderBottom: `1px solid ${c.borderDim}`, position: 'sticky', top: 0, background: c.bg, borderRadius: '8px 8px 0 0' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: c.text, fontFamily: c.font, fontSize: 15, fontWeight: 700 }}>{selected.name}</span>
                  {selected.category && <span style={{ color: c.dim, border: `1px solid ${c.borderDim}`, fontFamily: c.font, fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 3, letterSpacing: '0.03em' }}>{selected.category}</span>}
                </div>
                <div style={{ color: c.muted, fontFamily: c.font, fontSize: 10, marginTop: 4 }}>Hyper agent template</div>
              </div>
              <button onClick={() => { setSelected(null); setDetail(null) }} style={{ border: 'none', background: 'transparent', color: c.dim, cursor: 'pointer', fontSize: 16, padding: '2px 6px', fontFamily: c.font, flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = c.text }}
                onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>✕</button>
            </div>

            <div style={{ padding: 18 }}>
              {detailLoading ? (
                <div style={{ color: c.muted, fontFamily: c.font, fontSize: 12 }}>Loading everything this agent does…</div>
              ) : detailError ? (
                <div style={{ color: c.amber, fontFamily: c.font, fontSize: 12, lineHeight: 1.6 }}>{detailError}</div>
              ) : detail ? (
                <>
                  {/* Connectors */}
                  {detail.integrations.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: c.dim, fontFamily: c.font, fontSize: 9, letterSpacing: '0.05em', marginBottom: 6 }}>CONNECTORS & SKILLS</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {detail.integrations.map(it => (
                          <span key={it} style={{ color: c.green, border: `1px solid rgba(52,211,153,0.25)`, background: 'rgba(52,211,153,0.05)', fontFamily: c.font, fontSize: 10, padding: '3px 8px', borderRadius: 3 }}>{it}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example prompt */}
                  {detail.prompt && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: c.dim, fontFamily: c.font, fontSize: 9, letterSpacing: '0.05em', marginBottom: 6 }}>EXAMPLE PROMPT</div>
                      <div style={{ background: c.panel, border: `1px solid ${c.borderDim}`, borderRadius: 6, padding: '10px 12px', color: c.text, fontFamily: c.font, fontSize: 12, lineHeight: 1.6 }}>“{detail.prompt}”</div>
                    </div>
                  )}

                  {/* Full description */}
                  {detail.content && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ color: c.dim, fontFamily: c.font, fontSize: 9, letterSpacing: '0.05em', marginBottom: 6 }}>WHAT THIS AGENT DOES</div>
                      <MarkdownView md={detail.content} />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${c.borderDim}` }}>
                    <a href={detail.useUrl} target="_blank" rel="noreferrer"
                      style={{ textDecoration: 'none', padding: '8px 16px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.35)`, background: '#0c1210', color: c.green, fontWeight: 700, fontSize: 11, fontFamily: c.font }}>
                      ▶ Use this template
                    </a>
                    <a href={detail.url} target="_blank" rel="noreferrer" style={{ color: c.dim, fontFamily: c.font, fontSize: 10, textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.color = c.green }}
                      onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>view on hyperfx.ai ↗</a>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* HyperFX skill detail modal */}
      {hfxSelected && (
        <div onClick={() => setHfxSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflow: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, width: '100%', maxWidth: 760, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${c.borderDim}`, position: 'sticky', top: 0, background: c.bg, borderRadius: '8px 8px 0 0' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: c.text, fontFamily: c.font, fontSize: 13, fontWeight: 700 }}>{hfxSelected.name}</div>
                <div style={{ color: c.green, fontFamily: c.font, fontSize: 9, marginTop: 2 }}>skills/{hfxSelected.slug}/SKILL.md</div>
              </div>
              <button onClick={() => setHfxSelected(null)} style={{ border: 'none', background: 'transparent', color: c.dim, cursor: 'pointer', fontSize: 16, padding: '2px 6px', fontFamily: c.font, flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = c.text }}
                onMouseLeave={e => { e.currentTarget.style.color = c.dim }}>✕</button>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'auto', padding: 18 }}>
              {hfxFileLoading ? (
                <div style={{ color: c.muted, fontFamily: c.font, fontSize: 12 }}>Pulling skill…</div>
              ) : hfxFileError ? (
                <div style={{ color: c.amber, fontFamily: c.font, fontSize: 12, lineHeight: 1.6 }}>{hfxFileError}</div>
              ) : (
                <pre style={{ color: '#ccc', fontFamily: c.font, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{hfxFileContent}</pre>
              )}
            </div>
            <div style={{ padding: '10px 18px', borderTop: `1px solid ${c.borderDim}` }}>
              <a href={hfxSelected.htmlUrl} target="_blank" rel="noreferrer" style={{ color: c.green, fontFamily: c.font, fontSize: 10, textDecoration: 'none' }}>view on github ↗</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

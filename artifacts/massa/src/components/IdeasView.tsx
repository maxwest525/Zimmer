import { useState, useEffect, useRef, useCallback } from 'react'

type Idea = {
  id: number
  content: string
  category: string
  source: string
  starred: boolean
  archived: boolean
  enrichmentSummary: string | null
  enrichmentUrls: string | null
  enrichmentTechnologies: string | null
  enrichmentError: string | null
  createdAt: string
  updatedAt: string
}

const CATEGORIES = ['general', 'feature', 'design', 'bug', 'research', 'marketing']
const SOURCE_ICONS: Record<string, string> = {
  web: '⌨',
  email: '✉',
  sms: '📱',
  inbox: '📥',
}

const c = {
  bg: '#0a0d10',
  panel: '#080a0e',
  panelAlt: '#0c0f14',
  border: '#1e2330',
  borderLight: '#252a35',
  text: '#e8eaed',
  muted: '#9ca3af',
  green: '#34d399',
  font: '"JetBrains Mono", Menlo, monospace',
}

export function IdeasView() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('general')
  const [filter, setFilter] = useState<'all' | 'starred'>('all')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const apiBase = import.meta.env.DEV ? '/api' : '/api'

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/ideas`)
      if (res.ok) {
        const data = await res.json()
        setIdeas(data)
      }
    } catch (err) {
      console.error('Failed to fetch ideas:', err)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const addIdea = async () => {
    if (!inputValue.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`${apiBase}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputValue.trim(), category: selectedCategory, source: 'web' }),
      })
      if (res.ok) {
        const idea = await res.json()
        setIdeas(prev => [idea, ...prev])
        setInputValue('')
        setSelectedCategory('general')
        if (/instagram\.com\//i.test(idea.content)) {
          setTimeout(() => fetchIdeas(), 8000)
        }
      }
    } catch (err) {
      console.error('Failed to add idea:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStar = async (id: number, starred: boolean) => {
    try {
      const res = await fetch(`${apiBase}/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !starred }),
      })
      if (res.ok) {
        setIdeas(prev => prev.map(i => i.id === id ? { ...i, starred: !starred } : i))
      }
    } catch (err) {
      console.error('Failed to toggle star:', err)
    }
  }

  const archiveIdea = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      if (res.ok) {
        setIdeas(prev => prev.filter(i => i.id !== id))
      }
    } catch (err) {
      console.error('Failed to archive idea:', err)
    }
  }

  const deleteIdea = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/ideas/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setIdeas(prev => prev.filter(i => i.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete idea:', err)
    }
  }

  const startEditing = (idea: Idea) => {
    setEditingId(idea.id)
    setEditValue(idea.content)
    setTimeout(() => editRef.current?.focus(), 50)
  }

  const saveEdit = async (id: number) => {
    if (!editValue.trim()) return
    try {
      const res = await fetch(`${apiBase}/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editValue.trim() }),
      })
      if (res.ok) {
        setIdeas(prev => prev.map(i => i.id === id ? { ...i, content: editValue.trim() } : i))
        setEditingId(null)
      }
    } catch (err) {
      console.error('Failed to save edit:', err)
    }
  }

  const filteredIdeas = filter === 'starred' ? ideas.filter(i => i.starred) : ideas

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ border: `1px solid ${c.border}`, background: c.panel, borderRadius: 10, padding: 20, boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ color: c.green, fontSize: 14, fontFamily: c.font }}>{'>'}</span>
          <span style={{ color: c.text, fontSize: 14, fontWeight: 600, fontFamily: c.font, letterSpacing: '0.04em' }}>CAPTURE IDEA</span>
          <span style={{ color: c.muted, fontSize: 11, fontFamily: c.font, marginLeft: 'auto' }}>ideas auto-save instantly</span>
        </div>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              addIdea()
            }
          }}
          placeholder="What's on your mind? Type an idea, feature thought, or anything worth remembering..."
          rows={3}
          style={{
            width: '100%',
            background: c.bg,
            border: `1px solid ${c.borderLight}`,
            borderRadius: 8,
            padding: '12px 14px',
            color: c.text,
            fontSize: 13,
            fontFamily: c.font,
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: selectedCategory === cat ? `${c.green}18` : 'transparent',
                  border: `1px solid ${selectedCategory === cat ? c.green + '44' : c.borderLight}`,
                  color: selectedCategory === cat ? c.green : c.muted,
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: c.font,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'lowercase',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            onClick={addIdea}
            disabled={!inputValue.trim() || submitting}
            style={{
              background: inputValue.trim() ? c.green : c.borderLight,
              border: 'none',
              color: inputValue.trim() ? '#0a0d10' : c.muted,
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: c.font,
              cursor: inputValue.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s',
              letterSpacing: '0.05em',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'SAVING...' : 'SAVE'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 2, background: c.panel, border: `1px solid ${c.border}`, borderRadius: 8, padding: 2 }}>
          {(['all', 'starred'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? c.borderLight : 'transparent',
                border: 'none',
                color: filter === f ? c.text : c.muted,
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: c.font,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {f === 'starred' ? '★ starred' : 'all ideas'}
            </button>
          ))}
        </div>
        <span style={{ color: c.muted, fontSize: 11, fontFamily: c.font }}>
          {filteredIdeas.length} idea{filteredIdeas.length !== 1 ? 's' : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: c.muted, fontSize: 10, fontFamily: c.font, opacity: 0.7 }}>TIP: text ideas to <span style={{ color: c.text, opacity: 0.8 }}>(877) 766-3212</span></span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ color: c.muted, fontSize: 12, fontFamily: c.font, padding: 20, textAlign: 'center' }}>Loading ideas...</div>
        ) : filteredIdeas.length === 0 ? (
          <div style={{ color: c.muted, fontSize: 13, fontFamily: c.font, padding: 40, textAlign: 'center', lineHeight: 1.8 }}>
            {filter === 'starred' ? 'No starred ideas yet. Star the ones worth building.' : 'No ideas yet. Start capturing thoughts above.'}
          </div>
        ) : (
          filteredIdeas.map(idea => (
            <div
              key={idea.id}
              style={{
                border: `1px solid ${c.border}`,
                background: c.panel,
                borderRadius: 8,
                padding: '12px 16px',
                transition: 'all 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = c.borderLight }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = c.border }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <button
                  onClick={() => toggleStar(idea.id, idea.starred)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 0,
                    marginTop: 1,
                    color: idea.starred ? '#fbbf24' : c.muted,
                    opacity: idea.starred ? 1 : 0.4,
                    transition: 'all 0.15s',
                  }}
                  title={idea.starred ? 'Unstar' : 'Star this idea'}
                >
                  {idea.starred ? '★' : '☆'}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === idea.id ? (
                    <div>
                      <textarea
                        ref={editRef}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(idea.id) }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        style={{
                          width: '100%',
                          background: c.bg,
                          border: `1px solid ${c.green}44`,
                          borderRadius: 6,
                          padding: '8px 10px',
                          color: c.text,
                          fontSize: 12,
                          fontFamily: c.font,
                          resize: 'vertical',
                          outline: 'none',
                          lineHeight: 1.5,
                          boxSizing: 'border-box',
                        }}
                        rows={2}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button onClick={() => saveEdit(idea.id)} style={{ background: c.green, border: 'none', color: c.bg, padding: '4px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: c.font, cursor: 'pointer' }}>SAVE</button>
                        <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: `1px solid ${c.borderLight}`, color: c.muted, padding: '4px 12px', borderRadius: 4, fontSize: 10, fontFamily: c.font, cursor: 'pointer' }}>CANCEL</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEditing(idea)}
                      style={{
                        color: c.text,
                        fontSize: 12,
                        fontFamily: c.font,
                        lineHeight: 1.6,
                        cursor: 'text',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {idea.content}
                    </div>
                  )}
                  {idea.enrichmentSummary && (
                    <div style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      background: '#0d1117',
                      border: `1px solid ${c.border}`,
                      borderRadius: 6,
                    }}>
                      <div style={{ color: '#a78bfa', fontSize: 9, fontFamily: c.font, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, opacity: 0.8 }}>
                        AI Summary
                      </div>
                      <div style={{ color: c.text, fontSize: 11, fontFamily: c.font, lineHeight: 1.6, opacity: 0.9 }}>
                        {idea.enrichmentSummary}
                      </div>
                      {idea.enrichmentUrls && (() => {
                        try {
                          const urls = JSON.parse(idea.enrichmentUrls) as string[];
                          if (urls.length === 0) return null;
                          return (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ color: '#60a5fa', fontSize: 9, fontFamily: c.font, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, opacity: 0.8 }}>
                                Mentioned Links
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {urls.map((url, i) => (
                                  <a
                                    key={i}
                                    href={url.startsWith('http') ? url : `https://${url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#60a5fa', fontSize: 11, fontFamily: c.font, textDecoration: 'none', opacity: 0.9 }}
                                    onMouseEnter={e => { (e.target as HTMLElement).style.textDecoration = 'underline' }}
                                    onMouseLeave={e => { (e.target as HTMLElement).style.textDecoration = 'none' }}
                                  >
                                    {url}
                                  </a>
                                ))}
                              </div>
                            </div>
                          );
                        } catch { return null; }
                      })()}
                      {idea.enrichmentTechnologies && (() => {
                        try {
                          const techs = JSON.parse(idea.enrichmentTechnologies) as string[];
                          if (techs.length === 0) return null;
                          return (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ color: '#fbbf24', fontSize: 9, fontFamily: c.font, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, opacity: 0.8 }}>
                                Technologies
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {techs.map((tech, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      background: '#fbbf2415',
                                      border: '1px solid #fbbf2430',
                                      color: '#fbbf24',
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      fontSize: 10,
                                      fontFamily: c.font,
                                    }}
                                  >
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  )}
                  {idea.enrichmentError && !idea.enrichmentSummary && (
                    <div style={{
                      marginTop: 8,
                      color: c.muted,
                      fontSize: 10,
                      fontFamily: c.font,
                      opacity: 0.6,
                      fontStyle: 'italic',
                    }}>
                      Enrichment unavailable
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <span style={{
                      background: `${c.green}10`,
                      border: `1px solid ${c.green}22`,
                      color: c.green,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 9,
                      fontFamily: c.font,
                      textTransform: 'lowercase',
                      opacity: 0.8,
                    }}>
                      {idea.category}
                    </span>
                    <span style={{ color: c.muted, fontSize: 10, fontFamily: c.font, opacity: 0.6 }}>
                      {SOURCE_ICONS[idea.source] || ''} {idea.source}
                    </span>
                    <span style={{ color: c.muted, fontSize: 10, fontFamily: c.font, opacity: 0.5 }}>
                      {formatDate(idea.createdAt)}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); archiveIdea(idea.id) }}
                        style={{ background: 'none', border: 'none', color: c.muted, fontSize: 10, fontFamily: c.font, cursor: 'pointer', opacity: 0.5, padding: '2px 6px' }}
                        title="Archive"
                      >
                        archive
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id) }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 10, fontFamily: c.font, cursor: 'pointer', opacity: 0.5, padding: '2px 6px' }}
                        title="Delete permanently"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        border: `1px solid ${c.border}`,
        background: c.panelAlt,
        borderRadius: 8,
        padding: '12px 16px',
      }}>
        <div style={{ color: c.muted, fontSize: 10, fontFamily: c.font, lineHeight: 1.6, opacity: 0.7 }}>
          <span style={{ color: c.green, opacity: 0.6 }}>{'>'}</span> Text your ideas to <span style={{ color: c.text, opacity: 0.8 }}>(877) 766-3212</span> — they'll appear here tagged as SMS. You'll get a confirmation reply. Works from any phone, anywhere.
        </div>
      </div>
    </div>
  )
}

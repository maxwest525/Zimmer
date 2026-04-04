import { useState, useRef, useEffect } from 'react'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function QuickCapture() {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  async function send() {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const r = await fetch(`${API_BASE}/api/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), category, source: 'mobile' }),
      })
      if (!r.ok) throw new Error()
      setContent('')
      setToast({ msg: 'Idea saved!', ok: true })
    } catch {
      setToast({ msg: 'Failed to save', ok: false })
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div style={{
      background: '#0a0d10', color: '#e8eaed', fontFamily: "'JetBrains Mono', monospace",
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <h1 style={{
          fontSize: 14, color: '#34d399', letterSpacing: 2,
          textTransform: 'uppercase', marginBottom: 24, textAlign: 'center',
        }}>
          &#9889; MASSA — Quick Idea
        </h1>
        <textarea
          ref={ref}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && content.trim()) { e.preventDefault(); send() } }}
          placeholder="What's on your mind?"
          style={{
            width: '100%', background: '#0c0f14', border: '1px solid #1c2028',
            borderRadius: 8, color: '#e8eaed', fontFamily: 'inherit', fontSize: 16,
            padding: 14, minHeight: 120, resize: 'vertical', outline: 'none',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
          {content.length} chars
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              flex: 1, background: '#0c0f14', border: '1px solid #1c2028',
              borderRadius: 8, color: '#e8eaed', fontFamily: 'inherit', fontSize: 14,
              padding: 10, outline: 'none',
            }}
          >
            <option value="general">General</option>
            <option value="product">Product</option>
            <option value="marketing">Marketing</option>
            <option value="engineering">Engineering</option>
            <option value="design">Design</option>
            <option value="content">Content</option>
          </select>
          <button
            onClick={send}
            disabled={!content.trim() || sending}
            style={{
              flex: 1, background: '#34d399', color: '#0a0d10', border: 'none',
              borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              padding: 12, cursor: 'pointer', opacity: (!content.trim() || sending) ? 0.4 : 1,
            }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#34d399' : '#ef4444', color: toast.ok ? '#0a0d10' : '#fff',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '10px 20px',
          borderRadius: 8,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
import { useState, useRef, useEffect } from 'react'

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function QuickCapture() {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  async function uploadVideo(ideaId: number, file: File) {
    setUploadStatus('Uploading video...')
    try {
      const fd = new FormData()
      fd.append('video', file)
      const r = await fetch(`${API_BASE}/api/ideas/${ideaId}/video`, { method: 'POST', body: fd })
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }
      setUploadStatus('Transcribing audio...')
      setTimeout(() => setUploadStatus(''), 5000)
    } catch (err) {
      setUploadStatus(`Error: ${(err as Error).message}`)
      setTimeout(() => setUploadStatus(''), 4000)
    }
  }

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
      const idea = await r.json()
      const pendingVideo = videoFile
      setContent('')
      setVideoFile(null)
      setToast({ msg: 'Idea saved!', ok: true })
      if (pendingVideo) {
        void uploadVideo(idea.id, pendingVideo)
      }
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
        <input
          ref={fileRef}
          type="file"
          accept=".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/x-m4v,video/webm"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) setVideoFile(f)
            e.target.value = ''
          }}
          style={{ display: 'none' }}
        />
        {videoFile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', background: '#0d1117', border: '1px solid #1c2028',
            borderRadius: 6, marginTop: 8, fontSize: 11, color: '#9ca3af',
          }}>
            <span>{'\uD83C\uDFA5'}</span>
            <span>{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</span>
            <button
              onClick={() => setVideoFile(null)}
              style={{
                color: '#ef4444', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: 12, marginLeft: 'auto', fontFamily: 'inherit',
              }}
            >
              x
            </button>
          </div>
        )}
        {uploadStatus && (
          <div style={{
            fontSize: 11, marginTop: 6,
            color: uploadStatus.startsWith('Error') ? '#ef4444' : '#34d399',
          }}>
            {uploadStatus}
          </div>
        )}
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
            onClick={() => fileRef.current?.click()}
            style={{
              background: 'transparent', border: '1px solid #1c2028',
              borderRadius: 8, color: '#9ca3af', fontFamily: 'inherit', fontSize: 13,
              padding: '10px 14px', cursor: 'pointer',
            }}
            title="Attach video (mp4, mov, m4v, webm)"
          >
            {'\uD83C\uDFA5'}
          </button>
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
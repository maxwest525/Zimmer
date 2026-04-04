import { useCallback, useEffect, useRef, useState } from 'react'
import { type ChatMessage, MOCK_CHAT_MESSAGES, getAgentResponsePool } from '@/data/chatData'

type Build = {
  id: string
  title: string
  summary: string
  status: string
  progress: number
  stack: string[]
  agent: string
  agentRole?: string
}

type Project = {
  id: string
  name: string
  goal: string
  status: string
  builds: Build[]
}

type ChatViewProps = {
  projects: Project[]
  selectedBuildId: string | null
  onSelectBuild: (buildId: string) => void
  messages: Record<string, ChatMessage[]>
  onMessagesChange: (messages: Record<string, ChatMessage[]>) => void
  onBackToBuild?: () => void
  onGoHome?: () => void
}

const c = {
  bg: '#060606',
  panel: '#0d0d0d',
  alt: '#111111',
  border: '#1e1e1e',
  text: '#f5f5f5',
  muted: '#8c8f8c',
  green: '#2d8a32',
  greenSoft: 'rgba(45,138,50,0.08)',
}

function renderMessageContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3)
      const newlineIdx = inner.indexOf('\n')
      const code = newlineIdx > -1 ? inner.slice(newlineIdx + 1) : inner
      return (
        <pre key={i} style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 8,
          padding: '10px 12px',
          margin: '8px 0',
          fontSize: 12,
          lineHeight: 1.6,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: '#c3e88d',
        }}>
          {code}
        </pre>
      )
    }

    const lines = part.split('\n')
    return (
      <span key={i}>
        {lines.map((line, li) => {
          if (line.startsWith('|') && line.includes('|')) {
            const cells = line.split('|').filter(c => c.trim())
            const isSeparator = cells.every(c => /^[\s-:]+$/.test(c))
            if (isSeparator) return null
            return (
              <div key={li} style={{ display: 'flex', gap: 4, fontFamily: 'monospace', fontSize: 11, color: '#bbb', margin: '1px 0' }}>
                {cells.map((cell, ci) => (
                  <span key={ci} style={{ flex: 1, padding: '2px 4px', background: '#1a1a1a', borderRadius: 2 }}>{cell.trim()}</span>
                ))}
              </div>
            )
          }

          if (/^\d+\.\s/.test(line)) {
            return <div key={li} style={{ paddingLeft: 4, marginBottom: 2 }}>{line}</div>
          }
          if (line.startsWith('- **') || line.startsWith('  - ')) {
            return <div key={li} style={{ paddingLeft: line.startsWith('  ') ? 16 : 4, marginBottom: 2 }}>{formatInline(line)}</div>
          }

          return <span key={li}>{formatInline(line)}{li < lines.length - 1 ? <br /> : null}</span>
        })}
      </span>
    )
  })
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} style={{ color: '#e0e0e0', fontWeight: 700 }}>{p.slice(2, -2)}</strong>
    }
    if (p.startsWith('`') && p.endsWith('`')) {
      return <code key={i} style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: 3, fontSize: '0.9em', fontFamily: 'monospace', color: '#82aaff' }}>{p.slice(1, -1)}</code>
    }
    return p
  })
}

export function initChatMessages(projects: Project[]): Record<string, ChatMessage[]> {
  const initial: Record<string, ChatMessage[]> = {}
  for (const p of projects) {
    for (const b of p.builds) {
      initial[b.id] = MOCK_CHAT_MESSAGES[b.id] ? [...MOCK_CHAT_MESSAGES[b.id]] : [
        { id: `${b.id}-default-1`, role: 'user', content: `Start working on ${b.title}.`, time: '12:00 PM' },
        { id: `${b.id}-default-2`, role: 'agent', content: `Understood. I'll begin building ${b.title} — ${b.summary}. Setting up the project structure now.`, time: '12:01 PM' },
        { id: `${b.id}-default-3`, role: 'agent', content: `Initial scaffolding complete. Created the base files and installed dependencies. Moving on to the core implementation.`, time: '12:03 PM' },
      ]
    }
  }
  return initial
}

export function ChatView({ projects, selectedBuildId, onSelectBuild, messages, onMessagesChange, onBackToBuild, onGoHome }: ChatViewProps) {
  const [inputValue, setInputValue] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    projects.forEach(p => { init[p.id] = true })
    return init
  })
  const [typingBuilds, setTypingBuilds] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const counterRef = useRef(0)
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const isTypingForCurrent = selectedBuildId ? (typingBuilds[selectedBuildId] || false) : false

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, selectedBuildId, typingBuilds])

  useEffect(() => {
    inputRef.current?.focus()
  }, [selectedBuildId])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  const activeBuild = (() => {
    for (const p of projects) {
      const b = p.builds.find(b => b.id === selectedBuildId)
      if (b) return { build: b, project: p }
    }
    return null
  })()

  const currentMessages = selectedBuildId ? (messages[selectedBuildId] || []) : []

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !selectedBuildId || !activeBuild) return

    const buildId = selectedBuildId

    const userMsg: ChatMessage = {
      id: `user-${++counterRef.current}`,
      role: 'user',
      content: inputValue.trim(),
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }

    onMessagesChange({
      ...messages,
      [buildId]: [...(messages[buildId] || []), userMsg],
    })
    setInputValue('')
    setTypingBuilds(prev => ({ ...prev, [buildId]: true }))

    if (timersRef.current[buildId]) {
      clearTimeout(timersRef.current[buildId])
    }

    timersRef.current[buildId] = setTimeout(() => {
      const pool = getAgentResponsePool(buildId)
      const response = pool[Math.floor(Math.random() * pool.length)]

      const agentMsg: ChatMessage = {
        id: `agent-${++counterRef.current}`,
        role: 'agent',
        content: response,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      }

      onMessagesChange({
        ...messages,
        [buildId]: [...(messages[buildId] || []), userMsg, agentMsg],
      })
      setTypingBuilds(prev => ({ ...prev, [buildId]: false }))
      delete timersRef.current[buildId]
    }, 1200 + Math.random() * 800)
  }, [inputValue, selectedBuildId, activeBuild, messages, onMessagesChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', gap: 0 }}>
      {(onBackToBuild || onGoHome) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: c.alt, borderBottom: `1px solid ${c.border}`, borderRadius: '12px 12px 0 0' }}>
          {onGoHome && (
            <button
              onClick={onGoHome}
              onMouseEnter={e => e.currentTarget.style.background = '#1e1e1e'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{ background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: c.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
              title="Go to Dashboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
          )}
          {onBackToBuild && (
            <button
              onClick={onBackToBuild}
              onMouseEnter={e => e.currentTarget.style.background = '#1e1e1e'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{ background: 'transparent', border: `1px solid ${c.border}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: c.muted, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Build
            </button>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flex: 1, gap: 0, border: `1px solid ${c.border}`, borderRadius: (onBackToBuild || onGoHome) ? '0 0 12px 12px' : '12px', overflow: 'hidden', background: c.panel }}>
      <div style={{ width: 280, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', background: c.alt, flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, color: c.muted, fontWeight: 700 }}>CONVERSATIONS</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {projects.map(project => {
            const isExpanded = expandedProjects[project.id] !== false
            return (
              <div key={project.id}>
                <div
                  onClick={() => setExpandedProjects(prev => ({ ...prev, [project.id]: !isExpanded }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, color: c.text, letterSpacing: 0.3,
                  }}
                >
                  <span style={{ fontSize: 9, color: c.muted, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▸</span>
                  <span>{project.name}</span>
                  <span style={{ fontSize: 9, color: c.muted, marginLeft: 'auto' }}>{project.builds.length}</span>
                </div>
                {isExpanded && project.builds.map(build => {
                  const isActive = selectedBuildId === build.id
                  const buildMessages = messages[build.id] || []
                  const lastMsg = buildMessages[buildMessages.length - 1]
                  return (
                    <div
                      key={build.id}
                      onClick={() => onSelectBuild(build.id)}
                      style={{
                        padding: '10px 16px 10px 34px',
                        cursor: 'pointer',
                        background: isActive ? c.greenSoft : 'transparent',
                        borderLeft: isActive ? `2px solid ${c.green}` : '2px solid transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1a1a1a' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? c.green : c.text }}>{build.agent}</span>
                        {build.agentRole && (
                          <span style={{ fontSize: 8, color: c.muted, background: '#1e1e1e', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>{build.agentRole}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: c.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {build.title}
                      </div>
                      {lastMsg && (
                        <div style={{ fontSize: 10, color: '#999', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastMsg.role === 'user' ? 'You: ' : ''}{lastMsg.content.slice(0, 60).replace(/\n/g, ' ')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: c.panel }}>
        {activeBuild ? (
          <>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: c.greenSoft, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: c.green }}>
                {activeBuild.build.agent.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{activeBuild.build.agent}</div>
                <div style={{ fontSize: 11, color: c.muted }}>{activeBuild.build.title} · {activeBuild.project.name}</div>
              </div>
              {activeBuild.build.agentRole && (
                <span style={{ fontSize: 10, color: c.green, background: c.greenSoft, border: `1px solid ${c.green}44`, padding: '2px 8px', borderRadius: 999, fontWeight: 600, marginLeft: 'auto' }}>{activeBuild.build.agentRole}</span>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentMessages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'agent' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.green }}>{activeBuild.build.agent}</span>
                      {activeBuild.build.agentRole && <span style={{ fontSize: 8, color: c.muted, background: '#1e1e1e', padding: '1px 4px', borderRadius: 3 }}>{activeBuild.build.agentRole}</span>}
                    </div>
                  )}
                  <div style={{
                    background: msg.role === 'user' ? '#1a1a1a' : '#0a0a0a',
                    border: `1px solid ${msg.role === 'user' ? '#2e2e2e' : '#1a1a1a'}`,
                    borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    padding: '10px 14px',
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: c.text,
                    wordBreak: 'break-word',
                  }}>
                    {renderMessageContent(msg.content)}
                  </div>
                  <div style={{ fontSize: 9, color: '#888', marginTop: 4, padding: '0 4px' }}>{msg.time}</div>
                </div>
              ))}
              {isTypingForCurrent && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '85%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.green }}>{activeBuild.build.agent}</span>
                  </div>
                  <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', fontSize: 13, color: c.muted }}>
                    <span style={{ animation: 'phase-pulse 1.5s ease-in-out infinite' }}>Typing</span>
                    <span style={{ animation: 'phase-pulse 1.5s ease-in-out infinite 0.2s' }}>.</span>
                    <span style={{ animation: 'phase-pulse 1.5s ease-in-out infinite 0.4s' }}>.</span>
                    <span style={{ animation: 'phase-pulse 1.5s ease-in-out infinite 0.6s' }}>.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '12px 20px', borderTop: `1px solid ${c.border}`, background: c.alt }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                <button
                  onClick={() => setShowAttachMenu(prev => !prev)}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => { if (!showAttachMenu) e.currentTarget.style.color = '#888' }}
                  style={{ background: 'transparent', border: 'none', color: showAttachMenu ? '#fff' : '#888', cursor: 'pointer', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                  title="Attach files"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                </button>
                {showAttachMenu && (
                  <div style={{ position: 'absolute', bottom: 44, left: 0, background: '#1a1a1a', border: '1px solid #333', borderRadius: 14, padding: '6px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 10 }}>
                    {[
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, label: 'Photo Library' },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>, label: 'Take Photo or Video' },
                      { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, label: 'Choose Files' },
                    ].map((item, i) => (
                      <div key={i} onClick={() => setShowAttachMenu(false)}
                        onMouseEnter={e => e.currentTarget.style.background = '#252525'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', color: '#ddd', fontSize: 13, fontWeight: 500, transition: 'background 0.12s', borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                        <span style={{ color: '#888', display: 'flex' }}>{item.icon}</span>
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${activeBuild.build.agent}...`}
                  disabled={isTypingForCurrent}
                  style={{
                    flex: 1,
                    background: '#0a0a0a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: c.text,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = c.green}
                  onBlur={e => e.currentTarget.style.borderColor = '#2a2a2a'}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTypingForCurrent}
                  style={{
                    background: inputValue.trim() && !isTypingForCurrent ? c.green : '#1a1a1a',
                    color: inputValue.trim() && !isTypingForCurrent ? '#081008' : c.muted,
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 18px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: inputValue.trim() && !isTypingForCurrent ? 'pointer' : 'default',
                    transition: 'background 0.15s, color 0.15s',
                    flexShrink: 0,
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 32, color: '#222' }}>💬</div>
            <div style={{ fontSize: 14, color: c.muted, fontWeight: 600 }}>Select a conversation</div>
            <div style={{ fontSize: 12, color: '#888' }}>Choose a build from the left panel to view its chat thread</div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

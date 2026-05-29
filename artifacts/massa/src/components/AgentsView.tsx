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

type HfxAgent = {
  id: string
  name: string
  description?: string
  model?: string | null
  toolkits?: string[]
  is_default?: boolean
}

type RunResult = {
  status?: string
  result?: string
  threadId?: string
  agentName?: string
  error?: string
}

function prettyToolkit(t: string): string {
  return t.replace(/_toolkit$/, '').replace(/_/g, ' ')
}

export function AgentsView({ onBack }: { onBack: () => void }) {
  const [agents, setAgents] = useState<HfxAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prompts, setPrompts] = useState<Record<string, string>>({})
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, RunResult>>({})

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/skills/hyperfx/agents`)
      if (res.status === 503) {
        setError('Hyper is not connected to this workspace yet.')
        return
      }
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setAgents(Array.isArray(data.agents) ? data.agents : [])
    } catch {
      setError('Could not load your Hyper agents. Try again shortly.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const runAgent = useCallback(async (agent: HfxAgent) => {
    const prompt = (prompts[agent.id] ?? '').trim()
    if (!prompt || running[agent.id]) return
    setRunning(prev => ({ ...prev, [agent.id]: true }))
    setResults(prev => {
      const next = { ...prev }
      delete next[agent.id]
      return next
    })
    try {
      const res = await fetch(`${apiBase}/skills/hyperfx/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, instructions: prompt }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResults(prev => ({
          ...prev,
          [agent.id]: { error: data.detail || data.error || 'Run failed.' },
        }))
        return
      }
      setResults(prev => ({
        ...prev,
        [agent.id]: {
          status: data.status,
          result: data.result,
          threadId: data.thread_id,
          agentName: data.agent_name,
        },
      }))
    } catch {
      setResults(prev => ({
        ...prev,
        [agent.id]: { error: 'Could not reach Hyper. Try again shortly.' },
      }))
    } finally {
      setRunning(prev => ({ ...prev, [agent.id]: false }))
    }
  }, [prompts, running])

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
        <button
          onClick={fetchAgents}
          disabled={loading}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#141e14' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0c1210' }}
          style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid rgba(52,211,153,0.2)`, background: '#0c1210', color: c.green, fontWeight: 700, fontSize: 10, cursor: loading ? 'default' : 'pointer', fontFamily: c.font, transition: 'all 0.2s ease' }}>
          {loading ? 'SYNCING…' : '↻ REFRESH'}
        </button>
      </div>

      <div style={{ fontSize: 10, color: c.muted, fontFamily: c.font, marginBottom: 16, lineHeight: 1.6 }}>
        Your <span style={{ color: c.green, fontWeight: 700 }}>Hyper</span> agents — each one a worker with its own job and toolset. Give it a task and Run it live through the connected Hyper workspace. Need something bespoke? Build a custom agent in Hyper that does whatever you define.
      </div>

      {error && (
        <div style={{ padding: '10px 12px', marginBottom: 14, color: c.amber, fontFamily: c.font, fontSize: 11, lineHeight: 1.6, border: `1px solid ${c.borderDim}`, borderRadius: 6 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 24, color: c.muted, fontFamily: c.font, fontSize: 11 }}>Loading your Hyper agents…</div>
      ) : agents.length === 0 && !error ? (
        <div style={{ padding: 24, color: c.muted, fontFamily: c.font, fontSize: 11 }}>No Hyper agents found in this workspace.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
          {agents.map(agent => {
            const isRunning = !!running[agent.id]
            const result = results[agent.id]
            const hasPrompt = !!(prompts[agent.id] ?? '').trim()
            return (
              <div key={agent.id} style={{ background: c.panel, border: `1px solid ${agent.is_default ? 'rgba(52,211,153,0.3)' : c.borderDim}`, borderRadius: 6, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ color: c.text, fontFamily: c.font, fontSize: 13, fontWeight: 700 }}>{agent.name || 'Untitled Agent'}</span>
                    {agent.is_default && <span style={{ color: '#0a0a0a', background: c.green, fontFamily: c.font, fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.04em' }}>DEFAULT</span>}
                    {agent.model && <span style={{ color: c.blue, fontFamily: c.font, fontSize: 9 }}>{agent.model}</span>}
                  </div>
                  {agent.description && (
                    <div style={{ color: c.muted, fontFamily: c.font, fontSize: 10, lineHeight: 1.5 }}>{agent.description}</div>
                  )}
                </div>

                <div>
                  <div style={{ color: c.dim, fontFamily: c.font, fontSize: 8, letterSpacing: '0.05em', marginBottom: 5 }}>TOOLS / FEATURES</div>
                  {agent.toolkits && agent.toolkits.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {agent.toolkits.map(t => (
                        <span key={t} style={{ color: c.green, border: `1px solid rgba(52,211,153,0.25)`, background: 'rgba(52,211,153,0.05)', fontFamily: c.font, fontSize: 9, padding: '2px 6px', borderRadius: 3 }}>{prettyToolkit(t)}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: c.dim, fontFamily: c.font, fontSize: 9, fontStyle: 'italic' }}>no toolkits assigned</div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                  <textarea
                    value={prompts[agent.id] ?? ''}
                    onChange={e => setPrompts(prev => ({ ...prev, [agent.id]: e.target.value }))}
                    placeholder={`Give this agent a task… e.g. "Run a meta ads analysis for example.com"`}
                    rows={2}
                    style={{ resize: 'vertical', padding: '8px 10px', borderRadius: 4, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontFamily: c.font, fontSize: 11, lineHeight: 1.5 }} />
                  <button
                    onClick={() => runAgent(agent)}
                    disabled={isRunning || !hasPrompt}
                    onMouseEnter={e => { if (!isRunning && hasPrompt) e.currentTarget.style.background = '#141e14' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isRunning ? 'transparent' : '#0c1210' }}
                    style={{ padding: '8px 0', borderRadius: 4, border: `1px solid rgba(52,211,153,0.35)`, background: isRunning ? 'transparent' : '#0c1210', color: c.green, fontWeight: 700, fontSize: 10, letterSpacing: '0.04em', cursor: isRunning || !hasPrompt ? 'default' : 'pointer', fontFamily: c.font, opacity: hasPrompt || isRunning ? 1 : 0.5 }}>
                    {isRunning ? 'RUNNING…' : '▶ RUN AGENT'}
                  </button>
                </div>

                {result && (
                  <div style={{ border: `1px solid ${result.error ? c.borderDim : 'rgba(52,211,153,0.2)'}`, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: `1px solid ${c.borderDim}`, background: c.panelAlt }}>
                      <span style={{ color: result.error ? c.amber : c.green, fontFamily: c.font, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}>
                        {result.error ? 'RUN FAILED' : `COMPLETED${result.agentName ? ` · ${result.agentName}` : ''}`}
                      </span>
                      {result.threadId && <span style={{ color: c.dim, fontFamily: c.font, fontSize: 8 }}>thread {result.threadId.slice(0, 8)}</span>}
                    </div>
                    <pre style={{ color: result.error ? c.amber : '#ccc', fontFamily: c.font, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: 12, maxHeight: 320, overflow: 'auto' }}>{result.error || result.result || '(no output returned)'}</pre>
                  </div>
                )}
              </div>
            )
          })}

          {/* Custom build-your-own agent */}
          <a href={HYPER_AGENTS_URL} target="_blank" rel="noreferrer"
            style={{ textDecoration: 'none', background: c.panel, border: `1px dashed ${c.border}`, borderRadius: 6, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8, minHeight: 160 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.green }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = c.border }}>
            <span style={{ color: c.green, fontFamily: c.font, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>+</span>
            <span style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700 }}>Build a custom agent</span>
            <span style={{ color: c.muted, fontFamily: c.font, fontSize: 10, lineHeight: 1.5, maxWidth: 240 }}>Start blank in Hyper and give it any job, tools, tasks, and schedule — it can do anything you define.</span>
            <span style={{ color: c.green, fontFamily: c.font, fontSize: 10, fontWeight: 700 }}>open in hyper ↗</span>
          </a>
        </div>
      )}
    </div>
  )
}

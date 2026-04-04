import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { CompanyLogo, DualCompanyLogo } from '@/components/CompanyLogo'
import { MODEL_REGISTRY } from '@/data/modelRegistry'

const KEYFRAMES = `
@keyframes fadeInRow {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`

function useIsMobileIM() {
  const [m, setM] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return m
}

function useIsNarrowIM() {
  const [n, setN] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 420 : false)
  useEffect(() => {
    const h = () => setN(window.innerWidth < 420)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return n
}

export function InsideMassa() {
  const isMobile = useIsMobileIM()
  const isNarrow = useIsNarrowIM()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [, navigate] = useLocation()
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)

  const isDark = true

  useEffect(() => {
    const id = 'massa-inside-keyframes'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = KEYFRAMES
      document.head.appendChild(style)
    }
    return () => {
      const el = document.getElementById(id)
      if (el) el.remove()
    }
  }, [])

  const c = {
    bg: isDark ? '#050505' : '#f0f4ef',
    panel: isDark ? '#0d0d0d' : '#ffffff',
    alt: isDark ? '#111111' : '#f5f9f4',
    border: isDark ? '#1e1e1e' : '#cddecb',
    text: isDark ? '#f0f0f0' : '#0e120e',
    muted: isDark ? '#7a817a' : '#4e5e4e',
    green: '#2d8a32',
    soft: isDark ? 'rgba(45,138,50,0.10)' : 'rgba(45,138,50,0.08)',
    greenDark: isDark ? '#091409' : '#e4f7e2',
  }

  const nav = [
    { label: 'Dashboard', path: '/' },
    { label: 'History', path: '' },
    { label: 'Automations', path: '' },
    { label: 'Marketing', path: '' },
    { label: 'Skills', path: '' },
    { label: 'APIs', path: '' },
    { label: 'Web Scraper', path: '' },
    { label: 'Inside MASSA', path: '/inside' },
  ]

  const steps = [
    { label: 'Input', desc: 'Write your idea however it comes out.' },
    { label: 'Refine', desc: 'MASSA strengthens the wording and intent.' },
    { label: 'Classify', desc: 'The system reads what kind of work this is.' },
    { label: 'Packet', desc: 'A structured execution packet is built.' },
    { label: 'Route', desc: 'Work is directed to the right systems.' },
    { label: 'Build', desc: 'The selected layers execute in parallel.' },
  ]

  const systems = MODEL_REGISTRY.map(m => ({
    name: m.name,
    label: m.label,
    role: m.role,
    category: m.category,
    for: m.capabilities,
    why: m.reasons.default,
    color: m.color,
    logoNames: m.logoNames,
  }))

  const categoryMeta: Record<string, { title: string; color: string }> = {
    thinking: { title: 'Thinking', color: '#34d399' },
    building: { title: 'Building', color: '#818cf8' },
    interface: { title: 'Interface', color: '#f472b6' },
    automation: { title: 'Automation', color: '#a3b535' },
    research: { title: 'Research', color: '#f59e0b' },
    multimodal: { title: 'Multimodal', color: '#60a5fa' },
  }

  const groupedSystems = Object.entries(categoryMeta).map(([key, meta]) => ({
    category: key,
    ...meta,
    systems: systems.filter(s => s.category === key),
  })).filter(g => g.systems.length > 0)

  const examples = [
    {
      input: 'Build me an automated trading bot with alerts and a dashboard.',
      uses: ['Claude', 'GPT-4o', 'Claude Code', 'Lovable', 'n8n'],
      why: 'Deep reasoning + backend logic + interface + automation',
    },
    {
      input: 'Make me a landing page for my new app.',
      uses: ['Claude', 'Bolt', 'Lovable'],
      why: 'Fast scaffolding + polished UI output',
    },
    {
      input: 'Create a scraper that emails me a report every morning.',
      uses: ['Claude', 'Claude Code', 'n8n', 'Mistral'],
      why: 'Scraper logic + scheduling + fast triage',
    },
    {
      input: 'Analyze competitor pricing and build a comparison dashboard.',
      uses: ['Perplexity', 'Grok', 'Gemini', 'Replit'],
      why: 'Research + real-time reasoning + multimodal analysis + deploy',
    },
    {
      input: 'Refactor our entire auth module to use OAuth2.',
      uses: ['Claude', 'Cursor', 'Windsurf'],
      why: 'Planning + precise edits + cross-file refactoring',
    },
    {
      input: 'Classify and tag 10k support tickets, then summarize trends.',
      uses: ['Gemma', 'Mistral', 'Claude', 'n8n'],
      why: 'Fast classification + summarization + planning + automation',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, system-ui, sans-serif', padding: 16 }}>

      {/* HEADER */}
      <div style={{ height: 56, border: `1px solid ${c.border}`, background: c.panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ width: 20, height: 2, background: '#888' }} />
              <div style={{ width: 20, height: 2, background: '#888' }} />
              <div style={{ width: 20, height: 2, background: '#888' }} />
            </button>
          )}
          <div style={{ width: 28, height: 28, borderRadius: 7, background: c.green, color: '#091109', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>M</div>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Massa <span style={{ color: c.green }}>AI</span></span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: c.soft, color: c.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: `1px solid ${c.border}`, fontSize: 13 }}>M</div>
        </div>
      </div>

      {/* MOBILE NAV OVERLAY */}
      {isMobile && mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 260, height: '100%', background: c.panel, border: `1px solid ${c.border}`, padding: 16, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.3, color: c.muted, marginBottom: 10 }}>NAVIGATION</div>
            {nav.map(item => (
              <div key={item.label} onClick={() => { if (item.path) navigate(item.path); setMobileNavOpen(false) }}
                style={{ padding: '10px 11px', borderRadius: 8, marginBottom: 4, background: item.label === 'Inside MASSA' ? c.soft : 'transparent', color: item.label === 'Inside MASSA' ? c.green : c.text, fontSize: 14, fontWeight: item.label === 'Inside MASSA' ? 600 : 400, cursor: item.path ? 'pointer' : 'default' }}>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 1fr', gap: 14, minHeight: 'calc(100vh - 98px)' }}>

        {/* SIDEBAR */}
        {!isMobile && <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.3, color: c.muted, marginBottom: 10 }}>NAVIGATION</div>
            {nav.map((item) => {
              const active = item.label === 'Inside MASSA'
              return (
                <div key={item.label} onClick={() => item.path && navigate(item.path)}
                  style={{ padding: '10px 11px', borderRadius: 8, marginBottom: 4, background: active ? c.soft : 'transparent', color: active ? c.green : c.text, border: active ? `1px solid ${c.border}` : '1px solid transparent', fontSize: 14, fontWeight: active ? 600 : 400, cursor: item.path ? 'pointer' : 'default' }}>
                  {item.label}
                </div>
              )
            })}
          </div>
          <div>
            <div style={{ border: `1px solid ${c.border}`, background: c.greenDark, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, color: c.muted, marginBottom: 3 }}>Active Project</div>
              <div style={{ color: c.green, fontWeight: 700, fontSize: 13 }}>Massa Marketing Site</div>
            </div>
          </div>
        </div>}

        {/* CONTENT */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: isMobile ? 16 : 28, overflow: 'auto' }}>

          {/* HERO */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${c.border}`, background: c.soft, color: c.green, borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
              INSIDE MASSA
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>Inside MASSA</h1>
            <p style={{ margin: 0, color: c.muted, fontSize: 15, lineHeight: 1.5, maxWidth: 560 }}>
              See how MASSA interprets your idea, strengthens it, and routes it through the right systems.
            </p>
          </div>

          {/* WORKFLOW ROW — Glowing nodes with SVG connectors */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 20 }}>HOW IT WORKS</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative' }}>
              {steps.map((step, i) => {
                const isHovered = hoveredStep === i
                return (
                  <div key={step.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* Node */}
                    <div
                      onMouseEnter={() => setHoveredStep(i)}
                      onMouseLeave={() => setHoveredStep(null)}
                      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: isHovered ? c.green : '#060606',
                        border: `1.5px solid ${c.green}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        color: isHovered ? '#091109' : c.green,
                        cursor: 'default',
                        transition: 'background 0.2s, color 0.2s',
                        position: 'relative',
                        zIndex: 2,
                      }}>
                        {i + 1}
                      </div>
                    </div>
                    {/* Label + desc */}
                    <div style={{ marginTop: 10, textAlign: 'center', padding: '0 4px' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: c.text, marginBottom: 3 }}>{step.label}</div>
                      <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.4 }}>{step.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SYSTEM ARCHITECTURE PIPELINE */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>SYSTEM ARCHITECTURE</div>
            <div style={{ border: `1px solid ${c.border}`, borderRadius: 16, padding: '24px 20px 18px', background: c.alt, position: 'relative', overflow: 'hidden' }}>
              {/* Subtle grid texture */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none', zIndex: 0,
                backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(57,214,50,0.03)' : 'rgba(57,214,50,0.05)'} 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }} />
              <div style={{ position: 'relative', zIndex: 1, marginBottom: 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{
                    padding: '10px 28px',
                    background: c.green,
                    borderRadius: 12,
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: 1.5,
                    textAlign: 'center',
                  }}>MASSA</div>
                  <div style={{ width: 2, height: 20, background: c.border }} />
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isNarrow ? '1fr' : isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                  gap: isNarrow ? 10 : isMobile ? 12 : 16,
                }}>
                  {groupedSystems.map((group) => (
                    <div key={group.category} style={{
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      padding: '12px 10px 10px',
                      background: c.panel,
                      position: 'relative',
                    }}>
                      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 36, height: 3, background: group.color, borderRadius: '0 0 4px 4px' }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: group.color, letterSpacing: 1, textAlign: 'center', marginBottom: 8, marginTop: 2 }}>
                        {group.title.toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {group.systems.map((sys) => (
                          <div key={sys.name} style={{
                            border: `1px solid ${c.border}`,
                            borderRadius: 10,
                            padding: '8px 8px',
                            background: c.alt,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <div style={{ flexShrink: 0 }}>
                              {sys.logoNames ? (
                                <DualCompanyLogo names={sys.logoNames} size={22} accentColor={sys.color} />
                              ) : (
                                <CompanyLogo name={sys.name} size={24} accentColor={sys.color} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 11, color: c.text }}>{sys.name}</div>
                              <div style={{ fontSize: 9, color: c.muted }}>{sys.role}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, color: c.muted, position: 'relative', zIndex: 1 }}>
                MASSA routes each request through different systems depending on what the work needs.
              </div>
            </div>
          </div>

          {/* SYSTEM CARDS — Glassmorphism */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>THE SYSTEMS</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
              {systems.map((sys) => (
                <div key={sys.name} style={{
                  borderRadius: 14,
                  padding: 16,
                  border: `1px solid ${sys.color}cc`,
                  borderTop: `1px solid ${sys.color}`,
                  background: c.alt,
                }}>
                  <div style={{ marginBottom: 10 }}>
                    {sys.logoNames ? (
                      <DualCompanyLogo names={sys.logoNames} size={32} accentColor={sys.color} />
                    ) : (
                      <CompanyLogo name={sys.name} size={36} accentColor={sys.color} />
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{sys.name}</div>
                  <div style={{ fontSize: 11, color: sys.color, fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>{sys.role}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                    {sys.for.map(f => (
                      <span key={f} style={{
                        fontSize: 10,
                        border: `1px solid ${c.border}`,
                        padding: '2px 7px',
                        borderRadius: 999,
                        color: c.muted,
                        background: c.panel,
                        fontWeight: 500,
                      }}>{f}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: c.muted }}>{sys.why}</div>
                </div>
              ))}
            </div>
          </div>

          {/* INTERCHANGEABILITY NOTES */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>MODEL INTERCHANGEABILITY</div>
            <div style={{ border: `1px solid ${c.border}`, borderRadius: 16, padding: '20px 22px', background: c.alt }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: c.muted, lineHeight: 1.6 }}>
                MASSA picks the best model for each task, but several models can fill a similar role depending on the situation. Here's how they overlap:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                {[
                  {
                    pair: 'Claude & GPT-4o & Grok',
                    colors: ['#34d399', '#a78bfa', '#e44d26'],
                    note: 'All three handle deep reasoning and analysis. Claude excels at structured planning, GPT-4o at multi-step logic and math, and Grok brings real-time awareness with a conversational style. They can often fill a similar role depending on the task.',
                  },
                  {
                    pair: 'Gemma & Mistral',
                    colors: ['#4285f4', '#fb923c'],
                    note: 'Both are lightweight, fast models suited for quick tasks like summarization, classification, and triage. Gemma is optimized for on-device and local execution, while Mistral shines in translation and rapid inference — either can step in when speed matters most.',
                  },
                  {
                    pair: 'Lovable & Replit & Bolt',
                    colors: ['#f472b6', '#f97316', '#fbbf24'],
                    note: 'All three can produce UI and ship working apps quickly. Lovable focuses on polished front-end components, Replit handles full-stack prototyping with deployment, and Bolt specializes in rapid scaffolding and MVPs — they can substitute for one another in build-focused tasks.',
                  },
                  {
                    pair: 'Cursor & Windsurf',
                    colors: ['#818cf8', '#22d3ee'],
                    note: 'Both are code-editing tools that work across files. Cursor is best for precise refactoring and debugging, while Windsurf excels at large-scale, codebase-aware multi-file edits — either can handle code changes depending on scope.',
                  },
                  {
                    pair: 'Perplexity & Grok',
                    colors: ['#f59e0b', '#e44d26'],
                    note: 'Both can pull in current information for research. Perplexity is purpose-built for structured web search and fact-checking, while Grok offers a more conversational approach to real-time reasoning — they can often substitute when up-to-date knowledge is needed.',
                  },
                  {
                    pair: 'Gemini & GPT-4o',
                    colors: ['#60a5fa', '#a78bfa'],
                    note: 'Both support multimodal inputs and long-context analysis. Gemini specializes in vision and mixed-media tasks, while GPT-4o brings stronger structured reasoning — they can fill a similar role for complex, multi-format work.',
                  },
                ].map((item) => (
                  <div key={item.pair} style={{
                    border: `1px solid ${c.border}`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    background: c.panel,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      {item.colors.map((col, ci) => (
                        <div key={ci} style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                      ))}
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{item.pair}</span>
                    </div>
                    <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.55 }}>{item.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SWITCHING EXAMPLES TABLE */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>WHEN MASSA SWITCHES</div>
            <div style={{
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              overflow: 'hidden',
              background: c.panel,
            }}>
              {!isMobile && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr',
                  gap: 0,
                  padding: '8px 16px',
                  borderBottom: `1px solid ${c.border}`,
                  background: c.alt,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: c.muted, textTransform: 'uppercase' }}>Input</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: c.muted, textTransform: 'uppercase' }}>Routed To</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: c.muted, textTransform: 'uppercase' }}>Reason</div>
                </div>
              )}
              {examples.map((ex, i) => {
                const animDelay = `${i * 0.1}s`
                const isLast = i === examples.length - 1
                return isMobile ? (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderBottom: isLast ? 'none' : `1px solid ${c.border}`,
                    animation: `fadeInRow 0.4s ease both`,
                    animationDelay: animDelay,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.4 }}>{ex.input}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {ex.uses.map(u => (
                        <span key={u} style={{
                          fontSize: 10,
                          background: c.soft,
                          color: c.green,
                          border: `1px solid ${c.border}`,
                          padding: '2px 7px',
                          borderRadius: 999,
                          fontWeight: 600,
                        }}>{u}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.3 }}>{ex.why}</div>
                  </div>
                ) : (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1fr',
                    gap: 0,
                    padding: '10px 16px',
                    borderBottom: isLast ? 'none' : `1px solid ${c.border}`,
                    alignItems: 'center',
                    animation: `fadeInRow 0.4s ease both`,
                    animationDelay: animDelay,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: c.text, lineHeight: 1.4, paddingRight: 12 }}>{ex.input}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {ex.uses.map(u => (
                        <span key={u} style={{
                          fontSize: 10,
                          background: c.soft,
                          color: c.green,
                          border: `1px solid ${c.border}`,
                          padding: '2px 7px',
                          borderRadius: 999,
                          fontWeight: 600,
                        }}>{u}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.3 }}>{ex.why}</div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

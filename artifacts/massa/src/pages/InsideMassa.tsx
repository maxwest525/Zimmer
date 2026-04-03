import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { CompanyLogo, DualCompanyLogo } from '@/components/CompanyLogo'

const KEYFRAMES = `
@keyframes fadeInRow {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
`

export function InsideMassa() {
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
    terminalBg: isDark ? '#0a0a0a' : '#f5f5f5',
    terminalBorder: isDark ? '#2a2a2a' : '#d0d0d0',
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

  const systems: Array<{
    name: string
    label: string
    role: string
    for: string[]
    why: string
    color: string
    logoNames?: string[]
  }> = [
    {
      name: 'Claude',
      label: 'Think',
      role: 'Thinking layer',
      for: ['Intent', 'Refinement', 'Planning', 'Classification'],
      why: 'Used before anything is built.',
      color: c.green,
    },
    {
      name: 'Claude Code',
      label: 'Build',
      role: 'Build engine',
      for: ['Backend', 'APIs', 'Logic', 'Infrastructure'],
      why: 'Used for technical depth and code.',
      color: '#5aad58',
    },
    {
      name: 'Lovable / Replit',
      label: 'Interface',
      role: 'Interface layer',
      for: ['Dashboards', 'Front-end', 'Control panels', 'UI'],
      why: 'Used when the output needs a visual surface.',
      color: '#5080b8',
      logoNames: ['Lovable', 'Replit'],
    },
    {
      name: 'n8n',
      label: 'Automate',
      role: 'Automation layer',
      for: ['Routing', 'Triggers', 'Scheduling', 'Notifications'],
      why: 'Used to connect, schedule, and orchestrate.',
      color: '#9a9d48',
    },
  ]

  const examples = [
    {
      input: 'Build me an automated trading bot with alerts and a dashboard.',
      uses: ['Claude', 'Claude Code', 'Lovable', 'n8n'],
      why: 'Backend logic + interface + automation',
    },
    {
      input: 'Make me a landing page for my new app.',
      uses: ['Claude', 'Lovable'],
      why: 'Front-end focused request',
    },
    {
      input: 'Create a scraper that emails me a report every morning.',
      uses: ['Claude', 'Claude Code', 'n8n'],
      why: 'Scraper logic + scheduling',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, system-ui, sans-serif', padding: 16 }}>

      {/* HEADER */}
      <div style={{ height: 56, border: `1px solid ${c.border}`, background: c.panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: c.green, color: '#091109', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>M</div>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Massa <span style={{ color: c.green }}>AI</span></span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, background: c.soft, color: c.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: `1px solid ${c.border}`, fontSize: 13 }}>M</div>
        </div>
      </div>

      {/* LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 14, minHeight: 'calc(100vh - 98px)' }}>

        {/* SIDEBAR */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
        </div>

        {/* CONTENT */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 28, overflow: 'auto' }}>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 18, position: 'relative', zIndex: 1 }}>
                {systems.map((sys, i) => (
                  <div key={sys.name} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      flex: 1,
                      border: `1px solid ${sys.color}cc`,
                      borderRadius: 14,
                      padding: '16px 12px',
                      background: c.panel,
                      position: 'relative',
                      textAlign: 'center',
                    }}>
                      {/* Color accent bar */}
                      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 48, height: 3, background: sys.color, borderRadius: '0 0 4px 4px' }} />
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, marginTop: 4 }}>
                        {sys.logoNames ? (
                          <DualCompanyLogo names={sys.logoNames} size={28} accentColor={sys.color} />
                        ) : (
                          <CompanyLogo name={sys.name} size={32} accentColor={sys.color} />
                        )}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: sys.color, letterSpacing: 1, marginBottom: 3 }}>{sys.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{sys.name}</div>
                    </div>
                    {/* Animated SVG arrow between cards */}
                    {i < systems.length - 1 && (
                      <div style={{ padding: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                        <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
                          <line x1="2" y1="8" x2="26" y2="8" stroke={c.muted} strokeWidth="1.5" />
                          <polyline
                            points="22,4 28,8 22,12"
                            fill="none"
                            stroke={c.green}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: c.muted, position: 'relative', zIndex: 1 }}>
                MASSA routes each request through different systems depending on what the work needs.
              </div>
            </div>
          </div>

          {/* SYSTEM CARDS — Glassmorphism */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>THE SYSTEMS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {systems.map((sys) => (
                <div key={sys.name} style={{
                  borderRadius: 14,
                  padding: 16,
                  border: `1px solid ${sys.color}cc`,
                  borderTop: `2px solid ${sys.color}`,
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

          {/* TERMINAL SWITCHING EXAMPLES */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>WHEN MASSA SWITCHES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {examples.map((ex, i) => {
                const animDelay = `${i * 0.12}s`
                return (
                  <div key={i} style={{
                    borderRadius: 14,
                    border: `1px solid ${c.terminalBorder}`,
                    background: c.terminalBg,
                    overflow: 'hidden',
                    animation: `fadeInRow 0.4s ease both`,
                    animationDelay: animDelay,
                    position: 'relative',
                  }}>
                    {/* Scanline texture overlay */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.03)'} 3px, ${isDark ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.03)'} 4px)`,
                      pointerEvents: 'none',
                      borderRadius: 14,
                      zIndex: 0,
                    }} />
                    {/* Terminal header bar */}
                    <div style={{
                      padding: '8px 14px',
                      borderBottom: `1px solid ${c.terminalBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.green }} />
                      <span style={{ marginLeft: 8, fontSize: 10, color: c.muted, fontFamily: 'monospace', letterSpacing: 0.5 }}>massa — terminal</span>
                    </div>
                    <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center', position: 'relative', zIndex: 1 }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: c.green, opacity: 0.7, marginBottom: 4 }}>$ massa run</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: isDark ? '#d4f5d2' : '#1a3d18' }}>
                          <span style={{ color: c.green, opacity: 0.8 }}>›</span> {ex.input}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6, fontFamily: 'monospace', letterSpacing: 0.5 }}>ROUTING TO</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {ex.uses.map(u => {
                            return (
                              <span key={u} style={{
                                fontSize: 11,
                                background: c.soft,
                                color: c.text,
                                border: `1px solid ${c.border}`,
                                padding: '3px 9px',
                                borderRadius: 999,
                                fontWeight: 600,
                                fontFamily: 'monospace',
                              }}>{u}</span>
                            )
                          })}
                        </div>
                      </div>
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 4, fontFamily: 'monospace', letterSpacing: 0.5 }}>REASON</div>
                        <div style={{ fontSize: 12, color: c.muted, fontFamily: 'monospace' }}>{ex.why}</div>
                      </div>
                    </div>
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

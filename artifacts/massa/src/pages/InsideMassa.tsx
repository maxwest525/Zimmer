import { useState } from 'react'
import { useLocation } from 'wouter'

export function InsideMassa() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [, navigate] = useLocation()

  const isDark = theme === 'dark'

  const c = {
    bg: isDark ? '#050505' : '#f0f4ef',
    panel: isDark ? '#0d0d0d' : '#ffffff',
    alt: isDark ? '#111111' : '#f5f9f4',
    border: isDark ? '#1e1e1e' : '#cddecb',
    text: isDark ? '#f0f0f0' : '#0e120e',
    muted: isDark ? '#7a817a' : '#4e5e4e',
    green: '#39d632',
    soft: isDark ? 'rgba(57,214,50,0.13)' : 'rgba(57,214,50,0.10)',
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

  const systems = [
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
      color: '#7ef57a',
    },
    {
      name: 'Lovable / Replit',
      label: 'Interface',
      role: 'Interface layer',
      for: ['Dashboards', 'Front-end', 'Control panels', 'UI'],
      why: 'Used when the output needs a visual surface.',
      color: '#60a5fa',
    },
    {
      name: 'n8n',
      label: 'Automate',
      role: 'Automation layer',
      for: ['Routing', 'Triggers', 'Scheduling', 'Notifications'],
      why: 'Used to connect, schedule, and orchestrate.',
      color: '#d0d45b',
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
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={{ background: 'transparent', color: c.text, border: `1px solid ${c.border}`, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
            {isDark ? 'Light' : 'Dark'}
          </button>
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

          {/* WORKFLOW ROW */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>HOW IT WORKS</div>
            <div style={{ display: 'flex', gap: 0 }}>
              {steps.map((step, i) => (
                <div key={step.label} style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, border: `1px solid ${c.border}`, borderRight: i < steps.length - 1 ? 'none' : `1px solid ${c.border}`, borderRadius: i === 0 ? '12px 0 0 12px' : i === steps.length - 1 ? '0 12px 12px 0' : 0, padding: '14px 14px', background: c.alt }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 999, background: c.soft, color: c.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{step.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.45 }}>{step.desc}</div>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', color: c.muted, fontSize: 14, padding: '0 0', zIndex: 1 }}>›</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* LLM INFOGRAPHIC */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>SYSTEM ARCHITECTURE</div>
            <div style={{ border: `1px solid ${c.border}`, borderRadius: 16, padding: 20, background: c.alt }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
                {systems.map((sys, i) => (
                  <div key={sys.name} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 12px', background: c.panel, position: 'relative', textAlign: 'center' }}>
                      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 36, height: 3, background: sys.color, borderRadius: '0 0 4px 4px' }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: sys.color, letterSpacing: 1, marginBottom: 4, marginTop: 6 }}>{sys.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{sys.name}</div>
                    </div>
                    {i < systems.length - 1 && (
                      <div style={{ padding: '0 6px', color: c.muted, fontSize: 18, fontWeight: 300 }}>→</div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: c.muted }}>
                MASSA routes each request through different systems depending on what the work needs.
              </div>
            </div>
          </div>

          {/* SYSTEM CARDS */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>THE SYSTEMS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {systems.map((sys) => (
                <div key={sys.name} style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 16, background: c.alt, borderTop: `2px solid ${sys.color}` }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{sys.name}</div>
                  <div style={{ fontSize: 11, color: sys.color, fontWeight: 600, marginBottom: 10 }}>{sys.role}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                    {sys.for.map(f => (
                      <span key={f} style={{ fontSize: 11, border: `1px solid ${c.border}`, padding: '2px 7px', borderRadius: 999, color: c.muted, background: c.panel }}>{f}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: c.muted }}>{sys.why}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SWITCHING LOGIC */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 14 }}>WHEN MASSA SWITCHES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {examples.map((ex, i) => (
                <div key={i} style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 16, background: c.alt, display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: c.muted, marginBottom: 4 }}>INPUT</div>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{ex.input}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: c.muted, marginBottom: 6 }}>USES</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {ex.uses.map(u => (
                        <span key={u} style={{ fontSize: 11, background: c.soft, color: c.text, border: `1px solid ${c.border}`, padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>{u}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontSize: 11, color: c.muted, marginBottom: 4 }}>WHY</div>
                    <div style={{ fontSize: 12, color: c.muted }}>{ex.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

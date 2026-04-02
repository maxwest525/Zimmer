import { useState } from 'react'
import { useLocation } from 'wouter'

type ThemeMode = 'dark' | 'light'

export function InsideMassa() {
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [, navigate] = useLocation()

  const isDark = theme === 'dark'

  const colors = {
    bg: isDark ? '#050505' : '#f3f6f1',
    panel: isDark ? '#0d0d0d' : '#ffffff',
    panelAlt: isDark ? '#121212' : '#f8fbf6',
    border: isDark ? '#1e1e1e' : '#d7e4d6',
    text: isDark ? '#f5f5f5' : '#111411',
    muted: isDark ? '#8b928b' : '#5a6559',
    green: '#39d632',
    greenSoft: isDark ? 'rgba(57,214,50,0.14)' : 'rgba(57,214,50,0.10)',
    greenPanel: isDark ? '#0a140a' : '#e9f6e7',
    shadow: isDark ? '0 1px 2px rgba(0,0,0,0.28)' : '0 1px 2px rgba(0,0,0,0.05)',
  }

  const sidebarItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'History', path: '' },
    { label: 'Automations', path: '' },
    { label: 'Marketing', path: '' },
    { label: 'Skills', path: '' },
    { label: 'APIs', path: '' },
    { label: 'Web Scraper', path: '' },
    { label: 'Inside MASSA', path: '/inside' },
  ]

  const workflowSteps = [
    {
      title: 'Input',
      body: 'You describe what you want in plain language, even if it is messy, rough, or incomplete.',
    },
    {
      title: 'Refine',
      body: 'MASSA sharpens weak phrasing, improves clarity, and keeps your original intent intact.',
    },
    {
      title: 'Classify',
      body: 'The system determines what kind of request this is, what it needs, and how complex it is.',
    },
    {
      title: 'Build Packet',
      body: 'MASSA turns the request into a structured execution packet for the next layer.',
    },
    {
      title: 'Route',
      body: 'The system selects the right internal tools and layers based on the request.',
    },
    {
      title: 'Build',
      body: 'The selected systems begin creating the output, workflow, backend, or interface.',
    },
  ]

  const systems = [
    {
      name: 'Claude',
      role: 'Thinking layer',
      usedFor: [
        'understanding intent',
        'refining messy input',
        'planning',
        'classifying requests',
        'creating the build packet',
      ],
      why: 'Claude is used when MASSA needs reasoning, interpretation, and structure before execution begins.',
    },
    {
      name: 'Claude Code',
      role: 'Build engine',
      usedFor: [
        'backend systems',
        'trading bots',
        'infrastructure-heavy applications',
        'complex logic',
        'multi-file code work',
      ],
      why: 'Claude Code is used when a project needs technical depth and serious implementation work.',
    },
    {
      name: 'Lovable / Replit',
      role: 'Interface layer',
      usedFor: [
        'dashboards',
        'front-end experiences',
        'control panels',
        'product surfaces',
        'visual scaffolding',
      ],
      why: 'This layer is used when the system needs a visual interface, dashboard, or product-facing experience.',
    },
    {
      name: 'n8n',
      role: 'Automation layer',
      usedFor: [
        'routing',
        'notifications',
        'scheduled jobs',
        'workflow triggers',
        'operational automations',
      ],
      why: 'n8n is used when work needs to be coordinated, triggered, scheduled, or connected across systems.',
    },
  ]

  const switchingExamples = [
    {
      input: 'Build me an automated trading bot with alerts and a dashboard.',
      chooses: ['Claude', 'Claude Code', 'Lovable', 'n8n'],
      why: 'This request needs reasoning, backend logic, interface generation, and operational automation.',
    },
    {
      input: 'Make me a landing page for my new app.',
      chooses: ['Claude', 'Lovable'],
      why: 'This is primarily a front-end request and does not require a backend-first build path.',
    },
    {
      input:
        'Create a scraper that pulls competitor pricing every morning and emails me a report.',
      chooses: ['Claude', 'Claude Code', 'n8n'],
      why: 'This needs planning, scraper logic, scheduling, and automated delivery.',
    },
    {
      input: 'Help me clean up and strengthen this product idea before I build it.',
      chooses: ['Claude'],
      why: 'This request is still in the reasoning and refinement stage, so a build engine is not needed yet.',
    },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        padding: 16,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: 64,
          border: `1px solid ${colors.border}`,
          background: colors.panel,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          marginBottom: 14,
          boxShadow: colors.shadow,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: colors.green,
              color: '#091109',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            M
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Massa <span style={{ color: colors.green }}>AI</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            style={{
              background: 'transparent',
              color: colors.text,
              border: `1px solid ${colors.border}`,
              padding: '8px 12px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: colors.greenSoft,
              color: colors.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              border: `1px solid ${colors.border}`,
            }}
          >
            M
          </div>
        </div>
      </div>

      {/* 2-COLUMN LAYOUT */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 14,
          minHeight: 'calc(100vh - 110px)',
        }}
      >
        {/* SIDEBAR */}
        <div
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: colors.shadow,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                color: colors.muted,
                marginBottom: 12,
              }}
            >
              NAVIGATION
            </div>

            {sidebarItems.map((item) => {
              const active = item.label === 'Inside MASSA'
              return (
                <div
                  key={item.label}
                  onClick={() => item.path && navigate(item.path)}
                  style={{
                    padding: '12px 12px',
                    borderRadius: 10,
                    marginBottom: 8,
                    background: active ? colors.greenSoft : 'transparent',
                    color: active ? colors.green : colors.text,
                    border: active ? `1px solid ${colors.border}` : '1px solid transparent',
                    fontSize: 15,
                    fontWeight: active ? 600 : 500,
                    cursor: item.path ? 'pointer' : 'default',
                  }}
                >
                  {item.label}
                </div>
              )
            })}
          </div>

          <div>
            <div
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.greenPanel,
                borderRadius: 12,
                padding: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                Active Project
              </div>
              <div style={{ color: colors.green, fontWeight: 700 }}>Massa Marketing Site</div>
            </div>

            <div style={{ fontSize: 12, color: colors.muted }}>Secret Project</div>
            <div style={{ marginTop: 6, fontSize: 14 }}>Max and Jon</div>
          </div>
        </div>

        {/* CONTENT */}
        <div
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            padding: 22,
            overflow: 'auto',
            boxShadow: colors.shadow,
          }}
        >
          {/* HERO */}
          <div
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.panelAlt,
              borderRadius: 18,
              padding: 22,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: `1px solid ${colors.border}`,
                background: colors.greenSoft,
                color: colors.green,
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              INSIDE MASSA
            </div>

            <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1, marginBottom: 10 }}>
              See how MASSA works behind the scenes.
            </h1>

            <p
              style={{
                margin: 0,
                color: colors.muted,
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: 850,
              }}
            >
              MASSA interprets your idea, strengthens the instruction, decides what the request
              needs, and routes it through the right systems. You do not have to choose tools,
              models, or workflows manually.
            </p>
          </div>

          {/* CORE WORKFLOW */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>How it works</h2>
              <p style={{ margin: '6px 0 0', color: colors.muted, lineHeight: 1.6 }}>
                Every request follows the same core path before anything is built.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 14,
              }}
            >
              {workflowSteps.map((step, index) => (
                <div
                  key={step.title}
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: colors.panelAlt,
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: colors.greenSoft,
                      color: colors.green,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      marginBottom: 12,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ color: colors.muted, fontSize: 14, lineHeight: 1.6 }}>
                    {step.body}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: colors.muted }}>
              Every request goes through this path. The user never has to choose tools manually.
            </div>
          </section>

          {/* EXECUTION SIMULATION INFOGRAPHIC */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Execution simulation</h2>
              <p style={{ margin: '6px 0 0', color: colors.muted, lineHeight: 1.6 }}>
                When you submit a request, MASSA activates layers in sequence. Here is how a full execution unfolds in real time.
              </p>
            </div>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.panelAlt,
                borderRadius: 18,
                padding: 24,
              }}
            >
              {/* Pipeline visualization */}
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 24 }}>
                {[
                  {
                    layer: 'Claude',
                    role: 'Brain',
                    desc: 'Interprets your request, refines intent, classifies complexity, and builds the execution packet.',
                    color: colors.green,
                    phase: 'Think',
                  },
                  {
                    layer: 'n8n',
                    role: 'Routing',
                    desc: 'Reads the packet and determines which systems to activate, in what order, with what dependencies.',
                    color: '#d0d45b',
                    phase: 'Route',
                  },
                  {
                    layer: 'Claude Code',
                    role: 'Build',
                    desc: 'Writes backend logic, APIs, data models, infrastructure code, and complex multi-file systems.',
                    color: '#7ef57a',
                    phase: 'Build',
                  },
                  {
                    layer: 'Lovable',
                    role: 'UI',
                    desc: 'Generates dashboards, interfaces, control panels, and any visual product surface.',
                    color: '#60a5fa',
                    phase: 'Surface',
                  },
                ].map((step, index, arr) => (
                  <div key={step.layer} style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                    <div
                      style={{
                        flex: 1,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 14,
                        padding: 16,
                        background: colors.panel,
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: step.color,
                          borderRadius: '14px 14px 0 0',
                        }}
                      />
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: step.color,
                          letterSpacing: 1,
                          marginBottom: 8,
                          textTransform: 'uppercase',
                        }}
                      >
                        {step.phase}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                        {step.layer}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: colors.green,
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        {step.role}
                      </div>
                      <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.55 }}>
                        {step.desc}
                      </div>
                    </div>
                    {index < arr.length - 1 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 6px',
                          color: colors.muted,
                          fontSize: 18,
                          fontWeight: 700,
                        }}
                      >
                        ›
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Example execution trace */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: colors.muted,
                    marginBottom: 12,
                    textTransform: 'uppercase',
                  }}
                >
                  Example trace: "Build me a trading bot with alerts and a dashboard"
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    {
                      time: '0.0s',
                      system: 'Claude',
                      action: 'Receives raw input, identifies 3 sub-tasks: backend engine, alert system, dashboard UI',
                      color: colors.green,
                    },
                    {
                      time: '1.2s',
                      system: 'Claude',
                      action: 'Builds structured execution packet with dependencies and routing hints',
                      color: colors.green,
                    },
                    {
                      time: '2.0s',
                      system: 'n8n',
                      action: 'Routes packet: Claude Code for backend, n8n for alerts, Lovable for dashboard',
                      color: '#d0d45b',
                    },
                    {
                      time: '2.8s',
                      system: 'Claude Code',
                      action: 'Begins building trading engine: order executor, market feeds, risk module',
                      color: '#7ef57a',
                    },
                    {
                      time: '3.1s',
                      system: 'n8n',
                      action: 'Configures alert workflows: Slack integration, email templates, price triggers',
                      color: '#d0d45b',
                    },
                    {
                      time: '4.5s',
                      system: 'Lovable',
                      action: 'Generates dashboard: P&L chart, open positions table, trade history view',
                      color: '#60a5fa',
                    },
                    {
                      time: '8.2s',
                      system: 'All',
                      action: 'Execution complete — 3 parallel builds merged into one project output',
                      color: colors.text,
                    },
                  ].map((entry, i, arr) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '50px 100px 1fr',
                        gap: 12,
                        alignItems: 'start',
                        padding: '10px 0',
                        borderBottom: i < arr.length - 1 ? `1px solid ${colors.border}` : 'none',
                      }}
                    >
                      <span style={{ fontSize: 12, color: colors.muted, fontFamily: 'monospace' }}>
                        {entry.time}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: entry.color }}>
                        {entry.system}
                      </span>
                      <span style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>
                        {entry.action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key insight */}
              <div
                style={{
                  border: `1px solid ${colors.border}`,
                  background: colors.greenSoft,
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: colors.green,
                    color: '#091109',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  !
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                    Parallel execution, not sequential
                  </div>
                  <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>
                    MASSA does not wait for one system to finish before starting the next. Independent
                    sub-tasks run in parallel across multiple agents simultaneously, which is why a
                    complex project with 3-4 builds completes in seconds, not minutes.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SYSTEMS */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>The systems inside MASSA</h2>
              <p style={{ margin: '6px 0 0', color: colors.muted, lineHeight: 1.6 }}>
                Each layer has a fixed role. Different systems are used for different kinds of work.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 14,
              }}
            >
              {systems.map((system) => (
                <div
                  key={system.name}
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: colors.panelAlt,
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 10,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{system.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.green,
                        border: `1px solid ${colors.border}`,
                        background: colors.greenSoft,
                        borderRadius: 999,
                        padding: '5px 8px',
                        fontWeight: 700,
                      }}
                    >
                      {system.role}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: colors.muted, marginBottom: 10 }}>
                    Used for
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    {system.usedFor.map((item) => (
                      <span
                        key={item}
                        style={{
                          fontSize: 12,
                          border: `1px solid ${colors.border}`,
                          background: colors.panel,
                          padding: '6px 9px',
                          borderRadius: 999,
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div style={{ color: colors.muted, fontSize: 14, lineHeight: 1.65 }}>
                    {system.why}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SWITCHING LOGIC */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>When MASSA switches systems</h2>
              <p style={{ margin: '6px 0 0', color: colors.muted, lineHeight: 1.6 }}>
                Different requests call for different layers. MASSA decides the path automatically.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              {switchingExamples.map((example, index) => (
                <div
                  key={index}
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: colors.panelAlt,
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Input</div>
                    <div style={{ fontWeight: 600, lineHeight: 1.6 }}>{example.input}</div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>
                      MASSA chooses
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {example.chooses.map((item) => (
                        <span
                          key={item}
                          style={{
                            fontSize: 12,
                            border: `1px solid ${colors.border}`,
                            background: colors.greenSoft,
                            color: colors.text,
                            padding: '6px 9px',
                            borderRadius: 999,
                            fontWeight: 600,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Why</div>
                    <div style={{ color: colors.muted, lineHeight: 1.6 }}>{example.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FIXED SYSTEM LOGIC */}
          <section>
            <div style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>What stays fixed</h2>
              <p style={{ margin: '6px 0 0', color: colors.muted, lineHeight: 1.6 }}>
                MASSA is designed to feel simple, but its core workflow is structured and consistent.
              </p>
            </div>

            <div
              style={{
                border: `1px solid ${colors.border}`,
                background: colors.panelAlt,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                {[
                  'You provide the idea',
                  'MASSA strengthens the instruction',
                  'MASSA decides what the request needs',
                  'The system routes it through the right layers',
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      border: `1px solid ${colors.border}`,
                      background: colors.panel,
                      borderRadius: 14,
                      padding: 14,
                      lineHeight: 1.6,
                      fontSize: 14,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

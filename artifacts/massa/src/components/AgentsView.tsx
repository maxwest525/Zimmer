import { useState, useEffect } from 'react'
import { useThemeColors } from '@/contexts/ThemeContext'

const MASSA_AGENTS = [
  {
    role: 'coordinator',
    name: 'MASSA Coordinator',
    emoji: '🧠',
    model: 'claude-opus-4-8',
    desc: 'Orchestrates all specialists in parallel. Delegates to subagents, synthesizes outputs, ensures all layers fit together. Runs as the root of every project session.',
    skills: ['Project decomposition', 'Parallel orchestration', 'Quality synthesis'],
  },
  {
    role: 'system-architect',
    name: 'System Architect',
    emoji: '🏗️',
    model: 'claude-opus-4-8',
    desc: 'Defines data models, API surface, architecture layers, and system boundaries before a single line of code is written.',
    skills: ['DB schema design', 'API contract spec', 'System decomposition'],
  },
  {
    role: 'backend-engineer',
    name: 'Backend Engineer',
    emoji: '⚙️',
    model: 'claude-opus-4-8',
    desc: 'Builds production-grade Node.js/Express APIs, Drizzle ORM schemas, auth flows, business logic, and third-party integrations.',
    skills: ['REST APIs', 'PostgreSQL + Drizzle', 'Auth + JWT', 'Stripe', 'Redis'],
  },
  {
    role: 'frontend-engineer',
    name: 'Frontend Engineer',
    emoji: '🎨',
    model: 'claude-opus-4-8',
    desc: 'Builds React + TypeScript UIs with Tailwind CSS, glass morphism cards, spring physics animations, and pixel-perfect layouts.',
    skills: ['React + TypeScript', 'Tailwind CSS', 'Framer Motion', 'State management'],
  },
  {
    role: 'ux-designer',
    name: 'UI/UX Designer',
    emoji: '✏️',
    model: 'claude-opus-4-8',
    desc: 'Designs component systems, design tokens, user flows, and interaction specs. Works before code so engineers build the right thing.',
    skills: ['Design tokens', 'Component systems', 'User flows', 'Accessibility'],
  },
  {
    role: 'motion-designer',
    name: 'Motion Designer',
    emoji: '🌊',
    model: 'claude-opus-4-8',
    desc: 'Adds life with scroll-triggered animations, spring physics micro-interactions, page transitions, and Lottie integrations.',
    skills: ['Framer Motion', 'CSS @keyframes', 'Scroll triggers', 'Lottie'],
  },
  {
    role: 'copywriter',
    name: 'Copywriter',
    emoji: '✍️',
    model: 'claude-opus-4-8',
    desc: 'Writes conversion-optimized copy for landing pages, onboarding, emails, CTAs, and in-product microcopy.',
    skills: ['Landing page copy', 'Email sequences', 'Microcopy', 'SEO headings'],
  },
  {
    role: 'qa-engineer',
    name: 'QA Engineer',
    emoji: '🔍',
    model: 'claude-opus-4-8',
    desc: 'Reviews all code for TypeScript errors, security vulnerabilities, logic bugs, N+1 queries, and missing edge cases.',
    skills: ['Security review', 'Type safety', 'Performance audit', 'Edge cases'],
  },
]

const PROJECT_TYPE_AGENTS: Record<string, string[]> = {
  'landing-page': ['ux-designer', 'frontend-engineer', 'motion-designer', 'copywriter'],
  'saas': ['system-architect', 'backend-engineer', 'frontend-engineer', 'qa-engineer'],
  'crm': ['system-architect', 'backend-engineer', 'frontend-engineer', 'ux-designer'],
  'marketing-site': ['ux-designer', 'frontend-engineer', 'motion-designer', 'copywriter'],
  'ecommerce': ['system-architect', 'backend-engineer', 'frontend-engineer', 'ux-designer'],
  'dashboard': ['ux-designer', 'frontend-engineer', 'backend-engineer', 'motion-designer'],
  'mobile-app': ['ux-designer', 'frontend-engineer', 'motion-designer', 'backend-engineer'],
  'api': ['system-architect', 'backend-engineer', 'qa-engineer'],
  'automation': ['system-architect', 'backend-engineer', 'frontend-engineer'],
  'data-pipeline': ['system-architect', 'backend-engineer', 'frontend-engineer'],
  'video-generation': ['motion-designer', 'frontend-engineer', 'copywriter'],
}

export function AgentsView({ onBack }: { onBack: () => void }) {
  const c = useThemeColors()
  const [selectedAgent, setSelectedAgent] = useState<typeof MASSA_AGENTS[0] | null>(null)
  const [selectedType, setSelectedType] = useState<string>('saas')
  const [agentsReady, setAgentsReady] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if agents have been initialized
    fetch('/api/health').then(r => r.ok ? setAgentsReady(true) : setAgentsReady(false)).catch(() => setAgentsReady(false))
  }, [])

  const activeRoles = PROJECT_TYPE_AGENTS[selectedType] ?? PROJECT_TYPE_AGENTS['saas']

  return (
    <div style={{ gridColumn: '2 / -1', border: `1px solid ${c.border}`, background: c.bg, padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: c.text, fontFamily: c.font }}>MASSA Agents</div>
          <div style={{ fontSize: 11, color: c.muted, fontFamily: c.font }}>MASSA://sys/agents — {MASSA_AGENTS.length} persistent specialist agents</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: agentsReady ? '#34d399' : '#f59e0b', boxShadow: agentsReady ? '0 0 6px #34d399' : 'none' }} />
          <span style={{ fontSize: 10, color: agentsReady ? '#34d399' : '#f59e0b', fontFamily: c.font, fontWeight: 700 }}>
            {agentsReady === null ? 'CHECKING…' : agentsReady ? 'MANAGED AGENTS ACTIVE' : 'STREAMING MODE'}
          </span>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: c.panel, border: `1px solid rgba(52,211,153,0.2)`, borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 12, color: c.muted, lineHeight: 1.7 }}>
        <span style={{ color: '#34d399', fontWeight: 700 }}>Anthropic Managed Agents API (beta)</span> — Agents are created once and persist across all projects. When you start a project, the <span style={{ color: c.text }}>Coordinator</span> spins up a cloud session and delegates to specialists <span style={{ color: c.text }}>in parallel</span> — Architect defines the schema while Designer specs components while Copywriter drafts copy. All running simultaneously in an isolated container.
      </div>

      {/* Project type → agent roster */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: c.dim, fontFamily: c.font, letterSpacing: '0.05em', marginBottom: 8 }}>AGENT ROSTER BY PROJECT TYPE</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {Object.keys(PROJECT_TYPE_AGENTS).map(type => (
            <button key={type} onClick={() => setSelectedType(type)}
              style={{ padding: '4px 10px', borderRadius: 4, border: `1px solid ${selectedType === type ? 'rgba(52,211,153,0.4)' : c.borderDim}`, background: selectedType === type ? 'rgba(52,211,153,0.08)' : 'transparent', color: selectedType === type ? '#34d399' : c.muted, fontFamily: c.font, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              {type}
            </button>
          ))}
        </div>

        {/* Coordinator always shown first */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
          {[MASSA_AGENTS[0], ...MASSA_AGENTS.slice(1).filter(a => activeRoles.includes(a.role))].map(agent => {
            const isCoord = agent.role === 'coordinator'
            const isSelected = selectedAgent?.role === agent.role
            return (
              <div key={agent.role} onClick={() => setSelectedAgent(isSelected ? null : agent)}
                style={{ padding: '12px 14px', background: isSelected ? (isCoord ? 'rgba(52,211,153,0.06)' : c.panel) : c.panel, border: `1px solid ${isSelected ? (isCoord ? 'rgba(52,211,153,0.4)' : 'rgba(96,165,250,0.3)') : c.borderDim}`, borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = isCoord ? 'rgba(52,211,153,0.35)' : 'rgba(96,165,250,0.25)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = c.borderDim }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{agent.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700 }}>{agent.name}</span>
                      {isCoord && <span style={{ color: '#34d399', border: '1px solid rgba(52,211,153,0.3)', fontFamily: c.font, fontSize: 9, padding: '0 4px', borderRadius: 3, fontWeight: 700 }}>COORDINATOR</span>}
                    </div>
                    <div style={{ color: '#34d399', fontFamily: c.font, fontSize: 9, opacity: 0.6 }}>{agent.model}</div>
                  </div>
                </div>
                <div style={{ color: c.muted, fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>{agent.desc}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {agent.skills.map(s => (
                    <span key={s} style={{ color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.05)', fontFamily: c.font, fontSize: 10, padding: '1px 6px', borderRadius: 3 }}>{s}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* All agents (non-active for this type) */}
      {MASSA_AGENTS.slice(1).filter(a => !activeRoles.includes(a.role)).length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: c.dim, fontFamily: c.font, letterSpacing: '0.05em', marginBottom: 8 }}>OTHER AVAILABLE AGENTS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {MASSA_AGENTS.slice(1).filter(a => !activeRoles.includes(a.role)).map(agent => (
              <div key={agent.role} style={{ padding: '10px 12px', background: c.panel, border: `1px solid ${c.borderDim}`, borderRadius: 6, opacity: 0.65 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{agent.emoji}</span>
                  <span style={{ color: c.text, fontFamily: c.font, fontSize: 12, fontWeight: 700 }}>{agent.name}</span>
                </div>
                <div style={{ color: c.muted, fontSize: 11, lineHeight: 1.5 }}>{agent.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

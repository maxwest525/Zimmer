import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { InlineCompanyLogo, CompanyLogo } from '@/components/CompanyLogo'
import { NodeGraph } from '@/components/NodeGraph'
import { TimelineSwimlane } from '@/components/TimelineSwimlane'
import { ChatView } from '@/components/ChatView'
import { IdeasView } from '@/components/IdeasView'
import { ModelTooltip } from '@/components/ModelTooltip'
import { MODEL_COLORS, getModelReason } from '@/data/modelRegistry'
import { TenantSelector } from '@/components/TenantSelector'
import { useTenant } from '@/contexts/TenantContext'
import { useProjects } from '@/contexts/ProjectContext'
import { getPhaseIcon, getActionIcon, getTabIcon, ThinkingIcon, BuildingIcon } from '@/lib/actionIcons'

type Status = 'idle' | 'queued' | 'running' | 'complete' | 'failed'
type Phase = 'thinking' | 'building' | 'deploying' | 'done' | 'queued'

type Build = {
  id: string
  title: string
  summary: string
  status: Status
  progress: number
  stack: string[]
  agent: string
  agentRole?: string
  dependsOn?: string[]
  buildContext?: string
}

type ProjectLifecycle = 'active' | 'completed' | 'archived' | 'deleted'

type Project = {
  id: string
  name: string
  goal: string
  status: Status
  builds: Build[]
  lifecycle: 'active' | 'completed' | 'archived' | 'deleted'
}

const SKILL_COLORS: Record<string, string> = {
  ...MODEL_COLORS,
  'APIs': '#f59e0b',
}

const SKILL_PRIORITY = ['n8n', 'Perplexity', 'Lovable', 'Replit', 'Bolt', 'Windsurf', 'Cursor', 'Claude Code', 'Gemini', 'GPT-4o', 'Mistral', 'Grok', 'Gemma', 'APIs', 'Claude']

function skillColor(stack: string[]): string {
  for (const s of SKILL_PRIORITY) {
    if (stack.includes(s)) return SKILL_COLORS[s] || '#34d399'
  }
  return SKILL_COLORS['Claude']
}

function primarySkill(stack: string[]): string {
  for (const s of SKILL_PRIORITY) {
    if (stack.includes(s)) return s
  }
  return stack[0] || 'Claude'
}

function getPhase(builds: Build[]): Phase {
  if (builds.every(b => b.status === 'complete')) return 'done'
  if (!builds.some(b => b.status === 'running')) return 'queued'
  const running = builds.filter(b => b.status === 'running')
  const avg = running.reduce((s, b) => s + b.progress, 0) / running.length
  if (avg < 30) return 'thinking'
  if (avg < 75) return 'building'
  return 'deploying'
}

const PHASE_META: Record<Phase, { label: string; color: string; desc: string; icon: (size?: number) => React.ReactNode }> = {
  thinking: { label: 'Thinking', color: '#a78bfa', desc: 'Claude is interpreting and planning the work', icon: (s = 12) => getPhaseIcon('thinking', s) },
  building: { label: 'Building', color: '#34d399', desc: 'Claude Code is executing the build', icon: (s = 12) => getPhaseIcon('building', s) },
  deploying: { label: 'Deploying', color: '#60a5fa', desc: 'Lovable / Replit is rendering the interface', icon: (s = 12) => getPhaseIcon('deploying', s) },
  done: { label: 'Complete', color: '#4ade80', desc: 'All builds finished successfully', icon: (s = 12) => getPhaseIcon('done', s) },
  queued: { label: 'Queued', color: '#f59e0b', desc: 'Waiting to start', icon: (s = 12) => getPhaseIcon('queued', s) },
}

function StatusBadge({ status, colors, size = 'sm' }: { status: Status; colors: Record<string, string>; size?: 'sm' | 'lg' }) {
  const fs = size === 'lg' ? 13 : 11
  const pad = size === 'lg' ? '5px 12px' : '3px 8px'
  const iconSize = size === 'lg' ? 12 : 10
  if (status === 'running') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#e8eaed', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', padding: pad, borderRadius: 999, fontWeight: 600, boxShadow: '0 0 6px rgba(52,211,153,0.15)' }}>
      <span style={{ display: 'inline-flex', flexShrink: 0, color: '#34d399' }}>{getPhaseIcon('building', iconSize)}</span>
      Building
    </span>
  )
  if (status === 'queued') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#f59e0b', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ display: 'inline-flex', flexShrink: 0, color: '#f59e0b' }}>{getPhaseIcon('queued', iconSize)}</span> Pending
    </span>
  )
  if (status === 'complete') return null
  if (status === 'failed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ display: 'inline-flex', flexShrink: 0, color: '#f87171' }}>{getActionIcon('fix-error', iconSize)}</span> Failed
    </span>
  )
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#9ca3af', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.15)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
    <span style={{ display: 'inline-flex', flexShrink: 0, color: '#9ca3af' }}>{getPhaseIcon('queued', iconSize)}</span> Idle
  </span>
}

function getBuildType(stack: string[], title: string): 'ui' | 'backend' | 'database' | 'automation' {
  const t = title.toLowerCase()
  if (t.includes('ui') || t.includes('dashboard') || t.includes('homepage') || t.includes('site') || stack.includes('Lovable') || stack.includes('Replit') || stack.includes('Bolt')) return 'ui'
  if (t.includes('alert') || t.includes('scheduler') || t.includes('automation') || stack.includes('n8n')) return 'automation'
  if (t.includes('data') || t.includes('pipeline') || t.includes('schema')) return 'database'
  return 'backend'
}

function PreviewThumbnail({ buildId, buildType, sc, size = 'normal' }: { buildId?: string; buildType: 'ui' | 'backend' | 'database' | 'automation'; sc: string; size?: 'normal' | 'mini' }) {
  const h = size === 'mini' ? 34 : 140
  const w = size === 'mini' ? 48 : '100%'
  const base = { width: w, height: h, borderRadius: size === 'mini' ? 4 : '8px 8px 0 0', overflow: 'hidden' as const, position: 'relative' as const, flexShrink: 0, background: '#080808', border: '2px solid #333' }
  const m = size === 'mini'
  const f = (s: number) => m ? Math.max(1, Math.round(s * 0.45)) : s

  if (buildId === 'dashboard-ui') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        <div style={{ width: m ? 8 : 22, background: '#0c0c0c', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', padding: f(3), gap: f(3) }}>
          {!m && <div style={{ width: 8, height: 8, borderRadius: 2, background: `${sc}30`, marginBottom: 2 }} />}
          {['Portfolio', 'Positions', 'Orders', 'History', 'Analytics', 'Settings'].slice(0, m ? 3 : 6).map((label, i) => (
            <div key={i} style={{ height: f(2), background: i === 0 ? `${sc}50` : '#222', borderRadius: 1, width: i === 0 ? '100%' : '70%', position: 'relative' }}>
              {!m && i === 0 && <div style={{ position: 'absolute', left: 0, top: -1, width: 2, height: 4, background: sc, borderRadius: 1 }} />}
            </div>
          ))}
          {!m && <div style={{ marginTop: 'auto', borderTop: '1px solid #1a1a1a', paddingTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 99, background: '#222', margin: '0 auto' }} />
          </div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: f(8), background: '#0e0e0e', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: `0 ${f(4)}px`, gap: f(4) }}>
            <div style={{ height: f(2), width: m ? 10 : 30, background: '#333', borderRadius: 1 }} />
            {!m && <>
              <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
                {['1m', '5m', '1H', '4H', '1D'].map((tf, i) => <div key={i} style={{ fontSize: 3, color: i === 2 ? '#fff' : '#777', padding: '1px 3px', background: i === 2 ? `${sc}30` : 'transparent', borderRadius: 2 }}>{tf}</div>)}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
                <div style={{ width: 4, height: 4, borderRadius: 99, background: '#34d399' }} />
                <div style={{ fontSize: 3, color: '#b0b0b0' }}>Live</div>
                <div style={{ width: 16, height: 5, borderRadius: 2, background: `${sc}30`, border: `1px solid ${sc}50` }} />
              </div>
            </>}
          </div>
          <div style={{ flex: 1, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(3) }}>
            <div style={{ display: 'flex', gap: f(3) }}>
              {[
                { label: 'Total P&L', val: '+$12,840', c: '#34d399', delta: '+2.4%' },
                { label: 'Open Positions', val: '4', c: sc, delta: '' },
                { label: 'Win Rate', val: '68%', c: '#60a5fa', delta: '+3.1%' },
                { label: 'Daily Volume', val: '$48.2K', c: '#f59e0b', delta: '' },
              ].slice(0, m ? 2 : 4).map((kpi, i) => (
                <div key={i} style={{ flex: 1, background: '#111', borderRadius: f(2), padding: f(3), border: '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: f(4), color: '#888' }}>{kpi.label}</div>
                    {!m && kpi.delta && <div style={{ fontSize: 3, color: kpi.c }}>{kpi.delta}</div>}
                  </div>
                  <div style={{ fontSize: f(7), fontWeight: 700, color: kpi.c, marginTop: f(1) }}>{kpi.val}</div>
                </div>
              ))}
            </div>
            {!m && <div style={{ flex: 1, display: 'flex', gap: 3 }}>
              <div style={{ flex: 3, background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <div style={{ fontSize: 4, color: '#b0b0b0', fontWeight: 600 }}>BTC/USDT</div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 5, fontWeight: 700, color: '#34d399' }}>$68,412</span>
                    <span style={{ fontSize: 3, color: '#34d399' }}>+1.8%</span>
                  </div>
                </div>
                <svg viewBox="0 0 140 40" style={{ width: '100%', flex: 1 }} preserveAspectRatio="none">
                  {[15,18,12,20,16,22,19,25,21,28,24,30,26,32,22,28,25,35,30,27,29,33,31,26,28].map((v, i) => {
                    const x = i * 5.5 + 2; const o = v - 3; const c2 = v + 2
                    const isGreen = c2 > o
                    return <g key={i}><line x1={x} y1={40-v+2} x2={x} y2={40-v-4} stroke={isGreen ? '#34d399' : '#f87171'} strokeWidth="0.4" /><rect x={x-1.2} y={40-Math.max(o,c2)} width="2.4" height={Math.abs(c2-o)||1} fill={isGreen ? '#34d39990' : '#f8717190'} /></g>
                  })}
                  {[2,4,1,6,3,5,7,2,4,6,3,5,8,3,5,4,6,3,5,7,4,6,5,3,4].map((v, i) => (
                    <rect key={`v${i}`} x={i * 5.5 + 0.8} y={40-v*0.5} width="2.4" height={v*0.5} fill={`${sc}20`} />
                  ))}
                </svg>
              </div>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4, overflow: 'hidden' }}>
                  <div style={{ fontSize: 4, color: '#888', marginBottom: 2 }}>Open Positions</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 3, color: '#666', marginBottom: 2, borderBottom: '1px solid #151515', paddingBottom: 1 }}>
                    <span>Pair</span><span>Side</span><span>Size</span><span>P&L</span>
                  </div>
                  {[
                    { pair: 'BTC/USD', side: 'Long', size: '0.5', pnl: '+$420', c: '#34d399' },
                    { pair: 'ETH/USD', side: 'Short', size: '2.0', pnl: '-$85', c: '#f87171' },
                    { pair: 'SOL/USD', side: 'Long', size: '15', pnl: '+$162', c: '#34d399' },
                    { pair: 'AVAX', side: 'Long', size: '40', pnl: '+$34', c: '#34d399' },
                  ].map((pos, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 4, marginBottom: 2, padding: '1px 0' }}>
                      <span style={{ color: '#bbb', minWidth: 20 }}>{pos.pair}</span>
                      <span style={{ color: pos.side === 'Long' ? '#34d39980' : '#f8717180', fontSize: 3, minWidth: 14 }}>{pos.side}</span>
                      <span style={{ color: '#888', fontSize: 3, minWidth: 10 }}>{pos.size}</span>
                      <span style={{ color: pos.c, fontWeight: 600, minWidth: 16, textAlign: 'right' }}>{pos.pnl}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4 }}>
                  <div style={{ fontSize: 4, color: '#888', marginBottom: 2 }}>Order Book</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <div style={{ flex: 1 }}>
                      {[95,80,65,45,30].map((w, i) => (
                        <div key={i} style={{ position: 'relative', height: 4, marginBottom: 1 }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${w}%`, background: '#34d39915', borderRadius: 1 }} />
                          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 3, padding: '0 1px' }}>
                            <span style={{ color: '#34d399' }}>{(68412 - i * 12).toLocaleString()}</span>
                            <span style={{ color: '#777' }}>{(w * 0.02).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      {[40,60,75,55,85].map((w, i) => (
                        <div key={i} style={{ position: 'relative', height: 4, marginBottom: 1 }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${w}%`, background: '#f8717115', borderRadius: 1 }} />
                          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 3, padding: '0 1px' }}>
                            <span style={{ color: '#f87171' }}>{(68424 + i * 12).toLocaleString()}</span>
                            <span style={{ color: '#777' }}>{(w * 0.018).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>}
          </div>
        </div>
      </div>
    </div>
  )

  if (buildId === 'core-engine') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, fontFamily: 'monospace' }}>
        <div style={{ height: '100%', background: '#0c0c0c', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: f(7), background: '#161616', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: `0 ${f(4)}px`, gap: f(3) }}>
            {!m && <>
              {['#ff5f56', '#ffbd2e', '#27c93f'].map(clr => <div key={clr} style={{ width: 4, height: 4, borderRadius: 99, background: clr }} />)}
              <div style={{ marginLeft: 8, fontSize: 4, color: '#bbb', padding: '1px 4px', background: '#1e1e1e', borderRadius: 2 }}>src/engine/strategy.ts</div>
              <div style={{ fontSize: 4, color: '#888', padding: '1px 4px' }}>src/engine/order.ts</div>
              <div style={{ fontSize: 4, color: '#888', padding: '1px 4px' }}>src/engine/broker.ts</div>
              <div style={{ marginLeft: 'auto', fontSize: 3, color: '#666' }}>TypeScript</div>
            </>}
            {m && ['#ff5f56', '#ffbd2e', '#27c93f'].map(clr => <div key={clr} style={{ width: 2, height: 2, borderRadius: 99, background: clr }} />)}
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            {!m && <div style={{ width: 30, background: '#0a0a0a', borderRight: '1px solid #1a1a1a', display: 'flex' }}>
              <div style={{ width: 16, padding: '4px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 3 }}>
                {Array.from({ length: 18 }, (_, i) => (
                  <div key={i} style={{ fontSize: 4, color: i === 7 ? `${sc}60` : '#333', lineHeight: 1.6 }}>{i + 14}</div>
                ))}
              </div>
              <div style={{ width: 14, borderLeft: '1px solid #1a1a1a', padding: '4px 1px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {Array.from({ length: 18 }, (_, i) => {
                  const colors = ['#569cd650', '#569cd650', '', '#4ec9b040', '#4ec9b040', '#4ec9b040', '', '#dcdcaa30', '#9cdcfe30', '#c586c030', '#9cdcfe30', '#9cdcfe30', '#9cdcfe30', '', '#dcdcaa30', '#9cdcfe30', '#d4d4d430', '#c586c030']
                  return <div key={i} style={{ height: 5.75, background: colors[i] || 'transparent', margin: '0 1px', borderRadius: 1 }} />
                })}
              </div>
            </div>}
            <div style={{ flex: 1, padding: m ? 3 : '4px 6px', overflow: 'hidden' }}>
              {[
                [{ t: 'import', c: '#c586c0' }, { t: ' { OrderType, Side }', c: '#9cdcfe' }, { t: ' from', c: '#c586c0' }, { t: " './types'", c: '#ce9178' }],
                [{ t: 'import', c: '#c586c0' }, { t: ' { RiskEngine }', c: '#9cdcfe' }, { t: ' from', c: '#c586c0' }, { t: " './risk'", c: '#ce9178' }],
                [],
                [{ t: 'export class', c: '#569cd6' }, { t: ' StrategyRunner', c: '#4ec9b0' }, { t: ' {', c: '#d4d4d4' }],
                [{ t: '  private', c: '#569cd6' }, { t: ' risk', c: '#9cdcfe' }, { t: ': RiskEngine', c: '#4ec9b0' }],
                [{ t: '  private', c: '#569cd6' }, { t: ' positions', c: '#9cdcfe' }, { t: ': Map<', c: '#d4d4d4' }, { t: 'string', c: '#4ec9b0' }, { t: ', Position>', c: '#d4d4d4' }],
                [],
                [{ t: '  async', c: '#569cd6' }, { t: ' onSignal', c: '#dcdcaa' }, { t: '(signal: Signal) {', c: '#d4d4d4' }],
                [{ t: '    const', c: '#569cd6' }, { t: ' sizing = ', c: '#9cdcfe' }, { t: 'this', c: '#569cd6' }, { t: '.risk.calculate(signal)', c: '#9cdcfe' }],
                [{ t: '    if', c: '#c586c0' }, { t: ' (sizing.approved && sizing.qty > ', c: '#d4d4d4' }, { t: '0', c: '#b5cea8' }, { t: ') {', c: '#d4d4d4' }],
                [{ t: '      await', c: '#c586c0' }, { t: ' this', c: '#569cd6' }, { t: '.broker.submit({', c: '#9cdcfe' }],
                [{ t: '        side: signal.direction,', c: '#9cdcfe' }],
                [{ t: '        qty: sizing.qty,', c: '#9cdcfe' }],
                [{ t: '        type: OrderType.', c: '#9cdcfe' }, { t: 'LIMIT', c: '#4fc1ff' }, { t: ',', c: '#d4d4d4' }],
                [],
                [{ t: '  async', c: '#569cd6' }, { t: ' rebalance', c: '#dcdcaa' }, { t: '() {', c: '#d4d4d4' }],
                [{ t: '    const', c: '#569cd6' }, { t: ' open = ', c: '#9cdcfe' }, { t: 'this', c: '#569cd6' }, { t: '.positions.values()', c: '#9cdcfe' }],
                [{ t: '    for', c: '#c586c0' }, { t: ' (', c: '#d4d4d4' }, { t: 'const', c: '#569cd6' }, { t: ' pos ', c: '#9cdcfe' }, { t: 'of', c: '#c586c0' }, { t: ' open) {', c: '#d4d4d4' }],
              ].slice(0, m ? 3 : 18).map((tokens, i) => (
                <div key={i} style={{ fontSize: m ? 3 : 5, lineHeight: m ? 1.5 : 1.6, whiteSpace: 'nowrap', height: tokens.length === 0 ? (m ? 3 : 7) : undefined }}>
                  {tokens.map((tok, j) => <span key={j} style={{ color: tok.c }}>{tok.t}</span>)}
                </div>
              ))}
            </div>
            {!m && <div style={{ width: 8, background: '#0a0a0a', borderLeft: '1px solid #1a1a1a', padding: '4px 1px' }}>
              {Array.from({ length: 40 }, (_, i) => (
                <div key={i} style={{ height: 2, margin: '0.5px 1px', background: i > 5 && i < 25 ? `${sc}${10 + (i % 3) * 10}` : '#111', borderRadius: 0.5 }} />
              ))}
            </div>}
          </div>
          {!m && <div style={{ height: 14, background: '#161616', borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 8 }}>
            <div style={{ fontSize: 3.5, color: '#34d399' }}>0 errors</div>
            <div style={{ fontSize: 3.5, color: '#f59e0b' }}>2 warnings</div>
            <div style={{ marginLeft: 'auto', fontSize: 3.5, color: '#888' }}>Ln 21, Col 34</div>
            <div style={{ fontSize: 3.5, color: '#888' }}>UTF-8</div>
            <div style={{ fontSize: 3.5, color: '#888' }}>TS</div>
          </div>}
        </div>
      </div>
    </div>
  )

  if (buildId === 'risk-module') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(3) }}>
        <div style={{ display: 'flex', gap: f(3) }}>
          {[
            { label: 'Max Drawdown', val: '-2.5%', c: '#f87171' },
            { label: 'Position Limit', val: '$15,000', c: sc },
            { label: 'Risk Score', val: 'LOW', c: '#34d399' },
            ...(!m ? [{ label: 'Leverage', val: '3x', c: '#f59e0b' }] : []),
          ].slice(0, m ? 2 : 4).map((kpi, i) => (
            <div key={i} style={{ flex: 1, background: '#0e0e0e', borderRadius: f(3), padding: f(3), border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: f(4), color: '#888', marginBottom: f(1) }}>{kpi.label}</div>
              <div style={{ fontSize: f(7), fontWeight: 700, color: kpi.c }}>{kpi.val}</div>
            </div>
          ))}
        </div>
        {!m && <>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 3, padding: 4, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
              <div style={{ fontSize: 4, color: '#888', marginBottom: 3 }}>Portfolio Exposure by Asset</div>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
                {[
                  { label: 'BTC', v: 85, c: '#f59e0b' },
                  { label: 'ETH', v: 60, c: '#60a5fa' },
                  { label: 'SOL', v: 40, c: '#7a6aad' },
                  { label: 'AVAX', v: 25, c: '#34d399' },
                  { label: 'LINK', v: 15, c: sc },
                ].map((bar, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <div style={{ width: '80%', height: `${bar.v}%`, background: bar.v > 70 ? `${bar.c}` : `${bar.c}80`, borderRadius: '1px 1px 0 0', border: bar.v > 70 ? '1px solid #f8717150' : 'none' }} />
                    <div style={{ fontSize: 3, color: '#888' }}>{bar.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 3, padding: 4, border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: 4, color: '#888', marginBottom: 3 }}>Safety Rules</div>
              {[
                { rule: 'Max loss per trade: 1%', ok: true },
                { rule: 'Daily loss limit: 3%', ok: true },
                { rule: 'Correlation check: pass', ok: true },
                { rule: 'Position sizing: within limit', ok: true },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2, fontSize: 4 }}>
                  <div style={{ width: 4, height: 4, borderRadius: 1, background: r.ok ? '#34d39940' : '#f8717140', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 3, color: r.ok ? '#34d399' : '#f87171' }}>{r.ok ? '✓' : '!'}</div>
                  <span style={{ color: '#b0b0b0' }}>{r.rule}</span>
                </div>
              ))}
            </div>
          </div>
        </>}
      </div>
    </div>
  )

  if (buildId === 'alerts') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {!m && <div style={{ height: 10, background: '#0e0e0e', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4 }}>
          <div style={{ fontSize: 4, color: '#b0b0b0', fontWeight: 600 }}>Notifications</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
            {['All', 'Trades', 'Risk', 'System'].map((tab, i) => (
              <div key={i} style={{ fontSize: 3, color: i === 0 ? sc : '#888', padding: '1px 3px', borderRadius: 2, background: i === 0 ? `${sc}15` : 'transparent' }}>{tab}</div>
            ))}
          </div>
        </div>}
        <div style={{ flex: 1, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(2) }}>
          {[
            { icon: '⚡', title: 'BTC price crossed $68,400', desc: 'Triggered: Long entry signal on BTC/USDT', t: '2m ago', c: '#f59e0b', channel: 'Slack + Email' },
            { icon: '✓', title: 'Order filled: Buy 0.5 ETH', desc: 'Limit order filled at $3,241.50 on Binance', t: '5m ago', c: '#34d399', channel: 'Slack' },
            { icon: '⚠', title: 'Risk: exposure at 85% of limit', desc: 'Total exposure $12,750 / $15,000 max', t: '8m ago', c: '#f87171', channel: 'Email + SMS' },
            { icon: '◷', title: 'Stop-loss moved to breakeven', desc: 'SOL/USDT position trailing stop updated', t: '12m ago', c: '#60a5fa', channel: 'Slack' },
          ].slice(0, m ? 2 : 4).map((n, i) => (
            <div key={i} style={{ background: '#0e0e0e', borderRadius: f(3), padding: f(3), border: '1px solid #1a1a1a', display: 'flex', gap: f(4), alignItems: 'flex-start' }}>
              <div style={{ width: f(10), height: f(10), borderRadius: f(3), background: `${n.c}15`, border: `1px solid ${n.c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: f(5), flexShrink: 0, marginTop: f(1) }}>{n.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: f(1) }}>
                  <div style={{ fontSize: f(5), fontWeight: 600, color: '#ccc' }}>{n.title}</div>
                  <div style={{ fontSize: f(3), color: '#777', flexShrink: 0 }}>{n.t}</div>
                </div>
                {!m && <div style={{ fontSize: 4, color: '#999', marginBottom: 2 }}>{n.desc}</div>}
                {!m && <div style={{ fontSize: 3, color: n.c, background: `${n.c}10`, padding: '1px 3px', borderRadius: 2, display: 'inline-block' }}>{n.channel}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (buildId === 'backtester') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(3) }}>
        <div style={{ display: 'flex', gap: f(3) }}>
          {[
            { l: 'Total Return', v: '+34.2%', c: '#34d399' },
            { l: 'Sharpe Ratio', v: '1.82', c: sc },
            { l: 'Max Drawdown', v: '-8.1%', c: '#f87171' },
            ...(!m ? [{ l: 'Win Rate', v: '64%', c: '#60a5fa' }] : []),
          ].slice(0, m ? 2 : 4).map((s, i) => (
            <div key={i} style={{ flex: 1, background: '#0e0e0e', borderRadius: f(3), padding: f(3), border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: f(4), color: '#888' }}>{s.l}</div>
              <div style={{ fontSize: f(7), fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: f(3) }}>
          <div style={{ flex: 3, background: '#0e0e0e', borderRadius: f(3), border: '1px solid #1a1a1a', position: 'relative', overflow: 'hidden', padding: f(4) }}>
            {!m && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <div style={{ fontSize: 4, color: '#888' }}>Equity Curve — 6 Month Backtest</div>
              <div style={{ fontSize: 3, color: '#777' }}>Jan 2024 — Jun 2024</div>
            </div>}
            <svg viewBox="0 0 120 35" style={{ width: '100%', height: m ? '100%' : 'calc(100% - 10px)' }} preserveAspectRatio="none">
              <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={sc} stopOpacity="0.3" /><stop offset="100%" stopColor={sc} stopOpacity="0.02" /></linearGradient></defs>
              <polyline fill="url(#eq)" stroke="none" points="0,35 0,30 6,28 12,29 18,26 24,27 30,24 36,22 42,23 48,20 54,18 60,19 66,16 72,17 78,14 84,12 90,13 96,10 102,8 108,6 114,4 120,3 120,35" />
              <polyline fill="none" stroke={sc} strokeWidth="0.8" points="0,30 6,28 12,29 18,26 24,27 30,24 36,22 42,23 48,20 54,18 60,19 66,16 72,17 78,14 84,12 90,13 96,10 102,8 108,6 114,4 120,3" />
              {!m && <polyline fill="none" stroke="#f8717140" strokeWidth="0.5" strokeDasharray="2,2" points="0,30 6,30 12,28 18,29 24,27 30,28 36,26 42,27 48,25 54,24 60,25 66,23 72,24 78,22 84,21 90,22 96,20 102,19 108,18 114,17 120,16" />}
            </svg>
          </div>
          {!m && <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4 }}>
              <div style={{ fontSize: 4, color: '#888', marginBottom: 3 }}>Trade Log (Last 5)</div>
              {[
                { pair: 'BTC Long', result: '+4.2%', c: '#34d399' },
                { pair: 'ETH Short', result: '-1.1%', c: '#f87171' },
                { pair: 'SOL Long', result: '+2.8%', c: '#34d399' },
                { pair: 'BTC Short', result: '+1.5%', c: '#34d399' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 4, marginBottom: 2 }}>
                  <span style={{ color: '#b0b0b0' }}>{t.pair}</span>
                  <span style={{ color: t.c, fontWeight: 600 }}>{t.result}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 18, background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4 }}>
              <div style={{ fontSize: 4, color: '#888', marginBottom: 2 }}>Monthly Returns</div>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 8 }}>
                {[5,8,-2,6,9,4].map((v,i) => <div key={i} style={{ flex: 1, height: Math.abs(v), background: v > 0 ? '#34d39960' : '#f8717160', borderRadius: '1px 1px 0 0' }} />)}
              </div>
            </div>
          </div>}
        </div>
      </div>
    </div>
  )

  if (buildId === 'homepage') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#050505' }}>
        <div style={{ height: f(9), background: '#0a0a0a', borderBottom: '1px solid #151515', display: 'flex', alignItems: 'center', padding: `0 ${f(6)}px`, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: f(3) }}>
            <div style={{ fontSize: f(5), fontWeight: 800, color: '#fff', letterSpacing: f(2) }}>M</div>
            {!m && <div style={{ fontSize: 4, fontWeight: 700, color: '#b0b0b0', letterSpacing: 1.5 }}>MASSA</div>}
          </div>
          {!m && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['Features', 'How It Works', 'Pricing', 'Docs'].map((t, i) => <div key={i} style={{ fontSize: 3.5, color: '#999' }}>{t}</div>)}
            <div style={{ fontSize: 3.5, color: '#fff', background: sc, padding: '2px 6px', borderRadius: 2, fontWeight: 600 }}>Get Started</div>
          </div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: `0 ${f(8)}px` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: m ? 4 : 8, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: f(3) }}>{m ? 'Build with AI' : 'Build anything with'}</div>
              {!m && <div style={{ fontSize: 8, fontWeight: 800, color: sc, lineHeight: 1.2, marginBottom: 4 }}>AI agents, in parallel</div>}
              <div style={{ fontSize: f(3), color: '#888', lineHeight: 1.4, marginBottom: f(4), maxWidth: m ? '100%' : 70 }}>{m ? '' : 'Describe what you want. MASSA architects, builds, and deploys — running multiple agents simultaneously.'}</div>
              {!m && <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ fontSize: 4, color: '#fff', background: sc, padding: '3px 8px', borderRadius: 3, fontWeight: 600 }}>Start Building</div>
                <div style={{ fontSize: 4, color: '#bbb', background: 'transparent', border: '1px solid #2a3040', padding: '3px 8px', borderRadius: 3 }}>Watch Demo</div>
              </div>}
            </div>
            {!m && <div style={{ width: 60, height: 45, background: '#0a0a0a', borderRadius: 4, border: '1px solid #1a1a1a', padding: 4, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 3, color: '#777', marginBottom: 2 }}>Live Preview</div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                {[{ l: 'Agents', v: '4', c: sc }, { l: 'Builds', v: '12', c: '#60a5fa' }].map((k, i) => (
                  <div key={i} style={{ flex: 1, background: '#111', borderRadius: 2, padding: '2px 3px', border: '1px solid #1a1a1a' }}>
                    <div style={{ fontSize: 2.5, color: '#777' }}>{k.l}</div>
                    <div style={{ fontSize: 5, fontWeight: 700, color: k.c }}>{k.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 14 }}>
                {[3,5,4,7,6,8,5,7,9,6].map((v,i) => <div key={i} style={{ flex: 1, height: v*1.5, background: `${sc}${30+i*4}`, borderRadius: '1px 1px 0 0' }} />)}
              </div>
            </div>}
          </div>
          {!m && <>
            <div style={{ padding: '0 8px 4px', display: 'flex', justifyContent: 'center', gap: 6 }}>
              {['Claude', 'Lovable', 'Replit', 'n8n'].map((t, i) => (
                <div key={i} style={{ fontSize: 3, color: '#666', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 4, height: 4, borderRadius: 1, background: '#151920' }} />{t}
                </div>
              ))}
            </div>
            <div style={{ padding: '6px 8px', display: 'flex', gap: 4 }}>
              {[
                { icon: '⚡', title: 'Parallel Builds', desc: 'Run multiple agents building simultaneously' },
                { icon: '◎', title: 'Smart Routing', desc: 'Auto-assigns the right AI to each task' },
                { icon: '◈', title: 'Live Monitoring', desc: 'Watch every build in real-time' },
              ].map((feat, i) => (
                <div key={i} style={{ flex: 1, background: '#0a0a0a', borderRadius: 3, padding: 5, border: '1px solid #151515' }}>
                  <div style={{ fontSize: 6, marginBottom: 2 }}>{feat.icon}</div>
                  <div style={{ fontSize: 4, fontWeight: 600, color: '#ccc', marginBottom: 1 }}>{feat.title}</div>
                  <div style={{ fontSize: 3, color: '#888', lineHeight: 1.3 }}>{feat.desc}</div>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </div>
  )

  if (buildId === 'api-settings') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {!m && <div style={{ height: 10, background: '#0e0e0e', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 6px' }}>
          <div style={{ fontSize: 4, color: '#b0b0b0', fontWeight: 600 }}>API Connections</div>
          <div style={{ marginLeft: 'auto', width: 16, height: 5, borderRadius: 2, background: `${sc}20`, border: `1px solid ${sc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 3, color: sc }}>+ Add</div>
        </div>}
        <div style={{ flex: 1, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(3) }}>
          {[
            { name: 'Binance', status: 'Connected', c: '#34d399', keys: '••••R4xK', latency: '42ms' },
            { name: 'Coinbase Pro', status: 'API Key Set', c: sc, keys: '••••9mPq', latency: '68ms' },
            { name: 'Kraken', status: 'Not configured', c: '#777', keys: '—', latency: '—' },
          ].slice(0, m ? 2 : 3).map((api, i) => (
            <div key={i} style={{ background: '#0e0e0e', borderRadius: f(3), padding: f(4), border: `1px solid ${api.c === '#777' ? '#1a1a1a' : api.c + '30'}`, display: 'flex', alignItems: 'center', gap: f(4) }}>
              <div style={{ width: f(10), height: f(10), borderRadius: f(2), background: `${api.c}15`, border: `1px solid ${api.c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: f(5), fontWeight: 700, color: api.c, flexShrink: 0 }}>{api.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: f(5), fontWeight: 600, color: '#ccc', marginBottom: f(1) }}>{api.name}</div>
                {!m && <div style={{ display: 'flex', gap: 6, fontSize: 3, color: '#888' }}>
                  <span>Key: {api.keys}</span>
                  <span>Latency: {api.latency}</span>
                </div>}
              </div>
              <div style={{ fontSize: f(4), color: api.c, fontWeight: 600, padding: `${f(1)}px ${f(3)}px`, background: `${api.c}10`, borderRadius: f(2) }}>{api.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (buildId === 'crawler') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, fontFamily: 'monospace' }}>
        <div style={{ height: '100%', background: '#0c0c0c', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: f(7), background: '#161616', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: `0 ${f(4)}px`, gap: f(3) }}>
            {['#ff5f56', '#ffbd2e', '#27c93f'].map(clr => <div key={clr} style={{ width: m ? 2 : 4, height: m ? 2 : 4, borderRadius: 99, background: clr }} />)}
            {!m && <>
              <div style={{ fontSize: 4, color: '#b0b0b0', marginLeft: 6 }}>~/massa/crawler</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                <div style={{ fontSize: 3, color: '#888' }}>PID 4821</div>
                <div style={{ fontSize: 3, color: '#34d399', background: '#34d39915', padding: '1px 3px', borderRadius: 2 }}>Running</div>
              </div>
            </>}
          </div>
          {!m && <div style={{ height: 18, background: '#111', borderBottom: '1px solid #1a1a1a', padding: '3px 6px', display: 'flex', gap: 8, alignItems: 'center' }}>
            {[
              { l: 'Pages', v: '32/48', pct: 67 },
              { l: 'Items', v: '1,204', pct: 100 },
              { l: 'Errors', v: '0', pct: 0 },
            ].map((stat, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 3, color: '#888', marginBottom: 1 }}>
                  <span>{stat.l}</span><span style={{ color: i === 2 ? '#34d399' : '#b0b0b0' }}>{stat.v}</span>
                </div>
                <div style={{ height: 2, background: '#151920', borderRadius: 1 }}>
                  <div style={{ height: '100%', width: `${stat.pct}%`, background: i === 2 ? '#34d399' : sc, borderRadius: 1 }} />
                </div>
              </div>
            ))}
          </div>}
          <div style={{ flex: 1, padding: f(4), overflow: 'hidden' }}>
            {[
              { pre: '$ ', txt: 'massa crawl --target competitor-data.io --depth 3 --proxy-rotate', c: '#ccc' },
              { pre: '', txt: '', c: '' },
              { pre: '[init] ', txt: 'Headless Chromium 121.0 ready', c: '#888' },
              { pre: '[init] ', txt: 'Proxy pool: 12 endpoints loaded (3 regions)', c: '#888' },
              { pre: '[init] ', txt: 'Rate limit: 200ms delay, 3 concurrent', c: '#888' },
              { pre: '', txt: '', c: '' },
              { pre: '  → ', txt: 'GET /api/products?page=1 (200 OK, 142ms)', c: sc },
              { pre: '  → ', txt: 'GET /api/products?page=2 (200 OK, 156ms)', c: sc },
              { pre: '  ✓ ', txt: 'Parsed 234 items, 12 new entries', c: '#34d399' },
              { pre: '  ✓ ', txt: 'Price deltas: 18 items changed (+4.2% avg)', c: '#f59e0b' },
              { pre: '  → ', txt: 'GET /api/categories?page=1 (200 OK, 98ms)', c: sc },
              { pre: '  ✓ ', txt: 'Batch INSERT INTO products (412 rows, 89ms)', c: '#34d399' },
              { pre: '  → ', txt: 'GET /api/products?page=3 (200 OK, 131ms)', c: sc },
              { pre: '  ✓ ', txt: 'Dedup: 6 duplicates removed', c: '#888' },
              { pre: '', txt: '', c: '' },
              { pre: '[eta]  ', txt: 'Progress: 67% — est. 1m 14s remaining', c: '#60a5fa' },
            ].slice(0, m ? 2 : 16).map((line, i) => (
              <div key={i} style={{ fontSize: m ? 3 : 4.5, marginBottom: m ? 1 : 1.5, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.5, height: line.txt === '' ? (m ? 3 : 5) : undefined }}>
                <span style={{ color: '#777' }}>{line.pre}</span><span style={{ color: line.c }}>{line.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (buildId === 'scheduler') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {!m && <div style={{ height: 12, background: '#0e0e0e', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 6 }}>
          <div style={{ fontSize: 4, color: '#b0b0b0', fontWeight: 600 }}>Scheduled Jobs</div>
          <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
            {['Active', 'History', 'Config'].map((tab, i) => (
              <div key={i} style={{ fontSize: 3, color: i === 0 ? '#fff' : '#888', padding: '1px 4px', background: i === 0 ? `${sc}20` : 'transparent', borderRadius: 2 }}>{tab}</div>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 3, color: '#777' }}>Timezone: UTC</div>
        </div>}
        <div style={{ flex: 1, display: 'flex', flexDirection: m ? 'column' : 'row' }}>
          <div style={{ flex: 3, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(2) }}>
            {[
              { time: '06:00', task: 'Daily competitor crawl', status: 'Completed', c: '#34d399', dur: '3m 42s', cron: '0 6 * * *' },
              { time: '12:00', task: 'Export CSV + push to S3', status: 'Pending', c: '#f59e0b', dur: '~45s', cron: '0 12 * * *' },
              { time: '18:00', task: 'Email digest to team', status: 'Queued', c: '#888', dur: '~10s', cron: '0 18 * * *' },
              { time: '00:00', task: 'Database cleanup + archive', status: 'Queued', c: '#888', dur: '~2m', cron: '0 0 * * *' },
            ].slice(0, m ? 2 : 4).map((job, i) => (
              <div key={i} style={{ background: '#0e0e0e', borderRadius: f(3), padding: f(3), border: `1px solid ${job.c === '#888' ? '#1a1a1a' : job.c + '25'}`, display: 'flex', alignItems: 'center', gap: f(4) }}>
                <div style={{ fontSize: f(6), color: job.c === '#888' ? '#777' : job.c, fontFamily: 'monospace', minWidth: f(16), flexShrink: 0, fontWeight: 600 }}>{job.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: f(5), color: '#ccc', marginBottom: f(1) }}>{job.task}</div>
                  {!m && <div style={{ display: 'flex', gap: 6, fontSize: 3, color: '#777' }}>
                    <span>{job.cron}</span>
                    <span>Est: {job.dur}</span>
                  </div>}
                </div>
                <div style={{ fontSize: f(4), color: job.c, fontWeight: 600, padding: `${f(1)}px ${f(3)}px`, background: `${job.c}10`, borderRadius: f(2) }}>{job.status}</div>
              </div>
            ))}
          </div>
          {!m && <div style={{ flex: 2, borderLeft: '1px solid #1a1a1a', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              <div style={{ fontSize: 4, color: '#888', marginBottom: 3 }}>Run History (7d)</div>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 22 }}>
                {[4,4,3,4,4,2,4,4,4,3,4,4,1,4].map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {Array.from({ length: v }, (_, j) => (
                      <div key={j} style={{ height: 4, background: v < 3 ? '#f59e0b40' : '#34d39930', borderRadius: 1 }} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 3, color: '#666', marginTop: 2 }}>
                <span>Mon</span><span>Thu</span><span>Sun</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 4 }}>
              <div style={{ fontSize: 4, color: '#888', marginBottom: 3 }}>Stats</div>
              {[
                { l: 'Success rate', v: '96.4%', c: '#34d399' },
                { l: 'Avg duration', v: '2m 18s', c: '#b0b0b0' },
                { l: 'Total runs', v: '52', c: '#b0b0b0' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 4, marginBottom: 2 }}>
                  <span style={{ color: '#888' }}>{s.l}</span>
                  <span style={{ color: s.c, fontWeight: 600 }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>}
        </div>
      </div>
    </div>
  )

  if (buildType === 'ui') return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        <div style={{ width: m ? 8 : 18, background: '#0c0c0c', borderRight: '1px solid #1a1a1a' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: f(7), background: '#0e0e0e', borderBottom: '1px solid #1a1a1a' }} />
          <div style={{ flex: 1, padding: f(4) }}>
            <div style={{ height: '100%', background: `${sc}08`, borderRadius: f(2), border: `1px solid ${sc}15` }} />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0, fontFamily: 'monospace' }}>
        <div style={{ height: '100%', background: '#0c0c0c', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: f(7), background: '#161616', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', padding: `0 ${f(4)}px`, gap: f(3) }}>
            {['#ff5f56', '#ffbd2e', '#27c93f'].map(clr => <div key={clr} style={{ width: m ? 2 : 4, height: m ? 2 : 4, borderRadius: 99, background: clr }} />)}
          </div>
          <div style={{ flex: 1, padding: f(4) }}>
            {[0.7, 0.5, 0.85, 0.4, 0.6, 0.75, 0.3].slice(0, m ? 2 : 7).map((w, i) => (
              <div key={i} style={{ height: f(3), background: i === 0 ? `${sc}50` : '#1e1e1e', borderRadius: 1, marginBottom: f(3), width: `${w * 100}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Ticker<T extends { key: string }>({ lines, render }: { lines: T[]; render: (item: T) => React.ReactNode }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (lines.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), 3200)
    return () => clearInterval(t)
  }, [lines.length])
  if (lines.length === 0) return null
  return <>{render(lines[idx % lines.length])}</>
}

function getThinkingLines(builds: Build[]): { key: string; agent: string; text: string }[] {
  return builds
    .filter(b => b.status === 'running')
    .map(b => ({
      key: b.id,
      agent: b.agent,
      text: getInlineStatus(b),
    }))
}

const CODE_SNIPPETS: Record<string, { file: string; code: string }[]> = {
  backend: [
    { file: 'src/api/client.ts:88', code: 'const res = await fetch(`${B...' },
    { file: 'src/core/service.ts:43', code: 'const result = await this.repository.findById(...' },
    { file: 'src/db/schema.ts:5', code: 'export const records = pgTable("records", { id:...' },
  ],
  ui: [
    { file: 'src/components/Chart.tsx:12', code: 'return <ResponsiveContainer width="100%"...' },
    { file: 'src/pages/Dashboard.tsx:8', code: 'const [data, setData] = useState<Item[]>([])' },
    { file: 'src/lib/theme.ts:3', code: 'export const colors = { primary: "#34d399"...' },
  ],
  automation: [
    { file: 'src/workflows/notify.ts:15', code: 'await slack.send({ channel, text: alert })' },
    { file: 'src/jobs/scheduler.ts:22', code: 'cron.schedule("0 */6 * * *", async () => {' },
  ],
}

function getCodeStreamLines(builds: Build[]): { key: string; file: string; code: string }[] {
  return builds.map(b => {
    const ctx = (b.buildContext || 'backend') as string
    const snippets = CODE_SNIPPETS[ctx] || CODE_SNIPPETS.backend
    const snippet = snippets[Math.abs(b.id.charCodeAt(0)) % snippets.length]
    return { key: b.id, file: snippet.file, code: snippet.code }
  })
}

function getInlineStatus(build: { id: string; status: Status; progress: number; title: string; stack: string[] }): string {
  if (build.status === 'running') {
    if (build.progress < 30) return `Analyzing ${build.title.toLowerCase()}...`
    if (build.progress < 60) return `Compiling ${build.stack[build.stack.length - 1] || build.title}...`
    if (build.progress < 85) return `Building ${build.title.toLowerCase()}...`
    return `Deploying to Replit...`
  }
  if (build.status === 'complete') {
    const n = (build.id.charCodeAt(0) % 5) + 2
    return `${n} files generated`
  }
  if (build.status === 'failed') return 'Build failed'
  if (build.status === 'queued') return 'Waiting in queue'
  return 'Ready to build'
}

const KEYWORDS = ['async', 'function', 'await', 'const', 'let', 'if', 'return', 'export', 'import', 'from', 'throw', 'new', 'type', 'interface']

function renderCodeLine(code: string, isDark: boolean) {
  const kw = isDark ? '#c792ea' : '#7c3aed'
  const str = isDark ? '#c3e88d' : '#166534'
  const cmt = isDark ? '#546e7a' : '#9ca3af'
  const def = isDark ? '#82aaff' : '#1e40af'
  if (code.trim().startsWith('//') || code.trim().startsWith('#')) {
    return <span style={{ color: cmt }}>{code}</span>
  }
  const tokens = code.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:async|function|await|const|let|if|return|export|import|from|throw|new|type|interface)\b)/)
  return (
    <>
      {tokens.map((t, i) => {
        if ((t.startsWith('"') || t.startsWith("'") || t.startsWith('`')) && t.length > 1) return <span key={i} style={{ color: str }}>{t}</span>
        if (KEYWORDS.includes(t)) return <span key={i} style={{ color: kw, fontWeight: 600 }}>{t}</span>
        return <span key={i} style={{ color: def }}>{t}</span>
      })}
    </>
  )
}

function useScreenSize() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1440)
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1024, isDesktop: width >= 1024, width }
}

function ScrollableBuildStrip({ children, arrowColor, borderColor }: { children: React.ReactNode, arrowColor: string, borderColor: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    const mo = new MutationObserver(checkScroll)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
      mo.disconnect()
    }
  }, [checkScroll])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const firstChild = el.querySelector(':scope > * > *:first-child') as HTMLElement | null
    const gap = 10
    const step = firstChild ? firstChild.offsetWidth + gap : el.clientWidth * 0.8
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' })
  }

  const arrowBtn = (dir: 'left' | 'right', visible: boolean) => (
    <button
      onClick={(e) => { e.stopPropagation(); scroll(dir) }}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [dir === 'left' ? 'left' : 'right']: -2,
        zIndex: 5,
        width: 24,
        height: 48,
        borderRadius: dir === 'left' ? '6px 4px 4px 6px' : '4px 6px 6px 4px',
        border: `1px solid ${borderColor}`,
        background: 'rgba(10,13,16,0.92)',
        color: arrowColor,
        cursor: 'pointer',
        display: visible ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        padding: 0,
        transition: 'opacity 0.15s',
        opacity: 0.85,
        backdropFilter: 'blur(4px)',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '0.85' }}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  )

  return (
    <div style={{ position: 'relative' }}>
      {arrowBtn('left', canScrollLeft)}
      <style>{`.scrollable-build-strip::-webkit-scrollbar { display: none; }`}</style>
      <div ref={scrollRef} className="scrollable-build-strip" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {children}
      </div>
      {arrowBtn('right', canScrollRight)}
    </div>
  )
}

function CurrentProjectsView({ projects, setProjects, onBack }: { projects: Project[]; setProjects: React.Dispatch<React.SetStateAction<Project[]>>; onBack: () => void }) {
  const [currentTab, setCurrentTab] = useState<'completed' | 'archived' | 'deleted'>('completed')
  const { completedProducts, updateCompletedProduct } = useProjects()

  const tabProjects = useMemo(() => projects.filter(p => p.lifecycle === currentTab), [projects, currentTab])

  const c = { border: '#252a35', muted: '#9ca3af', green: '#34d399' }

  return (
    <div style={{ gridColumn: '2 / -1', border: `1px solid ${c.border}`, background: '#0a0d10', padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
        >←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0f0', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>Current Projects</div>
          <div style={{ fontSize: 10, color: c.muted, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>Manage completed, archived, and deleted projects</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#131619', borderRadius: 6, padding: 3, width: 'fit-content' }}>
        {(['completed', 'archived', 'deleted'] as const).map(tab => {
          const count = projects.filter(p => p.lifecycle === tab).length
          return (
            <button key={tab} onClick={() => setCurrentTab(tab)}
              style={{ border: 'none', background: currentTab === tab ? '#1e2430' : 'transparent', color: currentTab === tab ? '#f0f0f0' : c.muted, padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: currentTab === tab ? 700 : 500, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {count > 0 && <span style={{ fontSize: 9, background: currentTab === tab ? '#252a35' : '#1a1f28', padding: '1px 5px', borderRadius: 10, color: currentTab === tab ? '#f0f0f0' : c.muted }}>{count}</span>}
            </button>
          )
        })}
      </div>

      {tabProjects.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>{currentTab === 'completed' ? '✓' : currentTab === 'archived' ? '▪' : '✕'}</div>
          <div style={{ fontSize: 13, color: c.muted, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>No {currentTab} projects</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tabProjects.map(project => (
            <div key={project.id} style={{ border: `1px solid ${c.border}`, background: '#131619', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f0f0', fontFamily: '"JetBrains Mono", Menlo, monospace', marginBottom: 2 }}>{project.name}</div>
                <div style={{ fontSize: 10, color: '#666', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{project.goal} — {project.builds.length} build{project.builds.length !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, lifecycle: 'active' } : p))}
                  style={{ padding: '5px 12px', borderRadius: 4, border: `1px solid ${c.border}`, background: 'transparent', color: c.green, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >Restore</button>
                {currentTab !== 'deleted' && (
                  <button onClick={() => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, lifecycle: 'deleted' } : p))}
                    style={{ padding: '5px 12px', borderRadius: 4, border: `1px solid ${c.border}`, background: 'transparent', color: '#f87171', cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >Delete</button>
                )}
                {currentTab === 'completed' && (
                  <button onClick={() => setProjects(prev => prev.map(p => p.id === project.id ? { ...p, lifecycle: 'archived' } : p))}
                    style={{ padding: '5px 12px', borderRadius: 4, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1f28' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >Archive</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TerminalPageView({ onBack, title, command, lines }: { onBack: () => void; title: string; command: string; lines: string[] }) {
  const c = { border: '#252a35', muted: '#9ca3af', green: '#34d399' }
  return (
    <div style={{ gridColumn: '2 / -1', border: `1px solid ${c.border}`, background: '#0a0d10', padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
        >←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0f0', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{title}</div>
          <div style={{ fontSize: 10, color: c.muted, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>MASSA://sys/{command}</div>
        </div>
      </div>
      <div style={{ background: '#080808', border: `1px solid ${c.border}`, borderRadius: 6, padding: 16, fontFamily: '"JetBrains Mono", Menlo, monospace', fontSize: 11, lineHeight: 1.8 }}>
        <div style={{ color: c.green, marginBottom: 8 }}>$ massa {command} --status</div>
        {lines.map((line, i) => (
          <div key={i} style={{ color: line.startsWith('>') ? c.green : line.startsWith('!') ? '#f59e0b' : line.startsWith('[') ? '#60a5fa' : line === '' ? 'transparent' : '#ccc', whiteSpace: 'pre-wrap' }}>
            {line || '\u00A0'}
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: c.green }}>$</span>
          <span style={{ width: 7, height: 14, background: c.green, display: 'inline-block', animation: 'blink 1s step-end infinite' }} />
        </div>
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  )
}

function HistoryView({ onBack }: { onBack: () => void }) {
  return <TerminalPageView onBack={onBack} title="History" command="history" lines={[
    '[2026-04-06 03:22:11] Build #847 completed — Trading Bot / Core Engine',
    '[2026-04-06 03:18:45] Deploy #312 pushed — massa.ai (production)',
    '[2026-04-06 03:14:02] Build #846 completed — Trading Bot / Risk Module',
    '[2026-04-06 02:58:30] Agent assigned — UI Agent → Dashboard UI',
    '[2026-04-06 02:45:19] Build #845 started — Trading Bot / Core Engine',
    '[2026-04-06 02:30:00] Project created — Web Scraper',
    '[2026-04-05 23:12:44] Build #844 completed — Massa Marketing Site / Homepage',
    '[2026-04-05 22:58:11] Deploy #311 pushed — tradingbot.io (staging)',
    '',
    '> 847 events total — showing latest 8',
    '> Use --all to view full history',
  ]} />
}

function AutomationsView({ onBack }: { onBack: () => void }) {
  return <TerminalPageView onBack={onBack} title="Automations" command="automations" lines={[
    '> Registered automations: 6',
    '',
    '[auto-001]  on:build:complete    → notify:slack #builds        ACTIVE',
    '[auto-002]  on:deploy:success    → run:healthcheck             ACTIVE',
    '[auto-003]  on:error:critical    → notify:email ops@massa.ai   ACTIVE',
    '[auto-004]  cron:0 */6 * * *     → run:scraper:refresh         ACTIVE',
    '[auto-005]  on:pr:merged         → trigger:build:all           PAUSED',
    '[auto-006]  on:metric:threshold  → scale:agents +1             ACTIVE',
    '',
    '> 5 active, 1 paused',
    '> Last triggered: auto-001 at 03:22:11 UTC',
  ]} />
}

function MarketingView({ onBack }: { onBack: () => void }) {
  const c = { border: '#1e2530', muted: '#9ca3af', green: '#34d399' }

  const pipelineSteps = [
    { label: 'Analyze', desc: 'Market research, keyword gaps, competitor mapping' },
    { label: 'Strategize', desc: 'Channel mix, budget allocation, content calendar' },
    { label: 'Execute', desc: 'Launch campaigns, publish content, deploy ads' },
    { label: 'Optimize', desc: 'A/B testing, bid tuning, audience refinement' },
    { label: 'Report', desc: 'ROI dashboards, attribution, executive summaries' },
  ]

  const categories: { name: string; desc: string; status: 'ACTIVE' | 'MONITORING' | 'READY'; integrations: { name: string; color: string; detail: string }[] }[] = [
    {
      name: 'SEO & Content',
      desc: 'Automated keyword research, on-page optimization, content briefs, rank tracking.',
      status: 'ACTIVE',
      integrations: [
        { name: 'Ahrefs', color: '#1a73e8', detail: 'Backlink & keyword explorer' },
        { name: 'SEMrush', color: '#ff642d', detail: 'All-in-one SEO toolkit' },
        { name: 'Surfer SEO', color: '#00c2a8', detail: 'On-page content optimizer' },
        { name: 'Clearscope', color: '#6c63ff', detail: 'Content relevance grading' },
        { name: 'Google Search Console', color: '#4285f4', detail: 'Search performance data' },
      ],
    },
    {
      name: 'PPC & Paid Ads',
      desc: 'Campaign creation, bid management, audience targeting, budget optimization.',
      status: 'ACTIVE',
      integrations: [
        { name: 'Google Ads', color: '#4285f4', detail: 'Search & display campaigns' },
        { name: 'Meta Ads', color: '#1877f2', detail: 'Facebook & Instagram ads' },
        { name: 'Microsoft Ads', color: '#00a4ef', detail: 'Bing search advertising' },
        { name: 'TikTok Ads', color: '#ff0050', detail: 'Short-form video ads' },
        { name: 'LinkedIn Ads', color: '#0a66c2', detail: 'B2B professional targeting' },
      ],
    },
    {
      name: 'Ad Creative & Copy',
      desc: 'AI-generated ad copy, image variants, A/B headline testing, landing page copy.',
      status: 'READY',
      integrations: [
        { name: 'Canva', color: '#00c4cc', detail: 'Visual design platform' },
        { name: 'Figma', color: '#a259ff', detail: 'Collaborative design tool' },
        { name: 'Copy.ai', color: '#6c63ff', detail: 'AI copywriting assistant' },
        { name: 'Jasper', color: '#f43f5e', detail: 'Long-form AI content' },
        { name: 'AdCreative.ai', color: '#2563eb', detail: 'Ad creative generation' },
      ],
    },
    {
      name: 'Domain Authority & Link Building',
      desc: 'Backlink prospecting, outreach automation, toxic link monitoring, DR/DA tracking.',
      status: 'MONITORING',
      integrations: [
        { name: 'Ahrefs', color: '#1a73e8', detail: 'Backlink index & analysis' },
        { name: 'Moz', color: '#1dbdff', detail: 'Domain authority scoring' },
        { name: 'Majestic', color: '#ff0043', detail: 'Trust flow & link data' },
        { name: 'Hunter.io', color: '#ff7a59', detail: 'Email finder for outreach' },
        { name: 'Pitchbox', color: '#4caf50', detail: 'Outreach workflow automation' },
      ],
    },
    {
      name: 'Online Reputation & Reviews',
      desc: 'Review monitoring, sentiment analysis, automated response drafts, rating aggregation.',
      status: 'MONITORING',
      integrations: [
        { name: 'Google Business', color: '#4285f4', detail: 'Local listing & reviews' },
        { name: 'Trustpilot', color: '#00b67a', detail: 'Consumer review platform' },
        { name: 'G2', color: '#ff492c', detail: 'Software review marketplace' },
        { name: 'Yelp', color: '#d32323', detail: 'Local business reviews' },
        { name: 'Birdeye', color: '#2196f3', detail: 'Multi-channel reputation' },
      ],
    },
    {
      name: 'Competitive Intelligence',
      desc: 'Competitor ad monitoring, traffic estimation, keyword gap analysis, pricing intelligence.',
      status: 'ACTIVE',
      integrations: [
        { name: 'SimilarWeb', color: '#1f4dff', detail: 'Traffic & engagement data' },
        { name: 'SpyFu', color: '#3ec6ff', detail: 'Competitor keyword spy' },
        { name: 'SEMrush', color: '#ff642d', detail: 'Competitive analysis suite' },
        { name: 'Crayon', color: '#6366f1', detail: 'Market intelligence platform' },
        { name: 'Klue', color: '#00c9a7', detail: 'Competitive enablement' },
      ],
    },
    {
      name: 'Email & Nurture',
      desc: 'Drip campaigns, list segmentation, deliverability optimization, open/click analytics.',
      status: 'ACTIVE',
      integrations: [
        { name: 'Mailchimp', color: '#ffe01b', detail: 'Email marketing platform' },
        { name: 'SendGrid', color: '#1a82e2', detail: 'Transactional email API' },
        { name: 'Klaviyo', color: '#2bde73', detail: 'E-commerce email flows' },
        { name: 'ActiveCampaign', color: '#356ae6', detail: 'Marketing automation CRM' },
        { name: 'ConvertKit', color: '#fb6970', detail: 'Creator email marketing' },
      ],
    },
    {
      name: 'Social Media Management',
      desc: 'Scheduling, engagement tracking, audience growth, content calendar.',
      status: 'ACTIVE',
      integrations: [
        { name: 'Hootsuite', color: '#143059', detail: 'Social media dashboard' },
        { name: 'Buffer', color: '#168eea', detail: 'Post scheduling tool' },
        { name: 'Sprout Social', color: '#59c564', detail: 'Social analytics & CRM' },
        { name: 'Later', color: '#ff5c5c', detail: 'Visual content planner' },
        { name: 'Brandwatch', color: '#e63946', detail: 'Social listening platform' },
      ],
    },
    {
      name: 'Analytics & Attribution',
      desc: 'Cross-channel reporting, conversion tracking, ROI dashboards, funnel analysis.',
      status: 'ACTIVE',
      integrations: [
        { name: 'Google Analytics', color: '#e37400', detail: 'Web traffic analytics' },
        { name: 'Mixpanel', color: '#7856ff', detail: 'Product event analytics' },
        { name: 'HubSpot', color: '#ff7a59', detail: 'Inbound marketing hub' },
        { name: 'Segment', color: '#52bd95', detail: 'Customer data platform' },
        { name: 'Looker', color: '#4285f4', detail: 'BI & data exploration' },
      ],
    },
    {
      name: 'Conversion & UX Optimization',
      desc: 'Heatmaps, A/B testing, form optimization, exit-intent strategies.',
      status: 'READY',
      integrations: [
        { name: 'Hotjar', color: '#fd3a5c', detail: 'Heatmaps & session replay' },
        { name: 'Optimizely', color: '#0037ff', detail: 'Experimentation platform' },
        { name: 'VWO', color: '#3b82f6', detail: 'A/B testing & personalization' },
        { name: 'Unbounce', color: '#2563eb', detail: 'Landing page builder' },
        { name: 'Crazy Egg', color: '#f59e0b', detail: 'Click & scroll tracking' },
      ],
    },
  ]

  const statusColors: Record<string, string> = {
    ACTIVE: '#34d399',
    MONITORING: '#f59e0b',
    READY: '#60a5fa',
  }

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Active',
    MONITORING: 'Monitoring',
    READY: 'Ready',
  }

  const categoryIcons: Record<string, string> = {
    'SEO & Content': '🔍',
    'PPC & Paid Ads': '📢',
    'Ad Creative & Copy': '🎨',
    'Domain Authority & Link Building': '🔗',
    'Online Reputation & Reviews': '⭐',
    'Competitive Intelligence': '🕵️',
    'Email & Nurture': '✉️',
    'Social Media Management': '📱',
    'Analytics & Attribution': '📊',
    'Conversion & UX Optimization': '🧪',
  }

  return (
    <div style={{ gridColumn: '2 / -1', background: '#0a0d10', padding: 0, overflow: 'auto', borderRadius: 12, minWidth: 0, border: `1px solid ${c.border}` }}>
      <div style={{ padding: '24px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={onBack} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${c.border}`, background: 'rgba(255,255,255,0.04)', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, padding: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = '#3a4050' }}
            onMouseLeave={e => { e.currentTarget.style.color = c.muted; e.currentTarget.style.borderColor = c.border }}
          >←</button>
        </div>

        <div style={{ marginBottom: 36, maxWidth: 640 }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 32, fontWeight: 800, lineHeight: 1.15, fontFamily: 'Inter, system-ui, sans-serif', background: 'linear-gradient(135deg, #f0f0f0 0%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Marketing Command Center
          </h1>
          <p style={{ margin: '0 0 20px', color: '#ccc', fontSize: 16, lineHeight: 1.6, fontFamily: 'Inter, system-ui, sans-serif' }}>
            One click to install. Everything runs automatically. MASSA assembles a complete, AI-powered marketing team — from SEO and paid ads to reputation management and competitive intelligence. No specialists to hire, no complex tools to learn.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { value: '10', label: 'Marketing Modules' },
              { value: '50', label: 'Integrations' },
              { value: '100%', label: 'Automated' },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 28, fontWeight: 800, color: c.green, fontFamily: 'Inter, system-ui, sans-serif' }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: c.muted, fontFamily: 'Inter, system-ui, sans-serif' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>HOW IT WORKS</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative', overflowX: 'auto', paddingBottom: 8 }}>
            {pipelineSteps.map((step, i) => (
              <div key={step.label} style={{ flex: '1 0 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 120 }}>
                {i < pipelineSteps.length - 1 && (
                  <div style={{ position: 'absolute', top: 20, left: '50%', right: '-50%', height: 2, background: `linear-gradient(to right, ${c.green}60, ${c.green}20)`, zIndex: 0 }} />
                )}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: '#0a0d10', border: `2px solid ${c.green}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800,
                  color: c.green, position: 'relative', zIndex: 1, fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                  {i + 1}
                </div>
                <div style={{ marginTop: 12, textAlign: 'center', padding: '0 4px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#f0f0f0', marginBottom: 4, fontFamily: 'Inter, system-ui, sans-serif' }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.45, fontFamily: 'Inter, system-ui, sans-serif' }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, letterSpacing: 1.2, color: c.muted, fontWeight: 700, marginBottom: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>MARKETING MODULES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {categories.map(cat => (
            <div key={cat.name} style={{
              background: 'rgba(255,255,255,0.02)', border: `1px solid ${c.border}`, borderRadius: 12, padding: 20,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{categoryIcons[cat.name]}</span>
                  <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' }}>{cat.name}</span>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: statusColors[cat.status],
                  background: `${statusColors[cat.status]}12`, padding: '4px 10px', borderRadius: 999,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}>
                  {statusLabels[cat.status]}
                </span>
              </div>
              <div style={{ color: c.muted, fontSize: 13, lineHeight: 1.55, marginBottom: 14, fontFamily: 'Inter, system-ui, sans-serif' }}>{cat.desc}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cat.integrations.map(integ => (
                  <div key={integ.name} title={integ.detail} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.border}`,
                    borderRadius: 8, padding: '5px 10px', cursor: 'default',
                    transition: 'border-color 0.15s',
                  }}>
                    <CompanyLogo name={integ.name} size={16} accentColor={integ.color} />
                    <span style={{ fontSize: 11, color: '#ccc', fontFamily: 'Inter, system-ui, sans-serif' }}>{integ.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IntegrationsView({ onBack }: { onBack: () => void }) {
  const c = { border: '#252a35', muted: '#9ca3af', green: '#34d399' }
  const mono = '"JetBrains Mono", Menlo, monospace'
  const [activeCategory, setActiveCategory] = useState<string>('All')

  type IntegrationStatus = 'AVAILABLE' | 'CONNECTED' | 'BETA'
  interface Integration { name: string; color: string; monogram: string; desc: string; status: IntegrationStatus }
  interface Category { name: string; integrations: Integration[] }

  const categories: Category[] = [
    {
      name: 'CRM',
      integrations: [
        { name: 'Salesforce', color: '#00a1e0', monogram: 'SF', desc: 'Enterprise CRM platform', status: 'AVAILABLE' },
        { name: 'HubSpot', color: '#ff7a59', monogram: 'H', desc: 'Inbound marketing & sales CRM', status: 'CONNECTED' },
        { name: 'Pipedrive', color: '#21b978', monogram: 'P', desc: 'Sales pipeline management', status: 'AVAILABLE' },
        { name: 'Zoho CRM', color: '#e42527', monogram: 'Z', desc: 'Multi-channel CRM suite', status: 'AVAILABLE' },
        { name: 'Close', color: '#1a1a2e', monogram: 'C', desc: 'CRM built for inside sales', status: 'BETA' },
      ],
    },
    {
      name: 'Marketing & Email',
      integrations: [
        { name: 'Mailchimp', color: '#ffe01b', monogram: 'M', desc: 'Email campaigns & automations', status: 'CONNECTED' },
        { name: 'SendGrid', color: '#1a82e2', monogram: 'SG', desc: 'Transactional & marketing email API', status: 'AVAILABLE' },
        { name: 'Klaviyo', color: '#2eca7f', monogram: 'K', desc: 'E-commerce marketing automation', status: 'AVAILABLE' },
        { name: 'ActiveCampaign', color: '#356ae6', monogram: 'AC', desc: 'Email, automation & CRM combo', status: 'BETA' },
        { name: 'ConvertKit', color: '#fb6970', monogram: 'CK', desc: 'Creator-focused email platform', status: 'AVAILABLE' },
      ],
    },
    {
      name: 'Automation & Workflows',
      integrations: [
        { name: 'Zapier', color: '#ff4a00', monogram: 'Z', desc: 'Connect apps with automated workflows', status: 'CONNECTED' },
        { name: 'Make', color: '#6d00cc', monogram: 'M', desc: 'Visual automation platform (Integromat)', status: 'AVAILABLE' },
        { name: 'n8n', color: '#ea4b71', monogram: 'N', desc: 'Open-source workflow automation', status: 'AVAILABLE' },
        { name: 'IFTTT', color: '#33ccff', monogram: 'IF', desc: 'Simple conditional automations', status: 'BETA' },
      ],
    },
    {
      name: 'Analytics',
      integrations: [
        { name: 'Google Analytics', color: '#e37400', monogram: 'GA', desc: 'Web & app analytics by Google', status: 'CONNECTED' },
        { name: 'Mixpanel', color: '#7856ff', monogram: 'MP', desc: 'Product analytics & user tracking', status: 'AVAILABLE' },
        { name: 'Amplitude', color: '#1d5cf5', monogram: 'A', desc: 'Digital analytics platform', status: 'AVAILABLE' },
        { name: 'Segment', color: '#52bd95', monogram: 'S', desc: 'Customer data platform', status: 'CONNECTED' },
        { name: 'PostHog', color: '#f9bd2b', monogram: 'PH', desc: 'Open-source product analytics', status: 'BETA' },
      ],
    },
    {
      name: 'Payments',
      integrations: [
        { name: 'Stripe', color: '#635bff', monogram: 'S', desc: 'Payments, billing & connect', status: 'CONNECTED' },
        { name: 'PayPal', color: '#003087', monogram: 'PP', desc: 'Global payment processing', status: 'AVAILABLE' },
        { name: 'Square', color: '#3e4348', monogram: 'Sq', desc: 'Commerce & POS platform', status: 'AVAILABLE' },
        { name: 'Braintree', color: '#37475a', monogram: 'BT', desc: 'Full-stack payment platform', status: 'AVAILABLE' },
        { name: 'LemonSqueezy', color: '#ffc233', monogram: 'LS', desc: 'Payments for digital products', status: 'BETA' },
      ],
    },
    {
      name: 'Communication',
      integrations: [
        { name: 'Slack', color: '#4a154b', monogram: 'S', desc: 'Workspace messaging & bots', status: 'CONNECTED' },
        { name: 'Discord', color: '#5865f2', monogram: 'D', desc: 'Community server integration', status: 'AVAILABLE' },
        { name: 'Twilio', color: '#f22f46', monogram: 'T', desc: 'SMS, voice & WhatsApp APIs', status: 'AVAILABLE' },
        { name: 'Intercom', color: '#1f8ded', monogram: 'I', desc: 'Customer messaging platform', status: 'CONNECTED' },
        { name: 'SendBird', color: '#6210cc', monogram: 'SB', desc: 'In-app chat & notifications', status: 'BETA' },
      ],
    },
    {
      name: 'Cloud & Infrastructure',
      integrations: [
        { name: 'AWS', color: '#ff9900', monogram: 'A', desc: 'EC2, Lambda, S3 & 200+ services', status: 'CONNECTED' },
        { name: 'Google Cloud', color: '#4285f4', monogram: 'GC', desc: 'Cloud Run, GKE, BigQuery', status: 'AVAILABLE' },
        { name: 'Vercel', color: '#f0f0f0', monogram: 'V', desc: 'Edge-first frontend deployment', status: 'CONNECTED' },
        { name: 'Netlify', color: '#00c7b7', monogram: 'N', desc: 'Modern web deployment platform', status: 'AVAILABLE' },
        { name: 'Cloudflare', color: '#f38020', monogram: 'CF', desc: 'CDN, Workers & R2 storage', status: 'AVAILABLE' },
      ],
    },
    {
      name: 'Database',
      integrations: [
        { name: 'MongoDB', color: '#47a248', monogram: 'M', desc: 'Document database at scale', status: 'AVAILABLE' },
        { name: 'Firebase', color: '#ffca28', monogram: 'F', desc: 'Google app development platform', status: 'CONNECTED' },
        { name: 'Supabase', color: '#3ecf8e', monogram: 'S', desc: 'Open-source Firebase alternative', status: 'AVAILABLE' },
        { name: 'PlanetScale', color: '#f5a623', monogram: 'PS', desc: 'Serverless MySQL platform', status: 'BETA' },
        { name: 'Neon', color: '#00e599', monogram: 'N', desc: 'Serverless Postgres with branching', status: 'BETA' },
      ],
    },
    {
      name: 'E-commerce',
      integrations: [
        { name: 'Shopify', color: '#96bf48', monogram: 'S', desc: 'All-in-one commerce platform', status: 'AVAILABLE' },
        { name: 'WooCommerce', color: '#96588a', monogram: 'W', desc: 'WordPress e-commerce plugin', status: 'AVAILABLE' },
        { name: 'BigCommerce', color: '#34313f', monogram: 'BC', desc: 'Enterprise e-commerce SaaS', status: 'AVAILABLE' },
        { name: 'Gumroad', color: '#ff90e8', monogram: 'G', desc: 'Sell digital products easily', status: 'BETA' },
      ],
    },
    {
      name: 'Social Media',
      integrations: [
        { name: 'X (Twitter)', color: '#f0f0f0', monogram: 'X', desc: 'Post, monitor & analyze tweets', status: 'AVAILABLE' },
        { name: 'Instagram', color: '#e1306c', monogram: 'IG', desc: 'Photo & video social platform', status: 'AVAILABLE' },
        { name: 'LinkedIn', color: '#0a66c2', monogram: 'LI', desc: 'Professional network integration', status: 'CONNECTED' },
        { name: 'Facebook', color: '#1877f2', monogram: 'FB', desc: 'Social media & ads platform', status: 'AVAILABLE' },
        { name: 'TikTok', color: '#ff0050', monogram: 'TT', desc: 'Short-form video platform API', status: 'BETA' },
      ],
    },
    {
      name: 'Storage',
      integrations: [
        { name: 'Dropbox', color: '#0061ff', monogram: 'D', desc: 'Cloud file storage & sharing', status: 'AVAILABLE' },
        { name: 'Google Drive', color: '#4285f4', monogram: 'GD', desc: 'Cloud storage by Google', status: 'CONNECTED' },
        { name: 'Box', color: '#0061d5', monogram: 'B', desc: 'Enterprise content management', status: 'AVAILABLE' },
        { name: 'Cloudinary', color: '#3448c5', monogram: 'CL', desc: 'Image & video management API', status: 'AVAILABLE' },
      ],
    },
    {
      name: 'Developer Tools',
      integrations: [
        { name: 'GitHub', color: '#f0f0f0', monogram: 'GH', desc: 'Code hosting & Actions CI/CD', status: 'CONNECTED' },
        { name: 'GitLab', color: '#fc6d26', monogram: 'GL', desc: 'DevOps platform with CI/CD', status: 'AVAILABLE' },
        { name: 'Jira', color: '#0052cc', monogram: 'J', desc: 'Enterprise project management', status: 'AVAILABLE' },
        { name: 'Linear', color: '#5e6ad2', monogram: 'L', desc: 'Issue tracking for builders', status: 'CONNECTED' },
        { name: 'Notion', color: '#f0f0f0', monogram: 'N', desc: 'Docs, wikis & databases', status: 'AVAILABLE' },
      ],
    },
  ]

  const statusColors: Record<IntegrationStatus, string> = {
    AVAILABLE: '#60a5fa',
    CONNECTED: '#34d399',
    BETA: '#f59e0b',
  }

  const categoryNames = ['All', ...categories.map(cat => cat.name)]
  const filteredCategories = activeCategory === 'All' ? categories : categories.filter(cat => cat.name === activeCategory)

  return (
    <div style={{ gridColumn: '2 / -1', border: `1px solid ${c.border}`, background: '#0a0d10', padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
        >←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0f0', fontFamily: mono }}>Integrations</div>
          <div style={{ fontSize: 10, color: c.muted, fontFamily: mono }}>MASSA://sys/integrations</div>
        </div>
      </div>

      <div style={{ background: '#080808', border: `1px solid ${c.border}`, borderRadius: 6, padding: 16, fontFamily: mono, fontSize: 11, lineHeight: 1.8, marginBottom: 16 }}>
        <div style={{ color: c.green, marginBottom: 8 }}>$ massa integrations --list</div>
        <div style={{ color: '#ccc' }}>{'>'} Loaded {categories.reduce((sum, cat) => sum + cat.integrations.length, 0)} integrations across {categories.length} categories</div>
        <div style={{ color: '#ccc' }}>{'>'} {categories.reduce((sum, cat) => sum + cat.integrations.filter(i => i.status === 'CONNECTED').length, 0)} connected &middot; {categories.reduce((sum, cat) => sum + cat.integrations.filter(i => i.status === 'AVAILABLE').length, 0)} available &middot; {categories.reduce((sum, cat) => sum + cat.integrations.filter(i => i.status === 'BETA').length, 0)} in beta</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16, fontFamily: mono }}>
        {categoryNames.map(name => {
          const isActive = activeCategory === name
          return (
            <button key={name} onClick={() => setActiveCategory(name)} style={{ padding: '5px 12px', borderRadius: 4, border: `1px solid ${isActive ? c.green : c.border}`, background: isActive ? `${c.green}15` : 'transparent', color: isActive ? c.green : c.muted, cursor: 'pointer', fontSize: 10, fontFamily: mono, fontWeight: isActive ? 700 : 500, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = '#4a5568' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = c.border }}
            >{name}</button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {filteredCategories.map(cat => (
          <div key={cat.name} style={{ background: '#080808', border: `1px solid ${c.border}`, borderRadius: 6, padding: 16, fontFamily: mono }}>
            <div style={{ color: c.green, fontSize: 10, marginBottom: 10, fontWeight: 700 }}>[{cat.name.toUpperCase()}]</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cat.integrations.map(integ => (
                <div key={integ.name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0d1117', border: `1px solid ${c.border}`, borderRadius: 4, padding: '8px 10px', cursor: 'default' }}>
                  <span style={{ width: 28, height: 28, borderRadius: 5, background: integ.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: integ.color === '#ffffff' || integ.color === '#f0f0f0' || integ.color === '#ffe01b' || integ.color === '#ffca28' ? '#000' : '#fff', flexShrink: 0, letterSpacing: '-0.03em' }}>
                    {integ.monogram}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#f0f0f0', fontSize: 11, fontWeight: 600 }}>{integ.name}</div>
                    <div style={{ color: c.muted, fontSize: 9, marginTop: 1 }}>{integ.desc}</div>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: statusColors[integ.status], background: `${statusColors[integ.status]}15`, padding: '2px 8px', borderRadius: 3, border: `1px solid ${statusColors[integ.status]}30`, flexShrink: 0, letterSpacing: '0.04em' }}>
                    {integ.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#080808', border: `1px solid ${c.border}`, borderRadius: 6, padding: 16, fontFamily: mono, fontSize: 11, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: c.green }}>$</span>
          <span style={{ width: 7, height: 14, background: c.green, display: 'inline-block', animation: 'blink 1s step-end infinite' }} />
        </div>
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  )
}

function SkillsView({ onBack }: { onBack: () => void }) {
  return <TerminalPageView onBack={onBack} title="Skills" command="skills" lines={[
    '> Installed agent skills: 12',
    '',
    '[skill]  react-vite         v2.1.0   Frontend scaffolding + HMR',
    '[skill]  express-api        v1.4.2   REST API generation',
    '[skill]  drizzle-orm        v1.0.0   Database schema + migrations',
    '[skill]  tailwind-ui        v3.2.1   Component library integration',
    '[skill]  deployment         v1.1.0   Cloud Run auto-deploy',
    '[skill]  code-review        v0.9.3   Architect analysis agent',
    '[skill]  test-runner        v1.0.1   Automated test execution',
    '[skill]  security-scan      v0.8.0   Dependency + SAST scanning',
    '[skill]  web-scraper        v1.2.0   Headless browser automation',
    '[skill]  n8n-workflows      v0.7.1   Workflow automation bridge',
    '[skill]  resend-email       v1.0.0   Transactional email sending',
    '[skill]  stripe-payments    v0.6.0   Payment integration',
    '',
    '> All skills operational — last updated 2026-04-06',
  ]} />
}

function ApisView({ onBack }: { onBack: () => void }) {
  return <TerminalPageView onBack={onBack} title="APIs" command="apis" lines={[
    '> Connected API endpoints: 8',
    '',
    '[GET]     /api/healthz              200 OK     avg 12ms',
    '[GET]     /api/projects             200 OK     avg 45ms',
    '[POST]    /api/projects             201 Created avg 89ms',
    '[GET]     /api/builds/:id           200 OK     avg 34ms',
    '[POST]    /api/ai/enhance-prompt    200 OK     avg 1.2s',
    '[POST]    /api/ai/clarify           200 OK     avg 980ms',
    '[GET]     /api/agents               200 OK     avg 28ms',
    '[POST]    /api/deploy               202 Accepted avg 3.4s',
    '',
    '> All endpoints healthy — 99.97% uptime (30d)',
    '> Total requests today: 4,218',
  ]} />
}

function WebScraperView({ onBack }: { onBack: () => void }) {
  return <TerminalPageView onBack={onBack} title="Web Scraper" command="scraper" lines={[
    '> Scraper engine v1.2.0 — Chromium headless',
    '',
    '[job-01]  target: competitor-pricing    Schedule: */6h    Last: 03:00 UTC  OK',
    '[job-02]  target: tech-news-feeds       Schedule: */1h    Last: 03:30 UTC  OK',
    '[job-03]  target: api-changelog-watch   Schedule: */12h   Last: 00:00 UTC  OK',
    '[job-04]  target: social-mentions       Schedule: */30m   Last: 03:30 UTC  OK',
    '',
    '> 4 active jobs — 0 failures in last 24h',
    '> Data stored: 2.4 GB across 14,207 records',
    '> Next scheduled run: job-04 at 04:00 UTC',
  ]} />
}

function InsideMassaView({ onBack }: { onBack: () => void }) {
  return <TerminalPageView onBack={onBack} title="Inside MASSA" command="system --info" lines={[
    '> MASSA AI Platform — v2.4.1',
    '',
    'System Status:        OPERATIONAL',
    'Uptime:               99.98% (30d)',
    'Active Agents:        4 / 8 slots',
    'Build Queue:          5 queued, 3 running',
    'Memory Usage:         2.1 GB / 8 GB',
    'Storage:              14.8 GB / 50 GB',
    'Database:             PostgreSQL 16 — connected',
    'Cache:                Redis 7.2 — connected',
    '',
    '[module]  Core Engine        v3.1.0   LOADED',
    '[module]  Agent Orchestrator  v2.4.1   LOADED',
    '[module]  Build Pipeline      v1.8.0   LOADED',
    '[module]  Deploy Manager      v1.3.2   LOADED',
    '',
    '> All systems nominal',
  ]} />
}

function PublishedView({ onBack }: { onBack: () => void }) {
  const { completedProducts } = useProjects()
  const publishedProducts = useMemo(() => completedProducts.filter(p => p.publishStatus === 'live'), [completedProducts])

  const c = { border: '#252a35', muted: '#9ca3af', green: '#34d399' }

  return (
    <div style={{ gridColumn: '2 / -1', border: `1px solid ${c.border}`, background: '#0a0d10', padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0' }}
          onMouseLeave={e => { e.currentTarget.style.color = c.muted }}
        >←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#f0f0f0', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>Published</div>
          <div style={{ fontSize: 10, color: c.muted, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{publishedProducts.length} live product{publishedProducts.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {publishedProducts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.3 }}>◉</div>
          <div style={{ fontSize: 13, color: c.muted, fontFamily: '"JetBrains Mono", Menlo, monospace', marginBottom: 4 }}>No published products yet</div>
          <div style={{ fontSize: 10, color: '#555', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>Deploy and publish a completed product to see it here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {publishedProducts.map(product => (
            <div key={product.id} style={{ border: `1px solid ${c.border}`, background: '#131619', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f0f0', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{product.name}</div>
                <span style={{ fontSize: 9, fontWeight: 700, color: c.green, background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 10, fontFamily: '"JetBrains Mono", Menlo, monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.green, boxShadow: `0 0 4px ${c.green}` }} />
                  LIVE
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#666', fontFamily: '"JetBrains Mono", Menlo, monospace', marginBottom: 8 }}>{product.summary}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                {product.domain && (
                  <span style={{ color: c.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>🔗</span> {product.domain}
                  </span>
                )}
                <span style={{ color: '#555' }}>Completed {product.completedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Overview() {
  const { isMobile, isTablet, isDesktop } = useScreenSize()
  const { selectedTenantId } = useTenant()
  const { completeProject, archiveProject, deleteProject, projectLifecycles } = useProjects()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileRightOpen, setMobileRightOpen] = useState(false)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [livePreviewProject, setLivePreviewProject] = useState<string | null>(null)
  const [chatProject, setChatProject] = useState<string | null>(null)
  const [chatProjectBuildId, setChatProjectBuildId] = useState<string | null>(null)
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null)
  const [expandedBuildCard, setExpandedBuildCard] = useState<string | null>(null)
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null)
  const [buildModalTab, setBuildModalTab] = useState<'chat' | 'details' | 'code' | 'thinking' | 'revert' | 'preview' | 'archmap' | 'addagent' | 'addtask'>('chat')
  const [revertConfirmed, setRevertConfirmed] = useState<string | null>(null)
  const [revertPending, setRevertPending] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Record<string, { id: string; role: 'user' | 'agent'; content: string; time: string }[]>>(() => {
    const t = (h: number, m: number, s: number) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    return {
      'core-engine': [
        { id: '1', role: 'agent', content: 'Starting work on the Core Engine. I\'ll set up the strategy loop, execution logic, and order handling.', time: t(14,22,10) },
        { id: '2', role: 'user', content: 'Make sure the order handler supports both market and limit orders from the start.', time: t(14,23,4) },
        { id: '3', role: 'agent', content: 'Got it. I\'ll implement an OrderType enum with MARKET and LIMIT variants. The execution pipeline will route through different handlers based on type.\n\n```typescript\nexport enum OrderType {\n  MARKET = "market",\n  LIMIT = "limit"\n}\n```', time: t(14,23,45) },
        { id: '4', role: 'agent', content: 'Created src/core/engine.ts with the main strategy loop. It polls every 500ms, evaluates signals, and dispatches orders. Currently compiling APIs...', time: t(14,28,12) },
        { id: '5', role: 'user', content: 'Can we add a kill switch that halts all trading if drawdown exceeds 5%?', time: t(14,30,1) },
        { id: '6', role: 'agent', content: 'Adding a circuit breaker module now. It will monitor real-time P&L and freeze the engine if drawdown hits the threshold. I\'ll wire it into the main loop before order dispatch.', time: t(14,30,33) },
      ],
      'risk-module': [
        { id: '1', role: 'agent', content: 'Initializing Risk Module. Waiting for Core Engine dependency to stabilize before wiring position sizing.', time: t(14,25,0) },
        { id: '2', role: 'agent', content: 'Core Engine schema is available. Building position sizing logic based on account balance and volatility.', time: t(14,32,15) },
        { id: '3', role: 'user', content: 'Use Kelly Criterion for position sizing. Max 2% risk per trade.', time: t(14,33,8) },
        { id: '4', role: 'agent', content: 'Implementing Kelly Criterion with a 2% hard cap. I\'ll also add a configurable multiplier so you can scale it down (half-Kelly is common).\n\n```typescript\nconst kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;\nconst position = Math.min(kellyFraction * multiplier, 0.02);\n```', time: t(14,34,2) },
      ],
      'dashboard-ui': [
        { id: '1', role: 'agent', content: 'Setting up the Dashboard UI scaffold. Using React with a real-time WebSocket feed for live position updates.', time: t(14,26,0) },
        { id: '2', role: 'user', content: 'I want a dark trading terminal look. Think Bloomberg-style with green accents.', time: t(14,27,12) },
        { id: '3', role: 'agent', content: 'Perfect. I\'ll use a #0a0a0a base with #2d8a32 for positive P&L and accent elements. The layout will have a chart area top-center, order book on the right, and positions table below.', time: t(14,27,55) },
      ],
      'alerts': [
        { id: '1', role: 'agent', content: 'Alerts module complete. Set up n8n workflows for Slack notifications on trade execution, daily P&L summary, and critical errors.', time: t(13,50,0) },
        { id: '2', role: 'user', content: 'Add email alerts too for the daily summary.', time: t(13,52,30) },
        { id: '3', role: 'agent', content: 'Done. Added SendGrid integration for daily email digest. It fires at market close with a summary of all positions, P&L, and any triggered stop losses.', time: t(13,53,15) },
      ],
      'backtester': [
        { id: '1', role: 'agent', content: 'Backtester is queued. Once the Core Engine is stable, I\'ll build the historical simulation engine using the same strategy interface.', time: t(14,35,0) },
      ],
      'homepage': [
        { id: '1', role: 'agent', content: 'Starting the MASSA homepage build. I\'ll create a hero section, feature cards, and a CTA flow.', time: t(14,20,0) },
        { id: '2', role: 'user', content: 'Make the hero really impactful. "Build anything with AI agents, in parallel" as the main headline.', time: t(14,21,30) },
        { id: '3', role: 'agent', content: 'Love it. Using that headline with a gradient text treatment and animated particle background. Below it I\'ll place three feature cards: Multi-Agent, Auto-Architect, and Live Deploy.', time: t(14,22,10) },
        { id: '4', role: 'agent', content: 'Hero section is live. Working on the pricing comparison table and footer now. Progress at 71%.', time: t(14,40,5) },
      ],
      'api-settings': [
        { id: '1', role: 'agent', content: 'API Settings page scaffolded. Waiting for Homepage to finalize the nav structure before I wire up the settings routes.', time: t(14,30,0) },
        { id: '2', role: 'user', content: 'Each API provider should have its own card with a connection status indicator.', time: t(14,31,20) },
        { id: '3', role: 'agent', content: 'Building provider cards with green/red status dots and a "Test Connection" button. Supporting OpenAI, Anthropic, and custom endpoints.', time: t(14,32,0) },
      ],
      'crawler': [
        { id: '1', role: 'agent', content: 'Setting up the crawler pipeline. I\'ll use a queue-based architecture with configurable concurrency and retry logic.', time: t(14,24,0) },
        { id: '2', role: 'user', content: 'Need to handle rate limiting gracefully. Some sites throttle after 100 requests/min.', time: t(14,25,30) },
        { id: '3', role: 'agent', content: 'Adding adaptive rate limiting. The crawler will track response times and 429 status codes, then automatically throttle down. I\'ll also add a configurable delay between requests.', time: t(14,26,15) },
      ],
      'scheduler': [
        { id: '1', role: 'agent', content: 'Scheduler is queued behind the Crawler. Once the data pipeline is working, I\'ll set up n8n workflows for daily exports and email delivery.', time: t(14,28,0) },
      ],
    }
  })
  const [chatInput, setChatInput] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('p1')
  const [draggedBuild, setDraggedBuild] = useState<{ buildId: string; projectId: string } | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'tree' | 'arch' | 'graph' | 'timeline'>('list')
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false)
  const [hoveredArchBtn, setHoveredArchBtn] = useState<string | null>(null)
  const [pendingDropdown, setPendingDropdown] = useState<string | null>(null)
  const [addPromptModal, setAddPromptModal] = useState<{ type: 'agent' | 'task'; projectId: string } | null>(null)
  const [addPromptText, setAddPromptText] = useState('')
  const [leftNavCollapsed, setLeftNavCollapsed] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState<string | null>(null)
  const [archTab, setArchTab] = useState<'tree' | 'graph' | 'timeline'>('tree')
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const panelWasCollapsedBeforeSuggestions = useRef(false)
  const suggestionsAutoCollapsed = useRef(false)
  const [rawInput, setRawInput] = useState('')
  const [vagueMode, setVagueMode] = useState(false)
  const [showClarifyModal, setShowClarifyModal] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [ignoredAll, setIgnoredAll] = useState(false)
  const [clarifyQuestion, setClarifyQuestion] = useState('')
  const [clarifyOptions, setClarifyOptions] = useState<string[]>([])
  const [clarifyHistory, setClarifyHistory] = useState<{question: string; answer: string}[]>([])
  const [clarifyLoading, setClarifyLoading] = useState(false)
  const [clarifyDone, setClarifyDone] = useState(false)
  const [clarifySummary, setClarifySummary] = useState('')
  const [clarifyOtherText, setClarifyOtherText] = useState('')
  const [activeView, setActiveView] = useState<'dashboard' | 'chats' | 'ideas' | 'currentProjects' | 'published' | 'history' | 'automations' | 'marketing' | 'skills' | 'apis' | 'webScraper' | 'insideMassa' | 'integrations'>('dashboard')
  const [selectedChatBuildId, setSelectedChatBuildId] = useState<string | null>(null)
  const [chatOriginBuildId, setChatOriginBuildId] = useState<string | null>(null)
  const [enhancingId, setEnhancingId] = useState<number | null>(null)
  const [, navigate] = useLocation()
  const [typedPlaceholder, setTypedPlaceholder] = useState('')
  const [showSuggestionsTooltip, setShowSuggestionsTooltip] = useState(false)

  useEffect(() => {
    const fullText = '> describe what you want to build...'
    let i = 0
    setTypedPlaceholder('')
    const interval = setInterval(() => {
      i++
      setTypedPlaceholder(fullText.slice(0, i))
      if (i >= fullText.length) clearInterval(interval)
    }, 45)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setIgnoredAll(false)
    setDismissedSuggestions(new Set())
    if (rawInput.trim().length < 8) {
      setAiSuggestions([])
      return
    }
    setSuggestionsLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: rawInput.trim(), model: 'sonnet-4.6' }),
        signal: controller.signal,
      })
        .then(r => r.json())
        .then(d => setAiSuggestions(d.suggestions || []))
        .catch(() => { if (!controller.signal.aborted) setAiSuggestions([]) })
        .finally(() => { if (!controller.signal.aborted) setSuggestionsLoading(false) })
    }, 400)
    return () => { clearTimeout(timer); controller.abort(); setSuggestionsLoading(false) }
  }, [rawInput])

  useEffect(() => {
    const visibleSuggestions = ignoredAll ? [] : aiSuggestions.filter(s => !dismissedSuggestions.has(s))
    const hasSuggestions = !ignoredAll && (suggestionsLoading || visibleSuggestions.length > 0)
    if (hasSuggestions && !suggestionsAutoCollapsed.current) {
      setRightPanelCollapsed(prev => {
        panelWasCollapsedBeforeSuggestions.current = prev
        return true
      })
      suggestionsAutoCollapsed.current = true
    } else if (!hasSuggestions && suggestionsAutoCollapsed.current) {
      suggestionsAutoCollapsed.current = false
      if (!panelWasCollapsedBeforeSuggestions.current) {
        setRightPanelCollapsed(false)
      }
    }
  }, [aiSuggestions, suggestionsLoading, dismissedSuggestions, ignoredAll])

  const fetchClarifyQuestion = useCallback((prompt: string, history: {question: string; answer: string}[]) => {
    setClarifyLoading(true)
    fetch('/api/ai/clarify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, previousAnswers: history }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.done) {
          setClarifyDone(true)
          setClarifySummary(d.summary || '')
        } else {
          setClarifyQuestion(d.question || '')
          setClarifyOptions([...(d.options || []), 'Other'])
        }
      })
      .catch(() => {
        setClarifyQuestion('What type of application are you building?')
        setClarifyOptions(['Web app', 'Mobile app', 'API / Backend', 'Full-stack platform', 'Other'])
      })
      .finally(() => setClarifyLoading(false))
  }, [])

  const openClarifyWizard = useCallback((promptOverride?: string) => {
    const prompt = promptOverride || rawInput
    setClarifyHistory([])
    setClarifyQuestion('')
    setClarifyOptions([])
    setClarifyDone(false)
    setClarifySummary('')
    setClarifyOtherText('')
    setShowClarifyModal(true)
    fetchClarifyQuestion(prompt, [])
  }, [rawInput, fetchClarifyQuestion])

  const handleClarifyAnswer = useCallback((answer: string) => {
    const newHistory = [...clarifyHistory, { question: clarifyQuestion, answer }]
    setClarifyHistory(newHistory)
    setClarifyOtherText('')
    fetchClarifyQuestion(rawInput, newHistory)
  }, [clarifyHistory, clarifyQuestion, rawInput, fetchClarifyQuestion])

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'p1',
      name: 'Trading Bot',
      goal: 'Automated trading bot with dashboard, risk controls, and alerts',
      status: 'running',
      lifecycle: 'active',
      builds: [
        { id: 'core-engine', title: 'Core Engine', summary: 'Strategy loop, execution logic, and order handling', status: 'running', progress: 58, stack: ['Claude', 'Claude Code', 'APIs'], agent: 'System Builder', agentRole: 'Backend Architect', buildContext: 'backend' },
        { id: 'risk-module', title: 'Risk Module', summary: 'Position sizing, loss limits, and safety rules', status: 'running', progress: 46, stack: ['GPT-4o', 'Claude Code'], agent: 'Risk Agent', agentRole: 'Safety Engineer', dependsOn: ['core-engine'], buildContext: 'backend' },
        { id: 'dashboard-ui', title: 'Dashboard UI', summary: 'Bot controls, positions, and performance views', status: 'queued', progress: 14, stack: ['Claude', 'Lovable', 'Bolt'], agent: 'UI Agent', agentRole: 'Frontend Designer', dependsOn: ['core-engine', 'risk-module'], buildContext: 'ui' },
        { id: 'alerts', title: 'Alerts', summary: 'Slack, email, and critical event notifications', status: 'complete', progress: 100, stack: ['Mistral', 'n8n', 'APIs'], agent: 'Ops Agent', agentRole: 'DevOps Engineer', dependsOn: ['core-engine'], buildContext: 'automation' },
        { id: 'backtester', title: 'Backtester', summary: 'Historical simulation engine and result reporter', status: 'queued', progress: 0, stack: ['Claude', 'Claude Code', 'Gemini'], agent: 'Data Agent', agentRole: 'Data Engineer', dependsOn: ['core-engine'], buildContext: 'backend' },
      ],
    },
    {
      id: 'p2',
      name: 'Massa Marketing Site',
      goal: 'Homepage, funnel, API settings, and workflow pages',
      status: 'running',
      lifecycle: 'active',
      builds: [
        { id: 'homepage', title: 'Homepage', summary: 'Main marketing page and product explanation', status: 'running', progress: 71, stack: ['Claude', 'Lovable', 'Bolt'], agent: 'UI Agent', agentRole: 'Frontend Designer', buildContext: 'ui' },
        { id: 'api-settings', title: 'API Settings', summary: 'Provider cards, keys, and connection states', status: 'queued', progress: 24, stack: ['Claude', 'Replit', 'Cursor'], agent: 'Settings Agent', agentRole: 'Integration Engineer', dependsOn: ['homepage'], buildContext: 'backend' },
      ],
    },
    {
      id: 'p3',
      name: 'Web Scraper',
      goal: 'Source intake, parsing, and scheduled export flow',
      status: 'queued',
      lifecycle: 'active',
      builds: [
        { id: 'crawler', title: 'Crawler', summary: 'Fetch pipeline and retry handling', status: 'queued', progress: 12, stack: ['Claude', 'Claude Code', 'Perplexity'], agent: 'Crawler Agent', agentRole: 'Data Engineer', buildContext: 'backend' },
        { id: 'scheduler', title: 'Scheduler', summary: 'Daily export and email delivery', status: 'queued', progress: 0, stack: ['Mistral', 'n8n', 'Windsurf'], agent: 'Ops Agent', agentRole: 'DevOps Engineer', dependsOn: ['crawler'], buildContext: 'automation' },
      ],
    },
  ])

  useEffect(() => {
    if (selectedTenantId) {
      const tenantProject = projects.find(p => p.id === selectedTenantId)
      if (tenantProject && selectedProjectId !== selectedTenantId) {
        setSelectedProjectId(selectedTenantId)
      }
    }
  }, [selectedTenantId, projects, selectedProjectId])

  // Live progress simulation
  useEffect(() => {
    const t = setInterval(() => {
      setProjects(cur => cur.map(project => {
        const builds = project.builds.map(b => {
          if (b.status !== 'running') return b
          const next = Math.min(b.progress + Math.floor(Math.random() * 7) + 1, 100)
          return { ...b, progress: next, status: (next >= 100 ? 'complete' : 'running') as Status }
        })
        const hasRunning = builds.some(b => b.status === 'running')
        const firstQueued = builds.findIndex(b => b.status === 'queued')
        if (!hasRunning && firstQueued !== -1) {
          builds[firstQueued] = { ...builds[firstQueued], status: 'running', progress: Math.max(builds[firstQueued].progress, 12) }
        }
        const overall: Status = builds.every(b => b.status === 'complete') ? 'complete'
          : builds.some(b => b.status === 'running') ? 'running'
          : builds.some(b => b.status === 'queued') ? 'queued'
          : project.status
        return { ...project, status: overall, builds }
      }))
    }, 1800)
    return () => clearInterval(t)
  }, [])

  const agentResponses: Record<string, string[]> = {
    'core-engine': [
      'Understood. I\'ll update the strategy loop to handle that. Give me a moment to refactor the dispatch layer.',
      'Good call. I\'ve added that to the engine config. The change will propagate to all downstream modules.',
      'Working on it now. I\'ll push the update once the type checks pass.',
    ],
    'risk-module': [
      'Adjusting the risk parameters now. I\'ll run a backtest simulation to validate the change.',
      'That makes sense from a risk perspective. Updating the position sizing formula.',
      'Noted. I\'ll tighten the safety constraints and add an alert threshold.',
    ],
    'dashboard-ui': [
      'I\'ll update the layout to reflect that. Should have a preview ready in a minute.',
      'Good feedback. Tweaking the component hierarchy and re-rendering the chart panel.',
      'On it. I\'ll adjust the color scheme and spacing to match your vision.',
    ],
    'alerts': [
      'Adding that notification channel now. I\'ll wire it into the existing n8n workflow.',
      'Done. The alert trigger is configured and will fire on the conditions you specified.',
    ],
    'backtester': [
      'I\'ll incorporate that into the simulation parameters once the engine stabilizes.',
      'Noted. That will be part of the backtester\'s configuration panel.',
    ],
    'homepage': [
      'Great idea. I\'ll update the hero section and push a new preview.',
      'Adjusting the copy and layout now. The feature cards will reflect this.',
    ],
    'api-settings': [
      'I\'ll add that provider to the settings panel with a test connection button.',
      'Updating the API configuration flow. Give me a moment.',
    ],
    'crawler': [
      'Adjusting the crawl pipeline. I\'ll add that to the retry logic.',
      'Good point. I\'ll update the rate limiter to handle that edge case.',
    ],
    'scheduler': [
      'I\'ll configure the schedule once the crawler pipeline is ready.',
      'Noted. That will be part of the export workflow configuration.',
    ],
  }

  const sendChatMessage = (buildId: string) => {
    if (!chatInput.trim()) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: chatInput, time }
    setChatMessages(prev => ({ ...prev, [buildId]: [...(prev[buildId] || []), userMsg] }))
    setChatInput('')
    setTimeout(() => {
      const responses = agentResponses[buildId] || ['Understood. Working on that now.']
      const response = responses[Math.floor(Math.random() * responses.length)]
      const rNow = new Date()
      const rTime = `${String(rNow.getHours()).padStart(2,'0')}:${String(rNow.getMinutes()).padStart(2,'0')}:${String(rNow.getSeconds()).padStart(2,'0')}`
      setChatMessages(prev => ({ ...prev, [buildId]: [...(prev[buildId] || []), { id: `a-${Date.now()}`, role: 'agent', content: response, time: rTime }] }))
    }, 800 + Math.random() * 1200)
  }

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, expandedBuildId])

  const filteredProjects = useMemo(() => {
    const active = projects.filter(p => (projectLifecycles[p.id] || p.lifecycle) === 'active')
    if (!selectedTenantId) return active
    return active.filter(p => p.id === selectedTenantId)
  }, [projects, selectedTenantId, projectLifecycles])

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0]
  const expandedBuild = useMemo(() => {
    for (const p of projects) {
      const b = p.builds.find(b => b.id === expandedBuildId)
      if (b) return { build: b, project: p }
    }
    return null
  }, [projects, expandedBuildId])

  const isDark = true
  const c = {
    bg: isDark ? '#0a0d10' : '#f4f6f2',
    panel: isDark ? '#0f1215' : '#ffffff',
    alt: isDark ? '#131619' : '#f8fbf6',
    border: isDark ? '#252a35' : '#d8e5d7',
    text: isDark ? '#e8eaed' : '#101410',
    muted: isDark ? '#9ca3af' : '#556155',
    green: isDark ? '#34d399' : '#1a7a18',
    greenSoft: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(56,212,48,0.06)',
    blackGreen: isDark ? '#141820' : '#f0f0f0',
  }

  const readyBuildsCount = useMemo(
    () => filteredProjects.flatMap(p => p.builds).filter(b => b.status === 'queued').length,
    [filteredProjects]
  )

  const handleStartAll = () => {
    const targetIds = new Set(filteredProjects.map(p => p.id))
    setProjects(cur => cur.map(p => {
      if (!targetIds.has(p.id)) return p
      const builds = p.builds.map(b =>
        b.status === 'queued' ? { ...b, status: 'running' as Status, progress: Math.max(b.progress, 5) } : b
      )
      const overall: Status = builds.every(b => b.status === 'complete') ? 'complete'
        : builds.some(b => b.status === 'running') ? 'running'
        : builds.some(b => b.status === 'queued') ? 'queued'
        : p.status
      return { ...p, builds, status: overall }
    }))
  }

  // Build activity feed
  type FeedEntry = { id: number; time: string; buildName: string; phase: Phase; agent: string; status: string }
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([])
  const [feedHovered, setFeedHovered] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const feedCounter = useRef(0)
  const projectsRef = useRef(projects)
  const feedHoveredRef = useRef(feedHovered)
  useEffect(() => { projectsRef.current = projects }, [projects])
  useEffect(() => { feedHoveredRef.current = feedHovered }, [feedHovered])

  useEffect(() => {
    const statuses = [
      'Parsing AST and extracting symbols',
      'Running type checker on module',
      'Generating boilerplate from schema',
      'Writing integration test suite',
      'Resolving dependency graph',
      'Compiling to target format',
      'Optimising bundle size',
      'Streaming output to preview',
      'Verifying API contract',
      'Staging build artefacts',
      'Linking shared utilities',
      'Deploying to ephemeral env',
      'Running smoke test suite',
      'Refreshing asset hashes',
    ]
    const tick = () => {
      const allRunning = projectsRef.current.flatMap(p => p.builds.filter(b => b.status === 'running').map(b => ({ b, p })))
      if (allRunning.length === 0) return
      const { b, p } = allRunning[Math.floor(Math.random() * allRunning.length)]
      const phaseVal = getPhase([b])
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      feedCounter.current += 1
      const entry: FeedEntry = {
        id: feedCounter.current,
        time,
        buildName: `${p.name} / ${b.title}`,
        phase: phaseVal,
        agent: b.agent,
        status: statuses[Math.floor(Math.random() * statuses.length)],
      }
      setFeedEntries(prev => [...prev.slice(-39), entry])
    }
    tick()
    const t = setInterval(tick, 1600)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!feedHovered && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [feedEntries, feedHovered])

  // Code stream
  type CodeLine = { id: number; kind: 'code' | 'qa'; content: string; file?: string; lineNo?: number; qa?: 'pass' | 'warn'; projectId?: string }
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [dismissedActionKeys, setDismissedActionKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('massa_dismissedActionKeys')
      if (stored) return new Set<string>(JSON.parse(stored))
    } catch {}
    return new Set<string>()
  })
  const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('massa_collapsedProjectGroups')
      if (stored) return new Set<string>(JSON.parse(stored))
    } catch {}
    return new Set<string>()
  })
  const [pinnedActionKeys, setPinnedActionKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('massa_pinnedActionKeys')
      if (stored) return new Set<string>(JSON.parse(stored))
    } catch {}
    return new Set<string>()
  })
  const [pinnedActionOrder, setPinnedActionOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('massa_pinnedActionOrder')
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })
  const [pinnedNotes, setPinnedNotes] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('massa_pinnedNotes')
      if (stored) return JSON.parse(stored)
    } catch {}
    return {}
  })
  const [editingPinNoteKey, setEditingPinNoteKey] = useState<string | null>(null)
  const [editingPinNoteText, setEditingPinNoteText] = useState('')
  const [hoveredNoteKey, setHoveredNoteKey] = useState<string | null>(null)
  const draggedPinnedKey = useRef<string | null>(null)
  const [dragOverPinnedKey, setDragOverPinnedKey] = useState<string | null>(null)
  const [draggedPinnedKeyState, setDraggedPinnedKeyState] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after'>('before')
  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  useEffect(() => {
    try {
      localStorage.setItem('massa_dismissedActionKeys', JSON.stringify(Array.from(dismissedActionKeys)))
    } catch {}
  }, [dismissedActionKeys])
  useEffect(() => {
    try {
      localStorage.setItem('massa_collapsedProjectGroups', JSON.stringify(Array.from(collapsedProjectGroups)))
    } catch {}
  }, [collapsedProjectGroups])
  useEffect(() => {
    try {
      localStorage.setItem('massa_pinnedActionKeys', JSON.stringify(Array.from(pinnedActionKeys)))
    } catch {}
  }, [pinnedActionKeys])
  useEffect(() => {
    try {
      localStorage.setItem('massa_pinnedActionOrder', JSON.stringify(pinnedActionOrder))
    } catch {}
  }, [pinnedActionOrder])
  useEffect(() => {
    try {
      localStorage.setItem('massa_pinnedNotes', JSON.stringify(pinnedNotes))
    } catch {}
  }, [pinnedNotes])
  const [pinnedSectionCollapsed, setPinnedSectionCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('massa_pinnedSectionCollapsed')
      if (stored !== null) return JSON.parse(stored)
    } catch {}
    return false
  })
  useEffect(() => {
    try {
      localStorage.setItem('massa_pinnedSectionCollapsed', JSON.stringify(pinnedSectionCollapsed))
    } catch {}
  }, [pinnedSectionCollapsed])
  const actionRequiredProjectNames = useMemo(() => {
    const names = new Set<string>()
    for (const p of filteredProjects) {
      for (const b of p.builds) {
        const hasAction = b.status === 'failed' || b.status === 'queued' || b.status === 'running' || (() => {
          if (b.status !== 'complete') return false
          const msgs = chatMessages[b.id]
          const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null
          return lastMsg?.role === 'agent'
        })()
        if (hasAction) { names.add(p.name); break }
      }
    }
    return names
  }, [filteredProjects, chatMessages])
  useEffect(() => {
    setCollapsedProjectGroups(prev => {
      const pruned = new Set<string>([...prev].filter(name => actionRequiredProjectNames.has(name)))
      if (pruned.size === prev.size) return prev
      return pruned
    })
  }, [actionRequiredProjectNames])
  const sectionHeader = (label: string, key: string, extra?: React.ReactNode) => (
    <div
      onClick={() => toggleSection(key)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ fontSize: 8, color: '#9ca3af', transform: collapsedSections[key] ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
      <span className="panel-header" style={{ color: '#9ca3af' }}>{label}</span>
      {extra}
    </div>
  )
  const [codeLines, setCodeLines] = useState<CodeLine[]>([])
  const [codeHovered, setCodeHovered] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)
  const codeCounter = useRef(0)

  const CODE_POOL = [
    { file: 'src/engine/strategy.ts', line: 42, code: 'async function evaluateSignal(ctx: Context): Promise<Signal> {', projectId: 'p1' },
    { file: 'src/engine/strategy.ts', line: 43, code: '  const price = await ctx.market.getLatestPrice(ctx.symbol)', projectId: 'p1' },
    { file: 'src/risk/limits.ts', line: 17, code: 'if (exposure > MAX_EXPOSURE) throw new RiskError("limit exceeded")', projectId: 'p1' },
    { file: 'src/api/client.ts', line: 88, code: 'const res = await fetch(`${BASE_URL}/v1/orders`, { method: "POST", body })', projectId: 'p1' },
    { file: 'src/db/schema.ts', line: 5, code: 'export const orders = pgTable("orders", { id: serial("id").primaryKey(),', projectId: 'p1' },
    { file: 'src/ui/Dashboard.tsx', line: 14, code: 'const { data, isLoading } = useQuery(["positions"], fetchPositions)', projectId: 'p1' },
    { file: 'src/ui/Dashboard.tsx', line: 31, code: '  return <Chart series={data?.series ?? []} height={320} />', projectId: 'p1' },
    { file: 'src/pages/Homepage.tsx', line: 6, code: 'cron.schedule("0 9 * * 1-5", () => runDailyExport())', projectId: 'p2' },
    { file: 'src/pages/ApiSettings.tsx', line: 12, code: 'const providers = await fetchProviders()', projectId: 'p2' },
    { file: 'src/engine/backtest.ts', line: 77, code: 'const equity = positions.reduce((s, p) => s + p.unrealised, initialCapital)', projectId: 'p1' },
    { file: 'src/scraper/crawler.ts', line: 23, code: 'const $ = cheerio.load(await axios.get(url).then(r => r.data))', projectId: 'p3' },
    { file: 'src/scraper/parser.ts', line: 11, code: '// Send alert to #trading-alerts channel', projectId: 'p3' },
    { file: 'src/scraper/exporter.ts', line: 12, code: 'await slackClient.chat.postMessage({ channel, text: message })', projectId: 'p3' },
    { file: 'src/engine/order.ts', line: 55, code: 'export type Order = { id: string; side: "buy" | "sell"; qty: number }', projectId: 'p1' },
  ]
  const QA_POOL = [
    { qa: 'pass' as const, content: '✓ Unit test passed: strategy.evaluateSignal', projectId: 'p1' },
    { qa: 'pass' as const, content: '✓ Type check: src/engine/order.ts — no errors', projectId: 'p1' },
    { qa: 'pass' as const, content: '✓ Code review: logic approved by QA agent', projectId: 'p1' },
    { qa: 'pass' as const, content: '✓ Lint: 0 warnings, 0 errors', projectId: 'p2' },
    { qa: 'warn' as const, content: '⚠ Type mismatch on line 42 — Signal | undefined', projectId: 'p1' },
    { qa: 'warn' as const, content: '⚠ Unused import: Logger in risk/limits.ts', projectId: 'p1' },
    { qa: 'warn' as const, content: '⚠ Missing null check before API call on line 88', projectId: 'p3' },
    { qa: 'pass' as const, content: '✓ Integration test: /v1/orders endpoint — 200 OK', projectId: 'p1' },
    { qa: 'pass' as const, content: '✓ Schema migration dry-run succeeded', projectId: 'p2' },
    { qa: 'warn' as const, content: '⚠ Bundle size increased by 4.2 kB — review imports', projectId: 'p3' },
    { qa: 'pass' as const, content: '✓ Snapshot test: Dashboard renders correctly', projectId: 'p1' },
  ]

  useEffect(() => {
    const tick = () => {
      codeCounter.current += 1
      const isQA = Math.random() < 0.3
      let entry: CodeLine
      if (isQA) {
        const q = QA_POOL[Math.floor(Math.random() * QA_POOL.length)]
        entry = { id: codeCounter.current, kind: 'qa', content: q.content, qa: q.qa, projectId: q.projectId }
      } else {
        const c = CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)]
        entry = { id: codeCounter.current, kind: 'code', content: c.code, file: c.file, lineNo: c.line, projectId: c.projectId }
      }
      setCodeLines(prev => [...prev.slice(-79), entry])
    }
    tick()
    const t = setInterval(tick, 900)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!codeHovered && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight
    }
  }, [codeLines, codeHovered])

  // Drag handlers
  const handleDragStart = (buildId: string, projectId: string) => setDraggedBuild({ buildId, projectId })
  const handleDragOver = (e: React.DragEvent, buildId: string) => { e.preventDefault(); setDragOverId(buildId) }
  const handleDrop = (e: React.DragEvent, targetBuildId: string, projectId: string) => {
    e.preventDefault()
    if (!draggedBuild || draggedBuild.projectId !== projectId) { setDraggedBuild(null); setDragOverId(null); return }
    setProjects(cur => cur.map(p => {
      if (p.id !== projectId) return p
      const builds = [...p.builds]
      const fromIdx = builds.findIndex(b => b.id === draggedBuild.buildId)
      const toIdx = builds.findIndex(b => b.id === targetBuildId)
      if (fromIdx === -1 || toIdx === -1) return p
      const [moved] = builds.splice(fromIdx, 1)
      builds.splice(toIdx, 0, moved)
      return { ...p, builds }
    }))
    setDraggedBuild(null)
    setDragOverId(null)
  }
  const handleDragEnd = () => { setDraggedBuild(null); setDragOverId(null) }

  const expandProject = projects.find(p => p.id === expandedProject)
  const previewProject = projects.find(p => p.id === livePreviewProject)

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, Arial, sans-serif', padding: isMobile ? '12px 10px' : '16px 24px' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes phase-pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes terminal-blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes subtle-glow { 0%,100%{box-shadow: 0 0 4px rgba(52,211,153,0.15)} 50%{box-shadow: 0 0 8px rgba(52,211,153,0.25)} }
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes suggestion-slide-in { 0%{opacity:0;transform:translateY(6px) scale(0.97)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #252a35; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a3040; }
        textarea:focus, input:focus { outline: none !important; box-shadow: none !important; }
        .terminal-input-box textarea { caret-color: #34d399; }
        .terminal-input-box textarea::placeholder { font-family: "JetBrains Mono", Menlo, monospace; font-size: 13px; letter-spacing: -0.01em; }
        .panel-header { font-size: 10px; letter-spacing: 1.4px; font-weight: 700; text-transform: uppercase; font-family: "JetBrains Mono", Menlo, monospace; }
      `}</style>

      {/* HEADER */}
      <div style={{ height: 56, border: `1px solid #1e2330`, background: '#080a0e', display: 'flex', alignItems: 'center', padding: '0 18px', marginBottom: 12, position: 'relative', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: 8, color: '#e8eaed', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>MASSA</span>
          <span style={{ background: '#34d399', color: '#080a0e', fontWeight: 800, fontSize: isMobile ? 12 : 14, padding: '2px 8px', borderRadius: 3, boxShadow: '0 0 12px rgba(52,211,153,0.3)', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>AI</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <TenantSelector />
          <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', display: isDesktop ? 'block' : 'none' }}>v2.4.1</span>
          <div style={{ width: 30, height: 30, borderRadius: 4, background: 'rgba(52,211,153,0.06)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: `1px solid rgba(52,211,153,0.15)`, fontSize: 12, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>M</div>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? (`${mobileNavOpen ? '160px' : '42px'} minmax(0, 1fr) ${mobileRightOpen ? '160px' : '42px'}`) : isTablet ? (`${mobileNavOpen ? '160px' : '42px'} minmax(0, 1fr) ${mobileRightOpen ? '180px' : '42px'}`) : (`${leftNavCollapsed ? '42px' : '160px'} minmax(0, 1fr) ${rightPanelCollapsed ? '42px' : '200px'}`), gap: isMobile ? 6 : 12, minHeight: 'calc(100vh - 96px)', transition: 'grid-template-columns 0.3s ease' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ border: `1px solid #1e2330`, background: '#0a0d10', padding: (isDesktop ? leftNavCollapsed : !mobileNavOpen) ? '12px 4px' : 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2, overflow: 'hidden', transition: 'padding 0.3s ease' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: (isDesktop ? leftNavCollapsed : !mobileNavOpen) ? 'center' : 'space-between', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #1e2330' }}>
              {!(isDesktop ? leftNavCollapsed : !mobileNavOpen) && <span className="panel-header" style={{ color: '#9ca3af' }}>SYS://NAV</span>}
              <button
                onClick={() => isDesktop ? setLeftNavCollapsed(!leftNavCollapsed) : setMobileNavOpen(!mobileNavOpen)}
                title={(isDesktop ? leftNavCollapsed : !mobileNavOpen) ? 'Expand nav' : 'Collapse nav'}
                style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #1e2330', background: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, padding: 0, flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#34d399'; e.currentTarget.style.borderColor = '#34d399' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#1e2330' }}
              ><span style={{ display: 'inline-block', transform: (isDesktop ? leftNavCollapsed : !mobileNavOpen) ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>»</span></button>
            </div>
            {[
              { label: 'Dashboard', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, view: 'dashboard' as const, path: '' },
              { label: 'Chats', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, view: 'chats' as const, path: '' },
              { label: 'Ideas', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>, view: 'ideas' as const, path: '' },
              { label: 'History', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>, view: 'history' as const, path: '' },
              { label: 'Automations', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, view: 'automations' as const, path: '' },
              { label: 'Marketing', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, view: 'marketing' as const, path: '' },
              { label: 'Skills', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>, view: 'skills' as const, path: '' },
              { label: 'APIs', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-6-6-6"/><path d="M12 19h8"/></svg>, view: 'apis' as const, path: '' },
              { label: 'Web Scraper', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>, view: 'webScraper' as const, path: '' },
              { label: 'Inside MASSA', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, view: 'insideMassa' as const, path: '' },
              { label: 'Integrations', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>, view: 'integrations' as const, path: '' },
              { label: 'Current Projects', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, view: 'currentProjects' as const, path: '' },
              { label: 'Published', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>, view: 'published' as const, path: '' },
            ].map(item => {
              const active = item.view ? activeView === item.view : false
              const clickable = item.view !== null || item.path !== ''
              return (
                <div key={item.label} onClick={() => {
                  if (item.view) { setActiveView(item.view); setChatOriginBuildId(null) }
                  else if (item.path) { navigate(item.path) }
                }} title={(isDesktop ? leftNavCollapsed : !mobileNavOpen) ? item.label : undefined} style={{ padding: (isDesktop ? leftNavCollapsed : !mobileNavOpen) ? '8px 0' : '10px 10px', borderRadius: 0, marginBottom: 0, background: active ? 'rgba(52,211,153,0.04)' : 'transparent', color: active ? '#34d399' : '#9ca3af', borderLeft: active ? '2px solid #34d399' : '2px solid transparent', borderRight: active ? '1px solid #252a35' : '1px solid transparent', fontSize: 12, fontWeight: active ? 600 : 500, cursor: clickable ? 'pointer' : 'default', transition: 'all 0.12s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: '0.02em', borderBottom: '1px solid #1e2330', textAlign: (isDesktop ? leftNavCollapsed : !mobileNavOpen) ? 'center' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: (isDesktop ? leftNavCollapsed : !mobileNavOpen) ? 'center' : undefined, gap: 8 }}>
                  {(isDesktop ? leftNavCollapsed : !mobileNavOpen) ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                  ) : (
                    <><span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>{item.icon}</span>{item.label}</>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER + RIGHT AREA */}
        {activeView === 'chats' ? (
          <div style={{ gridColumn: '2 / -1' }}>
            <ChatView
              projects={projects}
              selectedBuildId={selectedChatBuildId}
              onSelectBuild={setSelectedChatBuildId}
              messages={chatMessages}
              onMessagesChange={setChatMessages}
              onBackToBuild={chatOriginBuildId ? () => { setActiveView('dashboard'); setExpandedBuildId(chatOriginBuildId); setChatOriginBuildId(null) } : undefined}
              onGoHome={chatOriginBuildId ? () => { setActiveView('dashboard'); setChatOriginBuildId(null) } : undefined}
            />
          </div>
        ) : activeView === 'ideas' ? (
          <div style={{ gridColumn: '2 / -1', border: `1px solid #1e2330`, background: '#0a0d10', padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
            <IdeasView enhancingId={enhancingId} onTurnIntoPrompt={async (content, ideaId) => {
              setEnhancingId(ideaId)
              try {
                const res = await fetch('/api/ai/enhance-prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
                const data = await res.json()
                setRawInput(data.prompt || content)
              } catch {
                setRawInput(content)
              } finally {
                setEnhancingId(null)
                setActiveView('dashboard')
              }
            }} />
          </div>
        ) : activeView === 'currentProjects' ? (
          <CurrentProjectsView projects={projects} setProjects={setProjects} onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'published' ? (
          <PublishedView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'history' ? (
          <HistoryView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'automations' ? (
          <AutomationsView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'marketing' ? (
          <MarketingView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'skills' ? (
          <SkillsView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'apis' ? (
          <ApisView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'webScraper' ? (
          <WebScraperView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'integrations' ? (
          <IntegrationsView onBack={() => setActiveView('dashboard')} />
        ) : activeView === 'insideMassa' ? (
          <InsideMassaView onBack={() => setActiveView('dashboard')} />
        ) : <>
        {/* CENTER MAIN */}
        <div style={{ border: `1px solid #1e2330`, background: '#0a0d10', padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>

          {/* Input area — Terminal Command Console */}
          {(() => {
            const flowSteps = [
              { label: 'Prompt', active: true },
              { label: 'Enhance', active: true },
              { label: 'Build', active: selectedProject.builds.some(b => b.status !== 'idle') },
              { label: 'Deploy', active: selectedProject.builds.every(b => b.status === 'complete') },
            ]
            return (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="terminal-input-box" style={{ flex: 1, minWidth: 0, border: `1px solid #252a35`, background: '#080a0e', borderRadius: 10, position: 'relative', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                {/* Terminal title bar with inline pipeline tracker */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid #1e2330', background: '#0c0f14' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700, lineHeight: 1 }}>{'>'}</span>
                    <span className="panel-header" style={{ color: '#9ca3af', fontSize: 9 }}>COMMAND</span>
                    <div style={{ width: 1, height: 12, background: '#252a35' }} />
                    <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 500, letterSpacing: 0.5 }}>MASSA://{selectedTenantId ? (projects.find(p => p.id === selectedTenantId)?.name?.toLowerCase().replace(/\s+/g, '-') ?? 'prompt') : 'prompt'}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {flowSteps.map((step, i) => (
                        <Fragment key={step.label}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 3,
                              border: `1px solid ${step.active ? 'rgba(232,234,237,0.2)' : '#252a35'}`,
                              background: step.active ? 'rgba(232,234,237,0.04)' : '#080a0e',
                              color: step.active ? '#e8eaed' : '#9ca3af',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: 10,
                              fontFamily: '"JetBrains Mono", Menlo, monospace',
                              boxShadow: 'none',
                              transition: 'all 0.3s ease',
                            }}>{i + 1}</div>
                            <div style={{ fontSize: 7, color: step.active ? '#9ca3af' : '#4b5563', fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.3, textTransform: 'uppercase' }}>{step.label}</div>
                          </div>
                          {i < flowSteps.length - 1 && <div style={{ width: 75, height: 1, background: step.active && flowSteps[i + 1].active ? 'rgba(232,234,237,0.15)' : '#252a35', marginBottom: 10, flexShrink: 0 }} />}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)', animation: 'subtle-glow 3s ease-in-out infinite' }} />
                    <span style={{ fontSize: 9, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 600, opacity: 0.7 }}>LIVE</span>
                  </div>
                </div>
                {/* Command input field */}
                <div style={{ padding: '12px 14px 8px', position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 3, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700, opacity: 0.6, lineHeight: 1.7 }}>$</span>
                    </div>
                    <textarea
                      value={rawInput}
                      onChange={e => setRawInput(e.target.value)}
                      placeholder={typedPlaceholder}
                      style={{ width: '100%', minHeight: 80, background: 'transparent', border: 'none', outline: 'none', color: '#e8eaed', fontSize: 14, lineHeight: 1.7, resize: 'vertical', fontFamily: '"JetBrains Mono", Menlo, monospace', boxSizing: 'border-box', letterSpacing: '-0.01em' }}
                    />
                  </div>
                </div>
                {/* Bottom bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 10px', borderTop: '1px solid #1e2330' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                      onMouseEnter={() => setHoveredArchBtn('arch-build')}
                      onMouseLeave={() => setHoveredArchBtn(null)}
                      onClick={() => { if (rawInput.trim().length > 0) openClarifyWizard() }}
                      style={{ background: hoveredArchBtn === 'arch-build' ? '#141e14' : '#0c1210', color: '#34d399', border: `1px solid ${hoveredArchBtn === 'arch-build' ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.15)'}`, padding: '5px 12px', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: 10, fontFamily: '"JetBrains Mono", Menlo, monospace', boxShadow: hoveredArchBtn === 'arch-build' ? '0 0 16px rgba(52,211,153,0.1)' : 'none', transition: 'all 0.2s ease', letterSpacing: 0.3 }}>
                      <span style={{ marginRight: 5, opacity: 0.5 }}>▶</span>EXECUTE
                    </button>
                    <div style={{ position: 'relative', display: 'inline-block' }}
                      onMouseEnter={() => setHoveredArchBtn('claude-rec')}
                      onMouseLeave={() => setHoveredArchBtn(null)}
                    >
                      <div style={{ border: '1px solid #1e2330', padding: '5px 12px', borderRadius: 4, color: '#9ca3af', background: hoveredArchBtn === 'claude-rec' ? '#0f1215' : '#0a0d10', fontSize: 10, fontWeight: 700, cursor: 'default', transition: 'all 0.2s ease', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                        <span style={{ color: '#9ca3af', marginRight: 4 }}>llm:</span>
                        <span style={{ color: '#9ca3af' }}>sonnet-4.6</span>
                      </div>
                      <span
                        onMouseEnter={() => setHoveredArchBtn('llm-tip')}
                        onMouseLeave={() => setHoveredArchBtn(null)}
                        style={{ position: 'absolute', top: -4, right: -4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 11, height: 11, borderRadius: '50%', border: '1px solid #333', color: '#555', fontSize: 7, fontWeight: 700, cursor: 'help', fontFamily: '"JetBrains Mono", Menlo, monospace', background: '#0a0d10', lineHeight: 1, zIndex: 2 }}>?</span>
                      {hoveredArchBtn === 'llm-tip' && (
                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, background: '#0f1215', border: '1px solid #252a35', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#9ca3af', width: 220, lineHeight: 1.5, boxShadow: '0 4px 16px rgba(0,0,0,0.6)', zIndex: 10, pointerEvents: 'none', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                          {getModelReason('Claude')}
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        onClick={() => setVagueMode(v => !v)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1e2330'; e.currentTarget.style.color = '#e8eaed' }}
                        onMouseLeave={e => { e.currentTarget.style.background = vagueMode ? 'rgba(52,211,153,0.06)' : '#0c0f14'; e.currentTarget.style.color = vagueMode ? '#34d399' : '#9ca3af' }}
                        style={{ padding: '5px 12px', borderRadius: 4, border: vagueMode ? '1px solid rgba(52,211,153,0.3)' : '1px solid #1e2330', background: vagueMode ? 'rgba(52,211,153,0.06)' : '#0c0f14', color: vagueMode ? '#34d399' : '#9ca3af', fontWeight: 700, fontSize: 10, cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', whiteSpace: 'nowrap' }}>nebulous mode</button>
                      <span
                        onMouseEnter={() => setHoveredArchBtn('nebulous-tip')}
                        onMouseLeave={() => setHoveredArchBtn(null)}
                        style={{ position: 'absolute', top: -4, right: -4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 11, height: 11, borderRadius: '50%', border: '1px solid #333', color: '#555', fontSize: 7, fontWeight: 700, cursor: 'help', fontFamily: '"JetBrains Mono", Menlo, monospace', background: '#0a0d10', lineHeight: 1, zIndex: 2 }}>?</span>
                      {hoveredArchBtn === 'nebulous-tip' && (
                        <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8, background: '#0f1215', border: '1px solid #252a35', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#9ca3af', width: 220, lineHeight: 1.5, boxShadow: '0 4px 16px rgba(0,0,0,0.6)', zIndex: 10, pointerEvents: 'none', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                          <div style={{ fontWeight: 700, color: '#e8eaed', marginBottom: 4, fontSize: 10 }}>NEBULOUS MODE {vagueMode ? '[ON]' : '[OFF]'}</div>
                          When enabled, MASSA will ask clarifying questions before building if your prompt is broad or ambiguous.
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                    <button
                      onClick={() => setShowAttachMenu(showAttachMenu === 'main' ? null : 'main')}
                      onMouseEnter={e => e.currentTarget.style.background = '#1a1f28'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ background: 'transparent', border: 'none', color: showAttachMenu === 'main' ? '#e8eaed' : '#9ca3af', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, fontSize: 14, transition: 'color 0.2s, background 0.2s', display: 'flex', alignItems: 'center' }}
                      title="Attach files"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    {showAttachMenu === 'main' && (
                      <div style={{ position: 'absolute', bottom: 36, right: 0, background: '#0f1215', border: '1px solid #252a35', borderRadius: 10, padding: '4px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 10 }}>
                        {[
                          { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, label: 'Photo Library' },
                          { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>, label: 'Take Photo or Video' },
                          { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, label: 'Choose Files' },
                        ].map((item, i) => (
                          <div key={i} onClick={() => setShowAttachMenu(null)}
                            onMouseEnter={e => e.currentTarget.style.background = '#1a1f28'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', color: '#9ca3af', fontSize: 12, fontWeight: 500, transition: 'background 0.15s', borderBottom: i < 2 ? '1px solid #1e2330' : 'none', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                            <span style={{ color: '#9ca3af', display: 'flex' }}>{item.icon}</span>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                {(() => {
                  const visibleSuggestions = ignoredAll ? [] : aiSuggestions.filter(s => !dismissedSuggestions.has(s))
                  const showSection = !ignoredAll && (suggestionsLoading || visibleSuggestions.length > 0)
                  if (!showSection) return null
                  return (
                    <div style={{ width: 340, flexShrink: 0, background: '#0c0f14', border: '1px solid #252a35', borderRadius: 12, padding: '12px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.05)', animation: 'suggestion-slide-in 0.25s ease both', alignSelf: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="panel-header" style={{ color: '#9ca3af', fontSize: 9 }}>NEXT STEPS</div>
                          <div style={{ position: 'relative', display: 'inline-flex' }}
                            onMouseEnter={() => setShowSuggestionsTooltip(true)}
                            onMouseLeave={() => setShowSuggestionsTooltip(false)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'help', opacity: 0.7 }}>
                              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            {showSuggestionsTooltip && (
                              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, background: '#0f1215', border: '1px solid #252a35', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.6)', zIndex: 20, pointerEvents: 'none', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                                Let us help improve your prompt
                              </div>
                            )}
                          </div>
                          {suggestionsLoading && <div style={{ width: 4, height: 4, borderRadius: 999, background: '#34d399', animation: 'subtle-glow 1s ease-in-out infinite' }} />}
                        </div>
                        <button
                          onClick={() => { setIgnoredAll(true); setAiSuggestions([]) }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#e8eaed' }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#4b5563' }}
                          style={{ background: 'transparent', border: 'none', color: '#4b5563', cursor: 'pointer', padding: '2px', borderRadius: 4, transition: 'color 0.15s ease', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Dismiss suggestions"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                      {suggestionsLoading && visibleSuggestions.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>analyzing prompt...</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {visibleSuggestions.map((s, i) => (
                            <div key={`${i}-${s}`} onClick={() => { setRawInput(s); setIgnoredAll(true); setAiSuggestions([]); openClarifyWizard(s) }}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: '#9ca3af', background: '#080a0e', border: '1px solid #1e2330', borderRadius: 10, padding: '8px 10px 8px 14px', cursor: 'pointer', lineHeight: 1.5, transition: 'all 0.2s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', animation: `suggestion-slide-in 0.3s ease ${i * 0.06}s both` }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#141820'; e.currentTarget.style.borderColor = '#34d399'; e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.boxShadow = '0 0 12px rgba(52,211,153,0.08)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#080a0e'; e.currentTarget.style.borderColor = '#1e2330'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.boxShadow = 'none' }}>
                              <span style={{ display: 'flex', alignItems: 'flex-start', gap: 4, flex: 1, minWidth: 0 }}>
                                <span style={{ color: '#34d399', fontWeight: 700, opacity: 0.5, flexShrink: 0, marginTop: 1 }}>{'›'}</span>
                                <span>{s}</span>
                              </span>
                              <button
                                onClick={e => { e.stopPropagation(); setDismissedSuggestions(prev => new Set(prev).add(s)) }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'transparent' }}
                                style={{ background: 'transparent', border: 'none', color: '#4b5563', cursor: 'pointer', padding: '1px 3px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease', lineHeight: 1, marginTop: 2 }}
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {visibleSuggestions.length > 0 && (
                        <button
                          onClick={() => { setIgnoredAll(true); setAiSuggestions([]) }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#9ca3af' }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#4b5563' }}
                          style={{ background: 'transparent', border: 'none', color: '#4b5563', fontSize: 9, cursor: 'pointer', padding: '6px 0 2px', fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'color 0.15s ease', letterSpacing: 0.3, width: '100%', textAlign: 'center' }}
                        >
                          Ignore suggestions
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            )
          })()}


          {/* Projects header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="panel-header" style={{ color: '#9ca3af' }}>PROJECTS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* View mode dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setViewDropdownOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', border: `1px solid ${c.border}`, borderRadius: 6, background: viewDropdownOpen ? '#1a1a1a' : 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.12s, color 0.12s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = '#555' }}
                  onMouseLeave={e => { if (!viewDropdownOpen) { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = c.border } }}
                >
                  {viewMode === 'list' && <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2"/><rect x="0" y="4" width="12" height="2"/><rect x="0" y="8" width="12" height="2"/></svg>}
                  {viewMode === 'grid' && <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="0" y="0" width="5" height="5"/><rect x="6" y="0" width="5" height="5"/><rect x="0" y="6" width="5" height="5"/><rect x="6" y="6" width="5" height="5"/></svg>}
                  {viewMode === 'tree' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="2" cy="2" r="1.5"/><circle cx="10" cy="6" r="1.5"/><circle cx="10" cy="10" r="1.5"/><line x1="2" y1="2" x2="10" y2="6"/><line x1="2" y1="2" x2="10" y2="10"/></svg>}
                  {viewMode === 'arch' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="4" height="3" rx="1"/><rect x="7" y="1" width="4" height="3" rx="1"/><rect x="4" y="8" width="4" height="3" rx="1"/><line x1="3" y1="4" x2="6" y2="8"/><line x1="9" y1="4" x2="6" y2="8"/></svg>}
                  {viewMode === 'graph' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="2" cy="6" r="1.5"/><circle cx="10" cy="2" r="1.5"/><circle cx="10" cy="10" r="1.5"/><line x1="3.5" y1="5" x2="8.5" y2="3"/><line x1="3.5" y1="7" x2="8.5" y2="9"/><line x1="10" y1="3.5" x2="10" y2="8.5"/></svg>}
                  {viewMode === 'timeline' && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="3" x2="11" y2="3"/><line x1="1" y1="6" x2="11" y2="6"/><line x1="1" y1="9" x2="11" y2="9"/><circle cx="4" cy="3" r="1.5" fill="currentColor" stroke="none"/><circle cx="7" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="9" r="1.5" fill="currentColor" stroke="none"/></svg>}
                  {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor" style={{ opacity: 0.6, transform: viewDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M0 0l4 5 4-5z"/></svg>
                </button>
                {viewDropdownOpen && (
                  <div style={{ position: 'absolute', top: 30, right: 0, background: '#111', border: `1px solid ${c.border}`, borderRadius: 8, padding: '4px 0', zIndex: 50, minWidth: 130, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                    {([
                      { key: 'list', icon: <svg width="12" height="10" viewBox="0 0 12 10" fill="currentColor"><rect x="0" y="0" width="12" height="2"/><rect x="0" y="4" width="12" height="2"/><rect x="0" y="8" width="12" height="2"/></svg>, label: 'List' },
                      { key: 'grid', icon: <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="0" y="0" width="5" height="5"/><rect x="6" y="0" width="5" height="5"/><rect x="0" y="6" width="5" height="5"/><rect x="6" y="6" width="5" height="5"/></svg>, label: 'Grid' },
                      { key: 'tree', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="2" cy="2" r="1.5"/><circle cx="10" cy="6" r="1.5"/><circle cx="10" cy="10" r="1.5"/><line x1="2" y1="2" x2="10" y2="6"/><line x1="2" y1="2" x2="10" y2="10"/></svg>, label: 'Tree' },
                      { key: 'arch', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="4" height="3" rx="1"/><rect x="7" y="1" width="4" height="3" rx="1"/><rect x="4" y="8" width="4" height="3" rx="1"/><line x1="3" y1="4" x2="6" y2="8"/><line x1="9" y1="4" x2="6" y2="8"/></svg>, label: 'Arch' },
                      { key: 'graph', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="2" cy="6" r="1.5"/><circle cx="10" cy="2" r="1.5"/><circle cx="10" cy="10" r="1.5"/><line x1="3.5" y1="5" x2="8.5" y2="3"/><line x1="3.5" y1="7" x2="8.5" y2="9"/><line x1="10" y1="3.5" x2="10" y2="8.5"/></svg>, label: 'Graph' },
                      { key: 'timeline', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="3" x2="11" y2="3"/><line x1="1" y1="6" x2="11" y2="6"/><line x1="1" y1="9" x2="11" y2="9"/><circle cx="4" cy="3" r="1.5" fill="currentColor" stroke="none"/><circle cx="7" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="9" r="1.5" fill="currentColor" stroke="none"/></svg>, label: 'Timeline' },
                    ] as { key: typeof viewMode; icon: React.ReactNode; label: string }[]).map(opt => (
                      <div
                        key={opt.key}
                        onClick={() => { setViewMode(opt.key); setViewDropdownOpen(false) }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e1e1e'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: viewMode === opt.key ? 700 : 500, color: viewMode === opt.key ? c.green : '#ccc', background: 'transparent', transition: 'background 0.12s' }}
                      >
                        <span style={{ color: viewMode === opt.key ? c.green : '#666', display: 'flex', alignItems: 'center' }}>{opt.icon}</span>
                        {opt.label}
                        {viewMode === opt.key && <span style={{ marginLeft: 'auto', color: c.green, fontSize: 10 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Projects list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {filteredProjects.map((project, pi) => {
              const isSel = selectedProjectId === project.id
              const thinkingLines = getThinkingLines(project.builds)
              const codeStreamLines = getCodeStreamLines(project.builds)
              const isPendingOpen = pendingDropdown === project.id
              const allBuilds = project.builds

              const statusColor = (s: Status) =>
                s === 'running' ? '#f59e0b' : s === 'failed' ? '#ef4444' : s === 'complete' ? '#34d399' : '#555'

              const buildCards = (column: boolean, wrap = false) => (
                <div style={{ display: 'flex', flexDirection: column ? 'column' : 'row', gap: 16, ...(column ? {} : wrap ? { flexWrap: 'wrap' } : { paddingBottom: 6 }) }}>
                  {project.builds.map((build) => {
                    const sc = skillColor(build.stack)
                    const isRunning = build.status === 'running'
                    const isFailed = build.status === 'failed'
                    const isComplete = build.status === 'complete'
                    const isDragging = draggedBuild?.buildId === build.id
                    const isDragOver = dragOverId === build.id && draggedBuild?.buildId !== build.id
                    const bt = getBuildType(build.stack, build.title)
                    const statusText = getInlineStatus(build)
                    const isCardExpanded = expandedBuildCard === build.id

                    return (
                      <div key={build.id} draggable onDragStart={() => handleDragStart(build.id, project.id)} onDragOver={e => handleDragOver(e, build.id)} onDrop={e => handleDrop(e, build.id, project.id)} onDragEnd={handleDragEnd}
                        onClick={() => { setBuildModalTab('chat'); setExpandedBuildId(build.id) }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = isCardExpanded ? '#aaa' : '#666' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = isDragOver ? '#888' : isCardExpanded ? '#777' : isFailed ? '#555' : isComplete ? '#333' : c.border }}
                        style={{ ...(column ? { width: '100%' } : { minWidth: isCardExpanded ? 260 : 176, maxWidth: isCardExpanded ? 260 : 176, flexShrink: 0 }), border: `1px solid ${isDragOver ? '#888' : isCardExpanded ? '#777' : isFailed ? '#555' : isComplete ? '#333' : c.border}`, background: c.alt, borderRadius: 12, padding: 0, display: 'flex', flexDirection: column ? 'row' : 'column', alignItems: column ? 'center' : undefined, opacity: isDragging ? 0.4 : isComplete ? 0.65 : 1, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'opacity 0.2s, border-color 0.2s, min-width 0.2s, max-width 0.2s' }}>

                        {column ? (
                          <>
                            <div style={{ width: 50, flexShrink: 0, padding: 8, position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: '#555', borderRadius: '12px 0 0 12px' }} />
                              <PreviewThumbnail buildId={build.id} buildType={bt} sc={sc} size="mini" />
                            </div>
                            <div style={{ flex: 1, padding: '8px 10px 8px 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{build.title}</div>
                                </div>
                                <div style={{ fontSize: 10, color: isFailed ? '#f87171' : c.muted, fontStyle: isRunning ? 'italic' : 'normal' }}>{statusText}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                                <div style={{ width: 80, height: 3, background: isDark ? '#131619' : '#dfe8de', borderRadius: 999, overflow: 'hidden' }}>
                                  <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                                </div>
                                <span style={{ fontSize: 10, color: c.muted, minWidth: 28 }}>{build.progress}%</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setChatProject(project.id); setChatProjectBuildId(build.id) }}
                                title="Open chat"
                                style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.color = c.green; e.currentTarget.style.borderColor = c.green }}
                                onMouseLeave={e => { e.currentTarget.style.color = c.muted; e.currentTarget.style.borderColor = c.border }}
                              >💬</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ padding: '8px 10px 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 6 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{build.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedBuildCard(isCardExpanded ? null : build.id) }}
                                    title={isCardExpanded ? 'Collapse' : 'Expand'}
                                    style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${c.border}`, background: isCardExpanded ? `${sc}15` : 'transparent', color: isCardExpanded ? sc : c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, padding: 0, transition: 'color 0.15s, border-color 0.15s, background 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = sc; e.currentTarget.style.borderColor = sc }}
                                    onMouseLeave={e => { if (!isCardExpanded) { e.currentTarget.style.color = c.muted; e.currentTarget.style.borderColor = c.border } }}
                                  ><span style={{ transform: isCardExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▸</span></button>
                                </div>
                              </div>
                            </div>
                            <div style={{ padding: '0 8px' }}>
                              <PreviewThumbnail buildId={build.id} buildType={bt} sc={sc} />
                            </div>
                            <div style={{ padding: '8px 10px 8px' }}>
                              <div style={{ display: 'flex', gap: 3 }}>
                                {[
                                  { label: 'Chat', tab: 'chat' as const },
                                  { label: 'Code', tab: 'code' as const },
                                  { label: 'Details', tab: 'details' as const },
                                  { label: 'Revert', tab: 'revert' as const },
                                  { label: 'Preview', tab: 'preview' as const },
                                ].map(btn => (
                                  <button key={btn.label} title={btn.label} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setBuildModalTab(btn.tab); setExpandedBuildId(build.id) }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#ccc' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#777' }}
                                    style={{
                                      flex: 1, height: 28, borderRadius: 4,
                                      background: 'transparent', border: '1px solid #333',
                                      color: '#777', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      padding: 0, transition: 'border-color 0.15s, color 0.15s', minWidth: 0,
                                    }}>{getTabIcon(btn.tab, 13)}</button>
                                ))}
                              </div>

                              {isCardExpanded && (() => {
                                const ctx = (build.buildContext || 'backend') as string
                                const snippets = CODE_SNIPPETS[ctx] || CODE_SNIPPETS.backend
                                const snippet = snippets[0]
                                return (
                                  <div style={{ marginTop: 8, borderTop: `1px solid ${c.border}`, paddingTop: 8 }}>
                                    <div style={{ fontSize: 8, color: '#555', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' }}>Thinking</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px', background: '#080808', borderRadius: 3, border: `1px solid ${c.border}`, marginBottom: 6, overflow: 'hidden' }}>
                                      <span style={{ fontSize: 9, color: '#555', flexShrink: 0 }}>▸</span>
                                      <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', flexShrink: 0 }}>{build.agent}</span>
                                      <span style={{ fontSize: 9, color: '#555', fontFamily: '"JetBrains Mono", Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusText}</span>
                                    </div>

                                    <div style={{ fontSize: 8, color: '#555', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' }}>Code</div>
                                    {snippet && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: '#080808', borderRadius: 3, border: `1px solid ${c.border}`, marginBottom: 3, overflow: 'hidden' }}>
                                        <span style={{ fontSize: 8, color: '#555', flexShrink: 0 }}>›</span>
                                        <span style={{ fontSize: 8, color: '#f59e0b88', fontFamily: '"JetBrains Mono", Menlo, monospace', flexShrink: 0 }}>{snippet.file}</span>
                                        <span style={{ fontSize: 8, color: '#444', fontFamily: '"JetBrains Mono", Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snippet.code}</span>
                                      </div>
                                    )}

                                    <div style={{ fontSize: 8, color: '#555', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.5, marginBottom: 4, marginTop: 6, textTransform: 'uppercase' }}>Build</div>
                                    <div style={{ padding: '4px 6px', background: '#080808', borderRadius: 3, border: `1px solid ${c.border}` }}>
                                      <div style={{ fontSize: 9, color: '#999', fontFamily: '"JetBrains Mono", Menlo, monospace', marginBottom: 3 }}>{build.summary}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                        <div style={{ flex: 1, height: 3, background: '#131619', borderRadius: 999, overflow: 'hidden' }}>
                                          <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                                        </div>
                                        <span style={{ fontSize: 9, color: c.muted, minWidth: 28 }}>{build.progress}%</span>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                        {build.stack.map(s => (
                                          <span key={s} style={{ fontSize: 8, color: '#888', fontFamily: '"JetBrains Mono", Menlo, monospace', padding: '1px 4px', background: '#111', borderRadius: 3, border: `1px solid ${c.border}` }}>{s}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Add agent / New task */}
                  <div style={{ ...(column ? { width: '100%', height: 80, flexDirection: 'row' } : { minWidth: 140, height: 148, flexDirection: 'column', flexShrink: 0 }), border: `1px dashed ${c.border}`, borderRadius: 12, display: 'flex', overflow: 'hidden', background: 'transparent' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'background 0.15s', borderRight: column ? 'none' : `1px dashed ${c.border}`, borderBottom: column ? `1px dashed ${c.border}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 36, height: 36, borderRadius: 999, border: `1.5px dashed #444`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 18, color: '#777', lineHeight: 1 }}>+</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Add Agent</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 36, height: 36, borderRadius: 999, border: `1.5px dashed #444`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 18, color: '#777', lineHeight: 1 }}>+</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>New Task</div>
                    </div>
                  </div>
                </div>
              )

              return (
                <div key={project.id}>
                  {viewMode === 'list' ? (
                    /* ── LIST VIEW — left info + right builds ── */
                    <div
                      style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px minmax(0, 1fr)', gap: 14, alignItems: 'start', position: 'relative', border: `1px solid ${c.border}`, borderRadius: 12, padding: isMobile ? 10 : 14, background: c.alt }}>

                      <div onClick={() => setSelectedProjectId(project.id)} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, alignSelf: 'stretch' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 17, color: '#f0f0f0', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                            {project.name}
                          </div>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id) }}
                              style={{ width: 24, height: 24, borderRadius: 4, border: `1px solid ${c.border}`, background: projectMenuOpen === project.id ? `${c.border}` : 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'color 0.15s, border-color 0.15s, background 0.15s', lineHeight: 1 }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.borderColor = '#555' }}
                              onMouseLeave={e => { if (projectMenuOpen !== project.id) { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = c.border } }}
                              title="Project actions"
                            >⋯</button>
                            {projectMenuOpen === project.id && (
                              <div style={{ position: 'absolute', top: 28, right: 0, background: '#0f1215', border: `1px solid ${c.border}`, borderRadius: 6, padding: 4, zIndex: 30, minWidth: 150, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                                {[
                                  { label: 'Mark Complete', icon: '✓', lifecycle: 'completed' as const },
                                  { label: 'Archive', icon: '▪', lifecycle: 'archived' as const },
                                  { label: 'Delete', icon: '✕', lifecycle: 'deleted' as const, color: '#f87171' },
                                ].map(action => (
                                  <div
                                    key={action.label}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (action.lifecycle === 'completed') {
                                        completeProject(project.id)
                                      } else if (action.lifecycle === 'archived') {
                                        archiveProject(project.id)
                                      } else if (action.lifecycle === 'deleted') {
                                        deleteProject(project.id)
                                      }
                                      setProjectMenuOpen(null)
                                    }}
                                    style={{ padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: action.color || '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.1s, color 0.1s', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1f28'; e.currentTarget.style.color = action.color || '#f0f0f0' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = action.color || '#9ca3af' }}
                                  >
                                    <span style={{ fontSize: 10, width: 14, textAlign: 'center' }}>{action.icon}</span>
                                    {action.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4, marginBottom: 10 }}>
                          {project.goal}
                        </div>

                        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                          {[
                            { label: 'Chat', onClick: (e: React.MouseEvent) => { e.stopPropagation(); setChatProject(project.id); setChatProjectBuildId(project.builds[0]?.id || null) }, hk: project.id + '-chat' },
                            { label: 'Preview', onClick: (e: React.MouseEvent) => { e.stopPropagation(); setLivePreviewProject(livePreviewProject === project.id ? null : project.id) }, hk: project.id + '-preview' },
                          ].map(btn => (
                            <button key={btn.label}
                              onClick={btn.onClick}
                              onMouseEnter={() => setHoveredArchBtn(btn.hk)}
                              onMouseLeave={() => setHoveredArchBtn(null)}
                              style={{ flex: 1, padding: '6px 0', borderRadius: 4, background: hoveredArchBtn === btn.hk ? '#0f1215' : 'transparent', border: `1px solid ${c.border}`, color: hoveredArchBtn === btn.hk ? '#ccc' : '#666', fontSize: 10, fontFamily: '"JetBrains Mono", Menlo, monospace', cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}>
                              {btn.label}
                            </button>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: 5, flex: 1, minHeight: 36, marginBottom: 10 }}>
                          {([{ label: '+ Agent', type: 'agent' as const }, { label: '+ Task', type: 'task' as const }]).map(btn => (
                            <button key={btn.label}
                              onClick={(e) => { e.stopPropagation(); setAddPromptText(''); setAddPromptModal({ type: btn.type, projectId: project.id }) }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#0f1215'; e.currentTarget.style.color = '#ccc'; e.currentTarget.style.borderColor = '#34d399' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = c.border }}
                              style={{ flex: 1, textAlign: 'center', borderRadius: 4, border: `1px solid ${c.border}`, background: 'transparent', fontSize: 11, color: '#666', fontFamily: '"JetBrains Mono", Menlo, monospace', cursor: 'pointer', transition: 'background 0.15s, color 0.15s, border-color 0.15s', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {btn.label}
                            </button>
                          ))}
                        </div>

                        {(() => {
                          type ActionType = 'response-ready' | 'review-plan' | 'run-build' | 'fix-error' | 'apply-changes'
                          const getProjectActionInfo = (build: typeof allBuilds[0]): { type: ActionType; label: string; color: string; tab: 'chat' | 'details' } | null => {
                            const msgs = chatMessages[build.id]
                            const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null
                            const agentReplied = lastMsg?.role === 'agent'
                            if (build.status === 'failed') return { type: 'fix-error', label: 'Fix Error', color: '#f87171', tab: 'chat' }
                            if (build.status === 'running' && agentReplied) return { type: 'response-ready', label: 'Response Ready', color: '#34d399', tab: 'chat' }
                            if (build.status === 'running') return { type: 'review-plan', label: 'Review Plan', color: '#f59e0b', tab: 'details' }
                            if (build.status === 'queued') return { type: 'run-build', label: 'Run Build', color: '#f59e0b', tab: 'details' }
                            if (build.status === 'complete' && agentReplied) return { type: 'apply-changes', label: 'Apply Changes', color: '#34d399', tab: 'chat' }
                            return null
                          }
                          const pendingBuilds = allBuilds.filter(b => b.status !== 'complete')
                          const combinedItems = allBuilds
                            .filter(b => b.status !== 'complete' || getProjectActionInfo(b) !== null)
                            .map(b => ({ ...b, action: getProjectActionInfo(b) }))
                          const actionItems = combinedItems.filter(b => b.action !== null)
                          const actionPriority: Record<ActionType, number> = { 'fix-error': 0, 'response-ready': 1, 'review-plan': 2, 'apply-changes': 3, 'run-build': 4 }
                          const sortedCombined = [...combinedItems].sort((a, b) => {
                            const aHasAction = a.action !== null
                            const bHasAction = b.action !== null
                            if (aHasAction && !bHasAction) return -1
                            if (!aHasAction && bHasAction) return 1
                            if (aHasAction && bHasAction) return (actionPriority[a.action!.type] ?? 5) - (actionPriority[b.action!.type] ?? 5)
                            return 0
                          })
                          const firstAction = sortedCombined.find(b => b.action !== null)
                          const actionCount = actionItems.length

                          if (sortedCombined.length === 0) return null

                          return (
                            <div style={{ marginBottom: 8, background: '#080808', border: `1px solid ${c.border}`, borderRadius: 4, overflow: 'hidden' }}>
                              <div
                                onClick={(e) => { e.stopPropagation(); setPendingDropdown(isPendingOpen ? null : project.id) }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, color: '#999', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                                    {pendingBuilds.length} pending
                                  </span>
                                  {actionCount > 0 && (
                                    <span style={{ fontSize: 8, color: '#f87171', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700 }}>· {actionCount} action{actionCount !== 1 ? 's' : ''}</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {actionCount > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (firstAction?.action) {
                                          setBuildModalTab(firstAction.action.tab)
                                          setExpandedBuildId(firstAction.id)
                                        }
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = '#1e2330'; e.currentTarget.style.color = '#e8eaed' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = '#0c0f14'; e.currentTarget.style.color = '#9ca3af' }}
                                      style={{ fontSize: 8, fontWeight: 600, color: '#9ca3af', background: '#0c0f14', border: '1px solid #1e2330', borderRadius: 3, padding: '2px 8px', fontFamily: '"JetBrains Mono", Menlo, monospace', cursor: 'pointer', transition: 'all 0.15s ease' }}
                                    >Run All</button>
                                  )}
                                  <span style={{ fontSize: 10, color: '#444', transform: isPendingOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▾</span>
                                </div>
                              </div>
                              {isPendingOpen && (
                                <div style={{ borderTop: `1px solid ${c.border}` }}>
                                  {sortedCombined.map((item, idx) => (
                                    <div
                                      key={item.id}
                                      onClick={(e) => { e.stopPropagation(); setBuildModalTab(item.action?.tab ?? 'chat'); setExpandedBuildId(item.id) }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#0f1215'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', cursor: 'pointer', borderTop: idx > 0 ? '1px solid #14181e' : 'none', transition: 'background 0.15s' }}
                                    >
                                      {item.action ? (
                                        <span style={{ display: 'inline-flex', flexShrink: 0, color: item.action.color }}>{getActionIcon(item.action.type, 10)}</span>
                                      ) : (
                                        <span style={{ fontSize: 9, color: statusColor(item.status), fontFamily: '"JetBrains Mono", Menlo, monospace', flexShrink: 0 }}>▸</span>
                                      )}
                                      <span style={{ fontSize: 9, color: '#bbb', fontFamily: '"JetBrains Mono", Menlo, monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                                      {item.action ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', padding: '1px 5px', background: 'transparent', borderRadius: 3, border: 'none', flexShrink: 0, fontWeight: 600 }}><span style={{ display: 'inline-flex', color: item.action.color }}>{getActionIcon(item.action.type, 9)}</span>{item.action.label}</span>
                                      ) : (
                                        <span style={{ fontSize: 8, color: '#555', fontFamily: '"JetBrains Mono", Menlo, monospace', padding: '1px 4px', background: '#111', borderRadius: 3, flexShrink: 0 }}>{item.status}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {thinkingLines.length > 0 && (
                          <Ticker lines={thinkingLines} render={(line) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#080808', borderRadius: 4, border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: 4 }}>
                              <span style={{ display: 'inline-flex', flexShrink: 0, color: '#a78bfa' }}><ThinkingIcon size={10} /></span>
                              <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', flexShrink: 0 }}>{line.agent}</span>
                              <span style={{ fontSize: 10, color: '#555', fontFamily: '"JetBrains Mono", Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.text}</span>
                            </div>
                          )} />
                        )}

                        {codeStreamLines.length > 0 && (
                          <Ticker lines={codeStreamLines} render={(line) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: '#080808', borderRadius: 4, border: `1px solid ${c.border}`, overflow: 'hidden', marginBottom: 6 }}>
                              <span style={{ display: 'inline-flex', flexShrink: 0, color: '#34d399' }}><BuildingIcon size={10} /></span>
                              <span style={{ fontSize: 10, color: '#f59e0b88', fontFamily: '"JetBrains Mono", Menlo, monospace', flexShrink: 0 }}>{line.file}</span>
                              <span style={{ fontSize: 10, color: '#444', fontFamily: '"JetBrains Mono", Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.code}</span>
                            </div>
                          )} />
                        )}

                      </div>

                      {/* Builds strip (horizontal scroll) */}
                      <div style={{ minWidth: 0 }}>
                        <div className="panel-header" style={{ color: '#9ca3af', marginBottom: 7, fontSize: 9 }}>BUILDS</div>
                        <ScrollableBuildStrip arrowColor={c.muted} borderColor={c.border}>
                          {buildCards(false)}
                        </ScrollableBuildStrip>
                      </div>
                    </div>
                  ) : viewMode === 'grid' ? (
                    /* ── GRID VIEW ── */
                    <div onClick={() => setSelectedProjectId(project.id)}
                      style={{ border: `1px solid ${isSel ? c.green : c.border}`, borderRadius: 12, padding: 16, cursor: 'pointer', background: isSel ? c.blackGreen : c.alt, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: isSel ? c.green : 'transparent', borderRadius: '12px 0 0 12px' }} />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.1, color: '#e8eaed' }}>{project.name}</div>
                          {isSel && <span style={{ fontSize: 10, fontWeight: 700, color: c.green, background: c.greenSoft, border: `1px solid ${c.green}`, padding: '2px 6px', borderRadius: 999 }}>Active</span>}
                          <span style={{ fontSize: 10, color: c.muted }}>{project.builds.length} builds · {project.builds.filter(b => b.status === 'complete').length} done</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); setChatProject(project.id); setChatProjectBuildId(project.builds[0]?.id || null) }}
                            onMouseEnter={() => setHoveredArchBtn(project.id + '-card-chat')}
                            onMouseLeave={() => setHoveredArchBtn(null)}
                            style={{ border: `1px solid #1e2330`, background: hoveredArchBtn === project.id + '-card-chat' ? '#0f1215' : '#080a0e', color: '#9ca3af', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s, color 0.15s' }}>
                            Chat
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setExpandedProject(expandedProject === project.id ? null : project.id) }}
                            onMouseEnter={() => setHoveredArchBtn(project.id + '-card')}
                            onMouseLeave={() => setHoveredArchBtn(null)}
                            style={{ border: `1px solid #1e2330`, background: hoveredArchBtn === project.id + '-card' ? '#0f1215' : '#080a0e', color: '#9ca3af', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s, color 0.15s' }}>
                            Arch Map
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setLivePreviewProject(livePreviewProject === project.id ? null : project.id) }}
                            onMouseEnter={() => setHoveredArchBtn(project.id + '-card-preview')}
                            onMouseLeave={() => setHoveredArchBtn(null)}
                            style={{ border: `1px solid #1e2330`, background: hoveredArchBtn === project.id + '-card-preview' ? '#0f1215' : '#080a0e', color: '#9ca3af', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s, color 0.15s' }}>
                            Preview
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id) }}
                              style={{ border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 16, fontWeight: 700, padding: '2px 6px', borderRadius: 4, lineHeight: 1, transition: 'color 0.12s, background 0.12s' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#f0f0f0'; e.currentTarget.style.background = '#1a1f28' }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent' }}
                              title="Project actions"
                            >⋯</button>
                            {projectMenuOpen === project.id && (
                              <div style={{ position: 'absolute', top: 28, right: 0, background: '#0f1215', border: `1px solid ${c.border}`, borderRadius: 6, padding: 4, zIndex: 30, minWidth: 150, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                                {[
                                  { label: 'Mark Complete', icon: '✓', lifecycle: 'completed' as const },
                                  { label: 'Archive', icon: '▪', lifecycle: 'archived' as const },
                                  { label: 'Delete', icon: '✕', lifecycle: 'deleted' as const, color: '#f87171' },
                                ].map(action => (
                                  <div
                                    key={action.label}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (action.lifecycle === 'completed') {
                                        completeProject(project.id)
                                      } else if (action.lifecycle === 'archived') {
                                        archiveProject(project.id)
                                      } else if (action.lifecycle === 'deleted') {
                                        deleteProject(project.id)
                                      }
                                      setProjectMenuOpen(null)
                                    }}
                                    style={{ padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: action.color || '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.1s, color 0.1s', whiteSpace: 'nowrap' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#1a1f28'; e.currentTarget.style.color = action.color || '#f0f0f0' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = action.color || '#9ca3af' }}
                                  >
                                    <span style={{ fontSize: 13 }}>{action.icon}</span> {action.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {buildCards(false, true)}
                    </div>
                  ) : (() => {
                    const treeLines: Record<string, string[]> = {
                      'p1': ['├── Backend','│   ├── Core Engine','│   ├── Risk Module','│   └── Exchange / API Logic','├── Interface','│   └── Dashboard UI','└── Operations','    ├── Alerts','    ├── Backtester','    └── Monitoring'],
                      'p2': ['├── Pages','│   ├── Homepage','│   ├── Pricing','│   └── Documentation','└── Infrastructure','    ├── API Settings','    └── Auth Flow'],
                      'p3': ['├── Pipeline','│   ├── Crawler','│   ├── Parser','│   └── Data Store','└── Operations','    ├── Scheduler','    └── Email Export'],
                    }
                    const lines = treeLines[project.id] || project.builds.map((b, i, a) => `${i === a.length - 1 ? '└' : '├'}── ${b.title}`)
                    return (
                      <div style={{ border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, background: c.alt }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f0f0', fontFamily: '"JetBrains Mono", Menlo, monospace', marginBottom: 8 }}>{project.name}</div>
                        <div style={{ fontSize: 13, color: c.muted, lineHeight: 1.8, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                          {viewMode === 'tree' && lines.map((line, i) => (
                            <div key={i} style={{ color: line.startsWith('│') || line.startsWith('    ') ? '#6b7280' : '#a0c8a0' }}>{line}</div>
                          ))}
                          {viewMode === 'arch' && (
                            <NodeGraph
                              builds={project.builds}
                              isDark={isDark}
                              colors={c}
                              onBuildClick={(id) => { setExpandedBuildId(id) }}
                            />
                          )}
                          {viewMode === 'graph' && (
                            <NodeGraph
                              builds={project.builds}
                              isDark={isDark}
                              colors={c}
                              onBuildClick={(id) => { setExpandedBuildId(id) }}
                            />
                          )}
                          {viewMode === 'timeline' && (
                            <TimelineSwimlane
                              builds={project.builds}
                              isDark={isDark}
                              colors={c}
                              onBuildClick={(id) => { setExpandedBuildId(id) }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL — Live Feed */}
        <div style={{
          border: `1px solid #1e2330`,
          background: '#0a0d10',
          padding: (isDesktop ? rightPanelCollapsed : !mobileRightOpen) ? '12px 4px' : 14,
          display: 'flex',
          flexDirection: 'column',
          gap: (isDesktop ? rightPanelCollapsed : !mobileRightOpen) ? 0 : 18,
          overflow: 'hidden',
          borderRadius: 2,
          position: 'relative',
          transition: 'padding 0.3s ease, gap 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: (isDesktop ? rightPanelCollapsed : !mobileRightOpen) ? 'center' : 'space-between', marginBottom: (isDesktop ? rightPanelCollapsed : !mobileRightOpen) ? 0 : -4 }}>
            {!(isDesktop ? rightPanelCollapsed : !mobileRightOpen) && <span className="panel-header" style={{ color: '#9ca3af' }}>LIVE FEED</span>}
            <button
              onClick={() => isDesktop ? setRightPanelCollapsed(!rightPanelCollapsed) : setMobileRightOpen(!mobileRightOpen)}
              title={(isDesktop ? rightPanelCollapsed : !mobileRightOpen) ? 'Expand panel' : 'Collapse panel'}
              style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #1e2330', background: 'transparent', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, padding: 0, flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#ffffff' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#1e2330' }}
            ><span style={{ display: 'inline-block', transform: (isDesktop ? rightPanelCollapsed : !mobileRightOpen) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>»</span></button>
          </div>

          {(isDesktop ? rightPanelCollapsed : !mobileRightOpen) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 4 }}>
              {[
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>, label: 'Ready Builds', color: '#ffffff' },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, label: 'Action Required', color: '#ffffff' },
                { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>, label: 'Code Stream', color: '#ffffff' },
              ].map(item => (
                <div
                  key={item.label}
                  title={item.label}
                  style={{ padding: '8px 0', color: item.color, textAlign: 'center', cursor: 'default', borderBottom: '1px solid #1e2330', width: '100%', display: 'flex', justifyContent: 'center' }}
                >
                  {item.icon}
                </div>
              ))}
            </div>
          )}

          {!(isDesktop ? rightPanelCollapsed : !mobileRightOpen) && <>
          {/* Ready Builds KPI */}
          <div style={{ border: `1px solid #1e2330`, background: '#080a0e', borderRadius: 6, padding: 12 }}>
            {sectionHeader('READY BUILDS', 'readyBuilds')}
            {!collapsedSections.readyBuilds && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: readyBuildsCount > 0 ? '#f59e0b' : '#9ca3af', lineHeight: 1, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{readyBuildsCount}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>queued</span>
                  </div>
                </div>
                <button
                  onClick={handleStartAll}
                  disabled={readyBuildsCount === 0}
                  onMouseEnter={e => { if (readyBuildsCount > 0) e.currentTarget.style.background = '#141a12' }}
                  onMouseLeave={e => { if (readyBuildsCount > 0) e.currentTarget.style.background = '#0c1210' }}
                  style={{
                    background: readyBuildsCount > 0 ? '#0c1210' : '#080a0e',
                    color: readyBuildsCount > 0 ? '#34d399' : '#9ca3af',
                    border: `1px solid ${readyBuildsCount > 0 ? 'rgba(52,211,153,0.2)' : '#1e2330'}`,
                    borderRadius: 4,
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: '"JetBrains Mono", Menlo, monospace',
                    cursor: readyBuildsCount > 0 ? 'pointer' : 'default',
                    letterSpacing: 0.5,
                    transition: 'background 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Start All
                </button>
              </div>
            )}
          </div>

          {/* ACTION REQUIRED Panel */}
          {(() => {
            type ActionType = 'response-ready' | 'review-plan' | 'run-build' | 'fix-error' | 'apply-changes'
            const getActionInfo = (build: Build & { projectName: string }): { type: ActionType; label: string; color: string; tab: 'chat' | 'details' } => {
              const msgs = chatMessages[build.id]
              const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null
              const agentReplied = lastMsg?.role === 'agent'

              if (build.status === 'failed') return { type: 'fix-error', label: 'Fix Error', color: '#f87171', tab: 'chat' }
              if (build.status === 'running' && agentReplied) return { type: 'response-ready', label: 'Response Ready', color: '#34d399', tab: 'chat' }
              if (build.status === 'running') return { type: 'review-plan', label: 'Review Plan', color: '#f59e0b', tab: 'details' }
              if (build.status === 'queued') return { type: 'run-build', label: 'Run Build', color: '#f59e0b', tab: 'details' }
              if (build.status === 'complete' && agentReplied) return { type: 'apply-changes', label: 'Apply Changes', color: '#34d399', tab: 'chat' }
              return { type: 'run-build', label: 'Run Build', color: '#f59e0b', tab: 'details' }
            }

            const actionItems = filteredProjects.flatMap(p =>
              p.builds
                .filter(b => {
                  if (b.status === 'failed' || b.status === 'queued' || b.status === 'running') return true
                  if (b.status === 'complete') {
                    const msgs = chatMessages[b.id]
                    const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null
                    return lastMsg?.role === 'agent'
                  }
                  return false
                })
                .map(b => ({ ...b, projectName: p.name }))
            )

            const actionPriority: Record<ActionType, number> = { 'fix-error': 0, 'response-ready': 1, 'review-plan': 2, 'apply-changes': 3, 'run-build': 4 }
            const sorted = [...actionItems]
              .map(item => ({ ...item, action: getActionInfo(item) }))
              .sort((a, b) => (actionPriority[a.action.type] ?? 5) - (actionPriority[b.action.type] ?? 5))
            const visibleSorted = sorted.filter(item => !dismissedActionKeys.has(`${item.id}:${item.action.type}`))

            const dismissItem = (itemId: string, actionType: string, el: HTMLElement | null) => {
              if (el) {
                el.style.maxHeight = '0px'
                el.style.opacity = '0'
                el.style.padding = '0 12px'
                el.style.marginTop = '0px'
                el.style.borderColor = 'transparent'
                setTimeout(() => {
                  setDismissedActionKeys(prev => new Set(prev).add(`${itemId}:${actionType}`))
                  setPinnedActionKeys(prev => { const next = new Set(prev); next.delete(`${itemId}:${actionType}`); return next })
                }, 280)
              } else {
                setDismissedActionKeys(prev => new Set(prev).add(`${itemId}:${actionType}`))
                setPinnedActionKeys(prev => { const next = new Set(prev); next.delete(`${itemId}:${actionType}`); return next })
              }
            }

            const togglePin = (itemId: string, actionType: string) => {
              const key = `${itemId}:${actionType}`
              const isCurrentlyPinned = pinnedActionKeys.has(key)
              setPinnedActionKeys(prev => {
                const next = new Set(prev)
                if (next.has(key)) next.delete(key)
                else next.add(key)
                return next
              })
              setPinnedActionOrder(prev => {
                if (prev.includes(key)) return prev.filter(k => k !== key)
                return [...prev, key]
              })
              if (isCurrentlyPinned) {
                setPinnedNotes(prev => { const next = { ...prev }; delete next[key]; return next })
                setEditingPinNoteKey(null)
                setEditingPinNoteText('')
              } else {
                setEditingPinNoteKey(key)
                setEditingPinNoteText('')
              }
            }

            const pinnedItemsRaw = visibleSorted.filter(item => pinnedActionKeys.has(`${item.id}:${item.action.type}`))
            const pinnedItems = [...pinnedItemsRaw].sort((a, b) => {
              const ka = `${a.id}:${a.action.type}`
              const kb = `${b.id}:${b.action.type}`
              const ia = pinnedActionOrder.indexOf(ka)
              const ib = pinnedActionOrder.indexOf(kb)
              if (ia === -1 && ib === -1) return 0
              if (ia === -1) return 1
              if (ib === -1) return -1
              return ia - ib
            })
            const unpinnedItems = visibleSorted.filter(item => !pinnedActionKeys.has(`${item.id}:${item.action.type}`))

            const projectOrder: string[] = []
            const projectMap: Record<string, typeof unpinnedItems> = {}
            for (const item of unpinnedItems) {
              if (!projectMap[item.projectName]) {
                projectMap[item.projectName] = []
                projectOrder.push(item.projectName)
              }
              projectMap[item.projectName].push(item)
            }
            const groupedByProject = projectOrder.map(name => ({ projectName: name, items: projectMap[name] }))

            const renderActionItemRow = (item: typeof visibleSorted[number], borderTop = '1px solid #14181e', draggable = false) => {
              const key = `${item.id}:${item.action.type}`
              const isPinned = pinnedActionKeys.has(key)
              const isDragOver = dragOverPinnedKey === key
              const isBeingDragged = draggedPinnedKeyState === key
              return (
                <div
                  key={item.id}
                  data-action-item
                  data-action-key={key}
                  draggable={draggable}
                  onDragStart={draggable ? (e) => {
                    draggedPinnedKey.current = key
                    setDraggedPinnedKeyState(key)
                    e.dataTransfer.effectAllowed = 'move'
                  } : undefined}
                  onDragOver={draggable ? (e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverPinnedKey !== key) setDragOverPinnedKey(key)
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const midY = rect.top + rect.height / 2
                    setDragOverPosition(e.clientY < midY ? 'before' : 'after')
                  } : undefined}
                  onDragLeave={draggable ? () => {
                    setDragOverPinnedKey(prev => prev === key ? null : prev)
                  } : undefined}
                  onDrop={draggable ? (e) => {
                    e.preventDefault()
                    const fromKey = draggedPinnedKey.current
                    setDragOverPinnedKey(null)
                    setDraggedPinnedKeyState(null)
                    draggedPinnedKey.current = null
                    if (!fromKey || fromKey === key) return
                    setPinnedActionOrder(prev => {
                      const ordered = pinnedItems.map(i => `${i.id}:${i.action.type}`)
                      const fromIdx = ordered.indexOf(fromKey)
                      let toIdx = ordered.indexOf(key)
                      if (fromIdx === -1 || toIdx === -1) return prev
                      if (dragOverPosition === 'after') toIdx = toIdx + 1
                      const next = [...ordered]
                      next.splice(fromIdx, 1)
                      const adjustedTo = toIdx > fromIdx ? toIdx - 1 : toIdx
                      next.splice(adjustedTo, 0, fromKey)
                      const rest = prev.filter(k => !next.includes(k))
                      return [...next, ...rest]
                    })
                  } : undefined}
                  onDragEnd={draggable ? () => {
                    draggedPinnedKey.current = null
                    setDragOverPinnedKey(null)
                    setDraggedPinnedKeyState(null)
                  } : undefined}
                  style={{
                    padding: '8px 12px',
                    borderTop,
                    transition: 'background 0.15s ease, opacity 0.15s ease',
                    overflow: 'hidden',
                    maxHeight: 120,
                    opacity: isBeingDragged ? 0.35 : 1,
                    background: isDragOver ? 'rgba(245,158,11,0.06)' : isPinned ? 'rgba(245,158,11,0.04)' : 'transparent',
                    cursor: draggable ? 'default' : 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {draggable && (
                      <div
                        title="Drag to reorder"
                        style={{
                          cursor: 'grab',
                          color: '#374151',
                          fontSize: 10,
                          lineHeight: 1,
                          flexShrink: 0,
                          marginTop: 2,
                          userSelect: 'none',
                          letterSpacing: -1,
                          opacity: 0.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                        onMouseDown={e => e.currentTarget.style.cursor = 'grabbing'}
                        onMouseUp={e => e.currentTarget.style.cursor = 'grab'}
                      >
                        <span style={{ display: 'block', lineHeight: 1 }}>⠿</span>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: item.action.color, fontFamily: '"JetBrains Mono", Menlo, monospace', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ display: 'inline-flex', flexShrink: 0 }}>{getActionIcon(item.action.type, 10)}</span>
                        {item.action.label}
                      </div>
                      <div style={{ fontSize: 9, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', lineHeight: 1.4, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{item.title}</div>
                      {isPinned && editingPinNoteKey === key && (
                        <input
                          autoFocus
                          maxLength={60}
                          value={editingPinNoteText}
                          onChange={e => setEditingPinNoteText(e.target.value)}
                          onBlur={() => {
                            setPinnedNotes(prev => ({ ...prev, [key]: editingPinNoteText.trim() }))
                            setEditingPinNoteKey(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              setPinnedNotes(prev => ({ ...prev, [key]: editingPinNoteText.trim() }))
                              setEditingPinNoteKey(null)
                            }
                          }}
                          placeholder="why pinned? (optional)"
                          style={{
                            marginTop: 5,
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid #374151',
                            outline: 'none',
                            color: '#9ca3af',
                            fontSize: 9,
                            fontFamily: '"JetBrains Mono", Menlo, monospace',
                            padding: '1px 0',
                            boxSizing: 'border-box',
                          }}
                        />
                      )}
                      {isPinned && editingPinNoteKey !== key && pinnedNotes[key] && (
                        <div
                          onMouseEnter={() => setHoveredNoteKey(key)}
                          onMouseLeave={() => setHoveredNoteKey(null)}
                          style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}
                        >
                          <span
                            onClick={() => { setEditingPinNoteKey(key); setEditingPinNoteText(pinnedNotes[key] || '') }}
                            style={{ fontSize: 9, color: '#6b7280', fontFamily: '"JetBrains Mono", Menlo, monospace', fontStyle: 'italic', cursor: 'text', lineHeight: 1.4 }}
                          >
                            {pinnedNotes[key]}
                          </span>
                          <button
                            onClick={() => { setEditingPinNoteKey(key); setEditingPinNoteText(pinnedNotes[key] || '') }}
                            title="Edit note"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              color: '#6b7280',
                              fontSize: 8,
                              lineHeight: 1,
                              flexShrink: 0,
                              opacity: hoveredNoteKey === key ? 0.8 : 0,
                              transition: 'opacity 0.15s',
                            }}
                          >✏</button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => togglePin(item.id, item.action.type)}
                      onMouseEnter={e => { e.currentTarget.style.color = isPinned ? '#fcd34d' : '#9ca3af'; e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.color = isPinned ? '#f59e0b' : '#374151'; e.currentTarget.style.opacity = isPinned ? '1' : '0.6' }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isPinned ? '#f59e0b' : '#374151',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '0 2px',
                        lineHeight: 1,
                        transition: 'color 0.15s, opacity 0.15s',
                        flexShrink: 0,
                        opacity: isPinned ? 1 : 0.6,
                        marginTop: 1,
                      }}
                      title={isPinned ? 'Unpin' : 'Pin to top'}
                    >⊙</button>
                    <button
                      onClick={() => {
                        const el = document.querySelector(`[data-action-item][data-action-key="${key}"]`) as HTMLElement
                        setBuildModalTab(item.action.tab)
                        setExpandedBuildId(item.id)
                        dismissItem(item.id, item.action.type, el)
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#e8eaed' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#4b5563' }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4b5563',
                        cursor: 'pointer',
                        fontSize: 16,
                        fontFamily: '"JetBrains Mono", Menlo, monospace',
                        padding: '0 2px',
                        lineHeight: 1,
                        transition: 'color 0.15s',
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                      title={item.action.label}
                    >›</button>
                    <button
                      onClick={(e) => {
                        const el = e.currentTarget.closest('[data-action-item]') as HTMLElement
                        dismissItem(item.id, item.action.type, el)
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#e8eaed')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4b5563',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontFamily: '"JetBrains Mono", Menlo, monospace',
                        padding: '0 2px',
                        lineHeight: 1,
                        transition: 'color 0.15s',
                        flexShrink: 0,
                      }}
                      title="Dismiss"
                    >✕</button>
                  </div>
                </div>
              )
            }

            return (
              <div style={{ border: '1px solid #1e2330', borderRadius: 4, background: '#080a0e', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2330', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="panel-header" style={{ fontSize: 9, letterSpacing: 1.2 }}>ACTION REQUIRED</span>
                    {visibleSorted.length > 0 && <span style={{ fontSize: 9, color: '#f87171', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700 }}>{visibleSorted.length}</span>}
                    {pinnedItems.length > 0 && <span style={{ fontSize: 8, color: '#f59e0b', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700, opacity: 0.8 }}>⊙ {pinnedItems.length}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {groupedByProject.length > 1 && (() => {
                      const allCollapsed = groupedByProject.every(g => collapsedProjectGroups.has(g.projectName))
                      return (
                        <button
                          onClick={() => setCollapsedProjectGroups(allCollapsed ? new Set() : new Set(groupedByProject.map(g => g.projectName)))}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 9, color: '#4b5563', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 600, padding: 0, letterSpacing: 0.5, transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#9ca3af'}
                          onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
                        >
                          {allCollapsed ? 'EXPAND ALL' : 'COLLAPSE ALL'}
                        </button>
                      )
                    })()}
                    {dismissedActionKeys.size > 0 && (
                      <button
                        onClick={() => {
                          setDismissedActionKeys(new Set())
                          localStorage.removeItem('massa_dismissedActionKeys')
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: '#6b7280', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.5, padding: 0, textDecoration: 'underline' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                      >
                        SHOW ALL
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#1e293b #080a0e' }}>
                  {visibleSorted.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 600 }}>✓ All clear</span>
                      <div className="panel-header" style={{ color: '#9ca3af', fontSize: 8, marginTop: 4 }}>NO ACTIONS PENDING</div>
                    </div>
                  ) : (
                    <>
                      {pinnedItems.length > 0 && (
                        <div>
                          <div
                            onClick={() => setPinnedSectionCollapsed(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', cursor: 'pointer', userSelect: 'none', borderBottom: pinnedSectionCollapsed ? 'none' : '1px solid #1a2235' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.04)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ fontSize: 7, color: '#f59e0b', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.8, opacity: 0.7, transition: 'transform 0.15s', display: 'inline-block', transform: pinnedSectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
                            <span style={{ fontSize: 7, color: '#f59e0b', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.8, fontWeight: 700, opacity: 0.7 }}>PINNED</span>
                            <span style={{ fontSize: 7, color: '#f59e0b', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700, opacity: 0.7 }}>{pinnedItems.length}</span>
                          </div>
                          {!pinnedSectionCollapsed && (
                            <>
                              {(() => {
                                const placeholder = (
                                  <div
                                    key="__drag-placeholder"
                                    style={{
                                      height: 3,
                                      margin: '0 12px',
                                      borderRadius: 2,
                                      background: 'rgba(245,158,11,0.6)',
                                      boxShadow: '0 0 6px rgba(245,158,11,0.4)',
                                    }}
                                  />
                                )
                                const rows: React.ReactNode[] = []
                                pinnedItems.forEach((item, idx) => {
                                  const k = `${item.id}:${item.action.type}`
                                  const isTarget = dragOverPinnedKey === k && draggedPinnedKeyState && draggedPinnedKeyState !== k
                                  if (isTarget && dragOverPosition === 'before') rows.push(placeholder)
                                  rows.push(renderActionItemRow(item, idx === 0 && !(isTarget && dragOverPosition === 'before') ? 'none' : '1px solid #1e2735', true))
                                  if (isTarget && dragOverPosition === 'after') rows.push(placeholder)
                                })
                                return rows
                              })()}
                              {unpinnedItems.length > 0 && (
                                <div style={{ borderTop: '1px solid #1e3a2a', display: 'flex', alignItems: 'center', gap: 6, padding: '3px 12px' }}>
                                  <span style={{ flex: 1, height: 0, borderTop: '1px dashed #1e3020' }} />
                                  <span style={{ fontSize: 7, color: '#374151', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>PINNED ABOVE</span>
                                  <span style={{ flex: 1, height: 0, borderTop: '1px dashed #1e3020' }} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      {groupedByProject.map(({ projectName, items }, groupIdx) => {
                        const isCollapsed = collapsedProjectGroups.has(projectName)
                        const toggleGroup = () => setCollapsedProjectGroups(prev => {
                          const next = new Set(prev)
                          if (next.has(projectName)) next.delete(projectName)
                          else next.add(projectName)
                          return next
                        })
                        const showGroupHeader = groupedByProject.length > 1 || pinnedItems.length > 0
                        return (
                        <div key={projectName}>
                          {showGroupHeader && (
                            <div
                              onClick={toggleGroup}
                              style={{ padding: '6px 12px 4px', background: '#0a0d12', borderTop: (groupIdx > 0 || pinnedItems.length > 0) ? '1px solid #1e2330' : 'none', cursor: groupedByProject.length > 1 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}
                            >
                              {groupedByProject.length > 1 && <span style={{ fontSize: 8, color: '#4b5563', fontFamily: '"JetBrains Mono", Menlo, monospace', lineHeight: 1, transition: 'transform 0.2s', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>}
                              <span style={{ fontSize: 8, letterSpacing: 1, color: '#6b7280', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700, textTransform: 'uppercase' as const, flex: 1 }}>{projectName}</span>
                              {isCollapsed && (
                                <span style={{ fontSize: 8, color: '#f87171', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700, background: '#1c1a1a', borderRadius: 3, padding: '1px 5px' }}>{items.length}</span>
                              )}
                            </div>
                          )}
                          <div style={{ overflow: 'hidden', maxHeight: isCollapsed ? 0 : 2000, transition: 'max-height 0.25s ease' }}>
                          {items.map((item) => renderActionItemRow(item))}
                          </div>
                        </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Code Stream + Build Activity */}
          <div style={{ border: `1px solid #1e2330`, borderRadius: 4, display: 'flex', flexDirection: 'column', flex: 'none', maxHeight: collapsedSections.codeStream ? 'none' : 260, minHeight: 0, background: '#080a0e', marginTop: 8 }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: collapsedSections.codeStream ? 'none' : `1px solid #1e2330` }}>
              {sectionHeader('CODE STREAM', 'codeStream', <span style={{ width: 6, height: 6, borderRadius: 999, background: '#34d399', display: 'inline-block', boxShadow: '0 0 4px rgba(52,211,153,0.5)' }} />)}
            </div>
            {!collapsedSections.codeStream && (
              <div
                ref={codeRef}
                onMouseEnter={() => setCodeHovered(true)}
                onMouseLeave={() => setCodeHovered(false)}
                style={{ flex: 1, overflowY: 'auto', background: isDark ? '#0f1215' : '#f0f0f0', padding: '8px 0 4px', fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', fontSize: 11, scrollBehavior: 'smooth', minHeight: 0 }}
              >
                <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: 28, background: `linear-gradient(to bottom, ${isDark ? '#0f1215' : '#f0f0f0'} 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 1 }} />
                {feedEntries.length > 0 && feedEntries.filter(entry => {
                  if (!selectedTenantId) return true
                  const tenantProject = filteredProjects[0]
                  return tenantProject && entry.buildName.startsWith(tenantProject.name + ' / ')
                }).slice(0, 3).map(entry => {
                  const pm = PHASE_META[entry.phase]
                  return (
                    <div key={`feed-${entry.id}`} style={{ padding: '5px 12px', borderBottom: `1px solid ${c.border}33`, fontFamily: 'inherit', lineHeight: 1.6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.buildName}</div>
                      <div style={{ fontSize: 10, color: c.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.agent} — {entry.status}</div>
                      <div style={{ fontSize: 10, color: pm.color, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-flex', flexShrink: 0 }}>{pm.icon(10)}</span>{entry.time} - {pm.label}</div>
                    </div>
                  )
                })}
                {codeLines.filter(line => !selectedTenantId || line.projectId === selectedTenantId).map(line => {
                  if (line.kind === 'qa') {
                    const isPass = line.qa === 'pass'
                    return (
                      <div key={line.id} style={{ padding: '3px 12px', color: isPass ? '#4ade80' : '#f59e0b', lineHeight: 1.5 }}>
                        {line.content}
                      </div>
                    )
                  }
                  return (
                    <div key={line.id} style={{ padding: '2px 12px', lineHeight: 1.5 }}>
                      <span style={{ color: isDark ? '#888' : '#aaa' }}>{line.file}:{line.lineNo} </span>
                      {renderCodeLine(line.content, isDark)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>}
        </div>
        </>}
      </div>

      {/* ARCHITECTURE MAP MODAL */}
      {expandedProject && expandProject && (
        <div onClick={() => setExpandedProject(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '82vh', background: c.panel, border: '1px solid #2a3040', borderRadius: 18, padding: 24, overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ARCHITECTURE MAP</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{expandProject.name}</div>
                <div style={{ color: c.muted, fontSize: 13 }}>{expandProject.goal}</div>
              </div>
              <button onClick={() => setExpandedProject(null)} onMouseEnter={e => e.currentTarget.style.background = '#1e2430'} onMouseLeave={e => e.currentTarget.style.background = '#151920'} style={{ border: '1px solid #252a35', background: '#151920', color: '#ffffff', padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s' }}>Close</button>
            </div>

            <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: isDark ? '#131619' : '#eee', borderRadius: 8, padding: 3, width: 'fit-content' }}>
              {(['tree', 'graph', 'timeline'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setArchTab(tab)}
                  style={{
                    border: 'none',
                    background: archTab === tab ? (isDark ? '#1e2430' : '#fff') : 'transparent',
                    color: archTab === tab ? c.text : c.muted,
                    padding: '6px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: archTab === tab ? 700 : 500,
                    transition: 'all 0.15s',
                    boxShadow: archTab === tab ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {tab === 'tree' ? 'Tree' : tab === 'graph' ? 'Graph' : 'Timeline'}
                </button>
              ))}
            </div>

            {archTab === 'tree' ? (() => {
              const treeLines: Record<string, string[]> = {
                'p1': [
                  '\u251C\u2500\u2500 Backend',
                  '\u2502   \u251C\u2500\u2500 Core Engine',
                  '\u2502   \u251C\u2500\u2500 Risk Module',
                  '\u2502   \u2514\u2500\u2500 Exchange / API Logic',
                  '\u251C\u2500\u2500 Interface',
                  '\u2502   \u2514\u2500\u2500 Dashboard UI',
                  '\u2514\u2500\u2500 Operations',
                  '    \u251C\u2500\u2500 Alerts',
                  '    \u251C\u2500\u2500 Backtester',
                  '    \u2514\u2500\u2500 Monitoring',
                ],
                'p2': [
                  '\u251C\u2500\u2500 Pages',
                  '\u2502   \u251C\u2500\u2500 Homepage',
                  '\u2502   \u251C\u2500\u2500 Pricing',
                  '\u2502   \u2514\u2500\u2500 Documentation',
                  '\u2514\u2500\u2500 Infrastructure',
                  '    \u251C\u2500\u2500 API Settings',
                  '    \u2514\u2500\u2500 Auth Flow',
                ],
                'p3': [
                  '\u251C\u2500\u2500 Pipeline',
                  '\u2502   \u251C\u2500\u2500 Crawler',
                  '\u2502   \u251C\u2500\u2500 Parser',
                  '\u2502   \u2514\u2500\u2500 Data Store',
                  '\u2514\u2500\u2500 Operations',
                  '    \u251C\u2500\u2500 Scheduler',
                  '    \u2514\u2500\u2500 Email Export',
                ],
              }
              const lines = treeLines[expandProject.id] || expandProject.builds.map((b, i, a) => `${i === a.length - 1 ? '\u2514' : '\u251C'}\u2500\u2500 ${b.title}`)
              return (
                <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
                  <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 12, minWidth: 220, background: c.alt }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{expandProject.name}</div>
                    <div style={{ color: c.muted, fontSize: 13 }}>{expandProject.goal}</div>
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.9 }}>
                    {lines.map((line, i) => (
                      <div key={i} style={{ marginLeft: line.startsWith('\u2502') || line.startsWith('    ') ? 24 : 0 }}>{line.startsWith('\u2502') || line.startsWith('    ') ? line.slice(4) : line}</div>
                    ))}
                  </div>
                </div>
              )
            })() : archTab === 'graph' ? (
              <NodeGraph
                builds={expandProject.builds}
                isDark={isDark}
                colors={c}
                onBuildClick={(id) => { setExpandedBuildId(id); setExpandedProject(null) }}
              />
            ) : (
              <TimelineSwimlane
                builds={expandProject.builds}
                isDark={isDark}
                colors={c}
                onBuildClick={(id) => { setExpandedBuildId(id); setExpandedProject(null) }}
              />
            )}

            <div style={{ marginTop: 24, borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>SKILL LEGEND</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(SKILL_COLORS).map(([skill, color]) => (
                  <ModelTooltip key={skill} text={getModelReason(skill)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                      <span style={{ fontSize: 12, color: c.muted }}>{skill}</span>
                    </div>
                  </ModelTooltip>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {livePreviewProject && previewProject && (
        <div onClick={() => setLivePreviewProject(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(940px, 100%)', maxHeight: '85vh', background: c.panel, border: '1px solid #2a3040', borderRadius: 18, padding: 24, overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>LIVE PREVIEW</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{previewProject.name}</div>
                <div style={{ color: c.muted, fontSize: 13 }}>{previewProject.goal}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: '#34d399', animation: 'phase-pulse 2s ease-in-out infinite', boxShadow: '0 0 6px rgba(52,211,153,0.4)' }} />
                <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>Running</span>
                <button onClick={() => setLivePreviewProject(null)} onMouseEnter={e => e.currentTarget.style.background = '#1e2430'} onMouseLeave={e => e.currentTarget.style.background = '#151920'} style={{ border: '1px solid #252a35', background: '#151920', color: '#ffffff', padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s', marginLeft: 8 }}>Close</button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#0a0a0a', borderRadius: 12, border: `1px solid ${c.border}`, overflow: 'hidden', minHeight: 420 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: `1px solid ${c.border}`, background: '#131619' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: '#f87171' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: '#f59e0b' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: '#34d399' }} />
                </div>
                <div style={{ flex: 1, background: '#151920', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: c.muted, border: `1px solid ${c.border}` }}>
                  {previewProject.id === 'p1' ? 'https://app.tradingbot.io' : previewProject.id === 'p2' ? 'https://massa.ai' : 'https://scraper.massa.ai'}
                </div>
              </div>
              <div style={{ padding: 0, height: 380, overflow: 'hidden', position: 'relative' }}>
                {previewProject.id === 'p1' && (
                  <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12, fontFamily: '"JetBrains Mono", monospace' }}>
                    <div style={{ display: 'flex', gap: 12, flex: '0 0 auto' }}>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>PORTFOLIO VALUE</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>$127,843.92</div>
                        <div style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>+3.42% today</div>
                      </div>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>OPEN POSITIONS</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>7</div>
                        <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>4 long / 3 short</div>
                      </div>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>24H P&L</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>+$4,221</div>
                        <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Win rate: 71%</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}`, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ fontSize: 10, color: c.muted, marginBottom: 8 }}>BTC/USDT</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 20, fontWeight: 800 }}>$67,432.18</span>
                        <span style={{ fontSize: 12, color: '#34d399' }}>+2.14%</span>
                        <span style={{ fontSize: 11, color: c.muted }}>H: $68,100 L: $65,890</span>
                      </div>
                      <svg width="100%" height="120" viewBox="0 0 800 120" preserveAspectRatio="none">
                        <defs><linearGradient id="pgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" stopOpacity="0.3"/><stop offset="1" stopColor="#34d399" stopOpacity="0"/></linearGradient></defs>
                        <path d="M0,80 Q50,75 100,70 T200,55 T300,65 T400,40 T500,50 T600,30 T700,25 T800,20" fill="none" stroke="#34d399" strokeWidth="2"/>
                        <path d="M0,80 Q50,75 100,70 T200,55 T300,65 T400,40 T500,50 T600,30 T700,25 T800,20 L800,120 L0,120Z" fill="url(#pgrad)"/>
                      </svg>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
                      {['ETH/USDT', 'SOL/USDT', 'ARB/USDT'].map(pair => (
                        <div key={pair} style={{ flex: 1, background: '#111', borderRadius: 6, padding: '8px 10px', border: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{pair}</span>
                          <span style={{ fontSize: 11, color: pair === 'ARB/USDT' ? '#f87171' : '#34d399' }}>{pair === 'ETH/USDT' ? '+1.8%' : pair === 'SOL/USDT' ? '+5.2%' : '-0.9%'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {previewProject.id === 'p2' && (
                  <div style={{ height: '100%', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(180deg, #0a0f0a 0%, #060606 100%)', padding: '32px 40px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, letterSpacing: 4, color: c.muted, marginBottom: 12 }}>M A S S A</div>
                      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg, #fff 0%, #888 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Build anything with AI agents, in parallel</div>
                      <div style={{ fontSize: 13, color: c.muted, maxWidth: 500, margin: '0 auto 20px' }}>Deploy multiple intelligent agents that architect, build, and ship production-ready software simultaneously.</div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <div style={{ background: '#34d399', color: '#0a0d10', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>Start Building</div>
                        <div style={{ border: '1px solid #2a3040', color: '#ccc', padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>View Demo</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, padding: '20px 40px' }}>
                      {['Multi-Agent', 'Auto-Architect', 'Live Deploy'].map(f => (
                        <div key={f} style={{ flex: 1, background: '#111', borderRadius: 10, padding: 16, border: `1px solid ${c.border}` }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{f}</div>
                          <div style={{ fontSize: 11, color: c.muted, lineHeight: 1.5 }}>Intelligent system that handles complex workflows automatically.</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {previewProject.id === 'p3' && (
                  <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12, fontFamily: '"JetBrains Mono", monospace' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>PAGES CRAWLED</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>12,847</div>
                        <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>142/min avg</div>
                      </div>
                      <div style={{ flex: 1, background: '#131619', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>DATA EXTRACTED</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>3.2 GB</div>
                        <div style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>98.7% success</div>
                      </div>
                      <div style={{ flex: 1, background: '#131619', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>ACTIVE JOBS</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>3</div>
                        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>2 queued</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 10, border: `1px solid ${c.border}`, fontSize: 11, lineHeight: 1.8, color: '#b0b0b0', overflow: 'hidden' }}>
                      <div><span style={{ color: '#34d399' }}>[OK]</span> GET https://api.example.com/products?page=142 <span style={{ color: '#9ca3af' }}>200 OK 234ms</span></div>
                      <div><span style={{ color: '#34d399' }}>[OK]</span> GET https://api.example.com/products?page=143 <span style={{ color: '#9ca3af' }}>200 OK 189ms</span></div>
                      <div><span style={{ color: '#60a5fa' }}>[PARSE]</span> Extracting 48 records from response...</div>
                      <div><span style={{ color: '#34d399' }}>[OK]</span> GET https://api.example.com/products?page=144 <span style={{ color: '#9ca3af' }}>200 OK 312ms</span></div>
                      <div><span style={{ color: '#f59e0b' }}>[WARN]</span> Rate limit approaching, throttling to 80/min</div>
                      <div><span style={{ color: '#34d399' }}>[OK]</span> Stored 48 records to PostgreSQL <span style={{ color: '#9ca3af' }}>batch_id: b-2847</span></div>
                      <div><span style={{ color: '#60a5fa' }}>[PARSE]</span> Extracting 52 records from response...</div>
                      <div><span style={{ color: '#34d399' }}>[OK]</span> GET https://api.example.com/products?page=145 <span style={{ color: '#9ca3af' }}>200 OK 198ms</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT CHAT MODAL */}
      {chatProject && (() => {
        const proj = projects.find(p => p.id === chatProject)
        if (!proj) return null
        const activeBuild = proj.builds.find(b => b.id === chatProjectBuildId) || proj.builds[0]
        if (!activeBuild) return null
        const msgs = chatMessages[activeBuild.id] || []
        const sc = skillColor(activeBuild.stack)
        return (
          <div onClick={() => { setChatProject(null); setChatInput('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 55 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(940px, 100%)', height: 'min(80vh, 680px)', background: c.panel, border: '1px solid #2a3040', borderRadius: 18, display: 'flex', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
              <div style={{ width: 220, borderRight: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${c.border}` }}>
                  <div style={{ fontSize: 11, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>PROJECT CHATS</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{proj.name}</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                  {proj.builds.map(b => {
                    const bMsgs = chatMessages[b.id] || []
                    const lastMsg = bMsgs[bMsgs.length - 1]
                    const isActive = b.id === chatProjectBuildId
                    const bsc = skillColor(b.stack)
                    const agentReplied = lastMsg?.role === 'agent'
                    return (
                      <div key={b.id} onClick={() => setChatProjectBuildId(b.id)}
                        style={{ padding: '10px 14px', cursor: 'pointer', background: isActive ? c.alt : 'transparent', borderLeft: isActive ? `2px solid ${bsc}` : '2px solid transparent', transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <div style={{ width: 5, height: 5, borderRadius: 99, background: agentReplied ? '#34d399' : bMsgs.length > 0 ? '#f59e0b' : '#9ca3af', flexShrink: 0 }} />
                          <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</div>
                        </div>
                        <div style={{ fontSize: 10, color: c.muted, marginLeft: 11 }}>{b.agent}</div>
                        {lastMsg && <div style={{ fontSize: 10, color: c.muted, marginLeft: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg.content.slice(0, 50)}...</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{activeBuild.title}</div>
                    </div>
                    <div style={{ fontSize: 11, color: c.muted }}>{activeBuild.agent} · {activeBuild.agentRole}</div>
                  </div>
                  <button onClick={() => { setChatProject(null); setChatInput('') }} onMouseEnter={e => e.currentTarget.style.background = '#1e2430'} onMouseLeave={e => e.currentTarget.style.background = '#151920'} style={{ border: '1px solid #252a35', background: '#151920', color: '#ffffff', padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s' }}>Close</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                  {msgs.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                      {msg.role === 'agent' && (
                        <div style={{ fontSize: 10, color: sc, fontWeight: 700, marginBottom: 3 }}>{activeBuild.agent}</div>
                      )}
                      <div style={{ maxWidth: '75%', background: msg.role === 'user' ? '#0f1f18' : c.alt, border: `1px solid ${msg.role === 'user' ? `${c.green}30` : c.border}`, borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px' }}>
                        {msg.content.split('\n').map((line, li) => {
                          if (line.startsWith('```')) return null
                          const prevLines = msg.content.split('\n')
                          const isInCodeBlock = prevLines.slice(0, li).filter(l => l.startsWith('```')).length % 2 === 1
                          if (isInCodeBlock) {
                            return <div key={li} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, background: '#0a0a0a', padding: '2px 8px', borderRadius: 4, color: '#b0b0b0', margin: '2px 0' }}>{line}</div>
                          }
                          return <div key={li} style={{ fontSize: 12, lineHeight: 1.6, color: msg.role === 'user' ? '#e0e0e0' : '#ccc' }}>{line}</div>
                        })}
                      </div>
                      <div style={{ fontSize: 9, color: c.muted, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{msg.time}</div>
                    </div>
                  ))}
                  {msgs.length === 0 && <div style={{ color: c.muted, fontSize: 12 }}>No messages yet. Start a conversation with {activeBuild.agent}.</div>}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding: '12px 20px 18px', borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                    <button
                      onClick={() => setShowAttachMenu(showAttachMenu === 'projchat' ? null : 'projchat')}
                      onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={e => { if (showAttachMenu !== 'projchat') e.currentTarget.style.color = '#888' }}
                      style={{ background: 'transparent', border: 'none', color: showAttachMenu === 'projchat' ? '#fff' : '#888', cursor: 'pointer', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                      title="Attach files"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    {showAttachMenu === 'projchat' && (
                      <div style={{ position: 'absolute', bottom: 44, left: 0, background: '#151920', border: '1px solid #2a3040', borderRadius: 14, padding: '6px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 10 }}>
                        {[
                          { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, label: 'Photo Library' },
                          { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>, label: 'Take Photo or Video' },
                          { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, label: 'Choose Files' },
                        ].map((item, i) => (
                          <div key={i} onClick={() => setShowAttachMenu(null)}
                            onMouseEnter={e => e.currentTarget.style.background = '#1e2430'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', color: '#ddd', fontSize: 13, fontWeight: 500, transition: 'background 0.12s', borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                            <span style={{ color: '#b0b0b0', display: 'flex' }}>{item.icon}</span>
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(activeBuild.id) } }}
                      placeholder={`Message ${activeBuild.agent}...`}
                      style={{ flex: 1, background: '#151920', border: '1px solid #252a35', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button
                      onClick={() => sendChatMessage(activeBuild.id)}
                      onMouseEnter={e => e.currentTarget.style.background = '#1e2430'}
                      onMouseLeave={e => e.currentTarget.style.background = '#151920'}
                      style={{ border: '1px solid #252a35', background: '#151920', color: '#fff', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s' }}
                    >Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* BUILD DETAIL MODAL */}
      {expandedBuild && (
        <div onClick={() => { setExpandedBuildId(null); setChatInput(''); setRevertPending(null); setRevertConfirmed(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(860px, 100%)', height: 'min(78vh, 640px)', background: c.panel, border: '1px solid #2a3040', borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            {(() => {
              const sc = skillColor(expandedBuild.build.stack)
              const msgs = chatMessages[expandedBuild.build.id] || []
              return (
                <>
                  <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <div style={{ fontWeight: 800, fontSize: 20 }}>{expandedBuild.build.title}</div>
                          {expandedBuild.build.status !== 'complete' && <StatusBadge status={expandedBuild.build.status} colors={c} size="lg" />}
                        </div>
                        <div style={{ fontSize: 12, color: c.muted }}>{expandedBuild.project.name} · {expandedBuild.build.agent} ({expandedBuild.build.agentRole})</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setChatOriginBuildId(expandedBuild.build.id); setSelectedChatBuildId(expandedBuild.build.id); setExpandedBuildId(null); setActiveView('chats'); setRevertPending(null); setRevertConfirmed(null) }} onMouseEnter={e => e.currentTarget.style.background = '#1e2430'} onMouseLeave={e => e.currentTarget.style.background = '#151920'} style={{ border: `1px solid ${c.green}44`, background: '#151920', color: c.green, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s', whiteSpace: 'nowrap' }}>Open in Chats</button>
                        <button onClick={() => { setExpandedBuildId(null); setChatInput(''); setRevertPending(null); setRevertConfirmed(null) }} onMouseEnter={e => e.currentTarget.style.background = '#1e2430'} onMouseLeave={e => e.currentTarget.style.background = '#151920'} style={{ border: '1px solid #252a35', background: '#151920', color: '#ffffff', padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s' }}>Close</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 1, background: '#0d1014', borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 0, borderBottom: '1px solid #252a35', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
                      {([
                        { key: 'chat' as const, label: 'Chat', icon: getTabIcon('chat') },
                        { key: 'archmap' as const, label: 'Arch Map', icon: getTabIcon('archmap') },
                        { key: 'preview' as const, label: 'Preview', icon: getTabIcon('preview') },
                        { key: 'addagent' as const, label: '+ Agent', icon: getTabIcon('addagent') },
                        { key: 'addtask' as const, label: '+ Task', icon: getTabIcon('addtask') },
                        { key: 'details' as const, label: 'Details', icon: getTabIcon('details') },
                        { key: 'code' as const, label: 'Code', icon: getTabIcon('code') },
                        { key: 'thinking' as const, label: 'Thinking', icon: getTabIcon('thinking') },
                        { key: 'revert' as const, label: 'Revert', icon: getTabIcon('revert') },
                      ]).map(tab => {
                        const isActive = buildModalTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setBuildModalTab(tab.key)}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#1a1e28'; e.currentTarget.style.color = '#d1d5db'; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.muted; } }}
                            style={{
                              border: 'none',
                              background: isActive ? '#1e2430' : 'transparent',
                              color: isActive ? '#e8eaed' : c.muted,
                              padding: '7px 14px',
                              borderRadius: 7,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              position: 'relative' as const,
                              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                              borderBottom: isActive ? `2px solid ${c.green}` : '2px solid transparent',
                            }}
                          >
                            {tab.icon}
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {buildModalTab === 'chat' ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                        {msgs.map(msg => (
                          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                            {msg.role === 'agent' && (
                              <div style={{ fontSize: 10, color: sc, fontWeight: 700, marginBottom: 3 }}>{expandedBuild.build.agent}</div>
                            )}
                            <div style={{ maxWidth: '75%', background: msg.role === 'user' ? '#0f1f18' : c.alt, border: `1px solid ${msg.role === 'user' ? `${c.green}30` : c.border}`, borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '10px 14px' }}>
                              {msg.content.split('\n').map((line, li) => {
                                if (line.startsWith('```')) return null
                                const prevLines = msg.content.split('\n')
                                const isInCodeBlock = prevLines.slice(0, li).filter(l => l.startsWith('```')).length % 2 === 1
                                if (isInCodeBlock) {
                                  return <div key={li} style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, background: '#0a0a0a', padding: '2px 8px', borderRadius: 4, color: '#b0b0b0', margin: '2px 0' }}>{line}</div>
                                }
                                return <div key={li} style={{ fontSize: 12, lineHeight: 1.6, color: msg.role === 'user' ? '#e0e0e0' : '#ccc' }}>{line}</div>
                              })}
                            </div>
                            <div style={{ fontSize: 9, color: c.muted, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{msg.time}</div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div style={{ padding: '12px 24px 20px', borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                          <button
                            onClick={() => setShowAttachMenu(showAttachMenu === 'buildchat' ? null : 'buildchat')}
                            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                            onMouseLeave={e => { if (showAttachMenu !== 'buildchat') e.currentTarget.style.color = '#888' }}
                            style={{ background: 'transparent', border: 'none', color: showAttachMenu === 'buildchat' ? '#fff' : '#888', cursor: 'pointer', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                            title="Attach files"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                          </button>
                          {showAttachMenu === 'buildchat' && (
                            <div style={{ position: 'absolute', bottom: 44, left: 0, background: '#151920', border: '1px solid #2a3040', borderRadius: 14, padding: '6px 0', minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 10 }}>
                              {[
                                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>, label: 'Photo Library' },
                                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>, label: 'Take Photo or Video' },
                                { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>, label: 'Choose Files' },
                              ].map((item, i) => (
                                <div key={i} onClick={() => setShowAttachMenu(null)}
                                  onMouseEnter={e => e.currentTarget.style.background = '#1e2430'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', color: '#ddd', fontSize: 13, fontWeight: 500, transition: 'background 0.12s', borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                                  <span style={{ color: '#b0b0b0', display: 'flex' }}>{item.icon}</span>
                                  {item.label}
                                </div>
                              ))}
                            </div>
                          )}
                          <input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(expandedBuild.build.id) } }}
                            placeholder={`Message ${expandedBuild.build.agent}...`}
                            style={{ flex: 1, background: '#151920', border: '1px solid #252a35', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                          />
                          <button
                            onClick={() => sendChatMessage(expandedBuild.build.id)}
                            onMouseEnter={e => e.currentTarget.style.background = '#1e2430'}
                            onMouseLeave={e => e.currentTarget.style.background = '#151920'}
                            style={{ border: '1px solid #252a35', background: '#151920', color: '#fff', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s' }}
                          >Send</button>
                        </div>
                      </div>
                    </div>
                  ) : buildModalTab === 'archmap' ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 24, width: '100%', textAlign: 'center' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Architecture Map</div>
                        <div style={{ fontSize: 12, color: c.muted, marginBottom: 16 }}>View the full architecture map for {expandedBuild.project.name}</div>
                        <button
                          onClick={() => { setExpandedBuildId(null); setExpandedProject(expandedBuild.project.id) }}
                          onMouseEnter={e => e.currentTarget.style.background = '#1e2430'}
                          onMouseLeave={e => e.currentTarget.style.background = '#151920'}
                          style={{ border: `1px solid ${c.green}44`, background: '#151920', color: c.green, padding: '8px 20px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s' }}
                        >Open Arch Map</button>
                      </div>
                    </div>
                  ) : buildModalTab === 'addagent' ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ background: c.alt, border: `1px dashed ${c.border}`, borderRadius: 12, padding: 24, width: '100%', textAlign: 'center' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Add Agent</div>
                        <div style={{ fontSize: 12, color: c.muted }}>Coming soon — assign additional agents to this build</div>
                      </div>
                    </div>
                  ) : buildModalTab === 'addtask' ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ background: c.alt, border: `1px dashed ${c.border}`, borderRadius: 12, padding: 24, width: '100%', textAlign: 'center' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Add Task</div>
                        <div style={{ fontSize: 12, color: c.muted }}>Coming soon — create new tasks for this build</div>
                      </div>
                    </div>
                  ) : buildModalTab === 'details' ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
                      <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: c.muted }}>
                          <span>Progress</span>
                          <span style={{ fontWeight: 700, color: c.text }}>{expandedBuild.build.progress}%</span>
                        </div>
                        <div style={{ height: 7, background: '#1b1b1b', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${expandedBuild.build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>AGENT</div>
                          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{expandedBuild.build.agent}</div>
                          <div style={{ fontSize: 12, color: c.muted }}>{expandedBuild.build.agentRole}</div>
                        </div>
                        <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>STACK</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {expandedBuild.build.stack.map(s => <ModelTooltip key={s} text={getModelReason(s, expandedBuild.build.buildContext)}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, border: `1px solid ${(SKILL_COLORS[s] || c.border)}44`, padding: '4px 10px', borderRadius: 999, color: '#ffffff', background: SKILL_COLORS[s] || c.green, cursor: 'default' }}><InlineCompanyLogo name={s} size={14} />{s}</span></ModelTooltip>)}
                          </div>
                        </div>
                      </div>

                      <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>SUMMARY</div>
                        <div style={{ fontSize: 14, lineHeight: 1.6 }}>{expandedBuild.build.summary}</div>
                      </div>

                      <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>ACTIVITY</div>
                        {[
                          { icon: '◎', label: `${msgs.length} messages · ${Math.floor(msgs.length * 0.5)} actions`, sub: 'Agent communication log', details: [
                            { time: '0:02', text: 'Agent initialized — reading project context' },
                            { time: '0:05', text: 'Analyzed requirements, identified 3 sub-tasks' },
                            { time: '0:12', text: 'Created file: src/core/engine.ts' },
                            { time: '0:18', text: 'Installed dependencies: zod, drizzle-orm' },
                            { time: '0:31', text: 'Wrote 142 lines across 4 files' },
                            { time: '0:45', text: 'Running type check — 0 errors' },
                          ]},
                          { icon: '◈', label: 'Checkpoint 3 min ago', sub: 'Last saved state', details: [
                            { time: '3m ago', text: 'Auto-saved: 8 files changed, 412 additions' },
                            { time: '7m ago', text: 'Auto-saved: schema migration applied' },
                          ]},
                          { icon: '◷', label: `${Math.round(expandedBuild.build.progress * 1.4)}s compute`, sub: 'Total active time', details: [
                            { time: 'Thinking', text: `${Math.round(expandedBuild.build.progress * 0.3)}s — planning and analysis` },
                            { time: 'Writing', text: `${Math.round(expandedBuild.build.progress * 0.7)}s — code generation` },
                            { time: 'Checking', text: `${Math.round(expandedBuild.build.progress * 0.4)}s — type checks and linting` },
                          ]},
                        ].map((row, i, arr) => {
                          const isOpen = expandedActivity === i
                          return (
                          <div key={i}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 0' }} onClick={() => setExpandedActivity(isOpen ? null : i)}>
                              <span style={{ fontSize: 16, color: sc }}>{row.icon}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</div>
                                <div style={{ fontSize: 12, color: c.muted }}>{row.sub}</div>
                              </div>
                              <span style={{ fontSize: 11, color: c.muted, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
                            </div>
                            {isOpen && (
                              <div style={{ marginLeft: 28, marginTop: 6, marginBottom: 4, borderLeft: `1px solid ${sc}33`, paddingLeft: 12 }}>
                                {row.details.map((d, di) => (
                                  <div key={di} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 12 }}>
                                    <span style={{ color: sc, fontFamily: 'monospace', fontSize: 11, minWidth: 55, flexShrink: 0 }}>{d.time}</span>
                                    <span style={{ color: '#b0b0b0' }}>{d.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {i < arr.length - 1 && <div style={{ height: 1, background: c.border, opacity: 0.5, margin: '10px 0' }} />}
                          </div>
                        )})}
                      </div>
                    </div>
                  ) : buildModalTab === 'code' ? (() => {
                    const ctx = (expandedBuild.build.buildContext || 'backend') as string
                    const snippets = CODE_SNIPPETS[ctx] || CODE_SNIPPETS.backend
                    return (
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
                        <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                          <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>CODE CHANGES</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {snippets.map((s, si) => (
                              <div key={si} style={{ background: '#0a0c10', border: `1px solid ${c.border}`, borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${c.border}`, background: '#0e1116' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                                  <span style={{ fontSize: 12, color: '#f59e0b', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 600 }}>{s.file}</span>
                                </div>
                                <div style={{ padding: '10px 12px', fontFamily: '"JetBrains Mono", Menlo, monospace', fontSize: 12, color: '#b0b0b0', lineHeight: 1.7 }}>
                                  {renderCodeLine(s.code, true)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>BUILD CONTEXT</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {expandedBuild.build.stack.map(s => (
                              <span key={s} style={{ fontSize: 11, color: '#ccc', fontFamily: '"JetBrains Mono", Menlo, monospace', padding: '3px 8px', background: '#111', borderRadius: 6, border: `1px solid ${c.border}` }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })() : buildModalTab === 'thinking' ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
                      <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>AGENT REASONING</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 999, background: `${sc}20`, border: `1px solid ${sc}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{expandedBuild.build.agent}</div>
                            <div style={{ fontSize: 11, color: c.muted }}>{expandedBuild.build.agentRole}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {[
                            { phase: 'Analysis', text: `Reading project context and analyzing requirements for "${expandedBuild.build.title}"`, time: `${Math.round(expandedBuild.build.progress * 0.3)}s`, status: 'complete' as const },
                            { phase: 'Planning', text: `Identified ${(expandedBuild.build.id.charCodeAt(0) % 4) + 2} sub-tasks. Determining optimal execution order and dependencies.`, time: `${Math.round(expandedBuild.build.progress * 0.2)}s`, status: 'complete' as const },
                            { phase: 'Implementation', text: `Writing code across ${(expandedBuild.build.id.charCodeAt(0) % 5) + 2} files. ${expandedBuild.build.summary}`, time: `${Math.round(expandedBuild.build.progress * 0.7)}s`, status: expandedBuild.build.progress >= 60 ? 'complete' as const : 'running' as const },
                            { phase: 'Verification', text: 'Running type checks, linting, and validating output against requirements.', time: `${Math.round(expandedBuild.build.progress * 0.4)}s`, status: expandedBuild.build.progress >= 85 ? 'complete' as const : expandedBuild.build.progress >= 60 ? 'running' as const : 'pending' as const },
                          ].map((step, si) => (
                            <div key={si} style={{ display: 'flex', gap: 12, padding: '10px 12px', background: '#0a0c10', borderRadius: 8, border: `1px solid ${step.status === 'running' ? `${sc}44` : c.border}` }}>
                              <div style={{ width: 20, height: 20, borderRadius: 999, background: step.status === 'complete' ? `${sc}20` : step.status === 'running' ? '#f59e0b20' : '#33333320', border: `1px solid ${step.status === 'complete' ? sc : step.status === 'running' ? '#f59e0b' : '#444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                {step.status === 'complete' && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={sc} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                {step.status === 'running' && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#f59e0b', animation: 'subtle-glow 1s ease-in-out infinite' }} />}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: step.status === 'pending' ? '#555' : c.text }}>{step.phase}</span>
                                  <span style={{ fontSize: 10, color: c.muted, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{step.time}</span>
                                </div>
                                <div style={{ fontSize: 11, color: step.status === 'pending' ? '#555' : c.muted, lineHeight: 1.5 }}>{step.text}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>STATUS</div>
                        <div style={{ fontSize: 13, color: expandedBuild.build.status === 'running' ? '#f59e0b' : expandedBuild.build.status === 'complete' ? sc : '#f87171', fontWeight: 600 }}>
                          {getInlineStatus(expandedBuild.build)}
                        </div>
                      </div>
                    </div>
                  ) : buildModalTab === 'revert' ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
                      <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 16, textAlign: 'left' }}>REVERT BUILD</div>
                        <div style={{ width: 56, height: 56, borderRadius: 999, background: '#f59e0b15', border: '1px solid #f59e0b44', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{expandedBuild.build.title}</div>
                        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>Build version: {expandedBuild.build.id}</div>
                        <div style={{ fontSize: 12, color: c.muted, marginBottom: 20 }}>Progress at snapshot: {expandedBuild.build.progress}%</div>

                        <div style={{ background: '#0a0c10', border: `1px solid ${c.border}`, borderRadius: 10, padding: 14, marginBottom: 16, textAlign: 'left' }}>
                          <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>CHANGES IN THIS VERSION</div>
                          <div style={{ fontSize: 12, color: '#b0b0b0', lineHeight: 1.6 }}>{expandedBuild.build.summary}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                            {expandedBuild.build.stack.map(s => (
                              <span key={s} style={{ fontSize: 10, color: '#888', fontFamily: '"JetBrains Mono", Menlo, monospace', padding: '2px 6px', background: '#111', borderRadius: 4, border: `1px solid ${c.border}` }}>{s}</span>
                            ))}
                          </div>
                        </div>

                        {revertConfirmed === expandedBuild.build.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: sc }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>Reverted successfully</span>
                            </div>
                            <div style={{ fontSize: 11, color: c.muted }}>Build has been rolled back to this version</div>
                          </div>
                        ) : revertPending === expandedBuild.build.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>Are you sure you want to revert?</div>
                            <div style={{ fontSize: 11, color: c.muted }}>All changes made after this build version will be lost.</div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button
                                onClick={() => { setRevertConfirmed(expandedBuild.build.id); setRevertPending(null) }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f87171'; e.currentTarget.style.color = '#000' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f87171' }}
                                style={{ border: '2px solid #f87171', background: 'transparent', color: '#f87171', padding: '8px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s ease' }}
                              >Yes, Revert</button>
                              <button
                                onClick={() => setRevertPending(null)}
                                onMouseEnter={e => e.currentTarget.style.background = '#1e2430'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                style={{ border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, padding: '8px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'background 0.15s' }}
                              >Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                            <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 4 }}>This will roll back all changes made after this build version.</div>
                            <button
                              onClick={() => setRevertPending(expandedBuild.build.id)}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f59e0b'; e.currentTarget.style.color = '#000' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#f59e0b' }}
                              style={{ border: '2px solid #f59e0b', background: 'transparent', color: '#f59e0b', padding: '10px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s ease' }}
                            >Revert to this version</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : buildModalTab === 'preview' ? (() => {
                    const bt = getBuildType(expandedBuild.build.stack, expandedBuild.build.title)
                    return (
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, width: '100%', marginBottom: 14 }}>
                          <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>BUILD PREVIEW</div>
                          <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${c.border}` }}>
                            <PreviewThumbnail buildId={expandedBuild.build.id} buildType={bt} sc={sc} />
                          </div>
                        </div>
                        <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, width: '100%' }}>
                          <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>BUILD INFO</div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            <div>
                              <div style={{ fontSize: 11, color: c.muted, marginBottom: 2 }}>Status</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: expandedBuild.build.status === 'complete' ? sc : expandedBuild.build.status === 'failed' ? '#f87171' : '#f59e0b', textTransform: 'capitalize' }}>{expandedBuild.build.status}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: c.muted, marginBottom: 2 }}>Progress</div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{expandedBuild.build.progress}%</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: c.muted, marginBottom: 2 }}>Agent</div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{expandedBuild.build.agent}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })() : null}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {addPromptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setAddPromptModal(null) }}>
          <div style={{ background: '#0a0d10', border: '1px solid #252a35', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 24px 80px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1e2330', background: '#0c0f14' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700 }}>+</span>
                <span className="panel-header" style={{ color: '#9ca3af', fontSize: 9 }}>{addPromptModal.type === 'agent' ? 'ADD AGENT' : 'ADD TASK'}</span>
              </div>
              <button onClick={() => setAddPromptModal(null)}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = '#555'}
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.15s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10, fontFamily: '"JetBrains Mono", Menlo, monospace', lineHeight: 1.5 }}>
                {addPromptModal.type === 'agent'
                  ? 'Describe the agent you want to add — its role, focus area, and what it should handle.'
                  : 'Describe the task — what needs to be done, any constraints, and expected outcome.'}
              </div>
              <textarea
                autoFocus
                value={addPromptText}
                onChange={e => setAddPromptText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && addPromptText.trim()) { e.preventDefault(); setAddPromptModal(null) } }}
                placeholder={addPromptModal.type === 'agent' ? 'e.g. A QA agent that reviews code for bugs and edge cases...' : 'e.g. Set up authentication with email + OAuth support...'}
                style={{ width: '100%', minHeight: 100, background: '#080a0e', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px', color: '#e8eaed', fontSize: 12, fontFamily: '"JetBrains Mono", Menlo, monospace', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button onClick={() => setAddPromptModal(null)}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e2330'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid #1e2330', background: 'transparent', color: '#9ca3af', fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", Menlo, monospace', cursor: 'pointer', transition: 'background 0.15s' }}>
                  Cancel
                </button>
                <button
                  onClick={() => { if (addPromptText.trim()) setAddPromptModal(null) }}
                  onMouseEnter={e => { if (addPromptText.trim()) { e.currentTarget.style.background = '#141e14'; e.currentTarget.style.boxShadow = '0 0 16px rgba(52,211,153,0.1)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = addPromptText.trim() ? '#0c1210' : 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
                  style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${addPromptText.trim() ? 'rgba(52,211,153,0.3)' : '#1e2330'}`, background: addPromptText.trim() ? '#0c1210' : 'transparent', color: addPromptText.trim() ? '#34d399' : '#555', fontSize: 10, fontWeight: 700, fontFamily: '"JetBrains Mono", Menlo, monospace', cursor: addPromptText.trim() ? 'pointer' : 'default', transition: 'all 0.15s', letterSpacing: 0.3 }}>
                  <span style={{ marginRight: 5, opacity: 0.5 }}>▶</span>{addPromptModal.type === 'agent' ? 'Add Agent' : 'Add Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClarifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowClarifyModal(false) }}>
          <div style={{ background: '#0a0d10', border: '1px solid #252a35', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(52,211,153,0.03)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1e2330', background: '#0c0f14' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700 }}>{'>'}</span>
                <span className="panel-header" style={{ color: '#9ca3af', fontSize: 9 }}>CLARIFY</span>
                <div style={{ width: 1, height: 12, background: '#252a35' }} />
                <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 500, letterSpacing: 0.5 }}>MASSA://vague-mode</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>step {clarifyHistory.length + (clarifyDone ? 0 : 1)}</span>
                <button onClick={() => setShowClarifyModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>✕</button>
              </div>
            </div>

            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2330' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', opacity: 0.5 }}>$</span>
                <span className="panel-header" style={{ color: '#9ca3af', fontSize: 9 }}>INPUT</span>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{rawInput}</div>
            </div>

            {clarifyHistory.length > 0 && (
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e2330', maxHeight: 140, overflowY: 'auto' }}>
                {clarifyHistory.map((h, i) => (
                  <div key={i} style={{ marginBottom: i < clarifyHistory.length - 1 ? 8 : 0 }}>
                    <div style={{ fontSize: 9, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace', marginBottom: 2 }}>Q{i + 1}: {h.question}</div>
                    <div style={{ fontSize: 11, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', opacity: 0.8 }}>→ {h.answer}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '16px 16px 20px' }}>
              {clarifyLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', justifyContent: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: '#34d399', animation: 'subtle-glow 1s ease-in-out infinite' }} />
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>generating question...</span>
                </div>
              ) : clarifyDone ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700 }}>✓</span>
                    <span className="panel-header" style={{ color: '#34d399', fontSize: 9 }}>READY TO BUILD</span>
                  </div>
                  {clarifySummary && (
                    <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6, fontFamily: '"JetBrains Mono", Menlo, monospace', background: '#0c0f14', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                      {clarifySummary}
                    </div>
                  )}
                  <button
                    onClick={() => setShowClarifyModal(false)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#141e14'; e.currentTarget.style.boxShadow = '0 0 20px rgba(52,211,153,0.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0c1210'; e.currentTarget.style.boxShadow = 'none' }}
                    style={{ width: '100%', background: '#0c1210', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, padding: '10px 0', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'all 0.2s ease', letterSpacing: 0.3 }}>
                    <span style={{ marginRight: 6, opacity: 0.5 }}>▶</span>EXECUTE BUILD
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: '#e8eaed', fontWeight: 600, marginBottom: 14, lineHeight: 1.5 }}>
                    {clarifyQuestion}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {clarifyOptions.map((opt, i) => (
                      opt === 'Other' ? (
                        <div key={i}>
                          <div
                            style={{ fontSize: 12, color: '#9ca3af', background: '#0c0f14', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', display: 'flex', alignItems: 'center', gap: 8 }}
                            onClick={() => {
                              const el = document.getElementById('clarify-other-input')
                              if (el) el.focus()
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#252a35'; e.currentTarget.style.color = '#9ca3af' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2330'; e.currentTarget.style.color = '#9ca3af' }}>
                            <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>{String.fromCharCode(65 + i)}.</span>
                            <input
                              id="clarify-other-input"
                              value={clarifyOtherText}
                              onChange={e => setClarifyOtherText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && clarifyOtherText.trim()) handleClarifyAnswer(clarifyOtherText.trim()) }}
                              placeholder="type your own answer..."
                              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e8eaed', fontSize: 12, fontFamily: '"JetBrains Mono", Menlo, monospace' }}
                            />
                            {clarifyOtherText.trim() && (
                              <button
                                onClick={e => { e.stopPropagation(); handleClarifyAnswer(clarifyOtherText.trim()) }}
                                style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: 11, fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700, padding: '2px 6px', flexShrink: 0 }}>
                                →
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div key={i}
                          onClick={() => handleClarifyAnswer(opt)}
                          style={{ fontSize: 12, color: '#9ca3af', background: '#0c0f14', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#141820'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)'; e.currentTarget.style.color = '#9ca3af' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#0c0f14'; e.currentTarget.style.borderColor = '#1e2330'; e.currentTarget.style.color = '#9ca3af' }}>
                          <span style={{ color: '#34d399', fontWeight: 700, fontSize: 10, opacity: 0.5, flexShrink: 0 }}>{String.fromCharCode(65 + i)}.</span>
                          {opt}
                        </div>
                      )
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                      onClick={() => { setClarifyDone(true); setClarifySummary('Building based on current context.') }}
                      onMouseEnter={e => e.currentTarget.style.color = '#9ca3af'}
                      onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
                      style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 10, fontFamily: '"JetBrains Mono", Menlo, monospace', padding: '4px 8px', transition: 'color 0.15s' }}>
                      skip → build now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

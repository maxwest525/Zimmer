import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { InlineCompanyLogo } from '@/components/CompanyLogo'
import { NodeGraph } from '@/components/NodeGraph'
import { TimelineSwimlane } from '@/components/TimelineSwimlane'
import { ChatView } from '@/components/ChatView'
import { IdeasView } from '@/components/IdeasView'
import { ModelTooltip } from '@/components/ModelTooltip'
import { MODEL_COLORS, getModelReason } from '@/data/modelRegistry'
import { TenantSelector } from '@/components/TenantSelector'
import { useTenant } from '@/contexts/TenantContext'

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

type Project = {
  id: string
  name: string
  goal: string
  status: Status
  builds: Build[]
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

const PHASE_META: Record<Phase, { label: string; color: string; desc: string }> = {
  thinking: { label: 'Thinking', color: '#a78bfa', desc: 'Claude is interpreting and planning the work' },
  building: { label: 'Building', color: '#34d399', desc: 'Claude Code is executing the build' },
  deploying: { label: 'Deploying', color: '#60a5fa', desc: 'Lovable / Replit is rendering the interface' },
  done: { label: 'Complete', color: '#4ade80', desc: 'All builds finished successfully' },
  queued: { label: 'Queued', color: '#f59e0b', desc: 'Waiting to start' },
}

function StatusBadge({ status, colors, size = 'sm' }: { status: Status; colors: Record<string, string>; size?: 'sm' | 'lg' }) {
  const fs = size === 'lg' ? 13 : 11
  const pad = size === 'lg' ? '5px 12px' : '3px 8px'
  if (status === 'running') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#e8eaed', background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', padding: pad, borderRadius: 999, fontWeight: 600, boxShadow: '0 0 6px rgba(52,211,153,0.15)' }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#34d399', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 4px rgba(52,211,153,0.5)' }} />
      Building
    </span>
  )
  if (status === 'queued') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#f59e0b', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} /> Pending
    </span>
  )
  if (status === 'complete') return null
  if (status === 'failed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>✕ Failed</span>
  )
  return <span style={{ fontSize: fs, color: '#6b7280', background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.15)', padding: pad, borderRadius: 999, fontWeight: 600 }}>Idle</span>
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
  const base = { width: w, height: h, borderRadius: size === 'mini' ? 4 : '8px 8px 0 0', overflow: 'hidden' as const, position: 'relative' as const, flexShrink: 0, background: '#080808' }
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
                {['1m', '5m', '1H', '4H', '1D'].map((tf, i) => <div key={i} style={{ fontSize: 3, color: i === 2 ? '#fff' : '#444', padding: '1px 3px', background: i === 2 ? `${sc}30` : 'transparent', borderRadius: 2 }}>{tf}</div>)}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
                <div style={{ width: 4, height: 4, borderRadius: 99, background: '#34d399' }} />
                <div style={{ fontSize: 3, color: '#888' }}>Live</div>
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
                    <div style={{ fontSize: f(4), color: '#555' }}>{kpi.label}</div>
                    {!m && kpi.delta && <div style={{ fontSize: 3, color: kpi.c }}>{kpi.delta}</div>}
                  </div>
                  <div style={{ fontSize: f(7), fontWeight: 700, color: kpi.c, marginTop: f(1) }}>{kpi.val}</div>
                </div>
              ))}
            </div>
            {!m && <div style={{ flex: 1, display: 'flex', gap: 3 }}>
              <div style={{ flex: 3, background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <div style={{ fontSize: 4, color: '#888', fontWeight: 600 }}>BTC/USDT</div>
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
                  <div style={{ fontSize: 4, color: '#555', marginBottom: 2 }}>Open Positions</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 3, color: '#333', marginBottom: 2, borderBottom: '1px solid #151515', paddingBottom: 1 }}>
                    <span>Pair</span><span>Side</span><span>Size</span><span>P&L</span>
                  </div>
                  {[
                    { pair: 'BTC/USD', side: 'Long', size: '0.5', pnl: '+$420', c: '#34d399' },
                    { pair: 'ETH/USD', side: 'Short', size: '2.0', pnl: '-$85', c: '#f87171' },
                    { pair: 'SOL/USD', side: 'Long', size: '15', pnl: '+$162', c: '#34d399' },
                    { pair: 'AVAX', side: 'Long', size: '40', pnl: '+$34', c: '#34d399' },
                  ].map((pos, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 4, marginBottom: 2, padding: '1px 0' }}>
                      <span style={{ color: '#999', minWidth: 20 }}>{pos.pair}</span>
                      <span style={{ color: pos.side === 'Long' ? '#34d39980' : '#f8717180', fontSize: 3, minWidth: 14 }}>{pos.side}</span>
                      <span style={{ color: '#555', fontSize: 3, minWidth: 10 }}>{pos.size}</span>
                      <span style={{ color: pos.c, fontWeight: 600, minWidth: 16, textAlign: 'right' }}>{pos.pnl}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4 }}>
                  <div style={{ fontSize: 4, color: '#555', marginBottom: 2 }}>Order Book</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <div style={{ flex: 1 }}>
                      {[95,80,65,45,30].map((w, i) => (
                        <div key={i} style={{ position: 'relative', height: 4, marginBottom: 1 }}>
                          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${w}%`, background: '#34d39915', borderRadius: 1 }} />
                          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 3, padding: '0 1px' }}>
                            <span style={{ color: '#34d399' }}>{(68412 - i * 12).toLocaleString()}</span>
                            <span style={{ color: '#444' }}>{(w * 0.02).toFixed(2)}</span>
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
                            <span style={{ color: '#444' }}>{(w * 0.018).toFixed(2)}</span>
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
              <div style={{ marginLeft: 8, fontSize: 4, color: '#999', padding: '1px 4px', background: '#1e1e1e', borderRadius: 2 }}>src/engine/strategy.ts</div>
              <div style={{ fontSize: 4, color: '#555', padding: '1px 4px' }}>src/engine/order.ts</div>
              <div style={{ fontSize: 4, color: '#555', padding: '1px 4px' }}>src/engine/broker.ts</div>
              <div style={{ marginLeft: 'auto', fontSize: 3, color: '#333' }}>TypeScript</div>
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
            <div style={{ marginLeft: 'auto', fontSize: 3.5, color: '#555' }}>Ln 21, Col 34</div>
            <div style={{ fontSize: 3.5, color: '#555' }}>UTF-8</div>
            <div style={{ fontSize: 3.5, color: '#555' }}>TS</div>
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
              <div style={{ fontSize: f(4), color: '#555', marginBottom: f(1) }}>{kpi.label}</div>
              <div style={{ fontSize: f(7), fontWeight: 700, color: kpi.c }}>{kpi.val}</div>
            </div>
          ))}
        </div>
        {!m && <>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 3, padding: 4, border: '1px solid #1a1a1a', overflow: 'hidden' }}>
              <div style={{ fontSize: 4, color: '#555', marginBottom: 3 }}>Portfolio Exposure by Asset</div>
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
                    <div style={{ fontSize: 3, color: '#555' }}>{bar.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 3, padding: 4, border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: 4, color: '#555', marginBottom: 3 }}>Safety Rules</div>
              {[
                { rule: 'Max loss per trade: 1%', ok: true },
                { rule: 'Daily loss limit: 3%', ok: true },
                { rule: 'Correlation check: pass', ok: true },
                { rule: 'Position sizing: within limit', ok: true },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2, fontSize: 4 }}>
                  <div style={{ width: 4, height: 4, borderRadius: 1, background: r.ok ? '#34d39940' : '#f8717140', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 3, color: r.ok ? '#34d399' : '#f87171' }}>{r.ok ? '✓' : '!'}</div>
                  <span style={{ color: '#888' }}>{r.rule}</span>
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
          <div style={{ fontSize: 4, color: '#888', fontWeight: 600 }}>Notifications</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
            {['All', 'Trades', 'Risk', 'System'].map((tab, i) => (
              <div key={i} style={{ fontSize: 3, color: i === 0 ? sc : '#555', padding: '1px 3px', borderRadius: 2, background: i === 0 ? `${sc}15` : 'transparent' }}>{tab}</div>
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
                  <div style={{ fontSize: f(3), color: '#444', flexShrink: 0 }}>{n.t}</div>
                </div>
                {!m && <div style={{ fontSize: 4, color: '#666', marginBottom: 2 }}>{n.desc}</div>}
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
              <div style={{ fontSize: f(4), color: '#555' }}>{s.l}</div>
              <div style={{ fontSize: f(7), fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: f(3) }}>
          <div style={{ flex: 3, background: '#0e0e0e', borderRadius: f(3), border: '1px solid #1a1a1a', position: 'relative', overflow: 'hidden', padding: f(4) }}>
            {!m && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <div style={{ fontSize: 4, color: '#555' }}>Equity Curve — 6 Month Backtest</div>
              <div style={{ fontSize: 3, color: '#444' }}>Jan 2024 — Jun 2024</div>
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
              <div style={{ fontSize: 4, color: '#555', marginBottom: 3 }}>Trade Log (Last 5)</div>
              {[
                { pair: 'BTC Long', result: '+4.2%', c: '#34d399' },
                { pair: 'ETH Short', result: '-1.1%', c: '#f87171' },
                { pair: 'SOL Long', result: '+2.8%', c: '#34d399' },
                { pair: 'BTC Short', result: '+1.5%', c: '#34d399' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 4, marginBottom: 2 }}>
                  <span style={{ color: '#888' }}>{t.pair}</span>
                  <span style={{ color: t.c, fontWeight: 600 }}>{t.result}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 18, background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4 }}>
              <div style={{ fontSize: 4, color: '#555', marginBottom: 2 }}>Monthly Returns</div>
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
            {!m && <div style={{ fontSize: 4, fontWeight: 700, color: '#888', letterSpacing: 1.5 }}>MASSA</div>}
          </div>
          {!m && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['Features', 'How It Works', 'Pricing', 'Docs'].map((t, i) => <div key={i} style={{ fontSize: 3.5, color: '#666' }}>{t}</div>)}
            <div style={{ fontSize: 3.5, color: '#fff', background: sc, padding: '2px 6px', borderRadius: 2, fontWeight: 600 }}>Get Started</div>
          </div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: `0 ${f(8)}px` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: m ? 4 : 8, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: f(3) }}>{m ? 'Build with AI' : 'Build anything with'}</div>
              {!m && <div style={{ fontSize: 8, fontWeight: 800, color: sc, lineHeight: 1.2, marginBottom: 4 }}>AI agents, in parallel</div>}
              <div style={{ fontSize: f(3), color: '#555', lineHeight: 1.4, marginBottom: f(4), maxWidth: m ? '100%' : 70 }}>{m ? '' : 'Describe what you want. MASSA architects, builds, and deploys — running multiple agents simultaneously.'}</div>
              {!m && <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ fontSize: 4, color: '#fff', background: sc, padding: '3px 8px', borderRadius: 3, fontWeight: 600 }}>Start Building</div>
                <div style={{ fontSize: 4, color: '#999', background: 'transparent', border: '1px solid #2a3040', padding: '3px 8px', borderRadius: 3 }}>Watch Demo</div>
              </div>}
            </div>
            {!m && <div style={{ width: 60, height: 45, background: '#0a0a0a', borderRadius: 4, border: '1px solid #1a1a1a', padding: 4, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 3, color: '#444', marginBottom: 2 }}>Live Preview</div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                {[{ l: 'Agents', v: '4', c: sc }, { l: 'Builds', v: '12', c: '#60a5fa' }].map((k, i) => (
                  <div key={i} style={{ flex: 1, background: '#111', borderRadius: 2, padding: '2px 3px', border: '1px solid #1a1a1a' }}>
                    <div style={{ fontSize: 2.5, color: '#444' }}>{k.l}</div>
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
                <div key={i} style={{ fontSize: 3, color: '#333', display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  <div style={{ fontSize: 3, color: '#555', lineHeight: 1.3 }}>{feat.desc}</div>
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
          <div style={{ fontSize: 4, color: '#888', fontWeight: 600 }}>API Connections</div>
          <div style={{ marginLeft: 'auto', width: 16, height: 5, borderRadius: 2, background: `${sc}20`, border: `1px solid ${sc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 3, color: sc }}>+ Add</div>
        </div>}
        <div style={{ flex: 1, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(3) }}>
          {[
            { name: 'Binance', status: 'Connected', c: '#34d399', keys: '••••R4xK', latency: '42ms' },
            { name: 'Coinbase Pro', status: 'API Key Set', c: sc, keys: '••••9mPq', latency: '68ms' },
            { name: 'Kraken', status: 'Not configured', c: '#444', keys: '—', latency: '—' },
          ].slice(0, m ? 2 : 3).map((api, i) => (
            <div key={i} style={{ background: '#0e0e0e', borderRadius: f(3), padding: f(4), border: `1px solid ${api.c === '#444' ? '#1a1a1a' : api.c + '30'}`, display: 'flex', alignItems: 'center', gap: f(4) }}>
              <div style={{ width: f(10), height: f(10), borderRadius: f(2), background: `${api.c}15`, border: `1px solid ${api.c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: f(5), fontWeight: 700, color: api.c, flexShrink: 0 }}>{api.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: f(5), fontWeight: 600, color: '#ccc', marginBottom: f(1) }}>{api.name}</div>
                {!m && <div style={{ display: 'flex', gap: 6, fontSize: 3, color: '#555' }}>
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
              <div style={{ fontSize: 4, color: '#888', marginLeft: 6 }}>~/massa/crawler</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                <div style={{ fontSize: 3, color: '#555' }}>PID 4821</div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 3, color: '#555', marginBottom: 1 }}>
                  <span>{stat.l}</span><span style={{ color: i === 2 ? '#34d399' : '#888' }}>{stat.v}</span>
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
              { pre: '[init] ', txt: 'Headless Chromium 121.0 ready', c: '#555' },
              { pre: '[init] ', txt: 'Proxy pool: 12 endpoints loaded (3 regions)', c: '#555' },
              { pre: '[init] ', txt: 'Rate limit: 200ms delay, 3 concurrent', c: '#555' },
              { pre: '', txt: '', c: '' },
              { pre: '  → ', txt: 'GET /api/products?page=1 (200 OK, 142ms)', c: sc },
              { pre: '  → ', txt: 'GET /api/products?page=2 (200 OK, 156ms)', c: sc },
              { pre: '  ✓ ', txt: 'Parsed 234 items, 12 new entries', c: '#34d399' },
              { pre: '  ✓ ', txt: 'Price deltas: 18 items changed (+4.2% avg)', c: '#f59e0b' },
              { pre: '  → ', txt: 'GET /api/categories?page=1 (200 OK, 98ms)', c: sc },
              { pre: '  ✓ ', txt: 'Batch INSERT INTO products (412 rows, 89ms)', c: '#34d399' },
              { pre: '  → ', txt: 'GET /api/products?page=3 (200 OK, 131ms)', c: sc },
              { pre: '  ✓ ', txt: 'Dedup: 6 duplicates removed', c: '#555' },
              { pre: '', txt: '', c: '' },
              { pre: '[eta]  ', txt: 'Progress: 67% — est. 1m 14s remaining', c: '#60a5fa' },
            ].slice(0, m ? 2 : 16).map((line, i) => (
              <div key={i} style={{ fontSize: m ? 3 : 4.5, marginBottom: m ? 1 : 1.5, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.5, height: line.txt === '' ? (m ? 3 : 5) : undefined }}>
                <span style={{ color: '#444' }}>{line.pre}</span><span style={{ color: line.c }}>{line.txt}</span>
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
          <div style={{ fontSize: 4, color: '#888', fontWeight: 600 }}>Scheduled Jobs</div>
          <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
            {['Active', 'History', 'Config'].map((tab, i) => (
              <div key={i} style={{ fontSize: 3, color: i === 0 ? '#fff' : '#555', padding: '1px 4px', background: i === 0 ? `${sc}20` : 'transparent', borderRadius: 2 }}>{tab}</div>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 3, color: '#444' }}>Timezone: UTC</div>
        </div>}
        <div style={{ flex: 1, display: 'flex', flexDirection: m ? 'column' : 'row' }}>
          <div style={{ flex: 3, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(2) }}>
            {[
              { time: '06:00', task: 'Daily competitor crawl', status: 'Completed', c: '#34d399', dur: '3m 42s', cron: '0 6 * * *' },
              { time: '12:00', task: 'Export CSV + push to S3', status: 'Pending', c: '#f59e0b', dur: '~45s', cron: '0 12 * * *' },
              { time: '18:00', task: 'Email digest to team', status: 'Queued', c: '#555', dur: '~10s', cron: '0 18 * * *' },
              { time: '00:00', task: 'Database cleanup + archive', status: 'Queued', c: '#555', dur: '~2m', cron: '0 0 * * *' },
            ].slice(0, m ? 2 : 4).map((job, i) => (
              <div key={i} style={{ background: '#0e0e0e', borderRadius: f(3), padding: f(3), border: `1px solid ${job.c === '#555' ? '#1a1a1a' : job.c + '25'}`, display: 'flex', alignItems: 'center', gap: f(4) }}>
                <div style={{ fontSize: f(6), color: job.c === '#555' ? '#444' : job.c, fontFamily: 'monospace', minWidth: f(16), flexShrink: 0, fontWeight: 600 }}>{job.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: f(5), color: '#ccc', marginBottom: f(1) }}>{job.task}</div>
                  {!m && <div style={{ display: 'flex', gap: 6, fontSize: 3, color: '#444' }}>
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
              <div style={{ fontSize: 4, color: '#555', marginBottom: 3 }}>Run History (7d)</div>
              <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 22 }}>
                {[4,4,3,4,4,2,4,4,4,3,4,4,1,4].map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {Array.from({ length: v }, (_, j) => (
                      <div key={j} style={{ height: 4, background: v < 3 ? '#f59e0b40' : '#34d39930', borderRadius: 1 }} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 3, color: '#333', marginTop: 2 }}>
                <span>Mon</span><span>Thu</span><span>Sun</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 4 }}>
              <div style={{ fontSize: 4, color: '#555', marginBottom: 3 }}>Stats</div>
              {[
                { l: 'Success rate', v: '96.4%', c: '#34d399' },
                { l: 'Avg duration', v: '2m 18s', c: '#888' },
                { l: 'Total runs', v: '52', c: '#888' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 4, marginBottom: 2 }}>
                  <span style={{ color: '#555' }}>{s.l}</span>
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

export function Overview() {
  const { isMobile, isTablet, isDesktop } = useScreenSize()
  const { selectedTenantId } = useTenant()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [livePreviewProject, setLivePreviewProject] = useState<string | null>(null)
  const [chatProject, setChatProject] = useState<string | null>(null)
  const [chatProjectBuildId, setChatProjectBuildId] = useState<string | null>(null)
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null)
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null)
  const [buildModalTab, setBuildModalTab] = useState<'chat' | 'details'>('chat')
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
  const [viewMode, setViewMode] = useState<'row' | 'card'>('row')
  const [hoveredArchBtn, setHoveredArchBtn] = useState<string | null>(null)
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
  const [activeView, setActiveView] = useState<'dashboard' | 'chats' | 'ideas'>('dashboard')
  const [selectedChatBuildId, setSelectedChatBuildId] = useState<string | null>(null)
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
    if (rawInput.trim().length < 12) {
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
    }, 800)
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

  const openClarifyWizard = useCallback(() => {
    setClarifyHistory([])
    setClarifyQuestion('')
    setClarifyOptions([])
    setClarifyDone(false)
    setClarifySummary('')
    setClarifyOtherText('')
    setShowClarifyModal(true)
    fetchClarifyQuestion(rawInput, [])
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
      builds: [
        { id: 'crawler', title: 'Crawler', summary: 'Fetch pipeline and retry handling', status: 'queued', progress: 12, stack: ['Claude', 'Claude Code', 'Perplexity'], agent: 'Crawler Agent', agentRole: 'Data Engineer', buildContext: 'backend' },
        { id: 'scheduler', title: 'Scheduler', summary: 'Daily export and email delivery', status: 'queued', progress: 0, stack: ['Mistral', 'n8n', 'Windsurf'], agent: 'Ops Agent', agentRole: 'DevOps Engineer', dependsOn: ['crawler'], buildContext: 'automation' },
      ],
    },
    {
      id: 'p4',
      name: 'Data Pipeline',
      goal: 'ETL pipeline for ingesting, transforming, and storing analytics data',
      status: 'failed',
      builds: [
        { id: 'ingestion', title: 'Ingestion Layer', summary: 'Stream connectors and batch import handlers', status: 'failed', progress: 38, stack: ['Claude', 'Claude Code', 'Kafka'], agent: 'Data Agent', agentRole: 'Data Engineer', buildContext: 'backend' },
        { id: 'transform', title: 'Transform Engine', summary: 'Data cleaning, normalization, and enrichment', status: 'queued', progress: 0, stack: ['GPT-4o', 'Claude Code'], agent: 'Transform Agent', agentRole: 'Data Engineer', dependsOn: ['ingestion'], buildContext: 'backend' },
      ],
    },
    {
      id: 'p5',
      name: 'User Portal',
      goal: 'Self-service portal for account management and billing',
      status: 'idle',
      builds: [
        { id: 'auth-flow', title: 'Auth Flow', summary: 'Login, signup, and session management', status: 'queued', progress: 0, stack: ['Claude', 'Lovable', 'Bolt'], agent: 'Auth Agent', agentRole: 'Security Engineer', buildContext: 'backend' },
        { id: 'billing-ui', title: 'Billing Dashboard', summary: 'Subscription management and invoice history', status: 'queued', progress: 0, stack: ['Claude', 'Replit', 'Stripe'], agent: 'UI Agent', agentRole: 'Frontend Designer', dependsOn: ['auth-flow'], buildContext: 'ui' },
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
    if (!selectedTenantId) return projects
    return projects.filter(p => p.id === selectedTenantId)
  }, [projects, selectedTenantId])

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
    muted: isDark ? '#6b7280' : '#556155',
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
  const [dismissedActionKeys, setDismissedActionKeys] = useState<Set<string>>(new Set())
  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const sectionHeader = (label: string, key: string, extra?: React.ReactNode) => (
    <div
      onClick={() => toggleSection(key)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ fontSize: 8, color: '#9ca3af', transform: collapsedSections[key] ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
      <span className="panel-header" style={{ color: '#6b7280' }}>{label}</span>
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
    { file: 'src/pipeline/ingestion.ts', line: 8, code: 'const stream = kafka.consumer({ groupId: "etl-group" })', projectId: 'p4' },
    { file: 'src/pipeline/transform.ts', line: 22, code: 'const cleaned = records.filter(r => r.valid).map(normalize)', projectId: 'p4' },
    { file: 'src/portal/auth.ts', line: 15, code: 'const session = await createSession(user.id, { ttl: 86400 })', projectId: 'p5' },
    { file: 'src/portal/billing.tsx', line: 31, code: 'const { subscription } = useStripeCustomer(userId)', projectId: 'p5' },
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
    { qa: 'warn' as const, content: '⚠ Kafka consumer lag detected — ingestion.ts', projectId: 'p4' },
    { qa: 'pass' as const, content: '✓ Auth session token validated successfully', projectId: 'p5' },
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
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, Arial, sans-serif', padding: 16 }}>
      <style>{`
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
        {!isDesktop && (
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 2 }}>
            <div style={{ width: 18, height: 2, background: '#6b7280' }} />
            <div style={{ width: 18, height: 2, background: '#6b7280' }} />
            <div style={{ width: 18, height: 2, background: '#6b7280' }} />
          </button>
        )}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, letterSpacing: 8, color: '#e8eaed', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>MASSA</span>
          <span style={{ background: '#34d399', color: '#080a0e', fontWeight: 800, fontSize: isMobile ? 12 : 14, padding: '2px 8px', borderRadius: 3, boxShadow: '0 0 12px rgba(52,211,153,0.3)', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>AI</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <TenantSelector />
          <span style={{ fontSize: 9, color: '#6b7280', fontFamily: '"JetBrains Mono", Menlo, monospace', display: isDesktop ? 'block' : 'none' }}>v2.4.1</span>
          <div style={{ width: 30, height: 30, borderRadius: 4, background: 'rgba(52,211,153,0.06)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: `1px solid rgba(52,211,153,0.15)`, fontSize: 12, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>M</div>
        </div>
      </div>

      {/* MOBILE NAV OVERLAY */}
      {!isDesktop && mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 260, height: '100%', background: '#0a0d10', border: `1px solid #1e2330`, padding: 16, overflowY: 'auto' }}>
            <div className="panel-header" style={{ color: '#9ca3af', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #1e2330' }}>SYS://NAV</div>
            {[
              { label: 'Dashboard', view: 'dashboard' as const, path: '/' },
              { label: 'Chats', view: 'chats' as const, path: '' },
              { label: 'Ideas', view: 'ideas' as const, path: '' },
              { label: 'History', view: null, path: '' },
              { label: 'Automations', view: null, path: '' },
              { label: 'Marketing', view: null, path: '' },
              { label: 'Skills', view: null, path: '' },
              { label: 'APIs', view: null, path: '' },
              { label: 'Web Scraper', view: null, path: '' },
              { label: 'Inside MASSA', view: null, path: '/inside' },
            ].map(item => {
              const active = item.view === activeView || (item.label === 'Dashboard' && activeView === 'dashboard')
              return (
              <div key={item.label}
                onClick={() => {
                  if (item.view) setActiveView(item.view)
                  if (item.path) navigate(item.path)
                  setMobileNavOpen(false)
                }}
                style={{ padding: '10px 10px', borderRadius: 0, cursor: 'pointer', color: active ? '#34d399' : '#9ca3af', fontSize: 12, fontWeight: active ? 600 : 500, borderLeft: active ? '2px solid #34d399' : '2px solid transparent', borderRight: active ? '1px solid #252a35' : '1px solid transparent', background: active ? 'rgba(52,211,153,0.04)' : 'transparent', marginBottom: 0, fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: '0.02em', borderBottom: '1px solid #1e2330' }}>
                {active && <span style={{ color: '#34d399', marginRight: 6, opacity: 0.7 }}>{'>'}</span>}{item.label}
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? (rightPanelCollapsed ? 'minmax(0, 1fr) 0px' : 'minmax(0, 1fr) 260px') : (rightPanelCollapsed ? '180px minmax(0, 1fr) 0px' : '180px minmax(0, 1fr) 260px'), gap: isMobile ? 12 : (rightPanelCollapsed ? '12px 0px' : 12), minHeight: 'calc(100vh - 96px)', transition: 'grid-template-columns 0.3s ease, gap 0.3s ease' }}>

        {/* LEFT SIDEBAR — hidden on mobile/tablet */}
        {isDesktop && <div style={{ border: `1px solid #1e2330`, background: '#0a0d10', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2 }}>
          <div>
            <div className="panel-header" style={{ color: '#9ca3af', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid #1e2330' }}>SYS://NAV</div>
            {[
              { label: 'Dashboard', view: 'dashboard' as const, path: '/' },
              { label: 'Chats', view: 'chats' as const, path: '' },
              { label: 'Ideas', view: 'ideas' as const, path: '' },
              { label: 'History', view: null, path: '' },
              { label: 'Automations', view: null, path: '' },
              { label: 'Marketing', view: null, path: '' },
              { label: 'Skills', view: null, path: '' },
              { label: 'APIs', view: null, path: '' },
              { label: 'Web Scraper', view: null, path: '' },
              { label: 'Inside MASSA', view: null, path: '/inside' },
            ].map(item => {
              const active = item.view ? activeView === item.view : false
              const clickable = item.view !== null || item.path !== ''
              return (
                <div key={item.label} onClick={() => {
                  if (item.view) { setActiveView(item.view) }
                  else if (item.path) { navigate(item.path) }
                }} style={{ padding: '10px 10px', borderRadius: 0, marginBottom: 0, background: active ? 'rgba(52,211,153,0.04)' : 'transparent', color: active ? '#34d399' : '#9ca3af', borderLeft: active ? '2px solid #34d399' : '2px solid transparent', borderRight: active ? '1px solid #252a35' : '1px solid transparent', fontSize: 12, fontWeight: active ? 600 : 500, cursor: clickable ? 'pointer' : 'default', transition: 'all 0.12s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', letterSpacing: '0.02em', borderBottom: '1px solid #1e2330' }}>
                  {active && <span style={{ color: '#34d399', marginRight: 6, opacity: 0.7 }}>{'>'}</span>}{item.label}
                </div>
              )
            })}
          </div>
        </div>}

        {/* CENTER + RIGHT AREA */}
        {activeView === 'chats' ? (
          <div style={{ gridColumn: isDesktop ? '2 / -1' : '1 / -1' }}>
            <ChatView
              projects={projects}
              selectedBuildId={selectedChatBuildId}
              onSelectBuild={setSelectedChatBuildId}
              messages={chatMessages}
              onMessagesChange={setChatMessages}
            />
          </div>
        ) : activeView === 'ideas' ? (
          <div style={{ gridColumn: isDesktop ? '2 / -1' : '1 / -1', border: `1px solid #1e2330`, background: '#0a0d10', padding: 16, overflow: 'auto', borderRadius: 2, minWidth: 0 }}>
            <IdeasView />
          </div>
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
                              color: step.active ? '#e8eaed' : '#6b7280',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px 8px', borderTop: '1px solid #1e2330' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onMouseEnter={() => setHoveredArchBtn('arch-build')}
                      onMouseLeave={() => setHoveredArchBtn(null)}
                      onClick={() => { if (vagueMode && rawInput.trim().length > 0) openClarifyWizard() }}
                      style={{ background: hoveredArchBtn === 'arch-build' ? '#141e14' : '#0c1210', color: '#34d399', border: `1px solid ${hoveredArchBtn === 'arch-build' ? 'rgba(52,211,153,0.4)' : 'rgba(52,211,153,0.15)'}`, padding: '5px 12px', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontSize: 10, fontFamily: '"JetBrains Mono", Menlo, monospace', boxShadow: hoveredArchBtn === 'arch-build' ? '0 0 16px rgba(52,211,153,0.1)' : 'none', transition: 'all 0.2s ease', letterSpacing: 0.3 }}>
                      <span style={{ marginRight: 5, opacity: 0.5 }}>▶</span>EXECUTE
                    </button>
                    <ModelTooltip text={getModelReason('Claude')}>
                      <div
                        onMouseEnter={() => setHoveredArchBtn('claude-rec')}
                        onMouseLeave={() => setHoveredArchBtn(null)}
                        style={{ border: '1px solid #1e2330', padding: '5px 10px', borderRadius: 4, color: '#9ca3af', background: hoveredArchBtn === 'claude-rec' ? '#0f1215' : '#0a0d10', fontSize: 9, cursor: 'default', transition: 'all 0.2s ease', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
                        <span style={{ color: '#9ca3af', marginRight: 4 }}>llm:</span>
                        <span style={{ color: '#6b7280' }}>sonnet-4.6</span>
                      </div>
                    </ModelTooltip>
                    <div style={{ position: 'relative' }}
                      onMouseEnter={() => setHoveredArchBtn('nebulous-tip')}
                      onMouseLeave={() => setHoveredArchBtn(null)}
                    >
                      <button
                        onClick={() => setVagueMode(v => !v)}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1e2330'; e.currentTarget.style.color = '#e8eaed' }}
                        onMouseLeave={e => { e.currentTarget.style.background = vagueMode ? 'rgba(52,211,153,0.06)' : '#0c0f14'; e.currentTarget.style.color = vagueMode ? '#34d399' : '#9ca3af' }}
                        style={{ padding: '5px 10px', borderRadius: 4, border: vagueMode ? '1px solid rgba(52,211,153,0.3)' : '1px solid #1e2330', background: vagueMode ? 'rgba(52,211,153,0.06)' : '#0c0f14', color: vagueMode ? '#34d399' : '#9ca3af', fontWeight: 600, fontSize: 9, cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', whiteSpace: 'nowrap' }}>nebulous mode</button>
                      {hoveredArchBtn === 'nebulous-tip' && (
                        <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, background: '#0f1215', border: '1px solid #252a35', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#9ca3af', width: 220, lineHeight: 1.5, boxShadow: '0 4px 16px rgba(0,0,0,0.6)', zIndex: 10, pointerEvents: 'none', fontFamily: '"JetBrains Mono", Menlo, monospace' }}>
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
                          <div className="panel-header" style={{ color: '#9ca3af', fontSize: 9 }}>AI SUGGESTIONS</div>
                          <div style={{ position: 'relative', display: 'inline-flex' }}
                            onMouseEnter={() => setShowSuggestionsTooltip(true)}
                            onMouseLeave={() => setShowSuggestionsTooltip(false)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'help', opacity: 0.7 }}>
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
                            <div key={`${i}-${s}`} onClick={() => { setRawInput(s); setIgnoredAll(true); setAiSuggestions([]) }}
                              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11.5, color: '#6b7280', background: '#080a0e', border: '1px solid #1e2330', borderRadius: 10, padding: '8px 10px 8px 14px', cursor: 'pointer', lineHeight: 1.5, transition: 'all 0.2s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', animation: `suggestion-slide-in 0.3s ease ${i * 0.06}s both` }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#141820'; e.currentTarget.style.borderColor = '#34d399'; e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.boxShadow = '0 0 12px rgba(52,211,153,0.08)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#080a0e'; e.currentTarget.style.borderColor = '#1e2330'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.boxShadow = 'none' }}>
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
              {/* View mode toggles */}
              <div style={{ display: 'flex', border: `1px solid ${c.border}`, borderRadius: 0, overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('row')}
                  title="Row view"
                  aria-label="Row view"
                  aria-pressed={viewMode === 'row'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 26, border: 'none', cursor: 'pointer', background: viewMode === 'row' ? 'rgba(52,211,153,0.04)' : 'transparent', color: viewMode === 'row' ? c.green : '#6b7280', borderRight: `1px solid ${c.border}`, transition: 'background 0.12s, color 0.12s', borderBottom: viewMode === 'row' ? '1px solid #34d399' : '1px solid transparent' }}>
                  <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                    <rect x="0" y="0" width="13" height="3" rx="0" fill="currentColor" />
                    <rect x="0" y="4" width="13" height="3" rx="0" fill="currentColor" />
                    <rect x="0" y="8" width="13" height="3" rx="0" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  title="Card view"
                  aria-label="Card view"
                  aria-pressed={viewMode === 'card'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 26, border: 'none', cursor: 'pointer', background: viewMode === 'card' ? 'rgba(52,211,153,0.04)' : 'transparent', color: viewMode === 'card' ? c.green : '#6b7280', transition: 'background 0.12s, color 0.12s', borderBottom: viewMode === 'card' ? '1px solid #34d399' : '1px solid transparent' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="0" y="0" width="5" height="5" rx="0" fill="currentColor" />
                    <rect x="7" y="0" width="5" height="5" rx="0" fill="currentColor" />
                    <rect x="0" y="7" width="5" height="5" rx="0" fill="currentColor" />
                    <rect x="7" y="7" width="5" height="5" rx="0" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Projects list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {filteredProjects.map((project, pi) => {
              const isSel = selectedProjectId === project.id
              const buildCards = (column: boolean, wrap = false) => (
                <div style={{ display: 'flex', flexDirection: column ? 'column' : 'row', gap: 16, ...(column ? {} : wrap ? { flexWrap: 'wrap' } : { paddingBottom: 6 }) }}>
                  {project.builds.map((build) => {
                    const sc = skillColor(build.stack)
                    const ps = primarySkill(build.stack)
                    const isRunning = build.status === 'running'
                    const isFailed = build.status === 'failed'
                    const isComplete = build.status === 'complete'
                    const isDragging = draggedBuild?.buildId === build.id
                    const isDragOver = dragOverId === build.id && draggedBuild?.buildId !== build.id
                    const bt = getBuildType(build.stack, build.title)
                    const statusText = getInlineStatus(build)

                    return (
                      <div key={build.id} draggable onDragStart={() => handleDragStart(build.id, project.id)} onDragOver={e => handleDragOver(e, build.id)} onDrop={e => handleDrop(e, build.id, project.id)} onDragEnd={handleDragEnd}
                        onClick={() => { setBuildModalTab('chat'); setExpandedBuildId(build.id) }}
                        style={{ ...(column ? { width: '100%' } : { minWidth: 176, maxWidth: 176, flexShrink: 0 }), border: `1px solid ${isDragOver ? sc : isFailed ? '#ff6b6b' : isComplete ? `${sc}30` : c.border}`, background: c.alt, borderRadius: 12, padding: 0, display: 'flex', flexDirection: column ? 'row' : 'column', alignItems: column ? 'center' : undefined, opacity: isDragging ? 0.4 : isComplete ? 0.65 : 1, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'opacity 0.2s, border 0.2s' }}>


                        {column ? (
                          <>
                            <div style={{ width: 50, flexShrink: 0, padding: 8, position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: sc, borderRadius: '12px 0 0 12px' }} />
                              <PreviewThumbnail buildId={build.id} buildType={bt} sc={sc} size="mini" />
                            </div>
                            <div style={{ flex: 1, padding: '8px 10px 8px 4px', display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{build.title}</div>
                                  <ModelTooltip text={getModelReason(ps, build.buildContext)}><span style={{ fontSize: 9, color: '#ffffff', fontWeight: 700, flexShrink: 0, cursor: 'default' }}>{ps}</span></ModelTooltip>
                                </div>
                                <div style={{ fontSize: 10, color: isRunning ? sc : isFailed ? '#f87171' : c.muted, fontStyle: isRunning ? 'italic' : 'normal' }}>{statusText}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                                <div style={{ width: 80, height: 3, background: isDark ? '#131619' : '#dfe8de', borderRadius: 999, overflow: 'hidden' }}>
                                  <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                                </div>
                                <span style={{ fontSize: 10, color: c.muted, minWidth: 28 }}>{build.progress}%</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedChatBuildId(build.id); setActiveView('chats') }}
                                title="Open chat"
                                style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, transition: 'color 0.15s, border-color 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.color = c.green; e.currentTarget.style.borderColor = c.green }}
                                onMouseLeave={e => { e.currentTarget.style.color = c.muted; e.currentTarget.style.borderColor = c.border }}
                              >💬</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <PreviewThumbnail buildId={build.id} buildType={bt} sc={sc} />
                            <div style={{ padding: '8px 10px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 4 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{build.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedChatBuildId(build.id); setActiveView('chats') }}
                                    title="Open chat"
                                    style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${c.border}`, background: 'transparent', color: c.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, padding: 0, transition: 'color 0.15s, border-color 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = c.green; e.currentTarget.style.borderColor = c.green }}
                                    onMouseLeave={e => { e.currentTarget.style.color = c.muted; e.currentTarget.style.borderColor = c.border }}
                                  >💬</button>
                                  <ModelTooltip text={getModelReason(ps, build.buildContext)}><span style={{ fontSize: 9, color: '#ffffff', fontWeight: 700, flexShrink: 0, cursor: 'default' }}>{ps}</span></ModelTooltip>
                                </div>
                              </div>
                              <div style={{ height: 3, background: isDark ? '#131619' : '#dfe8de', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                                <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                              </div>
                              <div style={{ fontSize: 10, color: isRunning ? sc : isFailed ? '#f87171' : c.muted, fontStyle: isRunning ? 'italic' : 'normal', lineHeight: 1.3, minHeight: 14 }}>{statusText}</div>
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
                  {viewMode === 'row' ? (
                    /* ── ROW VIEW (default) ── */
                    <div
                      style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px minmax(0, 1fr)', gap: 14, alignItems: 'start', position: 'relative', border: `1px solid ${c.border}`, borderRadius: 12, padding: isMobile ? 10 : 14, background: c.alt, overflow: 'hidden' }}>

                      <div onClick={() => setSelectedProjectId(project.id)} style={{ background: isSel ? c.blackGreen : 'transparent', borderRadius: 8, padding: '12px 12px 12px 0', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 1, background: isSel ? `${c.green}88` : 'transparent', borderRadius: '8px 0 0 8px' }} />
                        <div style={{ paddingLeft: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.1, color: '#e8eaed' }}>{project.name}</div>
                          </div>

                          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                            {project.builds.slice(0, 5).map(b => {
                              const sc = skillColor(b.stack)
                              const bt = getBuildType(b.stack, b.title)
                              return <PreviewThumbnail key={b.id} buildId={b.id} buildType={bt} sc={sc} size="mini" />
                            })}
                            {project.builds.length > 5 && <div style={{ width: 40, height: 28, borderRadius: 4, background: `${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: c.muted, fontWeight: 600 }}>+{project.builds.length - 5}</div>}
                          </div>

                          <div style={{ fontSize: 10, color: c.muted, marginBottom: 10 }}>
                            {project.builds.length} builds · {project.builds.filter(b => b.status === 'complete').length} done · {project.builds.filter(b => b.status === 'running').length} active
                          </div>

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={(e) => { e.stopPropagation(); setChatProject(project.id); setChatProjectBuildId(project.builds[0]?.id || null) }}
                              onMouseEnter={() => setHoveredArchBtn(project.id + '-chat')}
                              onMouseLeave={() => setHoveredArchBtn(null)}
                              style={{ flex: 1, border: `1px solid #1e2330`, background: hoveredArchBtn === project.id + '-chat' ? '#0f1215' : '#080a0e', color: '#9ca3af', padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s, color 0.15s' }}>
                              Chat
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setExpandedProject(expandedProject === project.id ? null : project.id) }}
                              onMouseEnter={() => setHoveredArchBtn(project.id)}
                              onMouseLeave={() => setHoveredArchBtn(null)}
                              style={{ flex: 1, border: `1px solid #1e2330`, background: hoveredArchBtn === project.id ? '#0f1215' : '#080a0e', color: '#9ca3af', padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s, color 0.15s' }}>
                              Arch Map
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setLivePreviewProject(livePreviewProject === project.id ? null : project.id) }}
                              onMouseEnter={() => setHoveredArchBtn(project.id + '-preview')}
                              onMouseLeave={() => setHoveredArchBtn(null)}
                              style={{ flex: 1, border: `1px solid #1e2330`, background: hoveredArchBtn === project.id + '-preview' ? '#0f1215' : '#080a0e', color: '#9ca3af', padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: '"JetBrains Mono", Menlo, monospace', transition: 'background 0.15s, color 0.15s' }}>
                              Preview
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', border: `1px dashed ${c.border}`, borderRadius: 8, overflow: 'hidden', marginTop: 8, background: 'transparent' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 0.15s', padding: '7px 10px', borderBottom: `1px dashed ${c.border}` }}
                              onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 24, height: 24, borderRadius: 999, border: `1.5px dashed #444`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <div style={{ fontSize: 13, color: '#777', lineHeight: 1 }}>+</div>
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Add Agent</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'background 0.15s', padding: '7px 10px' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 24, height: 24, borderRadius: 999, border: `1.5px dashed #444`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <div style={{ fontSize: 13, color: '#777', lineHeight: 1 }}>+</div>
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>New Task</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Builds strip (horizontal scroll) */}
                      <div style={{ minWidth: 0 }}>
                        <div className="panel-header" style={{ color: '#9ca3af', marginBottom: 7, fontSize: 9 }}>BUILDS</div>
                        <ScrollableBuildStrip arrowColor={c.muted} borderColor={c.border}>
                          {buildCards(false)}
                        </ScrollableBuildStrip>
                      </div>
                    </div>
                  ) : (
                    /* ── CARD VIEW ── */
                    <div onClick={() => setSelectedProjectId(project.id)}
                      style={{ border: `1px solid ${isSel ? c.green : c.border}`, borderRadius: 12, padding: 16, cursor: 'pointer', background: isSel ? c.blackGreen : c.alt, position: 'relative', overflow: 'hidden' }}>
                      {/* Left accent */}
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: isSel ? c.green : 'transparent', borderRadius: '12px 0 0 12px' }} />

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.1, color: '#e8eaed' }}>{project.name}</div>
                          {isSel && <span style={{ fontSize: 10, fontWeight: 700, color: c.green, background: c.greenSoft, border: `1px solid ${c.green}`, padding: '2px 6px', borderRadius: 999 }}>Active</span>}
                          <span style={{ fontSize: 10, color: c.muted }}>{project.builds.length} builds · {project.builds.filter(b => b.status === 'complete').length} done</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
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
                        </div>
                      </div>
                      {buildCards(false, true)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PANEL — Live Feed */}
        {!isMobile && rightPanelCollapsed && (
          <button
            onClick={() => setRightPanelCollapsed(false)}
            style={{
              position: 'fixed',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
              background: 'linear-gradient(135deg, #0a0f14 0%, #080a0e 100%)',
              border: `1px solid rgba(52,211,153,0.25)`,
              borderRight: 'none',
              borderRadius: '6px 0 0 6px',
              padding: '18px 10px',
              cursor: 'pointer',
              color: '#6ee7b7',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", Menlo, monospace',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'color 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s',
              letterSpacing: 1.2,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              boxShadow: '0 0 12px rgba(52,211,153,0.1), inset 0 0 8px rgba(52,211,153,0.04)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#34d399';
              e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #0d1a17 0%, #0a0f14 100%)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(52,211,153,0.2), inset 0 0 12px rgba(52,211,153,0.08)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#6ee7b7';
              e.currentTarget.style.borderColor = 'rgba(52,211,153,0.25)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #0a0f14 0%, #080a0e 100%)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(52,211,153,0.1), inset 0 0 8px rgba(52,211,153,0.04)';
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
            title="Show right panel"
          >
            <span style={{ fontSize: 18, writingMode: 'horizontal-tb', lineHeight: 1 }}>‹</span>
            <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>FEED</span>
          </button>
        )}
        {isMobile ? null :
        <div style={{
          border: rightPanelCollapsed ? 'none' : `1px solid #1e2330`,
          background: rightPanelCollapsed ? 'transparent' : '#0a0d10',
          padding: rightPanelCollapsed ? 0 : 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          overflow: 'hidden',
          borderRadius: 2,
          position: 'relative',
          opacity: rightPanelCollapsed ? 0 : 1,
          transition: 'opacity 0.3s ease, padding 0.3s ease',
          pointerEvents: rightPanelCollapsed ? 'none' : 'auto',
        }}>
          <button
            onClick={() => setRightPanelCollapsed(true)}
            style={{
              background: '#080a0e',
              border: '1px solid #1e2330',
              borderRadius: 4,
              padding: '5px 10px',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", Menlo, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              lineHeight: 1,
              transition: 'background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s',
              alignSelf: 'flex-end',
              marginBottom: -4,
              letterSpacing: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#0d1a17';
              e.currentTarget.style.color = '#34d399';
              e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(52,211,153,0.12)';
              e.currentTarget.style.transform = 'scale(1.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#080a0e';
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.borderColor = '#1e2330';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Collapse right panel"
          >
            HIDE <span style={{ fontSize: 12 }}>›</span>
          </button>

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
                    color: readyBuildsCount > 0 ? '#34d399' : '#6b7280',
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
                }, 280)
              } else {
                setDismissedActionKeys(prev => new Set(prev).add(`${itemId}:${actionType}`))
              }
            }

            return (
              <div style={{ border: '1px solid #1e2330', borderRadius: 4, background: '#080a0e', overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2330', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="panel-header" style={{ fontSize: 9, letterSpacing: 1.2 }}>ACTION REQUIRED</span>
                    {visibleSorted.length > 0 && <span style={{ fontSize: 9, color: '#f87171', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 700 }}>{visibleSorted.length}</span>}
                  </div>
                </div>
                <div style={{ maxHeight: 6 * 50, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#1e293b #080a0e' }}>
                  {visibleSorted.length === 0 ? (
                    <div style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, color: '#34d399', fontFamily: '"JetBrains Mono", Menlo, monospace', fontWeight: 600 }}>✓ All clear</span>
                      <div className="panel-header" style={{ color: '#6b7280', fontSize: 8, marginTop: 4 }}>NO ACTIONS PENDING</div>
                    </div>
                  ) : (
                    visibleSorted.map((item, idx) => (
                      <div
                        key={item.id}
                        data-action-item
                        data-action-key={`${item.id}:${item.action.type}`}
                        style={{
                          padding: '8px 12px',
                          borderTop: idx > 0 ? '1px solid #14181e' : 'none',
                          transition: 'all 0.25s ease',
                          overflow: 'hidden',
                          maxHeight: 60,
                          opacity: 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: '"JetBrains Mono", Menlo, monospace', lineHeight: 1.4 }}>{item.projectName}</div>
                            <div style={{ fontSize: 9, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: '"JetBrains Mono", Menlo, monospace', lineHeight: 1.4, marginTop: 2 }}>{item.title}</div>
                          </div>
                          <button
                            onClick={() => {
                              const el = document.querySelector(`[data-action-item][data-action-key="${item.id}:${item.action.type}"]`) as HTMLElement
                              setBuildModalTab(item.action.tab)
                              setExpandedBuildId(item.id)
                              dismissItem(item.id, item.action.type, el)
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1e2330'; e.currentTarget.style.color = '#e8eaed' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#0c0f14'; e.currentTarget.style.color = '#9ca3af' }}
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: '#9ca3af',
                              background: '#0c0f14',
                              border: '1px solid #1e2330',
                              borderRadius: 4,
                              padding: '4px 10px',
                              fontFamily: '"JetBrains Mono", Menlo, monospace',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              flexShrink: 0,
                            }}>{item.action.label}</button>
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
                    ))
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
                      <div style={{ fontSize: 10, color: pm.color, fontVariantNumeric: 'tabular-nums' }}>{entry.time} - {pm.label}</div>
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
                      <span style={{ color: isDark ? '#555' : '#aaa' }}>{line.file}:{line.lineNo} </span>
                      {renderCodeLine(line.content, isDark)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>}
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
                  {previewProject.id === 'p1' ? 'https://app.tradingbot.io' : previewProject.id === 'p2' ? 'https://massa.ai' : previewProject.id === 'p3' ? 'https://scraper.massa.ai' : previewProject.id === 'p4' ? 'https://pipeline.massa.ai' : 'https://portal.massa.ai'}
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
                    <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 10, border: `1px solid ${c.border}`, fontSize: 11, lineHeight: 1.8, color: '#888', overflow: 'hidden' }}>
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
                {previewProject.id === 'p4' && (
                  <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12, fontFamily: '"JetBrains Mono", monospace' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>PIPELINE STATUS</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>FAILED</div>
                        <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>Ingestion error</div>
                      </div>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>RECORDS PROCESSED</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>84,291</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Last 24h</div>
                      </div>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>THROUGHPUT</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>1.2k/s</div>
                        <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>Below target</div>
                      </div>
                    </div>
                    <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 10, border: `1px solid ${c.border}`, fontSize: 11, lineHeight: 1.8, color: '#888', overflow: 'hidden' }}>
                      <div><span style={{ color: '#f87171' }}>[ERR]</span> KafkaConsumerError: Connection refused to broker-3 <span style={{ color: '#9ca3af' }}>14:23:01</span></div>
                      <div><span style={{ color: '#f59e0b' }}>[WARN]</span> Consumer lag growing: partition 7 = 4,291 messages behind</div>
                      <div><span style={{ color: '#34d399' }}>[OK]</span> Transform batch #12847 completed — 512 records normalized</div>
                      <div><span style={{ color: '#f87171' }}>[ERR]</span> Retry 3/3 failed for broker-3, marking unhealthy</div>
                      <div><span style={{ color: '#60a5fa' }}>[INFO]</span> Failover initiated to broker-5</div>
                      <div><span style={{ color: '#34d399' }}>[OK]</span> Reconnected to broker-5 successfully</div>
                    </div>
                  </div>
                )}
                {previewProject.id === 'p5' && (
                  <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12, fontFamily: '"JetBrains Mono", monospace' }}>
                    <div style={{ background: '#111', borderRadius: 8, padding: 20, border: `1px solid ${c.border}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, letterSpacing: 3, color: c.muted, marginBottom: 8 }}>USER PORTAL</div>
                      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Sign In</div>
                      <div style={{ maxWidth: 280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: '#0a0d10', border: `1px solid ${c.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: c.muted, textAlign: 'left' }}>email@example.com</div>
                        <div style={{ background: '#0a0d10', border: `1px solid ${c.border}`, borderRadius: 6, padding: '10px 12px', fontSize: 12, color: c.muted, textAlign: 'left' }}>••••••••</div>
                        <div style={{ background: '#34d399', color: '#0a0d10', padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, marginTop: 4 }}>Sign In</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>REGISTERED USERS</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>0</div>
                        <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Not launched</div>
                      </div>
                      <div style={{ flex: 1, background: '#111', borderRadius: 8, padding: 12, border: `1px solid ${c.border}` }}>
                        <div style={{ fontSize: 10, color: c.muted, marginBottom: 6 }}>BILLING</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>—</div>
                        <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>Pending setup</div>
                      </div>
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
                          <div style={{ width: 5, height: 5, borderRadius: 99, background: agentReplied ? '#34d399' : bMsgs.length > 0 ? '#f59e0b' : '#6b7280', flexShrink: 0 }} />
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
                      <ModelTooltip text={getModelReason(primarySkill(activeBuild.stack), activeBuild.buildContext)}><span style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, cursor: 'default' }}>{primarySkill(activeBuild.stack)}</span></ModelTooltip>
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
                      onMouseLeave={e => { if (showAttachMenu !== 'projchat') e.currentTarget.style.color = '#555' }}
                      style={{ background: 'transparent', border: 'none', color: showAttachMenu === 'projchat' ? '#fff' : '#555', cursor: 'pointer', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
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
                            <span style={{ color: '#888', display: 'flex' }}>{item.icon}</span>
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
        <div onClick={() => { setExpandedBuildId(null); setChatInput('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(860px, 100%)', height: 'min(78vh, 640px)', background: c.panel, border: '1px solid #2a3040', borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            {(() => {
              const sc = skillColor(expandedBuild.build.stack)
              const ps = primarySkill(expandedBuild.build.stack)
              const msgs = chatMessages[expandedBuild.build.id] || []
              return (
                <>
                  <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <div style={{ fontWeight: 800, fontSize: 20 }}>{expandedBuild.build.title}</div>
                          {expandedBuild.build.status !== 'complete' && <StatusBadge status={expandedBuild.build.status} colors={c} size="lg" />}
                          <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 700, border: `1px solid ${sc}44`, padding: '2px 7px', borderRadius: 6, background: `${sc}14` }}>{ps}</span>
                        </div>
                        <div style={{ fontSize: 12, color: c.muted }}>{expandedBuild.project.name} · {expandedBuild.build.agent} ({expandedBuild.build.agentRole})</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setSelectedChatBuildId(expandedBuild.build.id); setExpandedBuildId(null); setActiveView('chats') }} onMouseEnter={e => e.currentTarget.style.background = '#1e2430'} onMouseLeave={e => e.currentTarget.style.background = '#151920'} style={{ border: `1px solid ${c.green}44`, background: '#151920', color: c.green, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s', whiteSpace: 'nowrap' }}>Open in Chats</button>
                        <button onClick={() => { setExpandedBuildId(null); setChatInput('') }} onMouseEnter={e => e.currentTarget.style.background = '#1e2430'} onMouseLeave={e => e.currentTarget.style.background = '#151920'} style={{ border: '1px solid #252a35', background: '#151920', color: '#ffffff', padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 6px rgba(0,0,0,0.35)', transition: 'background 0.15s' }}>Close</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 2, background: '#131619', borderRadius: 8, padding: 3, width: 'fit-content', marginBottom: 0 }}>
                      {(['chat', 'details'] as const).map(tab => (
                        <button key={tab} onClick={() => setBuildModalTab(tab)} style={{ border: 'none', background: buildModalTab === tab ? '#1e2430' : 'transparent', color: buildModalTab === tab ? '#e8eaed' : c.muted, padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'capitalize' }}>{tab}</button>
                      ))}
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
                                if (line.startsWith('```')) {
                                  return null
                                }
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
                            onMouseLeave={e => { if (showAttachMenu !== 'buildchat') e.currentTarget.style.color = '#555' }}
                            style={{ background: 'transparent', border: 'none', color: showAttachMenu === 'buildchat' ? '#fff' : '#555', cursor: 'pointer', padding: '6px', borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
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
                                  <span style={{ color: '#888', display: 'flex' }}>{item.icon}</span>
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
                  ) : (
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
                  )}
                </>
              )
            })()}
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
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, fontFamily: '"JetBrains Mono", Menlo, monospace' }}>{rawInput}</div>
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
                            style={{ fontSize: 12, color: '#6b7280', background: '#0c0f14', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', display: 'flex', alignItems: 'center', gap: 8 }}
                            onClick={() => {
                              const el = document.getElementById('clarify-other-input')
                              if (el) el.focus()
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#252a35'; e.currentTarget.style.color = '#9ca3af' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2330'; e.currentTarget.style.color = '#6b7280' }}>
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
                          style={{ fontSize: 12, color: '#6b7280', background: '#0c0f14', border: '1px solid #1e2330', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: '"JetBrains Mono", Menlo, monospace', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#141820'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)'; e.currentTarget.style.color = '#9ca3af' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#0c0f14'; e.currentTarget.style.borderColor = '#1e2330'; e.currentTarget.style.color = '#6b7280' }}>
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

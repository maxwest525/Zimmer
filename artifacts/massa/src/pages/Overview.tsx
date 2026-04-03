import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { InlineCompanyLogo } from '@/components/CompanyLogo'
import { NodeGraph } from '@/components/NodeGraph'
import { TimelineSwimlane } from '@/components/TimelineSwimlane'

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
}

type Project = {
  id: string
  name: string
  goal: string
  status: Status
  builds: Build[]
}

const SKILL_COLORS: Record<string, string> = {
  'n8n': '#7a9430',
  'Lovable': '#5080b8',
  'Replit': '#5080b8',
  'Claude Code': '#5aad58',
  'APIs': '#9a8030',
  'Claude': '#2d8a32',
}

function skillColor(stack: string[]): string {
  for (const s of ['n8n', 'Lovable', 'Replit', 'Claude Code', 'APIs']) {
    if (stack.includes(s)) return SKILL_COLORS[s]
  }
  return SKILL_COLORS['Claude']
}

function primarySkill(stack: string[]): string {
  for (const s of ['n8n', 'Lovable', 'Replit', 'Claude Code', 'APIs', 'Claude']) {
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
  thinking: { label: 'Thinking', color: '#7a6aad', desc: 'Claude is interpreting and planning the work' },
  building: { label: 'Building', color: '#2d8a32', desc: 'Claude Code is executing the build' },
  deploying: { label: 'Deploying', color: '#5080b8', desc: 'Lovable / Replit is rendering the interface' },
  done: { label: 'Complete', color: '#5aad58', desc: 'All builds finished successfully' },
  queued: { label: 'Queued', color: '#9a8030', desc: 'Waiting to start' },
}

function StatusBadge({ status, colors, size = 'sm' }: { status: Status; colors: Record<string, string>; size?: 'sm' | 'lg' }) {
  const fs = size === 'lg' ? 13 : 11
  const pad = size === 'lg' ? '5px 12px' : '3px 8px'
  if (status === 'running') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#ffffff', background: 'rgba(45,138,50,0.10)', border: '1px solid rgba(45,138,50,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#2d8a32', display: 'inline-block', flexShrink: 0 }} />
      Building
    </span>
  )
  if (status === 'queued') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#9a8030', background: 'rgba(154,128,48,0.10)', border: '1px solid rgba(154,128,48,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: '#9a8030', display: 'inline-block', flexShrink: 0 }} /> Pending
    </span>
  )
  if (status === 'complete') return null
  if (status === 'failed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs, color: '#b85858', background: 'rgba(184,88,88,0.10)', border: '1px solid rgba(184,88,88,0.25)', padding: pad, borderRadius: 999, fontWeight: 600 }}>✕ Failed</span>
  )
  return <span style={{ fontSize: fs, color: '#6a6d6a', background: 'rgba(106,109,106,0.08)', border: '1px solid rgba(106,109,106,0.15)', padding: pad, borderRadius: 999, fontWeight: 600 }}>Idle</span>
}

function getBuildType(stack: string[], title: string): 'ui' | 'backend' | 'database' | 'automation' {
  const t = title.toLowerCase()
  if (t.includes('ui') || t.includes('dashboard') || t.includes('homepage') || t.includes('site') || stack.includes('Lovable') || stack.includes('Replit')) return 'ui'
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
                <div style={{ width: 4, height: 4, borderRadius: 99, background: '#2d8a32' }} />
                <div style={{ fontSize: 3, color: '#888' }}>Live</div>
                <div style={{ width: 16, height: 5, borderRadius: 2, background: `${sc}30`, border: `1px solid ${sc}50` }} />
              </div>
            </>}
          </div>
          <div style={{ flex: 1, padding: f(4), display: 'flex', flexDirection: 'column', gap: f(3) }}>
            <div style={{ display: 'flex', gap: f(3) }}>
              {[
                { label: 'Total P&L', val: '+$12,840', c: '#2d8a32', delta: '+2.4%' },
                { label: 'Open Positions', val: '4', c: sc, delta: '' },
                { label: 'Win Rate', val: '68%', c: '#5080b8', delta: '+3.1%' },
                { label: 'Daily Volume', val: '$48.2K', c: '#9a8030', delta: '' },
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
                    <span style={{ fontSize: 5, fontWeight: 700, color: '#2d8a32' }}>$68,412</span>
                    <span style={{ fontSize: 3, color: '#2d8a32' }}>+1.8%</span>
                  </div>
                </div>
                <svg viewBox="0 0 140 40" style={{ width: '100%', flex: 1 }} preserveAspectRatio="none">
                  {[15,18,12,20,16,22,19,25,21,28,24,30,26,32,22,28,25,35,30,27,29,33,31,26,28].map((v, i) => {
                    const x = i * 5.5 + 2; const o = v - 3; const c2 = v + 2
                    const isGreen = c2 > o
                    return <g key={i}><line x1={x} y1={40-v+2} x2={x} y2={40-v-4} stroke={isGreen ? '#2d8a32' : '#b85858'} strokeWidth="0.4" /><rect x={x-1.2} y={40-Math.max(o,c2)} width="2.4" height={Math.abs(c2-o)||1} fill={isGreen ? '#2d8a3290' : '#b8585890'} /></g>
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
                    { pair: 'BTC/USD', side: 'Long', size: '0.5', pnl: '+$420', c: '#2d8a32' },
                    { pair: 'ETH/USD', side: 'Short', size: '2.0', pnl: '-$85', c: '#b85858' },
                    { pair: 'SOL/USD', side: 'Long', size: '15', pnl: '+$162', c: '#2d8a32' },
                    { pair: 'AVAX', side: 'Long', size: '40', pnl: '+$34', c: '#2d8a32' },
                  ].map((pos, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 4, marginBottom: 2, padding: '1px 0' }}>
                      <span style={{ color: '#999', minWidth: 20 }}>{pos.pair}</span>
                      <span style={{ color: pos.side === 'Long' ? '#2d8a3280' : '#b8585880', fontSize: 3, minWidth: 14 }}>{pos.side}</span>
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
                          <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${w}%`, background: '#2d8a3215', borderRadius: 1 }} />
                          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 3, padding: '0 1px' }}>
                            <span style={{ color: '#2d8a32' }}>{(68412 - i * 12).toLocaleString()}</span>
                            <span style={{ color: '#444' }}>{(w * 0.02).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      {[40,60,75,55,85].map((w, i) => (
                        <div key={i} style={{ position: 'relative', height: 4, marginBottom: 1 }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${w}%`, background: '#b8585815', borderRadius: 1 }} />
                          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 3, padding: '0 1px' }}>
                            <span style={{ color: '#b85858' }}>{(68424 + i * 12).toLocaleString()}</span>
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
            <div style={{ fontSize: 3.5, color: '#2d8a32' }}>0 errors</div>
            <div style={{ fontSize: 3.5, color: '#9a8030' }}>2 warnings</div>
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
            { label: 'Max Drawdown', val: '-2.5%', c: '#b85858' },
            { label: 'Position Limit', val: '$15,000', c: sc },
            { label: 'Risk Score', val: 'LOW', c: '#2d8a32' },
            ...(!m ? [{ label: 'Leverage', val: '3x', c: '#9a8030' }] : []),
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
                  { label: 'BTC', v: 85, c: '#9a8030' },
                  { label: 'ETH', v: 60, c: '#5080b8' },
                  { label: 'SOL', v: 40, c: '#7a6aad' },
                  { label: 'AVAX', v: 25, c: '#2d8a32' },
                  { label: 'LINK', v: 15, c: sc },
                ].map((bar, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <div style={{ width: '80%', height: `${bar.v}%`, background: bar.v > 70 ? `${bar.c}` : `${bar.c}80`, borderRadius: '1px 1px 0 0', border: bar.v > 70 ? '1px solid #b8585850' : 'none' }} />
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
                  <div style={{ width: 4, height: 4, borderRadius: 1, background: r.ok ? '#2d8a3240' : '#b8585840', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 3, color: r.ok ? '#2d8a32' : '#b85858' }}>{r.ok ? '✓' : '!'}</div>
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
            { icon: '⚡', title: 'BTC price crossed $68,400', desc: 'Triggered: Long entry signal on BTC/USDT', t: '2m ago', c: '#9a8030', channel: 'Slack + Email' },
            { icon: '✓', title: 'Order filled: Buy 0.5 ETH', desc: 'Limit order filled at $3,241.50 on Binance', t: '5m ago', c: '#2d8a32', channel: 'Slack' },
            { icon: '⚠', title: 'Risk: exposure at 85% of limit', desc: 'Total exposure $12,750 / $15,000 max', t: '8m ago', c: '#b85858', channel: 'Email + SMS' },
            { icon: '◷', title: 'Stop-loss moved to breakeven', desc: 'SOL/USDT position trailing stop updated', t: '12m ago', c: '#5080b8', channel: 'Slack' },
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
            { l: 'Total Return', v: '+34.2%', c: '#2d8a32' },
            { l: 'Sharpe Ratio', v: '1.82', c: sc },
            { l: 'Max Drawdown', v: '-8.1%', c: '#b85858' },
            ...(!m ? [{ l: 'Win Rate', v: '64%', c: '#5080b8' }] : []),
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
              {!m && <polyline fill="none" stroke="#b8585840" strokeWidth="0.5" strokeDasharray="2,2" points="0,30 6,30 12,28 18,29 24,27 30,28 36,26 42,27 48,25 54,24 60,25 66,23 72,24 78,22 84,21 90,22 96,20 102,19 108,18 114,17 120,16" />}
            </svg>
          </div>
          {!m && <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 3, border: '1px solid #1a1a1a', padding: 4 }}>
              <div style={{ fontSize: 4, color: '#555', marginBottom: 3 }}>Trade Log (Last 5)</div>
              {[
                { pair: 'BTC Long', result: '+4.2%', c: '#2d8a32' },
                { pair: 'ETH Short', result: '-1.1%', c: '#b85858' },
                { pair: 'SOL Long', result: '+2.8%', c: '#2d8a32' },
                { pair: 'BTC Short', result: '+1.5%', c: '#2d8a32' },
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
                {[5,8,-2,6,9,4].map((v,i) => <div key={i} style={{ flex: 1, height: Math.abs(v), background: v > 0 ? '#2d8a3260' : '#b8585860', borderRadius: '1px 1px 0 0' }} />)}
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
                <div style={{ fontSize: 4, color: '#999', background: 'transparent', border: '1px solid #333', padding: '3px 8px', borderRadius: 3 }}>Watch Demo</div>
              </div>}
            </div>
            {!m && <div style={{ width: 60, height: 45, background: '#0a0a0a', borderRadius: 4, border: '1px solid #1a1a1a', padding: 4, position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 3, color: '#444', marginBottom: 2 }}>Live Preview</div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                {[{ l: 'Agents', v: '4', c: sc }, { l: 'Builds', v: '12', c: '#5080b8' }].map((k, i) => (
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
                  <div style={{ width: 4, height: 4, borderRadius: 1, background: '#1a1a1a' }} />{t}
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
            { name: 'Binance', status: 'Connected', c: '#2d8a32', keys: '••••R4xK', latency: '42ms' },
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
                <div style={{ fontSize: 3, color: '#2d8a32', background: '#2d8a3215', padding: '1px 3px', borderRadius: 2 }}>Running</div>
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
                  <span>{stat.l}</span><span style={{ color: i === 2 ? '#2d8a32' : '#888' }}>{stat.v}</span>
                </div>
                <div style={{ height: 2, background: '#1a1a1a', borderRadius: 1 }}>
                  <div style={{ height: '100%', width: `${stat.pct}%`, background: i === 2 ? '#2d8a32' : sc, borderRadius: 1 }} />
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
              { pre: '  ✓ ', txt: 'Parsed 234 items, 12 new entries', c: '#2d8a32' },
              { pre: '  ✓ ', txt: 'Price deltas: 18 items changed (+4.2% avg)', c: '#9a8030' },
              { pre: '  → ', txt: 'GET /api/categories?page=1 (200 OK, 98ms)', c: sc },
              { pre: '  ✓ ', txt: 'Batch INSERT INTO products (412 rows, 89ms)', c: '#2d8a32' },
              { pre: '  → ', txt: 'GET /api/products?page=3 (200 OK, 131ms)', c: sc },
              { pre: '  ✓ ', txt: 'Dedup: 6 duplicates removed', c: '#555' },
              { pre: '', txt: '', c: '' },
              { pre: '[eta]  ', txt: 'Progress: 67% — est. 1m 14s remaining', c: '#5080b8' },
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
              { time: '06:00', task: 'Daily competitor crawl', status: 'Completed', c: '#2d8a32', dur: '3m 42s', cron: '0 6 * * *' },
              { time: '12:00', task: 'Export CSV + push to S3', status: 'Pending', c: '#9a8030', dur: '~45s', cron: '0 12 * * *' },
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
                      <div key={j} style={{ height: 4, background: v < 3 ? '#9a803040' : '#2d8a3230', borderRadius: 1 }} />
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
                { l: 'Success rate', v: '96.4%', c: '#2d8a32' },
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

export function Overview() {
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [expandedBuildId, setExpandedBuildId] = useState<string | null>(null)
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('trading-bot')
  const [draggedBuild, setDraggedBuild] = useState<{ buildId: string; projectId: string } | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'row' | 'card'>('row')
  const [hoveredArchBtn, setHoveredArchBtn] = useState<string | null>(null)
  const [archTab, setArchTab] = useState<'tree' | 'graph' | 'timeline'>('tree')
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [vagueMode, setVagueMode] = useState(false)
  const [showClarifyModal, setShowClarifyModal] = useState(false)
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({})
  const [, navigate] = useLocation()

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'trading-bot',
      name: 'Trading Bot',
      goal: 'Automated trading bot with dashboard, risk controls, and alerts',
      status: 'running',
      builds: [
        { id: 'core-engine', title: 'Core Engine', summary: 'Strategy loop, execution logic, and order handling', status: 'running', progress: 58, stack: ['Claude', 'Claude Code', 'APIs'], agent: 'System Builder', agentRole: 'Backend Architect' },
        { id: 'risk-module', title: 'Risk Module', summary: 'Position sizing, loss limits, and safety rules', status: 'running', progress: 46, stack: ['Claude', 'Claude Code'], agent: 'Risk Agent', agentRole: 'Safety Engineer', dependsOn: ['core-engine'] },
        { id: 'dashboard-ui', title: 'Dashboard UI', summary: 'Bot controls, positions, and performance views', status: 'queued', progress: 14, stack: ['Claude', 'Lovable'], agent: 'UI Agent', agentRole: 'Frontend Designer', dependsOn: ['core-engine', 'risk-module'] },
        { id: 'alerts', title: 'Alerts', summary: 'Slack, email, and critical event notifications', status: 'complete', progress: 100, stack: ['Claude', 'n8n', 'APIs'], agent: 'Ops Agent', agentRole: 'DevOps Engineer', dependsOn: ['core-engine'] },
        { id: 'backtester', title: 'Backtester', summary: 'Historical simulation engine and result reporter', status: 'queued', progress: 0, stack: ['Claude', 'Claude Code'], agent: 'Data Agent', agentRole: 'Data Engineer', dependsOn: ['core-engine'] },
      ],
    },
    {
      id: 'massa-site',
      name: 'Massa Marketing Site',
      goal: 'Homepage, funnel, API settings, and workflow pages',
      status: 'running',
      builds: [
        { id: 'homepage', title: 'Homepage', summary: 'Main marketing page and product explanation', status: 'running', progress: 71, stack: ['Claude', 'Lovable'], agent: 'UI Agent', agentRole: 'Frontend Designer' },
        { id: 'api-settings', title: 'API Settings', summary: 'Provider cards, keys, and connection states', status: 'queued', progress: 24, stack: ['Claude', 'Replit'], agent: 'Settings Agent', agentRole: 'Integration Engineer', dependsOn: ['homepage'] },
      ],
    },
    {
      id: 'scraper',
      name: 'Web Scraper',
      goal: 'Source intake, parsing, and scheduled export flow',
      status: 'queued',
      builds: [
        { id: 'crawler', title: 'Crawler', summary: 'Fetch pipeline and retry handling', status: 'queued', progress: 12, stack: ['Claude', 'Claude Code'], agent: 'Crawler Agent', agentRole: 'Data Engineer' },
        { id: 'scheduler', title: 'Scheduler', summary: 'Daily export and email delivery', status: 'queued', progress: 0, stack: ['Claude', 'n8n'], agent: 'Ops Agent', agentRole: 'DevOps Engineer', dependsOn: ['crawler'] },
      ],
    },
  ])

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
    bg: isDark ? '#060606' : '#f4f6f2',
    panel: isDark ? '#0d0d0d' : '#ffffff',
    alt: isDark ? '#111111' : '#f8fbf6',
    border: isDark ? '#1e1e1e' : '#d8e5d7',
    text: isDark ? '#f5f5f5' : '#101410',
    muted: isDark ? '#8c8f8c' : '#556155',
    green: isDark ? '#2d8a32' : '#1a7a18',
    greenSoft: isDark ? 'rgba(45,138,50,0.08)' : 'rgba(56,212,48,0.06)',
    blackGreen: isDark ? '#1a1a1a' : '#f0f0f0',
  }

  const readyBuildsCount = useMemo(
    () => selectedProject.builds.filter(b => b.status === 'queued').length,
    [selectedProject.builds]
  )

  const handleStartAll = () => {
    setProjects(cur => cur.map(p => {
      if (p.id !== selectedProjectId) return p
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
  type CodeLine = { id: number; kind: 'code' | 'qa'; content: string; file?: string; lineNo?: number; qa?: 'pass' | 'warn' }
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [flowHovered, setFlowHovered] = useState(false)
  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const sectionHeader = (label: string, key: string, extra?: React.ReactNode) => (
    <div
      onClick={() => toggleSection(key)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ fontSize: 8, color: '#ffffff', transform: collapsedSections[key] ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, color: '#ffffff' }}>{label}</span>
      {extra}
    </div>
  )
  const [codeLines, setCodeLines] = useState<CodeLine[]>([])
  const [codeHovered, setCodeHovered] = useState(false)
  const codeRef = useRef<HTMLDivElement>(null)
  const codeCounter = useRef(0)

  const CODE_POOL = [
    { file: 'src/engine/strategy.ts', line: 42, code: 'async function evaluateSignal(ctx: Context): Promise<Signal> {' },
    { file: 'src/engine/strategy.ts', line: 43, code: '  const price = await ctx.market.getLatestPrice(ctx.symbol)' },
    { file: 'src/risk/limits.ts', line: 17, code: 'if (exposure > MAX_EXPOSURE) throw new RiskError("limit exceeded")' },
    { file: 'src/api/client.ts', line: 88, code: 'const res = await fetch(`${BASE_URL}/v1/orders`, { method: "POST", body })' },
    { file: 'src/db/schema.ts', line: 5, code: 'export const orders = pgTable("orders", { id: serial("id").primaryKey(),' },
    { file: 'src/ui/Dashboard.tsx', line: 14, code: 'const { data, isLoading } = useQuery(["positions"], fetchPositions)' },
    { file: 'src/ui/Dashboard.tsx', line: 31, code: '  return <Chart series={data?.series ?? []} height={320} />' },
    { file: 'src/workers/scheduler.ts', line: 6, code: 'cron.schedule("0 9 * * 1-5", () => runDailyExport())' },
    { file: 'src/engine/backtest.ts', line: 77, code: 'const equity = positions.reduce((s, p) => s + p.unrealised, initialCapital)' },
    { file: 'src/scraper/crawler.ts', line: 23, code: 'const $ = cheerio.load(await axios.get(url).then(r => r.data))' },
    { file: 'src/notifications/slack.ts', line: 11, code: '// Send alert to #trading-alerts channel' },
    { file: 'src/notifications/slack.ts', line: 12, code: 'await slackClient.chat.postMessage({ channel, text: message })' },
    { file: 'src/engine/order.ts', line: 55, code: 'export type Order = { id: string; side: "buy" | "sell"; qty: number }' },
  ]
  const QA_POOL = [
    { qa: 'pass' as const, content: '✓ Unit test passed: strategy.evaluateSignal' },
    { qa: 'pass' as const, content: '✓ Type check: src/engine/order.ts — no errors' },
    { qa: 'pass' as const, content: '✓ Code review: logic approved by QA agent' },
    { qa: 'pass' as const, content: '✓ Lint: 0 warnings, 0 errors' },
    { qa: 'warn' as const, content: '⚠ Type mismatch on line 42 — Signal | undefined' },
    { qa: 'warn' as const, content: '⚠ Unused import: Logger in risk/limits.ts' },
    { qa: 'warn' as const, content: '⚠ Missing null check before API call on line 88' },
    { qa: 'pass' as const, content: '✓ Integration test: /v1/orders endpoint — 200 OK' },
    { qa: 'pass' as const, content: '✓ Schema migration dry-run succeeded' },
    { qa: 'warn' as const, content: '⚠ Bundle size increased by 4.2 kB — review imports' },
    { qa: 'pass' as const, content: '✓ Snapshot test: Dashboard renders correctly' },
  ]

  useEffect(() => {
    const tick = () => {
      codeCounter.current += 1
      const isQA = Math.random() < 0.3
      let entry: CodeLine
      if (isQA) {
        const q = QA_POOL[Math.floor(Math.random() * QA_POOL.length)]
        entry = { id: codeCounter.current, kind: 'qa', content: q.content, qa: q.qa }
      } else {
        const c = CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)]
        entry = { id: codeCounter.current, kind: 'code', content: c.code, file: c.file, lineNo: c.line }
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

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'Inter, Arial, sans-serif', padding: 16 }}>
      <style>{`
        @keyframes phase-pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 99px; }
      `}</style>

      {/* HEADER */}
      <div style={{ height: 60, border: `1px solid ${c.border}`, background: c.panel, display: 'flex', alignItems: 'center', padding: '0 18px', marginBottom: 12, position: 'relative' }}>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: 6, color: '#ffffff' }}>MASSA</span>
          <span style={{ background: c.green, color: '#081008', fontWeight: 800, fontSize: 20, padding: '3px 10px', borderRadius: 6 }}>AI</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: c.greenSoft, color: c.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: `1px solid ${c.border}`, fontSize: 13 }}>M</div>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div style={{ display: 'grid', gridTemplateColumns: rightPanelCollapsed ? '240px 1fr 0px' : '240px 1fr 300px', gap: rightPanelCollapsed ? '12px 0px' : 12, minHeight: 'calc(100vh - 96px)', transition: 'grid-template-columns 0.3s ease, gap 0.3s ease' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 2 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: c.muted, marginBottom: 10, fontWeight: 700 }}>NAVIGATION</div>
            {[
              { label: 'Dashboard', path: '/' },
              { label: 'History', path: '' },
              { label: 'Automations', path: '' },
              { label: 'Marketing', path: '' },
              { label: 'Skills', path: '' },
              { label: 'APIs', path: '' },
              { label: 'Web Scraper', path: '' },
              { label: 'Inside MASSA', path: '/inside' },
            ].map(item => {
              const active = item.label === 'Dashboard'
              return (
                <div key={item.label} onClick={() => item.path && navigate(item.path)} style={{ padding: '10px 11px', borderRadius: 8, marginBottom: 3, background: active ? c.greenSoft : 'transparent', color: active ? c.green : c.text, border: active ? `1px solid ${c.border}` : '1px solid transparent', fontSize: 14, fontWeight: active ? 600 : 400, cursor: item.path ? 'pointer' : 'default' }}>
                  {item.label}
                </div>
              )
            })}
          </div>
          <div>
            <div style={{ border: `1px solid ${c.border}`, background: c.blackGreen, borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, color: c.muted, marginBottom: 3 }}>Active Project</div>
              <div style={{ color: c.green, fontWeight: 700, fontSize: 13 }}>{selectedProject.name}</div>
            </div>
          </div>
        </div>

        {/* CENTER MAIN */}
        <div style={{ border: `1px solid ${c.border}`, background: c.panel, padding: 16, overflow: 'auto', borderRadius: 2 }}>

          {/* Pizza tracker — flow steps */}
          {(() => {
            const flowSteps = [
              { label: 'Prompt', active: true },
              { label: 'Enhance', active: true },
              { label: 'Build', active: selectedProject.builds.some(b => b.status !== 'idle') },
              { label: 'Deploy', active: selectedProject.builds.every(b => b.status === 'complete') },
            ]
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 30px 20px', position: 'relative' }}>
                {/* connecting line */}
                <div style={{ position: 'absolute', left: 19, right: 19, top: 18, height: 2, background: c.border, zIndex: 0 }} />
                {flowSteps.map((step, i) => (
                  <div key={step.label} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 999,
                      border: `1.5px solid ${step.active ? c.green : '#2e2e2e'}`,
                      background: '#060606',
                      color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 11, color: '#ffffff', fontWeight: step.active ? 600 : 400 }}>{step.label}</div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Input area */}
          {(() => {
            const suggestions = rawInput.trim().length > 10 ? [
              rawInput.length < 60
                ? `${rawInput.trim()} — with React frontend, Node.js backend, PostgreSQL, REST API, and deployment via Replit`
                : rawInput.trim().replace(/\.$/, '') + ', structured as modular builds with clear agent routing per layer',
              'Scope into 3 parallel builds: UI agent (Lovable), backend agent (Claude Code), and integration agent (n8n) — optimized for speed',
            ] : []

            return (
              <div style={{ border: `1px solid #2a2a2a`, background: '#0e0e0e', borderRadius: 12, padding: 16, marginBottom: 12, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.2, color: '#ffffff', fontWeight: 700 }}>Ask us for anything</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {rawInput.trim().length > 0 && <div style={{ fontSize: 10, color: c.muted }}>{rawInput.length} chars</div>}
                    <div style={{ width: 6, height: 6, borderRadius: 999, background: c.green }} />
                  </div>
                </div>
                <textarea
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  placeholder="Describe what you want to build. Be as specific or as vague as you want — MASSA will handle the rest."
                  style={{ width: '100%', minHeight: 90, background: 'transparent', border: 'none', outline: 'none', color: '#ffffff', fontSize: 14, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                {suggestions.length > 0 && (
                  <div style={{ borderTop: `1px solid #1e1e1e`, marginTop: 10, paddingTop: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: c.muted, marginBottom: 6 }}>MASSA SUGGESTS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {suggestions.map((s, i) => (
                        <div key={i} onClick={() => setRawInput(s)}
                          style={{ fontSize: 11, color: '#a0a0a0', background: '#151515', border: `1px solid #252525`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', lineHeight: 1.5, transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#151515')}>
                          <span style={{ color: c.green, fontWeight: 700, marginRight: 5 }}>+</span>{s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}


          {/* Action bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
            <button
              onMouseEnter={() => setHoveredArchBtn('arch-build')}
              onMouseLeave={() => setHoveredArchBtn(null)}
              onClick={() => { if (vagueMode && rawInput.trim().length > 0) setShowClarifyModal(true) }}
              style={{ background: hoveredArchBtn === 'arch-build' ? '#242424' : '#1a1a1a', color: '#ffffff', border: '1px solid #2e2e2e', padding: '9px 18px', borderRadius: 9, fontWeight: 700, cursor: 'pointer', fontSize: 13, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>Build and Run Prompt</button>
            <div
              onMouseEnter={() => setHoveredArchBtn('claude-rec')}
              onMouseLeave={() => setHoveredArchBtn(null)}
              style={{ border: '1px solid #2e2e2e', padding: '9px 12px', borderRadius: 9, color: c.text, background: hoveredArchBtn === 'claude-rec' ? '#242424' : '#1a1a1a', fontSize: 12, cursor: 'default', boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>LLM: Sonnet 4.6 (Claude)</div>
            {/* Vague mode toggle */}
            <button
              onClick={() => setVagueMode(v => !v)}
              title={vagueMode ? 'Vague mode on — MASSA will ask clarifying questions' : 'Enable vague mode to get clarifying questions'}
              style={{ width: 32, height: 32, borderRadius: 999, border: vagueMode ? `1px solid ${c.green}` : '1px solid #2e2e2e', background: vagueMode ? c.greenSoft : '#1a1a1a', color: vagueMode ? c.green : c.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>?</button>
          </div>

          {/* Projects header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.1, color: c.muted, fontWeight: 700 }}>PROJECTS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* View mode toggles */}
              <div style={{ display: 'flex', border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <button
                  onClick={() => setViewMode('row')}
                  title="Row view"
                  aria-label="Row view"
                  aria-pressed={viewMode === 'row'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 26, border: 'none', cursor: 'pointer', background: viewMode === 'row' ? c.greenSoft : 'transparent', color: viewMode === 'row' ? c.green : c.muted, borderRight: `1px solid ${c.border}`, transition: 'background 0.15s, color 0.15s' }}>
                  {/* Row icon: three horizontal lines */}
                  <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                    <rect x="0" y="0" width="13" height="3" rx="1" fill="currentColor" />
                    <rect x="0" y="4" width="13" height="3" rx="1" fill="currentColor" />
                    <rect x="0" y="8" width="13" height="3" rx="1" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  title="Card view"
                  aria-label="Card view"
                  aria-pressed={viewMode === 'card'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 26, border: 'none', cursor: 'pointer', background: viewMode === 'card' ? c.greenSoft : 'transparent', color: viewMode === 'card' ? c.green : c.muted, transition: 'background 0.15s, color 0.15s' }}>
                  {/* Grid icon: 2x2 squares */}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="0" y="0" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="7" y="0" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="0" y="7" width="5" height="5" rx="1" fill="currentColor" />
                    <rect x="7" y="7" width="5" height="5" rx="1" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Projects list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {projects.map((project, pi) => {
              const isSel = selectedProjectId === project.id
              const buildCards = (column: boolean, wrap = false) => (
                <div style={{ display: 'flex', flexDirection: column ? 'column' : 'row', gap: 10, ...(column ? {} : wrap ? { flexWrap: 'wrap' } : { overflowX: 'auto', paddingBottom: 6 }) }}>
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
                        onClick={() => setExpandedBuildId(build.id)}
                        style={{ ...(column ? { width: '100%' } : { minWidth: 176, maxWidth: 176, flexShrink: 0 }), border: `1px solid ${isDragOver ? sc : isFailed ? '#ff6b6b' : isComplete ? `${sc}30` : c.border}`, background: c.alt, borderRadius: 12, padding: 0, display: 'flex', flexDirection: column ? 'row' : 'column', alignItems: column ? 'center' : undefined, opacity: isDragging ? 0.4 : isComplete ? 0.65 : 1, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'opacity 0.2s, border 0.2s' }}>

                        {isComplete && (
                          <div style={{ position: 'absolute', top: column ? 6 : 6, right: 6, width: 16, height: 16, borderRadius: 999, background: `${sc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                            <span style={{ fontSize: 9, color: sc }}>✓</span>
                          </div>
                        )}

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
                                  <span style={{ fontSize: 9, color: '#ffffff', fontWeight: 700, border: `1px solid ${sc}99`, padding: '1px 5px', borderRadius: 4, background: `${sc}12`, flexShrink: 0 }}>{ps}</span>
                                </div>
                                <div style={{ fontSize: 10, color: isRunning ? sc : isFailed ? '#b85858' : c.muted, fontStyle: isRunning ? 'italic' : 'normal' }}>{statusText}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                                <div style={{ width: 80, height: 3, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden' }}>
                                  <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                                </div>
                                <span style={{ fontSize: 10, color: c.muted, minWidth: 28 }}>{build.progress}%</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <PreviewThumbnail buildId={build.id} buildType={bt} sc={sc} />
                            <div style={{ padding: '8px 10px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 4 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{build.title}</div>
                                <span style={{ fontSize: 9, color: '#ffffff', fontWeight: 700, border: `1px solid ${sc}99`, padding: '1px 5px', borderRadius: 4, background: `${sc}12`, flexShrink: 0 }}>{ps}</span>
                              </div>
                              <div style={{ height: 3, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                                <div style={{ width: `${build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                              </div>
                              <div style={{ fontSize: 10, color: isRunning ? sc : isFailed ? '#b85858' : c.muted, fontStyle: isRunning ? 'italic' : 'normal', lineHeight: 1.3, minHeight: 14 }}>{statusText}</div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Add agent */}
                  <div style={{ ...(column ? { width: '100%', height: 40, flexDirection: 'row', justifyContent: 'center' } : { minWidth: 90, height: 148, flexDirection: 'column', flexShrink: 0 }), border: `1px dashed ${c.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: c.muted, background: 'transparent', cursor: 'pointer' }}>
                    <div style={{ fontSize: 16, lineHeight: 1 }}>+</div>
                    <div style={{ fontSize: 11 }}>Add Agent</div>
                  </div>
                </div>
              )

              return (
                <div key={project.id}>
                  {viewMode === 'row' ? (
                    /* ── ROW VIEW (default) ── */
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14, alignItems: 'start', position: 'relative', border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, background: c.alt }}>

                      <div onClick={() => setSelectedProjectId(project.id)} style={{ background: isSel ? c.blackGreen : 'transparent', borderRadius: 8, padding: '12px 12px 12px 0', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 1, background: isSel ? `${c.green}88` : 'transparent', borderRadius: '8px 0 0 8px' }} />
                        <div style={{ paddingLeft: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.1, color: '#ffffff' }}>{project.name}</div>
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

                          <button onClick={(e) => { e.stopPropagation(); setExpandedProject(expandedProject === project.id ? null : project.id) }}
                            onMouseEnter={() => setHoveredArchBtn(project.id)}
                            onMouseLeave={() => setHoveredArchBtn(null)}
                            style={{ width: '100%', border: `1px solid #2e2e2e`, background: hoveredArchBtn === project.id ? '#242424' : '#1a1a1a', color: '#ffffff', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>
                            {expandedProject === project.id ? 'Close Map' : 'Architecture Map'}
                          </button>
                        </div>
                      </div>

                      {/* Builds strip (horizontal scroll) */}
                      <div>
                        <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 7 }}>BUILDS</div>
                        {buildCards(false)}
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
                          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.1, color: '#ffffff' }}>{project.name}</div>
                          {isSel && <span style={{ fontSize: 10, fontWeight: 700, color: c.green, background: c.greenSoft, border: `1px solid ${c.green}`, padding: '2px 6px', borderRadius: 999 }}>Active</span>}
                          <span style={{ fontSize: 10, color: c.muted }}>{project.builds.length} builds · {project.builds.filter(b => b.status === 'complete').length} done</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setExpandedProject(expandedProject === project.id ? null : project.id) }}
                          onMouseEnter={() => setHoveredArchBtn(project.id + '-card')}
                          onMouseLeave={() => setHoveredArchBtn(null)}
                          style={{ border: `1px solid #2e2e2e`, background: hoveredArchBtn === project.id + '-card' ? '#242424' : '#1a1a1a', color: '#ffffff', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>
                          {expandedProject === project.id ? 'Close Map' : 'Architecture Map'}
                        </button>
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
        {rightPanelCollapsed && (
          <button
            onClick={() => setRightPanelCollapsed(false)}
            style={{
              position: 'fixed',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
              background: c.panel,
              border: `1px solid ${c.border}`,
              borderRight: 'none',
              borderRadius: '8px 0 0 8px',
              padding: '16px 8px',
              cursor: 'pointer',
              color: c.text,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'color 0.15s, border-color 0.15s',
              letterSpacing: 1,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = c.green; e.currentTarget.style.borderColor = c.green }}
            onMouseLeave={e => { e.currentTarget.style.color = c.text; e.currentTarget.style.borderColor = c.border }}
            title="Show right panel"
          >
            <span style={{ fontSize: 14, writingMode: 'horizontal-tb' }}>‹</span>
            <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>FEED</span>
          </button>
        )}
        <div style={{
          border: rightPanelCollapsed ? 'none' : `1px solid ${c.border}`,
          background: rightPanelCollapsed ? 'transparent' : c.panel,
          padding: rightPanelCollapsed ? 0 : 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
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
              background: '#1a1a1a',
              border: '1px solid #2e2e2e',
              borderRadius: 9,
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              lineHeight: 1,
              transition: 'background 0.15s',
              alignSelf: 'flex-end',
              marginBottom: -4,
              letterSpacing: 0.5,
              boxShadow: '3px 3px 8px rgba(0,0,0,0.45)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#242424'}
            onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
            title="Collapse right panel"
          >
            HIDE <span style={{ fontSize: 14 }}>›</span>
          </button>

          {/* Ready Builds KPI */}
          <div style={{ border: `1px solid ${c.border}`, background: c.alt, borderRadius: 12, padding: 12 }}>
            {sectionHeader('READY BUILDS', 'readyBuilds')}
            {!collapsedSections.readyBuilds && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: readyBuildsCount > 0 ? '#9a8030' : c.text, lineHeight: 1 }}>{readyBuildsCount}</span>
                    <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 500 }}>queued</span>
                  </div>
                </div>
                <button
                  onClick={handleStartAll}
                  disabled={readyBuildsCount === 0}
                  onMouseEnter={e => { if (readyBuildsCount > 0) e.currentTarget.style.background = '#242424' }}
                  onMouseLeave={e => { if (readyBuildsCount > 0) e.currentTarget.style.background = '#1a1a1a' }}
                  style={{
                    background: readyBuildsCount > 0 ? '#1a1a1a' : (isDark ? '#1e1e1e' : '#e8e8e8'),
                    color: readyBuildsCount > 0 ? '#9a8030' : c.muted,
                    border: `1px solid ${readyBuildsCount > 0 ? '#2e2e2e' : c.border}`,
                    borderRadius: 9,
                    padding: '7px 13px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: readyBuildsCount > 0 ? 'pointer' : 'default',
                    letterSpacing: 0.3,
                    transition: 'background 0.15s',
                    whiteSpace: 'nowrap',
                    boxShadow: readyBuildsCount > 0 ? '3px 3px 8px rgba(0,0,0,0.45)' : 'none',
                  }}
                >
                  Start All
                </button>
              </div>
            )}
          </div>

          {/* FLOW Metrics Panel */}
          {(() => {
            const allBuilds = projects.flatMap(p => p.builds)
            const totalProjects = projects.length
            const runningBuilds = allBuilds.filter(b => b.status === 'running').length
            const completedBuilds = allBuilds.filter(b => b.status === 'complete').length
            const queuedBuilds = allBuilds.filter(b => b.status === 'queued').length
            const failedBuilds = allBuilds.filter(b => b.status === 'failed').length

            const kpis: { label: string; value: number; color: string; bg: string }[] = [
              { label: 'Total Projects', value: totalProjects, color: c.text, bg: c.alt },
              { label: 'Running', value: runningBuilds, color: '#2d8a32', bg: c.greenSoft },
              { label: 'Completed', value: completedBuilds, color: '#5080b8', bg: 'rgba(80,128,184,0.06)' },
              { label: 'Queued', value: queuedBuilds, color: '#9a8030', bg: 'rgba(154,128,48,0.06)' },
              { label: 'Failed', value: failedBuilds, color: '#b85858', bg: 'rgba(184,88,88,0.06)' },
            ]

            return (
              <div>
                {sectionHeader('FLOW', 'flow')}
                {!collapsedSections.flow && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      onMouseEnter={() => setFlowHovered(true)}
                      onMouseLeave={() => setFlowHovered(false)}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}
                    >
                      {kpis.map(kpi => (
                        <div key={kpi.label} style={{ background: kpi.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: '#ffffff', marginBottom: 3 }}>{kpi.label.toUpperCase()}</div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden', maxHeight: flowHovered ? 500 : 0, opacity: flowHovered ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.25s ease' }}>
                      {projects.map(p => {
                        const running = p.builds.filter(b => b.status === 'running').length
                        const done = p.builds.filter(b => b.status === 'complete').length
                        const queued = p.builds.filter(b => b.status === 'queued').length
                        const failed = p.builds.filter(b => b.status === 'failed').length
                        const parts: string[] = []
                        if (running > 0) parts.push(`${running} running`)
                        if (done > 0) parts.push(`${done} done`)
                        if (queued > 0) parts.push(`${queued} queued`)
                        if (failed > 0) parts.push(`${failed} failed`)
                        return (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: c.alt, borderRadius: 7, border: `1px solid ${c.border}` }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>{p.name}</span>
                            <span style={{ fontSize: 10, color: c.muted, flexShrink: 0 }}>{parts.join(', ') || 'no builds'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Build Activity Feed */}
          <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: collapsedSections.buildActivity ? 'none' : `1px solid ${c.border}` }}>
              {sectionHeader('BUILD ACTIVITY', 'buildActivity')}
            </div>
            {!collapsedSections.buildActivity && (
              <div
                ref={feedRef}
                onMouseEnter={() => setFeedHovered(true)}
                onMouseLeave={() => setFeedHovered(false)}
                style={{ position: 'relative', height: 210, overflowY: 'auto', scrollBehavior: 'smooth', padding: '8px 0 4px' }}
              >
                <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: 28, background: `linear-gradient(to bottom, ${isDark ? '#0d0d0d' : '#ffffff'} 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 1 }} />
                {feedEntries.map(entry => {
                  const pm = PHASE_META[entry.phase]
                  return (
                    <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 12px', borderBottom: `1px solid ${c.border}33` }}>
                      <span style={{ fontSize: 10, color: c.muted, fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginTop: 1 }}>{entry.time}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: pm.color, background: `${pm.color}18`, border: `1px solid ${pm.color}44`, padding: '1px 6px', borderRadius: 999, flexShrink: 0, alignSelf: 'center' }}>{pm.label}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.buildName}</div>
                        <div style={{ fontSize: 10, color: c.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.agent} — {entry.status}</div>
                      </div>
                    </div>
                  )
                })}
                {feedEntries.length === 0 && (
                  <div style={{ padding: '12px', fontSize: 12, color: c.muted }}>Waiting for activity…</div>
                )}
              </div>
            )}
          </div>

          {/* Code Stream */}
          <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, display: 'flex', flexDirection: 'column', flex: collapsedSections.codeStream ? 'none' : 1, minHeight: 0 }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: collapsedSections.codeStream ? 'none' : `1px solid ${c.border}` }}>
              {sectionHeader('CODE STREAM', 'codeStream', <span style={{ width: 6, height: 6, borderRadius: 999, background: '#2d8a32', display: 'inline-block' }} />)}
            </div>
            {!collapsedSections.codeStream && (
              <div
                ref={codeRef}
                onMouseEnter={() => setCodeHovered(true)}
                onMouseLeave={() => setCodeHovered(false)}
                style={{ flex: 1, overflowY: 'auto', background: isDark ? '#1a1a1a' : '#f0f0f0', padding: '8px 0 4px', fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace', fontSize: 11, scrollBehavior: 'smooth', minHeight: 0 }}
              >
                <div style={{ position: 'sticky', top: 0, left: 0, right: 0, height: 28, background: `linear-gradient(to bottom, ${isDark ? '#1a1a1a' : '#f0f0f0'} 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 1 }} />
                {codeLines.map(line => {
                  if (line.kind === 'qa') {
                    const isPass = line.qa === 'pass'
                    return (
                      <div key={line.id} style={{ padding: '3px 12px', color: isPass ? '#5aad58' : '#b8801a', lineHeight: 1.5 }}>
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
        </div>
      </div>

      {/* ARCHITECTURE MAP MODAL */}
      {expandedProject && expandProject && (
        <div onClick={() => setExpandedProject(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(900px, 100%)', maxHeight: '82vh', background: c.panel, border: '1px solid #333', borderRadius: 18, padding: 24, overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>ARCHITECTURE MAP</div>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>{expandProject.name}</div>
                <div style={{ color: c.muted, fontSize: 13 }}>{expandProject.goal}</div>
              </div>
              <button onClick={() => setExpandedProject(null)} onMouseEnter={e => e.currentTarget.style.background = '#242424'} onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'} style={{ border: '1px solid #2e2e2e', background: '#1a1a1a', color: '#ffffff', padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>Close</button>
            </div>

            <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: isDark ? '#111' : '#eee', borderRadius: 8, padding: 3, width: 'fit-content' }}>
              {(['tree', 'graph', 'timeline'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setArchTab(tab)}
                  style={{
                    border: 'none',
                    background: archTab === tab ? (isDark ? '#2a2a2a' : '#fff') : 'transparent',
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
              const treeData: Record<string, { label: string; children: { label: string; children?: string[] }[] }> = {
                'trading-bot': {
                  label: 'Trading Bot',
                  children: [
                    { label: 'Backend', children: ['Core Engine', 'Risk Module', 'Exchange / API Logic'] },
                    { label: 'Interface', children: ['Dashboard UI'] },
                    { label: 'Operations', children: ['Alerts', 'Backtester', 'Monitoring'] },
                  ]
                },
                'massa-site': {
                  label: 'Massa Marketing Site',
                  children: [
                    { label: 'Pages', children: ['Homepage', 'Pricing', 'Documentation'] },
                    { label: 'Infrastructure', children: ['API Settings', 'Auth Flow'] },
                  ]
                },
                'scraper': {
                  label: 'Web Scraper',
                  children: [
                    { label: 'Pipeline', children: ['Crawler', 'Parser', 'Data Store'] },
                    { label: 'Operations', children: ['Scheduler', 'Email Export'] },
                  ]
                },
              }
              const tree = treeData[expandProject.id] || { label: expandProject.name, children: expandProject.builds.map(b => ({ label: b.title })) }
              const buildTitles = expandProject.builds.map(b => b.title)
              const getNodeColor = (label: string) => {
                const matchBuild = expandProject.builds.find(b => b.title === label)
                if (matchBuild) return skillColor(matchBuild.stack)
                return c.muted
              }
              const getStatus = (label: string) => {
                const matchBuild = expandProject.builds.find(b => b.title === label)
                if (!matchBuild) return null
                return matchBuild.status
              }
              return (
                <div style={{ display: 'flex', gap: 30, alignItems: 'flex-start' }}>
                  <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 14, minWidth: 200, background: c.alt }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{tree.label}</div>
                    <div style={{ color: c.muted, fontSize: 13 }}>{expandProject.goal}</div>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 2, fontFamily: 'monospace' }}>
                    {tree.children.map((group, gi) => {
                      const isLast = gi === tree.children.length - 1
                      const prefix = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '
                      const childPrefix = isLast ? '    ' : '\u2502   '
                      return (
                        <div key={gi}>
                          <div style={{ color: '#ccc', fontWeight: 600 }}>
                            <span style={{ color: c.muted }}>{prefix}</span>{group.label}
                          </div>
                          {group.children?.map((child, ci) => {
                            const isChildLast = ci === (group.children?.length || 0) - 1
                            const cPrefix = isChildLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 '
                            const nodeColor = getNodeColor(child)
                            const status = getStatus(child)
                            const isBuild = buildTitles.includes(child)
                            return (
                              <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: c.muted }}>{childPrefix}{cPrefix}</span>
                                <span style={{ color: isBuild ? nodeColor : '#888', fontWeight: isBuild ? 600 : 400, cursor: isBuild ? 'pointer' : 'default' }}
                                  onClick={() => { if (isBuild) { const b = expandProject.builds.find(b => b.title === child); if (b) { setExpandedBuildId(b.id); setExpandedProject(null) } } }}
                                >{child}</span>
                                {status && (
                                  <span style={{ fontSize: 10, color: status === 'complete' ? c.green : status === 'running' ? '#5080b8' : '#555', fontWeight: 600 }}>
                                    {status === 'complete' ? 'done' : status === 'running' ? 'building' : status === 'failed' ? 'failed' : 'queued'}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
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
                  <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                    <span style={{ fontSize: 12, color: c.muted }}>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUILD DETAIL MODAL */}
      {expandedBuild && (
        <div onClick={() => setExpandedBuildId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: 18, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(860px, 100%)', maxHeight: '78vh', background: c.panel, border: '1px solid #333', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, overflow: 'auto', boxShadow: '0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' }}>
            {(() => {
              const sc = skillColor(expandedBuild.build.stack)
              const ps = primarySkill(expandedBuild.build.stack)
              return (
                <>
                  <div style={{ height: 3, background: sc, borderRadius: 99, marginBottom: 20, width: 60 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ fontWeight: 800, fontSize: 22 }}>{expandedBuild.build.title}</div>
                        {expandedBuild.build.status !== 'complete' && <StatusBadge status={expandedBuild.build.status} colors={c} size="lg" />}
                        <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 700, border: `1px solid ${sc}44`, padding: '2px 7px', borderRadius: 6, background: `${sc}14` }}>{ps}</span>
                      </div>
                      <div style={{ fontSize: 13, color: c.muted }}>{expandedBuild.project.name}</div>
                    </div>
                    <button onClick={() => setExpandedBuildId(null)} onMouseEnter={e => e.currentTarget.style.background = '#242424'} onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'} style={{ border: '1px solid #2e2e2e', background: '#1a1a1a', color: '#ffffff', padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>Close</button>
                  </div>

                  {/* Progress */}
                  <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: c.muted }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 700, color: c.text }}>{expandedBuild.build.progress}%</span>
                    </div>
                    <div style={{ height: 7, background: isDark ? '#1b1b1b' : '#dfe8de', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${expandedBuild.build.progress}%`, height: '100%', background: sc, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>

                  {/* Agent + Stack */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>AGENT</div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{expandedBuild.build.agent}</div>
                      <div style={{ fontSize: 12, color: c.muted }}>{expandedBuild.build.agentRole}</div>
                    </div>
                    <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>STACK</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {expandedBuild.build.stack.map(s => <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, border: `1px solid ${(SKILL_COLORS[s] || c.border)}44`, padding: '4px 10px', borderRadius: 999, color: '#ffffff', background: SKILL_COLORS[s] || c.green }}><InlineCompanyLogo name={s} size={14} />{s}</span>)}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>SUMMARY</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>{expandedBuild.build.summary}</div>
                  </div>

                  {/* Activity */}
                  <div style={{ background: c.alt, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, color: c.muted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>ACTIVITY</div>
                    {[
                      { icon: '◎', label: '24 messages · 12 actions', sub: 'Agent communication log', details: [
                        { time: '0:02', text: 'Agent initialized — reading project context' },
                        { time: '0:05', text: 'Analyzed requirements, identified 3 sub-tasks' },
                        { time: '0:12', text: 'Created file: src/core/engine.ts' },
                        { time: '0:18', text: 'Installed dependencies: zod, drizzle-orm' },
                        { time: '0:31', text: 'Wrote 142 lines across 4 files' },
                        { time: '0:45', text: 'Running type check — 0 errors' },
                        { time: '1:02', text: 'Refactored handler to async pattern' },
                        { time: '1:18', text: 'Added error boundaries and validation' },
                      ]},
                      { icon: '◈', label: 'Checkpoint 3 min ago', sub: 'Last saved state', details: [
                        { time: '3m ago', text: 'Auto-saved: 8 files changed, 412 additions' },
                        { time: '7m ago', text: 'Auto-saved: schema migration applied' },
                        { time: '12m ago', text: 'Manual save: pre-refactor snapshot' },
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
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Clarify Modal */}
      {showClarifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowClarifyModal(false) }}>
          <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>Let's refine your build</div>
                <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.5 }}>Answer a few quick questions so MASSA can build exactly what you need.</div>
              </div>
              <button onClick={() => setShowClarifyModal(false)} style={{ background: 'transparent', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            {/* Original input preview */}
            <div style={{ background: '#151515', border: '1px solid #222', borderRadius: 8, padding: '8px 12px', marginBottom: 20, marginTop: 14 }}>
              <div style={{ fontSize: 9, color: c.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>YOUR INPUT</div>
              <div style={{ fontSize: 12, color: '#b0b0b0', lineHeight: 1.5 }}>{rawInput}</div>
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { id: 'goal', label: "What's the main goal? What problem does this solve?", placeholder: 'e.g. Help our sales team track leads without switching tools' },
                { id: 'user', label: 'Who is the end user — internal team, customers, or just you?', placeholder: 'e.g. Internal ops team of 5 people' },
                { id: 'backend', label: 'Do you need a backend, database, or external integrations?', placeholder: 'e.g. Yes — needs Stripe, a database, and Slack notifications' },
                { id: 'existing', label: 'Any existing systems, APIs, or codebases this connects to?', placeholder: 'e.g. Our existing CRM API at api.ourcompany.com' },
                { id: 'constraints', label: 'Any timeline or hard constraints we should know about?', placeholder: 'e.g. Need an MVP in 2 weeks, no budget for paid APIs' },
              ].map(q => (
                <div key={q.id}>
                  <div style={{ fontSize: 12, color: '#e0e0e0', fontWeight: 600, marginBottom: 6 }}>{q.label}</div>
                  <textarea
                    value={clarifyAnswers[q.id] || ''}
                    onChange={e => setClarifyAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    rows={2}
                    style={{ width: '100%', background: '#151515', border: '1px solid #272727', borderRadius: 8, padding: '8px 10px', color: '#ffffff', fontSize: 12, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => setShowClarifyModal(false)}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                style={{ flex: 1, background: c.green, color: '#081008', border: 'none', borderRadius: 9, padding: '10px 0', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'opacity 0.15s' }}>
                Build with answers
              </button>
              <button
                onClick={() => setShowClarifyModal(false)}
                onMouseEnter={e => e.currentTarget.style.background = '#242424'}
                onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
                style={{ background: '#1a1a1a', color: c.muted, border: '1px solid #2e2e2e', borderRadius: 9, padding: '10px 16px', fontSize: 12, cursor: 'pointer', boxShadow: '3px 3px 8px rgba(0,0,0,0.45)', transition: 'background 0.15s' }}>
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

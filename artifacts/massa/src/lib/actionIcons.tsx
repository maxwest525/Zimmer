import React from 'react'

const ICON_PROPS = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function icon(size: number, children: React.ReactNode) {
  return (
    <svg {...ICON_PROPS} width={size} height={size}>
      {children}
    </svg>
  )
}

export function ThinkingIcon({ size = 13 }: { size?: number }) {
  return icon(size, <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />)
}

export function BuildingIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </>)
}

export function DeployingIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>)
}

export function DoneIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </>)
}

export function QueuedIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>)
}

export function ChatIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </>)
}

export function DetailsIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </>)
}

export function RevertIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </>)
}

export function ArchMapIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </>)
}

export function AddAgentIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </>)
}

export function AddTaskIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>)
}

export function PreviewIcon({ size = 13 }: { size?: number }) {
  return <DeployingIcon size={size} />
}

export function ApplyChangesIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>)
}

export function FixErrorIcon({ size = 13 }: { size?: number }) {
  return icon(size, <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>)
}

export function RunBuildIcon({ size = 13 }: { size?: number }) {
  return icon(size, <polygon points="5 3 19 12 5 21 5 3" />)
}

export function getTabIcon(tabKey: string, size = 13): React.ReactNode {
  switch (tabKey) {
    case 'chat': return <ChatIcon size={size} />
    case 'archmap': return <ArchMapIcon size={size} />
    case 'preview': return <PreviewIcon size={size} />
    case 'addagent': return <AddAgentIcon size={size} />
    case 'addtask': return <AddTaskIcon size={size} />
    case 'details': return <DetailsIcon size={size} />
    case 'code': return <BuildingIcon size={size} />
    case 'thinking': return <ThinkingIcon size={size} />
    case 'revert': return <RevertIcon size={size} />
    default: return <QueuedIcon size={size} />
  }
}

export function getPhaseIcon(phase: string, size = 13): React.ReactNode {
  switch (phase) {
    case 'thinking': return <ThinkingIcon size={size} />
    case 'building': return <BuildingIcon size={size} />
    case 'deploying': return <DeployingIcon size={size} />
    case 'done': return <DoneIcon size={size} />
    case 'queued': return <QueuedIcon size={size} />
    default: return <QueuedIcon size={size} />
  }
}

export function getActionIcon(actionType: string, size = 13): React.ReactNode {
  switch (actionType) {
    case 'response-ready': return <ChatIcon size={size} />
    case 'apply-changes': return <ApplyChangesIcon size={size} />
    case 'fix-error': return <FixErrorIcon size={size} />
    case 'review-plan': return <DeployingIcon size={size} />
    case 'run-build': return <RunBuildIcon size={size} />
    default: return <QueuedIcon size={size} />
  }
}

export function getActivityIcon(label: string, size = 13): React.ReactNode {
  const l = label.toLowerCase()
  if (l.includes('think') || l.includes('plan') || l.includes('interpret')) return <ThinkingIcon size={size} />
  if (l.includes('build') || l.includes('generat') || l.includes('creat') || l.includes('implement')) return <BuildingIcon size={size} />
  if (l.includes('deploy') || l.includes('render') || l.includes('preview')) return <DeployingIcon size={size} />
  if (l.includes('review') || l.includes('needs review')) return <DeployingIcon size={size} />
  if (l.includes('complete') || l.includes('done') || l.includes('finish')) return <DoneIcon size={size} />
  if (l.includes('queue') || l.includes('wait') || l.includes('pending')) return <QueuedIcon size={size} />
  if (l.includes('error') || l.includes('fail') || l.includes('fix')) return getActionIcon('fix-error', size)
  if (l.includes('rout') || l.includes('connect') || l.includes('automat')) return <BuildingIcon size={size} />
  return <BuildingIcon size={size} />
}

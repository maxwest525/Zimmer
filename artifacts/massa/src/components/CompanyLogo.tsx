import { useState } from 'react'
import { getLogoInfo, type LogoInfo } from '@/lib/logos'

interface DualCompanyLogoProps {
  names: string[]
  size?: number
  accentColor?: string
}

export function DualCompanyLogo({ names, size = 28, accentColor }: DualCompanyLogoProps) {
  if (names.length === 1) {
    return <CompanyLogo name={names[0]} size={size} accentColor={accentColor} />
  }
  const overlap = Math.round(size * 0.3)
  return (
    <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: size + (size - overlap) * (names.length - 1) }}>
      {names.map((name, i) => (
        <div key={name} style={{ position: i === 0 ? 'relative' : 'absolute', left: i * (size - overlap), zIndex: i + 1 }}>
          <CompanyLogo name={name} size={size} accentColor={accentColor} style={{ boxShadow: i > 0 ? '-2px 0 0 rgba(0,0,0,0.3)' : undefined }} />
        </div>
      ))}
    </div>
  )
}

type FallbackStage = 'primary' | 'fallback' | 'text'

// Remembers whether a given logo URL loaded successfully (true) or failed (false)
// across every surface and re-render. This lets a connector start at the correct
// fallback stage immediately instead of re-probing a known-bad URL and flickering
// from a broken image to the placeholder.
const logoLoadStatus = new Map<string, boolean>()

function initialStage(info: LogoInfo): FallbackStage {
  if (logoLoadStatus.get(info.url) !== false) {
    // Unknown or known-good primary: start at primary.
    return 'primary'
  }
  // Primary is known-bad.
  if (info.fallbackUrl) {
    return logoLoadStatus.get(info.fallbackUrl) === false ? 'text' : 'fallback'
  }
  return 'text'
}

interface CompanyLogoProps {
  name: string
  size?: number
  style?: React.CSSProperties
  accentColor?: string
  info?: LogoInfo | null
}

export function CompanyLogo({ name, size = 28, style, accentColor, info: infoOverride }: CompanyLogoProps) {
  const info = infoOverride !== undefined ? infoOverride : getLogoInfo(name)
  const [stage, setStage] = useState<FallbackStage>(() => (info ? initialStage(info) : 'primary'))

  if (!info || stage === 'text') {
    const iconColor = accentColor ?? '#888'
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 8,
        background: accentColor ? `${accentColor}15` : 'rgba(128,128,128,0.10)',
        flexShrink: 0,
        ...style,
      }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="3" stroke={iconColor} strokeWidth="1.5" fill="none" />
          <circle cx="8" cy="8" r="2.5" fill={iconColor} opacity="0.6" />
        </svg>
      </span>
    )
  }

  const src = stage === 'primary' ? info.url : info.fallbackUrl

  const handleError = () => {
    if (src) logoLoadStatus.set(src, false)
    if (stage === 'primary' && info.fallbackUrl) {
      setStage('fallback')
    } else {
      setStage('text')
    }
  }

  const handleLoad = () => {
    if (src) logoLoadStatus.set(src, true)
  }

  return (
    <img
      key={stage}
      src={src}
      alt={`${info.label} logo`}
      width={size}
      height={size}
      onError={handleError}
      onLoad={handleLoad}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        objectFit: 'contain',
        display: 'block',
        flexShrink: 0,
        background: 'transparent',
        ...style,
      }}
    />
  )
}

interface InlineCompanyLogoProps {
  name: string
  size?: number
  style?: React.CSSProperties
}

export function InlineCompanyLogo({ name, size = 14, style }: InlineCompanyLogoProps) {
  const info = getLogoInfo(name)
  const [stage, setStage] = useState<FallbackStage>(() => (info ? initialStage(info) : 'primary'))

  if (!info) {
    return null
  }

  if (stage === 'text') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 3,
        fontSize: size * 0.65,
        fontWeight: 700,
        color: 'currentColor',
        flexShrink: 0,
        verticalAlign: 'middle',
        ...style,
      }}>
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }

  const src = stage === 'primary' ? info.url : info.fallbackUrl

  const handleError = () => {
    if (src) logoLoadStatus.set(src, false)
    if (stage === 'primary' && info.fallbackUrl) {
      setStage('fallback')
    } else {
      setStage('text')
    }
  }

  const handleLoad = () => {
    if (src) logoLoadStatus.set(src, true)
  }

  return (
    <img
      key={stage}
      src={src}
      alt={`${info.label} logo`}
      width={size}
      height={size}
      onError={handleError}
      onLoad={handleLoad}
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

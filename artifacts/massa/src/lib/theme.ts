export type ThemeMode = 'light' | 'dark'

export const FONTS = {
  mono: '"JetBrains Mono", Menlo, monospace',
  sans: "'Inter', system-ui, -apple-system, sans-serif",
}

export interface ThemeColors {
  [key: string]: string
  bg: string
  panel: string
  panelAlt: string
  alt: string
  border: string
  borderDim: string
  borderLight: string
  text: string
  muted: string
  dim: string
  green: string
  greenSoft: string
  soft: string
  greenDark: string
  blackGreen: string
  blue: string
  amber: string
  red: string
  yellow: string
  font: string
  fontSans: string
}

const DARK: ThemeColors = {
  bg: '#0a0d10',
  panel: '#0f1215',
  panelAlt: '#131619',
  alt: '#131619',
  border: '#252a35',
  borderDim: '#1a1f27',
  borderLight: '#2c333f',
  text: '#e8eaed',
  muted: '#9ca3af',
  dim: '#6b7280',
  green: '#34d399',
  greenSoft: 'rgba(52,211,153,0.10)',
  soft: 'rgba(52,211,153,0.10)',
  greenDark: '#0c1a0c',
  blackGreen: '#141820',
  blue: '#60a5fa',
  amber: '#f59e0b',
  red: '#f87171',
  yellow: '#fbbf24',
  font: FONTS.mono,
  fontSans: FONTS.sans,
}

const LIGHT: ThemeColors = {
  bg: '#f6f8f4',
  panel: '#ffffff',
  panelAlt: '#f1f5ef',
  alt: '#f1f5ef',
  border: '#dbe5d8',
  borderDim: '#e6ece3',
  borderLight: '#cbd8c8',
  text: '#13180f',
  muted: '#566156',
  dim: '#7c887c',
  green: '#0a8f4e',
  greenSoft: 'rgba(10,143,78,0.09)',
  soft: 'rgba(10,143,78,0.09)',
  greenDark: '#e3f5e1',
  blackGreen: '#eef2ec',
  blue: '#2563eb',
  amber: '#b45309',
  red: '#dc2626',
  yellow: '#a16207',
  font: FONTS.mono,
  fontSans: FONTS.sans,
}

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? DARK : LIGHT
}

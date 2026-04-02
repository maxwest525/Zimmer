export interface LogoInfo {
  url: string
  fallbackUrl?: string
  label: string
}

const toDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

const ANTHROPIC_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a120b"/><path fill="#c5a98e" d="M13.827 3.756h3.041L24 20.244h-3.041l-7.132-16.488zm-3.654 0H7.132L0 20.244h3.041l1.507-3.489h7.774l1.508 3.489h3.041L10.173 3.756zm-4.773 10.5L7.8 8.384l2.4 5.872H5.4z"/></svg>`
)

const REPLIT_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a0e04"/><path fill="#f26207" d="M2.189 2h7.368C11.496 2 13 3.504 13 5.443v3.114H2.189A1.189 1.189 0 0 1 1 7.368V3.189A1.189 1.189 0 0 1 2.189 2zM13 10.443v3.114H7.557A1.557 1.557 0 0 1 6 12v-.003A1.557 1.557 0 0 1 7.557 10.44H13zm0 4H2.189A1.189 1.189 0 0 0 1 15.632v4.179A1.189 1.189 0 0 0 2.189 21h7.368C11.496 21 13 19.496 13 17.557v-3.114zm8.811-4H15v6h6.811A1.189 1.189 0 0 0 23 15.257v-3.625A1.189 1.189 0 0 0 21.811 10.443zm0-8H15v6h6.811A1.189 1.189 0 0 0 23 7.257V3.632A1.189 1.189 0 0 0 21.811 2.443z"/></svg>`
)

const LOVABLE_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a050d"/><path fill="#ff6b8a" d="M12 21.593c-.397 0-.795-.152-1.098-.455L3.45 13.686a5.218 5.218 0 0 1 0-7.371 5.22 5.22 0 0 1 7.375 0l1.175 1.175 1.175-1.175a5.22 5.22 0 0 1 7.375 0 5.218 5.218 0 0 1 0 7.371l-7.452 7.452a1.553 1.553 0 0 1-1.098.455z"/></svg>`
)

const N8N_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a0b08"/><circle cx="6" cy="6" r="2.5" fill="#ff6d5a"/><circle cx="18" cy="6" r="2.5" fill="#ff6d5a"/><circle cx="6" cy="18" r="2.5" fill="#ff6d5a"/><circle cx="18" cy="18" r="2.5" fill="#ff6d5a"/><line x1="6" y1="6" x2="18" y2="6" stroke="#ff6d5a" stroke-width="1.5"/><line x1="6" y1="18" x2="18" y2="18" stroke="#ff6d5a" stroke-width="1.5"/><line x1="6" y1="6" x2="6" y2="18" stroke="#ff6d5a" stroke-width="1.5"/><line x1="18" y1="6" x2="18" y2="18" stroke="#ff6d5a" stroke-width="1.5"/></svg>`
)

export const COMPANY_LOGOS: Record<string, LogoInfo> = {
  'Claude': {
    url: 'https://logo.clearbit.com/anthropic.com',
    fallbackUrl: ANTHROPIC_FALLBACK,
    label: 'Anthropic',
  },
  'Claude Code': {
    url: 'https://logo.clearbit.com/anthropic.com',
    fallbackUrl: ANTHROPIC_FALLBACK,
    label: 'Anthropic',
  },
  'Lovable / Replit': {
    url: 'https://logo.clearbit.com/replit.com',
    fallbackUrl: REPLIT_FALLBACK,
    label: 'Replit',
  },
  'Lovable': {
    url: 'https://logo.clearbit.com/lovable.dev',
    fallbackUrl: LOVABLE_FALLBACK,
    label: 'Lovable',
  },
  'Replit': {
    url: 'https://logo.clearbit.com/replit.com',
    fallbackUrl: REPLIT_FALLBACK,
    label: 'Replit',
  },
  'n8n': {
    url: 'https://logo.clearbit.com/n8n.io',
    fallbackUrl: N8N_FALLBACK,
    label: 'n8n',
  },
  'Anthropic': {
    url: 'https://logo.clearbit.com/anthropic.com',
    fallbackUrl: ANTHROPIC_FALLBACK,
    label: 'Anthropic',
  },
}

export function getLogoInfo(name: string): LogoInfo | null {
  return COMPANY_LOGOS[name] ?? null
}

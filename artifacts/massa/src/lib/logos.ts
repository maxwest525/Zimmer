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

const GITHUB_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0d1117"/><path fill="#e6edf3" d="M12 4a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.23 1.87.87 2.33.67.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 12 4z"/></svg>`
)

const GITLAB_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a0f0a"/><path fill="#fc6d26" d="M12 20.5 4.3 11h15.4z"/><path fill="#e24329" d="M4.3 11 6 5l2 6zM19.7 11 18 5l-2 6z"/></svg>`
)

const SLACK_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a1019"/><path fill="#36c5f0" d="M9.5 12a1.5 1.5 0 1 1-1.5-1.5h1.5zm.8 0a1.5 1.5 0 0 1 3 0v3.8a1.5 1.5 0 0 1-3 0z"/><path fill="#2eb67d" d="M12 9.5A1.5 1.5 0 1 1 13.5 8v1.5zm0 .8a1.5 1.5 0 0 1 0 3H8.2a1.5 1.5 0 0 1 0-3z"/><path fill="#ecb22e" d="M14.5 12A1.5 1.5 0 1 1 16 13.5h-1.5zm-.8 0a1.5 1.5 0 0 1-3 0V8.2a1.5 1.5 0 0 1 3 0z"/><path fill="#e01e5a" d="M12 14.5A1.5 1.5 0 1 1 10.5 16v-1.5zm0-.8a1.5 1.5 0 0 1 0-3h3.8a1.5 1.5 0 0 1 0 3z"/></svg>`
)

const NOTION_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#ffffff"/><path d="M8 17V7l8 10V7" fill="none" stroke="#111111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
)

const LINEAR_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0d0e16"/><path fill="#5e6ad2" d="M5 14.5 9.5 19A7 7 0 0 1 5 14.5zm-.4-2.2A7 7 0 0 1 11.7 4.6L19.4 12.3A7 7 0 0 1 11.7 19.4zM6 8.6 15.4 18a7 7 0 0 0 1.4-1L7 7.2A7 7 0 0 0 6 8.6z"/></svg>`
)

const STRIPE_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#635bff"/><path fill="#ffffff" d="M11.5 9.6c0-.5.4-.7 1-.7.9 0 2 .3 2.9.8V6.9a7.4 7.4 0 0 0-2.9-.5c-2.4 0-4 1.2-4 3.3 0 3.2 4.4 2.7 4.4 4.1 0 .5-.5.7-1.1.7-1 0-2.3-.4-3.3-1v2.6c1.1.5 2.2.7 3.3.7 2.5 0 4.1-1.2 4.1-3.3 0-3.5-4.4-2.9-4.4-4.2z"/></svg>`
)

const VERCEL_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#000000"/><path fill="#ffffff" d="M12 6 19 18H5z"/></svg>`
)

const SUPABASE_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0d1f17"/><path fill="#3ecf8e" d="M13 3 5 13.5a.8.8 0 0 0 .6 1.3H11v6.2c0 .8 1 1.1 1.5.5L19 10.5a.8.8 0 0 0-.6-1.3H13V3.5c0-.8-1-1.1-1.5-.5z"/></svg>`
)

const CLOUDFLARE_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a1206"/><path fill="#f6821f" d="M16.5 16H7a3 3 0 0 1 0-6 4.5 4.5 0 0 1 8.6-1.3A3.2 3.2 0 0 1 16.5 16z"/></svg>`
)

const MONGODB_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#06140d"/><path fill="#4faa41" d="M12 3.5c1.8 2.8 3.8 4.8 3.8 8.6 0 3.7-1.9 5.7-3.3 6.7l-.5 1.7-.5-1.7c-1.4-1-3.3-3-3.3-6.7 0-3.8 2-5.8 3.8-8.6z"/></svg>`
)

const DISCORD_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#5865f2"/><path fill="#ffffff" d="M16.5 8a10 10 0 0 0-2.5-.8l-.3.6a8.5 8.5 0 0 0-3.4 0L10 7.2A10 10 0 0 0 7.5 8C5.8 10.5 5.3 13 5.5 15.4A10 10 0 0 0 8.6 17l.6-1a6 6 0 0 1-1-.5l.2-.2a7 7 0 0 0 6.2 0l.2.2a6 6 0 0 1-1 .5l.6 1a10 10 0 0 0 3.1-1.6c.3-2.8-.4-5.3-2-7.4zM9.8 14c-.6 0-1.1-.6-1.1-1.2s.5-1.2 1.1-1.2 1.1.6 1.1 1.2-.5 1.2-1.1 1.2zm4.4 0c-.6 0-1.1-.6-1.1-1.2s.5-1.2 1.1-1.2 1.1.6 1.1 1.2-.5 1.2-1.1 1.2z"/></svg>`
)

const SENTRY_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a0f1a"/><path fill="#a55eea" d="M12 5a1.2 1.2 0 0 1 1 .6l6 10.4a1.2 1.2 0 0 1-1 1.8h-2.4a7 7 0 0 0-4.2-6.3l1.2-2a9.3 9.3 0 0 1 5 6.3H17L12 7l-2 3.5 1 .6-2.5 4.3H6L11 6.6a1.2 1.2 0 0 1 1-.6z"/></svg>`
)

const HUGGINGFACE_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a1500"/><circle cx="12" cy="13" r="6" fill="#ffd21e"/><circle cx="10" cy="12" r="1" fill="#3a2c00"/><circle cx="14" cy="12" r="1" fill="#3a2c00"/><path d="M9.5 15a3 3 0 0 0 5 0" fill="none" stroke="#3a2c00" stroke-width="1.2" stroke-linecap="round"/></svg>`
)

const BRAVE_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a0a04"/><path fill="#fb542b" d="M12 4l4.5 1.8L18 8l-.8 5.5L12 19l-5.2-5.5L6 8l1.5-2.2z"/><path fill="#fff" d="M12 9l1.8 1.2-1.8 3.2L10.2 10z" opacity=".85"/></svg>`
)

const POSTGRES_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0a1525"/><path fill="#5896c8" d="M12 4c4 0 6.5 1.6 6.5 5 0 2.8-1.6 4.7-3.6 4.7-.8 0-1.4-.2-1.9-.6.3 2.3.6 3.6.6 4.7 0 1.2-.7 2-1.9 2-2.7 0-4.7-3.6-4.7-8.5C7 6.2 8.7 4 12 4z"/><circle cx="14" cy="9.5" r="1" fill="#0a1525"/></svg>`
)

const DOCKER_FALLBACK = toDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#06121a"/><g fill="#2496ed"><rect x="6" y="11" width="2.4" height="2.4"/><rect x="9" y="11" width="2.4" height="2.4"/><rect x="12" y="11" width="2.4" height="2.4"/><rect x="9" y="8.4" width="2.4" height="2.4"/><rect x="12" y="8.4" width="2.4" height="2.4"/></g><path fill="#2496ed" d="M19 11.2c-.5-.3-1.6-.4-2.4-.2-.1-.8-.6-1.5-1.3-2l-.4-.3-.3.4c-.5.7-.6 1.6-.3 2.3-1 .4-2 .4-7 .4-.2 1.7.3 3.4 1.5 4.5 1.2 1 3 1.3 4.8.7 2.4-.8 3.7-2.5 4.4-4.4.6 0 1.4 0 1.8-.9z"/></svg>`
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
  'GPT-4o': {
    url: 'https://logo.clearbit.com/openai.com',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0d0d0d"/><text x="12" y="16" text-anchor="middle" fill="#a78bfa" font-size="11" font-weight="700" font-family="sans-serif">GPT</text></svg>`
    ),
    label: 'OpenAI',
  },
  'Gemini': {
    url: 'https://logo.clearbit.com/deepmind.google',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0a1628"/><circle cx="12" cy="12" r="6" fill="none" stroke="#60a5fa" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#60a5fa"/></svg>`
    ),
    label: 'Gemini',
  },
  'Cursor': {
    url: 'https://logo.clearbit.com/cursor.sh',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0d0d1a"/><path d="M6 4l12 8-12 8z" fill="#818cf8"/></svg>`
    ),
    label: 'Cursor',
  },
  'Bolt': {
    url: 'https://logo.clearbit.com/bolt.new',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a1500"/><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#fbbf24"/></svg>`
    ),
    label: 'Bolt',
  },
  'Windsurf': {
    url: 'https://logo.clearbit.com/codeium.com',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#061a1a"/><path d="M4 16 Q8 8 12 12 Q16 16 20 8" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/></svg>`
    ),
    label: 'Windsurf',
  },
  'Perplexity': {
    url: 'https://logo.clearbit.com/perplexity.ai',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a1408"/><circle cx="12" cy="12" r="7" fill="none" stroke="#f59e0b" stroke-width="2"/><line x1="12" y1="5" x2="12" y2="19" stroke="#f59e0b" stroke-width="1.5"/><line x1="5" y1="12" x2="19" y2="12" stroke="#f59e0b" stroke-width="1.5"/></svg>`
    ),
    label: 'Perplexity',
  },
  'Mistral': {
    url: 'https://logo.clearbit.com/mistral.ai',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a0e04"/><rect x="4" y="4" width="4" height="4" rx="1" fill="#fb923c"/><rect x="10" y="4" width="4" height="4" rx="1" fill="#fb923c"/><rect x="16" y="4" width="4" height="4" rx="1" fill="#fb923c"/><rect x="4" y="10" width="4" height="4" rx="1" fill="#fb923c"/><rect x="16" y="10" width="4" height="4" rx="1" fill="#fb923c"/><rect x="4" y="16" width="4" height="4" rx="1" fill="#fb923c"/><rect x="10" y="16" width="4" height="4" rx="1" fill="#fb923c"/><rect x="16" y="16" width="4" height="4" rx="1" fill="#fb923c"/></svg>`
    ),
    label: 'Mistral',
  },
  'Grok': {
    url: 'https://logo.clearbit.com/x.ai',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1a0906"/><text x="12" y="16.5" text-anchor="middle" fill="#e44d26" font-size="13" font-weight="800" font-family="sans-serif">G</text></svg>`
    ),
    label: 'xAI',
  },
  'Gemma': {
    url: 'https://logo.clearbit.com/google.com',
    fallbackUrl: toDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0a1628"/><path d="M12 4 L18 8 L18 16 L12 20 L6 16 L6 8 Z" fill="none" stroke="#4285f4" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="#4285f4"/></svg>`
    ),
    label: 'Google',
  },
  'Ahrefs': { url: 'https://logo.clearbit.com/ahrefs.com', label: 'Ahrefs' },
  'SEMrush': { url: 'https://logo.clearbit.com/semrush.com', label: 'SEMrush' },
  'Surfer SEO': { url: 'https://logo.clearbit.com/surferseo.com', label: 'Surfer SEO' },
  'Clearscope': { url: 'https://logo.clearbit.com/clearscope.io', label: 'Clearscope' },
  'Google Search Console': { url: 'https://logo.clearbit.com/google.com', label: 'Google' },
  'Google Ads': { url: 'https://logo.clearbit.com/google.com', label: 'Google Ads' },
  'Meta Ads': { url: 'https://logo.clearbit.com/meta.com', label: 'Meta' },
  'Microsoft Ads': { url: 'https://logo.clearbit.com/microsoft.com', label: 'Microsoft' },
  'TikTok Ads': { url: 'https://logo.clearbit.com/tiktok.com', label: 'TikTok' },
  'LinkedIn Ads': { url: 'https://logo.clearbit.com/linkedin.com', label: 'LinkedIn' },
  'Canva': { url: 'https://logo.clearbit.com/canva.com', label: 'Canva' },
  'Figma': { url: 'https://logo.clearbit.com/figma.com', label: 'Figma' },
  'Copy.ai': { url: 'https://logo.clearbit.com/copy.ai', label: 'Copy.ai' },
  'Jasper': { url: 'https://logo.clearbit.com/jasper.ai', label: 'Jasper' },
  'AdCreative.ai': { url: 'https://logo.clearbit.com/adcreative.ai', label: 'AdCreative.ai' },
  'Moz': { url: 'https://logo.clearbit.com/moz.com', label: 'Moz' },
  'Majestic': { url: 'https://logo.clearbit.com/majestic.com', label: 'Majestic' },
  'Hunter.io': { url: 'https://logo.clearbit.com/hunter.io', label: 'Hunter.io' },
  'Pitchbox': { url: 'https://logo.clearbit.com/pitchbox.com', label: 'Pitchbox' },
  'Google Business': { url: 'https://logo.clearbit.com/google.com', label: 'Google Business' },
  'Trustpilot': { url: 'https://logo.clearbit.com/trustpilot.com', label: 'Trustpilot' },
  'G2': { url: 'https://logo.clearbit.com/g2.com', label: 'G2' },
  'Yelp': { url: 'https://logo.clearbit.com/yelp.com', label: 'Yelp' },
  'Birdeye': { url: 'https://logo.clearbit.com/birdeye.com', label: 'Birdeye' },
  'SimilarWeb': { url: 'https://logo.clearbit.com/similarweb.com', label: 'SimilarWeb' },
  'SpyFu': { url: 'https://logo.clearbit.com/spyfu.com', label: 'SpyFu' },
  'Crayon': { url: 'https://logo.clearbit.com/crayon.co', label: 'Crayon' },
  'Klue': { url: 'https://logo.clearbit.com/klue.com', label: 'Klue' },
  'Mailchimp': { url: 'https://logo.clearbit.com/mailchimp.com', label: 'Mailchimp' },
  'SendGrid': { url: 'https://logo.clearbit.com/sendgrid.com', label: 'SendGrid' },
  'Klaviyo': { url: 'https://logo.clearbit.com/klaviyo.com', label: 'Klaviyo' },
  'ActiveCampaign': { url: 'https://logo.clearbit.com/activecampaign.com', label: 'ActiveCampaign' },
  'ConvertKit': { url: 'https://logo.clearbit.com/convertkit.com', label: 'ConvertKit' },
  'Hootsuite': { url: 'https://logo.clearbit.com/hootsuite.com', label: 'Hootsuite' },
  'Buffer': { url: 'https://logo.clearbit.com/buffer.com', label: 'Buffer' },
  'Sprout Social': { url: 'https://logo.clearbit.com/sproutsocial.com', label: 'Sprout Social' },
  'Later': { url: 'https://logo.clearbit.com/later.com', label: 'Later' },
  'Brandwatch': { url: 'https://logo.clearbit.com/brandwatch.com', label: 'Brandwatch' },
  'Google Analytics': { url: 'https://logo.clearbit.com/google.com', label: 'Google Analytics' },
  'Mixpanel': { url: 'https://logo.clearbit.com/mixpanel.com', label: 'Mixpanel' },
  'HubSpot': { url: 'https://logo.clearbit.com/hubspot.com', label: 'HubSpot' },
  'Segment': { url: 'https://logo.clearbit.com/segment.com', label: 'Segment' },
  'Looker': { url: 'https://logo.clearbit.com/looker.com', label: 'Looker' },
  'Hotjar': { url: 'https://logo.clearbit.com/hotjar.com', label: 'Hotjar' },
  'Optimizely': { url: 'https://logo.clearbit.com/optimizely.com', label: 'Optimizely' },
  'VWO': { url: 'https://logo.clearbit.com/vwo.com', label: 'VWO' },
  'Unbounce': { url: 'https://logo.clearbit.com/unbounce.com', label: 'Unbounce' },
  'Crazy Egg': { url: 'https://logo.clearbit.com/crazyegg.com', label: 'Crazy Egg' },

  // --- Popular MCP connectors (curated icons + inline SVG fallbacks) ---
  'GitHub': { url: 'https://logo.clearbit.com/github.com', fallbackUrl: GITHUB_FALLBACK, label: 'GitHub' },
  'GitLab': { url: 'https://logo.clearbit.com/gitlab.com', fallbackUrl: GITLAB_FALLBACK, label: 'GitLab' },
  'Slack': { url: 'https://logo.clearbit.com/slack.com', fallbackUrl: SLACK_FALLBACK, label: 'Slack' },
  'Notion': { url: 'https://logo.clearbit.com/notion.so', fallbackUrl: NOTION_FALLBACK, label: 'Notion' },
  'Linear': { url: 'https://logo.clearbit.com/linear.app', fallbackUrl: LINEAR_FALLBACK, label: 'Linear' },
  'Stripe': { url: 'https://logo.clearbit.com/stripe.com', fallbackUrl: STRIPE_FALLBACK, label: 'Stripe' },
  'Sentry': { url: 'https://logo.clearbit.com/sentry.io', fallbackUrl: SENTRY_FALLBACK, label: 'Sentry' },
  'Cloudflare': { url: 'https://logo.clearbit.com/cloudflare.com', fallbackUrl: CLOUDFLARE_FALLBACK, label: 'Cloudflare' },
  'Supabase': { url: 'https://logo.clearbit.com/supabase.com', fallbackUrl: SUPABASE_FALLBACK, label: 'Supabase' },
  'Vercel': { url: 'https://logo.clearbit.com/vercel.com', fallbackUrl: VERCEL_FALLBACK, label: 'Vercel' },
  'MongoDB': { url: 'https://logo.clearbit.com/mongodb.com', fallbackUrl: MONGODB_FALLBACK, label: 'MongoDB' },
  'Discord': { url: 'https://logo.clearbit.com/discord.com', fallbackUrl: DISCORD_FALLBACK, label: 'Discord' },
  'Hugging Face': { url: 'https://logo.clearbit.com/huggingface.co', fallbackUrl: HUGGINGFACE_FALLBACK, label: 'Hugging Face' },
  'Brave Search': { url: 'https://logo.clearbit.com/brave.com', fallbackUrl: BRAVE_FALLBACK, label: 'Brave Search' },
  'PostgreSQL': { url: 'https://logo.clearbit.com/postgresql.org', fallbackUrl: POSTGRES_FALLBACK, label: 'PostgreSQL' },
  'Postgres': { url: 'https://logo.clearbit.com/postgresql.org', fallbackUrl: POSTGRES_FALLBACK, label: 'PostgreSQL' },
  'Docker': { url: 'https://logo.clearbit.com/docker.com', fallbackUrl: DOCKER_FALLBACK, label: 'Docker' },

  // --- Popular MCP connectors (Clearbit only) ---
  'Atlassian': { url: 'https://logo.clearbit.com/atlassian.com', label: 'Atlassian' },
  'Jira': { url: 'https://logo.clearbit.com/atlassian.com', label: 'Jira' },
  'Confluence': { url: 'https://logo.clearbit.com/atlassian.com', label: 'Confluence' },
  'Asana': { url: 'https://logo.clearbit.com/asana.com', label: 'Asana' },
  'Trello': { url: 'https://logo.clearbit.com/trello.com', label: 'Trello' },
  'Airtable': { url: 'https://logo.clearbit.com/airtable.com', label: 'Airtable' },
  'Shopify': { url: 'https://logo.clearbit.com/shopify.com', label: 'Shopify' },
  'PayPal': { url: 'https://logo.clearbit.com/paypal.com', label: 'PayPal' },
  'Square': { url: 'https://logo.clearbit.com/squareup.com', label: 'Square' },
  'Zapier': { url: 'https://logo.clearbit.com/zapier.com', label: 'Zapier' },
  'Intercom': { url: 'https://logo.clearbit.com/intercom.com', label: 'Intercom' },
  'Zendesk': { url: 'https://logo.clearbit.com/zendesk.com', label: 'Zendesk' },
  'Twilio': { url: 'https://logo.clearbit.com/twilio.com', label: 'Twilio' },
  'Snowflake': { url: 'https://logo.clearbit.com/snowflake.com', label: 'Snowflake' },
  'Databricks': { url: 'https://logo.clearbit.com/databricks.com', label: 'Databricks' },
  'Netlify': { url: 'https://logo.clearbit.com/netlify.com', label: 'Netlify' },
  'Neon': { url: 'https://logo.clearbit.com/neon.tech', label: 'Neon' },
  'Prisma': { url: 'https://logo.clearbit.com/prisma.io', label: 'Prisma' },
  'Redis': { url: 'https://logo.clearbit.com/redis.io', label: 'Redis' },
  'Elasticsearch': { url: 'https://logo.clearbit.com/elastic.co', label: 'Elastic' },
  'AWS': { url: 'https://logo.clearbit.com/aws.amazon.com', label: 'AWS' },
  'Datadog': { url: 'https://logo.clearbit.com/datadoghq.com', label: 'Datadog' },
  'Grafana': { url: 'https://logo.clearbit.com/grafana.com', label: 'Grafana' },
  'Salesforce': { url: 'https://logo.clearbit.com/salesforce.com', label: 'Salesforce' },
  'Dropbox': { url: 'https://logo.clearbit.com/dropbox.com', label: 'Dropbox' },
  'Box': { url: 'https://logo.clearbit.com/box.com', label: 'Box' },
  'Google Drive': { url: 'https://logo.clearbit.com/google.com', label: 'Google Drive' },
  'Gmail': { url: 'https://logo.clearbit.com/google.com', label: 'Gmail' },
  'Google Calendar': { url: 'https://logo.clearbit.com/google.com', label: 'Google Calendar' },
  'Google Sheets': { url: 'https://logo.clearbit.com/google.com', label: 'Google Sheets' },
  'Google Docs': { url: 'https://logo.clearbit.com/google.com', label: 'Google Docs' },
  'Google Maps': { url: 'https://logo.clearbit.com/google.com', label: 'Google Maps' },
  'YouTube': { url: 'https://logo.clearbit.com/youtube.com', label: 'YouTube' },
  'Microsoft Teams': { url: 'https://logo.clearbit.com/microsoft.com', label: 'Microsoft Teams' },
  'Outlook': { url: 'https://logo.clearbit.com/microsoft.com', label: 'Outlook' },
  'OneDrive': { url: 'https://logo.clearbit.com/microsoft.com', label: 'OneDrive' },
  'Spotify': { url: 'https://logo.clearbit.com/spotify.com', label: 'Spotify' },
  'Reddit': { url: 'https://logo.clearbit.com/reddit.com', label: 'Reddit' },
  'Exa': { url: 'https://logo.clearbit.com/exa.ai', label: 'Exa' },
  'Firecrawl': { url: 'https://logo.clearbit.com/firecrawl.dev', label: 'Firecrawl' },
  'Apify': { url: 'https://logo.clearbit.com/apify.com', label: 'Apify' },
  'Browserbase': { url: 'https://logo.clearbit.com/browserbase.com', label: 'Browserbase' },
  'Playwright': { url: 'https://logo.clearbit.com/playwright.dev', label: 'Playwright' },
  'Fly.io': { url: 'https://logo.clearbit.com/fly.io', label: 'Fly.io' },
  'Render': { url: 'https://logo.clearbit.com/render.com', label: 'Render' },
  'Railway': { url: 'https://logo.clearbit.com/railway.app', label: 'Railway' },
  'DigitalOcean': { url: 'https://logo.clearbit.com/digitalocean.com', label: 'DigitalOcean' },
  'Heroku': { url: 'https://logo.clearbit.com/heroku.com', label: 'Heroku' },
}

export function getLogoInfo(name: string): LogoInfo | null {
  return COMPANY_LOGOS[name] ?? null
}

const MULTI_PART_TLDS = new Set([
  'co.uk', 'org.uk', 'me.uk', 'gov.uk', 'ac.uk',
  'com.au', 'net.au', 'org.au',
  'co.jp', 'co.nz', 'co.in', 'co.za',
  'com.br', 'com.mx', 'com.sg', 'com.tr',
])

export function getLogoInfoByDomain(domain: string): LogoInfo {
  const clean = domain.replace(/^www\./i, '')
  const parts = clean.split('.')
  let registrable = clean
  if (parts.length > 2) {
    const lastTwo = parts.slice(-2).join('.')
    registrable = MULTI_PART_TLDS.has(lastTwo) ? parts.slice(-3).join('.') : lastTwo
  }
  const base = registrable.split('.')[0] || registrable
  const label = base.charAt(0).toUpperCase() + base.slice(1)
  return {
    url: `https://logo.clearbit.com/${registrable}`,
    label,
  }
}

export interface ResolvedBrand {
  info: LogoInfo | null
  label: string
}

// Resolved brands are memoized per (name, endpoint) so the domain-derived guess
// and the returned object identity stay stable across re-renders and across the
// different surfaces that render the same connector.
const resolvedBrandCache = new Map<string, ResolvedBrand>()

function computeMcpBrand(name: string, endpoint?: string | null): ResolvedBrand {
  const trimmed = (name ?? '').trim()
  const byName = getLogoInfo(trimmed)
  if (byName) return { info: byName, label: byName.label }
  if (endpoint) {
    try {
      const host = new URL(endpoint).hostname
      if (host) return { info: getLogoInfoByDomain(host), label: trimmed || host }
    } catch {
      // invalid endpoint URL; fall through to no-brand
    }
  }
  return { info: null, label: trimmed || 'Unknown server' }
}

export function resolveMcpBrand(name: string, endpoint?: string | null): ResolvedBrand {
  const key = `${name ?? ''}\u0000${endpoint ?? ''}`
  const cached = resolvedBrandCache.get(key)
  if (cached) return cached
  const resolved = computeMcpBrand(name, endpoint)
  resolvedBrandCache.set(key, resolved)
  return resolved
}

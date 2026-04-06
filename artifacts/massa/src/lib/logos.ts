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
}

export function getLogoInfo(name: string): LogoInfo | null {
  return COMPANY_LOGOS[name] ?? null
}

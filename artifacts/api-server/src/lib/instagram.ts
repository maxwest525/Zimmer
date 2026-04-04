const INSTAGRAM_URL_REGEX = /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|stories|tv)\/[\w-]+\/?/i;
const INSTAGRAM_PROFILE_REGEX = /https?:\/\/(?:www\.)?instagram\.com\/[\w.]+\/?/i;

export function detectInstagramUrl(text: string): string | null {
  const postMatch = text.match(INSTAGRAM_URL_REGEX);
  if (postMatch) return postMatch[0];
  const profileMatch = text.match(INSTAGRAM_PROFILE_REGEX);
  if (profileMatch) return profileMatch[0];
  return null;
}

export function hasInstagramUrl(text: string): boolean {
  return detectInstagramUrl(text) !== null;
}

interface InstagramMetadata {
  title: string | null;
  description: string | null;
  url: string;
}

async function fetchOgMetadata(url: string): Promise<InstagramMetadata> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();

  const titleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:title["']/i);

  const descMatch = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:description["']/i);

  return {
    title: titleMatch?.[1] ? decodeHtmlEntities(titleMatch[1]) : null,
    description: descMatch?.[1] ? decodeHtmlEntities(descMatch[1]) : null,
    url,
  };
}

async function fetchOembedMetadata(url: string): Promise<InstagramMetadata> {
  const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetch(oembedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`oEmbed HTTP ${res.status}`);

  const data = await res.json() as { title?: string; author_name?: string };
  return {
    title: data.title || data.author_name || null,
    description: data.title || null,
    url,
  };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

export async function fetchInstagramMetadata(url: string): Promise<{ text: string; url: string } | null> {
  try {
    const metadata = await fetchOgMetadata(url);
    const parts = [metadata.title, metadata.description].filter(Boolean);
    if (parts.length > 0) {
      return { text: parts.join("\n\n"), url };
    }
  } catch (err) {
    console.log("[instagram] OG fetch failed, trying oEmbed:", (err as Error).message);
  }

  try {
    const metadata = await fetchOembedMetadata(url);
    const parts = [metadata.title, metadata.description].filter(Boolean);
    if (parts.length > 0) {
      return { text: parts.join("\n\n"), url };
    }
  } catch (err) {
    console.log("[instagram] oEmbed fetch also failed:", (err as Error).message);
  }

  return null;
}

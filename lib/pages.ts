// Call-page resolver for opportunity themes: the analogue of the paper
// abstract chain. Fetches the linked call/programme page so summaries are
// grounded in the source instead of tweet phrasing. Every failure degrades to
// null and the summarizer falls back to tweet-discussion-only.

export interface PageInfo {
  url: string;
  text: string;
  image?: string; // og:image, absolute http(s) URL
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 4000;
const MIN_USEFUL_CHARS = 200;
const MAX_URLS_TO_TRY = 3;

// Readable body text: drop non-content blocks, then tags, then entities.
export function extractPageText(html: string): string {
  const withoutBlocks = html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return withoutBlocks
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function metaContent(html: string, name: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2]) : undefined;
}

export function extractOgImage(
  html: string,
  pageUrl: string
): string | undefined {
  const raw = metaContent(html, "og:image");
  if (!raw) return undefined;
  try {
    const resolved = new URL(raw, pageUrl);
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
      return undefined;
    }
    return resolved.toString();
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "twitterdigest (personal project)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type && !type.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const SKIP_HOSTS = /(^|\.)(x\.com|twitter\.com|t\.co)$/i;

// Try the cluster's URLs in engagement order; first page with enough
// readable text wins.
export async function fetchCallPage(urls: string[]): Promise<PageInfo | null> {
  const candidates = urls
    .filter((url) => {
      try {
        return !SKIP_HOSTS.test(new URL(url).hostname);
      } catch {
        return false;
      }
    })
    .slice(0, MAX_URLS_TO_TRY);
  for (const url of candidates) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const text = extractPageText(html);
    if (text.length < MIN_USEFUL_CHARS) continue;
    const image = extractOgImage(html, url);
    return { url, text, ...(image ? { image } : {}) };
  }
  return null;
}

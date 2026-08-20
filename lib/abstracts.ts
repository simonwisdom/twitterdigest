// Paper-abstract resolver chain. Given a canonical id ("arxiv:...", "doi:...")
// and fallback URLs, try progressively more general sources. Every step is
// try/caught: total failure returns null and the summarizer degrades to
// tweet-discussion-only.

export interface PaperInfo {
  title?: string;
  abstract?: string;
  source: string;
}

const FETCH_TIMEOUT_MS = 10_000;

async function fetchText(url: string, accept?: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "twitterdigest (personal project)",
        ...(accept ? { Accept: accept } : {}),
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fromArxiv(id: string): Promise<PaperInfo | null> {
  const xml = await fetchText(
    `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`
  );
  if (!xml) return null;
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
  if (!entry) return null;
  const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1];
  if (!summary) return null;
  return {
    title: title ? stripTags(title) : undefined,
    abstract: stripTags(summary),
    source: "arxiv",
  };
}

async function fromBiorxiv(doi: string): Promise<PaperInfo | null> {
  for (const server of ["biorxiv", "medrxiv"]) {
    const raw = await fetchText(
      `https://api.biorxiv.org/details/${server}/${encodeURIComponent(doi)}`
    );
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const rec = data?.collection?.[data.collection.length - 1];
      if (rec?.abstract) {
        return { title: rec.title, abstract: rec.abstract, source: server };
      }
    } catch {
      // fall through to next server
    }
  }
  return null;
}

async function fromPubmed(id: string): Promise<PaperInfo | null> {
  const xml = await fetchText(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${encodeURIComponent(id)}&retmode=xml`
  );
  if (!xml) return null;
  const article = xml.match(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/)?.[1];
  if (!article) return null;
  const title = article.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1];
  const abstractParts = [...article.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);
  if (!title && abstractParts.length === 0) return null;
  return {
    title: title ? stripTags(title) : undefined,
    abstract: abstractParts.length > 0 ? abstractParts.join(" ") : undefined,
    source: "pubmed",
  };
}

async function fromCrossref(doi: string): Promise<PaperInfo | null> {
  const raw = await fetchText(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`
  );
  if (!raw) return null;
  try {
    const msg = JSON.parse(raw)?.message;
    const title = msg?.title?.[0];
    const abstract = msg?.abstract ? stripTags(msg.abstract) : undefined;
    if (!title && !abstract) return null;
    return { title, abstract, source: "crossref" };
  } catch {
    return null;
  }
}

async function fromLandingPage(url: string): Promise<PaperInfo | null> {
  const html = await fetchText(url, "text/html");
  if (!html) return null;
  const meta = (name: string): string | undefined => {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
      "i"
    );
    const m = html.match(re);
    return m ? stripTags(m[1] ?? m[2]) : undefined;
  };
  const abstract =
    meta("citation_abstract") ?? meta("og:description") ?? meta("description");
  const title = meta("citation_title") ?? meta("og:title");
  if (!abstract) return null;
  return { title, abstract, source: "landing-page" };
}

export async function resolveAbstract(
  canonicalIds: string[],
  fallbackUrls: string[]
): Promise<PaperInfo | null> {
  for (const cid of canonicalIds) {
    const [ns, ...rest] = cid.split(":");
    const id = rest.join(":");
    if (ns === "arxiv") {
      const r = await fromArxiv(id);
      if (r) return r;
    } else if (ns === "pubmed") {
      const r = await fromPubmed(id);
      if (r) return r;
    } else if (ns === "doi") {
      if (id.startsWith("10.1101/")) {
        const r = await fromBiorxiv(id);
        if (r) return r;
      }
      const r = await fromCrossref(id);
      if (r) return r;
    }
  }
  for (const url of fallbackUrls.slice(0, 2)) {
    const r = await fromLandingPage(url);
    if (r) return r;
  }
  return null;
}

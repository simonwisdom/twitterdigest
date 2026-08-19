import { CanonicalPattern } from "@/lib/types";

const TRACKING_PARAMS = /^(utm_|ref$|ref_|fbclid|gclid|igsh|s$|t$|source$)/;

// Strip tracking params and fragments, lowercase host, drop trailing slash.
export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    url.hostname = url.hostname.toLowerCase();
    url.hash = "";
    const keep = [...url.searchParams.entries()].filter(
      ([k]) => !TRACKING_PARAMS.test(k)
    );
    url.search = "";
    for (const [k, v] of keep) url.searchParams.append(k, v);
    let s = url.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

// Generic DOI matcher — works for any journal or preprint server whose URLs
// embed a DOI, without per-publisher rules. Trailing punctuation and common
// suffixes (.pdf, vN) are trimmed.
const DOI_RE = /\b(10\.\d{4,9}\/[^\s?#"']+)/;

function extractDoi(url: string): string | null {
  const m = url.match(DOI_RE);
  if (!m) return null;
  let doi = m[1].replace(/[.,;)\]]+$/, "");
  doi = doi.replace(/\.(pdf|full|abstract)$/i, "");
  doi = doi.replace(/v\d+$/i, ""); // preprint version suffix
  return doi.toLowerCase();
}

// DOI registrant prefixes that are alternate names for another namespace: a
// paper linked via doi.org must land in the same cluster as one linked via the
// repository's own URL. (10.48550 is arXiv's DOI prefix.)
const DOI_NAMESPACE_ALIASES: { pattern: RegExp; namespace: string }[] = [
  { pattern: /^10\.48550\/arxiv\.(.+)$/, namespace: "arxiv" },
];

function canonicalizeDoi(doi: string): string {
  for (const alias of DOI_NAMESPACE_ALIASES) {
    const m = doi.match(alias.pattern);
    if (m) return `${alias.namespace}:${m[1]}`;
  }
  return `doi:${doi}`;
}

// Canonical IDs for a set of URLs: theme-configured patterns (namespaced,
// e.g. "arxiv:2408.01234") plus the generic DOI rule ("doi:10.1101/...").
export function extractCanonicalIds(
  urls: string[],
  patterns: CanonicalPattern[] = []
): string[] {
  const ids = new Set<string>();
  for (const raw of urls) {
    const normalized = normalizeUrl(raw);
    if (!normalized) continue;
    let host = "";
    try {
      host = new URL(normalized).hostname;
    } catch {
      continue;
    }
    let matched = false;
    for (const p of patterns) {
      if (!new RegExp(p.hostPattern).test(host)) continue;
      const m = normalized.match(new RegExp(p.idPattern));
      if (m?.[1]) {
        ids.add(`${p.name}:${m[1]}`);
        matched = true;
      }
    }
    if (!matched) {
      const doi = extractDoi(normalized);
      if (doi) ids.add(canonicalizeDoi(doi));
    }
  }
  return [...ids];
}

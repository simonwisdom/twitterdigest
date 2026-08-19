// Core data types shared across the pipeline, storage, and frontend.

export interface Tweet {
  id: string;
  authorHandle: string;
  authorFollowers?: number;
  text: string;
  createdAt: string; // ISO 8601
  urls: string[]; // expanded (non-t.co) URLs, twitter-internal links excluded
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  // Count of retweets we folded into this tweet during dedupe.
  amplification?: number;
  isQuoteOf?: string;
}

export interface FilteredTweet extends Tweet {
  canonicalIds: string[]; // e.g. "arxiv:2408.01234", "doi:10.1101/2026.08.01.123456"
  normalizedUrls: string[];
}

export interface Cluster {
  key: string; // canonical id, normalized URL, or topic slug
  label: string; // human-readable name (paper title unknown at this stage; topic description for news)
  tweetIds: string[];
  canonicalIds: string[];
  urls: string[];
}

export interface RankedCluster extends Cluster {
  score: number;
  tweetCount: number;
  distinctAuthors: number;
  engagement: number;
}

export interface DigestItem {
  headline: string;
  summary: string;
  // id from the theme's `categories` config, when the theme defines categories
  category?: string;
  primaryLinks: { url: string; title: string }[];
  sourceTweets: { url: string; authorHandle: string }[];
  stats: { tweetCount: number; distinctAuthors: number; engagement: number };
}

export interface Digest {
  date: string; // YYYY-MM-DD
  generatedAt: string;
  themes: Record<string, DigestItem[]>;
}

export interface DigestIndexEntry {
  date: string;
  themes: Record<string, number>; // theme id -> item count
}

export interface ThemeCategory {
  id: string;
  label: string;
  color: string; // header band background (white text on top)
}

export interface CanonicalPattern {
  name: string; // id namespace, e.g. "arxiv"
  hostPattern: string; // regex matched against the URL host
  idPattern: string; // regex whose first capture group is the id, matched against the full URL
}

export interface ThemeConfig {
  id: string;
  label: string;
  accounts: string[];
  searchQueries: string[];
  // Prompt text for the classifier — what belongs in this theme.
  inclusionCriteria: string;
  exclusionCriteria: string;
  clusterStrategy: "canonical-link" | "topic";
  canonicalPatterns?: CanonicalPattern[];
  // Preferred hosts for "professional source" links surfaced in the digest.
  primaryLinkHosts?: string[];
  summaryStyle: string;
  // When set, the summarizer also assigns each item one of these categories,
  // rendered as a color-coded header on the digest card.
  categories?: ThemeCategory[];
  fetchAbstracts: boolean;
  topN: number;
  maxTweets: number;
}

export const STAGES = ["fetch", "filter", "cluster", "summarize"] as const;
export type Stage = (typeof STAGES)[number];

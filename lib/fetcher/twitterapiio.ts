import { Tweet } from "@/lib/types";
import { TweetFetcher } from "@/lib/fetcher/types";

// twitterapi.io client. Endpoint paths and response shapes were written against
// their docs as of Aug 2026 — verify against https://docs.twitterapi.io if
// requests start failing; the service iterates.
const BASE = "https://api.twitterapi.io";
const MAX_PAGES_PER_ACCOUNT = 2;
const RETRIES = 5;
// twitterapi.io enforces a strict QPS cap (low on entry-level tiers): all
// requests are serialized through a global throttle with this spacing.
const MIN_INTERVAL_MS = Number(process.env.TWITTERAPI_MIN_INTERVAL_MS ?? 1200);

interface RawTweet {
  id: string;
  text?: string;
  createdAt?: string;
  created_at?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  author?: { userName?: string; followers?: number };
  entities?: { urls?: { expanded_url?: string; url?: string }[] };
  retweeted_tweet?: RawTweet | null;
  quoted_tweet?: RawTweet | null;
}

export class TwitterApiIoFetcher implements TweetFetcher {
  private apiKey: string;
  private log: (msg: string) => void;

  constructor(log: (msg: string) => void = console.log) {
    const key = process.env.TWITTERAPI_IO_KEY;
    if (!key) {
      throw new Error(
        "TWITTERAPI_IO_KEY is not set. Get one at https://twitterapi.io and add it to .env.local"
      );
    }
    this.apiKey = key;
    this.log = log;
  }

  // Global throttle: each request start waits for the previous slot plus
  // MIN_INTERVAL_MS, across all concurrent callers.
  private nextSlot: Promise<void> = Promise.resolve();
  private acquireSlot(): Promise<void> {
    const prev = this.nextSlot;
    let release!: () => void;
    this.nextSlot = new Promise((r) => (release = r));
    return prev.then(() => {
      setTimeout(release, MIN_INTERVAL_MS);
    });
  }

  private async get(pathname: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(BASE + pathname);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    let lastError: unknown;
    for (let i = 0; i < RETRIES; i++) {
      await this.acquireSlot();
      try {
        const res = await fetch(url, {
          headers: { "x-api-key": this.apiKey },
          signal: AbortSignal.timeout(30_000),
        });
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(`twitterapi.io ${res.status} on ${pathname}`);
          this.log(`  rate-limited (${res.status}), backing off ${5 * 2 ** i}s`);
          await sleep(5000 * 2 ** i);
          continue;
        }
        if (!res.ok) {
          throw new Error(
            `twitterapi.io ${res.status} on ${pathname}: ${(await res.text()).slice(0, 300)}`
          );
        }
        const body = (await res.json()) as {
          status?: string;
          code?: number;
          msg?: string;
        };
        // Some errors come back as HTTP 200 with an error envelope.
        if (body.status === "error" || (body.code !== undefined && body.code !== 0)) {
          lastError = new Error(
            `twitterapi.io error envelope on ${pathname}: code=${body.code} msg=${body.msg}`
          );
          await sleep(5000 * 2 ** i);
          continue;
        }
        return body;
      } catch (err) {
        lastError = err;
        await sleep(5000 * 2 ** i);
      }
    }
    throw lastError;
  }

  async userRecentTweets(handle: string, sinceIso: string): Promise<Tweet[]> {
    const since = new Date(sinceIso).getTime();
    const tweets: Tweet[] = [];
    let cursor = "";
    for (let page = 0; page < MAX_PAGES_PER_ACCOUNT; page++) {
      const data = (await this.get("/twitter/user/last_tweets", {
        userName: handle,
        ...(cursor ? { cursor } : {}),
      })) as {
        tweets?: RawTweet[];
        data?: { tweets?: RawTweet[] };
        has_next_page?: boolean;
        next_cursor?: string;
      };
      const raw = data.tweets ?? data.data?.tweets ?? [];
      const normalized = raw.map((t) => normalizeTweet(t, handle));
      tweets.push(...normalized);
      this.log(`  fetched @${handle} page ${page + 1}: ${raw.length} tweets`);
      const oldest = normalized[normalized.length - 1];
      const reachedWindowStart =
        oldest && new Date(oldest.createdAt).getTime() < since;
      if (!data.has_next_page || !data.next_cursor || reachedWindowStart) break;
      cursor = data.next_cursor;
    }
    return tweets;
  }

  async search(query: string, sinceIso: string, maxResults: number): Promise<Tweet[]> {
    // The since: operator uses YYYY-MM-DD_HH:MM:SS_UTC in twitterapi.io queries.
    const sinceOp = new Date(sinceIso)
      .toISOString()
      .slice(0, 19)
      .replace("T", "_") + "_UTC";
    const fullQuery = `${query} since:${sinceOp}`;
    const tweets: Tweet[] = [];
    let cursor = "";
    while (tweets.length < maxResults) {
      const data = (await this.get("/twitter/tweet/advanced_search", {
        query: fullQuery,
        queryType: "Latest",
        ...(cursor ? { cursor } : {}),
      })) as {
        tweets?: RawTweet[];
        has_next_page?: boolean;
        next_cursor?: string;
      };
      const raw = data.tweets ?? [];
      tweets.push(...raw.map((t) => normalizeTweet(t)));
      this.log(`  search "${query}": ${tweets.length} tweets so far`);
      if (!data.has_next_page || !data.next_cursor || raw.length === 0) break;
      cursor = data.next_cursor;
    }
    return tweets.slice(0, maxResults);
  }
}

function normalizeTweet(raw: RawTweet, fallbackHandle = "unknown"): Tweet {
  const urls = (raw.entities?.urls ?? [])
    .map((u) => u.expanded_url ?? u.url ?? "")
    .filter((u) => u && !/(^|\.)((x|twitter)\.com|t\.co)\//.test(u.replace(/^https?:\/\//, "")));
  return {
    id: raw.id,
    authorHandle: raw.author?.userName ?? fallbackHandle,
    authorFollowers: raw.author?.followers,
    text: raw.text ?? "",
    createdAt: parseDate(raw.createdAt ?? raw.created_at),
    urls,
    likeCount: raw.likeCount ?? 0,
    retweetCount: raw.retweetCount ?? 0,
    replyCount: raw.replyCount ?? 0,
    quoteCount: raw.quoteCount ?? 0,
    ...(raw.retweeted_tweet?.id ? { amplification: 1, id: raw.retweeted_tweet.id, text: raw.retweeted_tweet.text ?? raw.text ?? "" } : {}),
    ...(raw.quoted_tweet?.id ? { isQuoteOf: raw.quoted_tweet.id } : {}),
  };
}

function parseDate(s?: string): string {
  if (!s) return new Date(0).toISOString();
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

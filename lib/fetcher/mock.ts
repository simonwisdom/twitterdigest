import fs from "fs/promises";
import path from "path";
import { Tweet } from "@/lib/types";
import { TweetFetcher } from "@/lib/fetcher/types";

// Fixture-backed fetcher for --mock runs: no credentials, no network.
// Fixture timestamps are rewritten to fall inside the requested window so the
// same fixtures work for any --date.
export class MockFetcher implements TweetFetcher {
  private tweets: Tweet[] | null = null;

  private async load(): Promise<Tweet[]> {
    if (this.tweets) return this.tweets;
    const dir = path.join(process.cwd(), "fixtures");
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
    const all: Tweet[] = [];
    for (const f of files) {
      const raw = await fs.readFile(path.join(dir, f), "utf8");
      all.push(...(JSON.parse(raw) as Tweet[]));
    }
    this.tweets = all;
    return all;
  }

  private rewriteTimes(tweets: Tweet[], sinceIso: string): Tweet[] {
    const start = new Date(sinceIso).getTime();
    const span = 23 * 60 * 60 * 1000;
    return tweets.map((t, i) => ({
      ...t,
      createdAt: new Date(start + ((i * 997) % span)).toISOString(),
    }));
  }

  async userRecentTweets(handle: string, sinceIso: string): Promise<Tweet[]> {
    const all = await this.load();
    return this.rewriteTimes(
      all.filter((t) => t.authorHandle.toLowerCase() === handle.toLowerCase()),
      sinceIso
    );
  }

  async search(query: string, sinceIso: string, maxResults: number): Promise<Tweet[]> {
    const all = await this.load();
    // Naive interpretation of "url:HOST ..." queries; other queries match all tweets with URLs.
    const urlOp = query.match(/url:(\S+)/)?.[1];
    const matches = all.filter((t) =>
      urlOp ? t.urls.some((u) => u.includes(urlOp)) : t.urls.length > 0
    );
    return this.rewriteTimes(matches, sinceIso).slice(0, maxResults);
  }
}

import { Tweet } from "@/lib/types";

// Provider boundary: everything that talks to a tweet data source lives behind
// this interface, so the provider (twitterapi.io today) can be swapped in one file.
export interface TweetFetcher {
  // Recent tweets by one account, newest first. Implementations may return
  // tweets older than sinceIso; the pipeline window-filters afterwards.
  userRecentTweets(handle: string, sinceIso: string): Promise<Tweet[]>;
  // Advanced-search query (Twitter search operator syntax).
  search(query: string, sinceIso: string, maxResults: number): Promise<Tweet[]>;
}

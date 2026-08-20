import { extractCanonicalIds, normalizeUrl } from "@/lib/links";
import { historyKey, Storage } from "@/lib/storage";
import {
  Cluster,
  DigestItem,
  FilteredTweet,
  ThemeConfig,
  ThemeHistory,
  ThemeHistoryEntry,
  Tweet,
} from "@/lib/types";

export type HistoryScope = "live" | "fixtures";

const canonicalKey = (id: string) => `canonical:${id}`;
const urlKey = (url: string) => `url:${url}`;

function identitiesForUrls(theme: ThemeConfig, urls: string[]): {
  canonical: string[];
  urls: string[];
} {
  const canonical = extractCanonicalIds(urls, theme.canonicalPatterns).map(
    canonicalKey
  );
  const normalized = urls
    .map(normalizeUrl)
    .filter((url): url is string => url !== null)
    .map(urlKey);
  return {
    canonical: [...new Set(canonical)],
    urls: [...new Set(normalized)],
  };
}

export function dedupeKeysForCluster(
  theme: ThemeConfig,
  cluster: Cluster
): string[] {
  const identities = identitiesForUrls(theme, cluster.urls);
  return [
    ...new Set([
      ...cluster.canonicalIds.map(canonicalKey),
      ...identities.canonical,
      ...identities.urls,
    ]),
  ];
}

// Only entries from an earlier digest suppress work. This deliberately allows
// same-date --force-from reruns and historical backfills.
export function seenKeysBefore(
  history: ThemeHistory,
  date: string
): Set<string> {
  return new Set(
    history.entries
      .filter((entry) => entry.firstSeenDate < date)
      .flatMap((entry) => entry.keys)
  );
}

export function filterPreviouslySeenTweets<T extends Tweet | FilteredTweet>(
  theme: ThemeConfig,
  tweets: T[],
  seen: Set<string>
): T[] {
  if (seen.size === 0) return tweets;
  return tweets.filter((tweet) => {
    const identities = identitiesForUrls(theme, tweet.urls);
    if (identities.canonical.length > 0) {
      // Keep a multi-paper tweet when at least one paper is new.
      return !identities.canonical.every((key) => seen.has(key));
    }
    // Opportunity calls generally lack canonical ids. Any previously seen
    // normalized call/listing URL is enough to identify the item.
    return !identities.urls.some((key) => seen.has(key));
  });
}

export function filterPreviouslySeenClusters(
  theme: ThemeConfig,
  clusters: Cluster[],
  seen: Set<string>
): Cluster[] {
  if (seen.size === 0) return clusters;
  return clusters.filter((cluster) => {
    if (theme.clusterStrategy === "canonical-link") {
      const primary = cluster.key.startsWith("url:")
        ? urlKey(cluster.key.slice(4))
        : canonicalKey(cluster.key);
      return !seen.has(primary);
    }
    return !dedupeKeysForCluster(theme, cluster).some((key) => seen.has(key));
  });
}

export async function loadThemeHistory(
  storage: Storage,
  scope: HistoryScope,
  themeId: string
): Promise<ThemeHistory> {
  return (
    (await storage.getJson<ThemeHistory>(historyKey(scope, themeId))) ?? {
      version: 1,
      themeId,
      updatedAt: new Date(0).toISOString(),
      entries: [],
    }
  );
}

export async function recordThemeHistory(
  storage: Storage,
  scope: HistoryScope,
  theme: ThemeConfig,
  date: string,
  items: DigestItem[]
): Promise<void> {
  if (items.length === 0) return;
  const history = await loadThemeHistory(storage, scope, theme.id);

  for (const item of items) {
    const primaryIdentities = identitiesForUrls(
      theme,
      item.primaryLinks.map((link) => link.url)
    );
    const keys =
      item.dedupeKeys && item.dedupeKeys.length > 0
        ? item.dedupeKeys
        : [...primaryIdentities.canonical, ...primaryIdentities.urls];
    const uniqueKeys = [...new Set(keys)];
    if (uniqueKeys.length === 0) continue;

    const keySet = new Set(uniqueKeys);
    const overlaps = history.entries.filter((entry) =>
      entry.keys.some((key) => keySet.has(key))
    );
    const overlapSet = new Set(overlaps);
    history.entries = history.entries.filter((entry) => !overlapSet.has(entry));

    const seenDates = [
      date,
      ...overlaps.flatMap((entry) => [entry.firstSeenDate, entry.lastSeenDate]),
    ].sort();
    const merged: ThemeHistoryEntry = {
      keys: [
        ...new Set([
          ...uniqueKeys,
          ...overlaps.flatMap((entry) => entry.keys),
        ]),
      ],
      firstSeenDate: seenDates[0],
      lastSeenDate: seenDates[seenDates.length - 1],
      headline: item.headline,
      ...(item.category ? { category: item.category } : {}),
      primaryLinks: item.primaryLinks,
    };
    history.entries.push(merged);
  }

  history.entries.sort((a, b) =>
    b.firstSeenDate.localeCompare(a.firstSeenDate)
  );
  history.updatedAt = new Date().toISOString();
  await storage.putJson(historyKey(scope, theme.id), history);
}

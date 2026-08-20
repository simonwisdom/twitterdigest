import { Cluster, FilteredTweet, RankedCluster, ThemeConfig } from "@/lib/types";
import { engagement } from "@/lib/pipeline/fetch";

// Pure ranking: breadth of discussion (distinct authors) dominates; engagement
// is log-damped so one viral tweet can't swamp a widely-discussed topic.
// Multi-author clusters always outrank single-author ones, but single-author
// clusters can fill remaining topN slots — on current Twitter most papers get
// exactly one substantive tweet, and a hard >=2-author floor starves the
// canonical-link digest.
export function rankClusters(
  theme: ThemeConfig,
  clusters: Cluster[],
  tweets: FilteredTweet[]
): RankedCluster[] {
  const byId = new Map(tweets.map((t) => [t.id, t]));
  const ranked: RankedCluster[] = [];
  for (const c of clusters) {
    const members = c.tweetIds
      .map((id) => byId.get(id))
      .filter((t): t is FilteredTweet => t !== undefined);
    if (members.length === 0) continue;
    const distinctAuthors = new Set(members.map((t) => t.authorHandle)).size;
    const totalEngagement = members.reduce((sum, t) => sum + engagement(t), 0);
    ranked.push({
      ...c,
      tweetCount: members.length,
      distinctAuthors,
      engagement: totalEngagement,
      score:
        3 * distinctAuthors + members.length + Math.log2(1 + totalEngagement),
    });
  }
  ranked.sort((a, b) => {
    const aMulti = a.distinctAuthors >= 2 ? 1 : 0;
    const bMulti = b.distinctAuthors >= 2 ? 1 : 0;
    if (aMulti !== bMulti) return bMulti - aMulti;
    return b.score - a.score;
  });

  // A tweet linking two papers seeds two clusters containing the same tweet(s);
  // a cluster whose tweets are a subset of an already-selected cluster's is the
  // same discussion again — skip it.
  const selected: RankedCluster[] = [];
  for (const c of ranked) {
    if (selected.length >= theme.topN) break;
    const isSubset = selected.some((s) => {
      const set = new Set(s.tweetIds);
      return c.tweetIds.every((id) => set.has(id));
    });
    if (!isSubset) selected.push(c);
  }
  return selected;
}

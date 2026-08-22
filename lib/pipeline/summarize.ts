import { MODEL_SMART } from "@/lib/openrouter";
import { buildEvidenceNote } from "@/lib/format";
import { safeTruncate } from "@/lib/text";
import { extractCanonicalIds } from "@/lib/links";
import { resolveAbstract } from "@/lib/abstracts";
import { fetchCallPage } from "@/lib/pages";
import {
  Cluster,
  DigestItem,
  FilteredTweet,
  OpportunityFunding,
  OpportunityMeta,
  RankedCluster,
  ThemeConfig,
} from "@/lib/types";
import { PipelineCtx, pMap } from "@/lib/pipeline/index";
import { engagement } from "@/lib/pipeline/fetch";
import { rankClusters } from "@/lib/pipeline/rank";
import { dedupeKeysForCluster } from "@/lib/history";

const CONCURRENCY = 3;
const MAX_TWEETS_IN_PROMPT = 25;
const MAX_SOURCE_TWEET_LINKS = 10;

const FUNDING_IDS: OpportunityFunding[] = [
  "fully-funded",
  "partially-funded",
  "self-funded",
  "funding-unclear",
];

export async function summarizeStage(
  ctx: PipelineCtx,
  theme: ThemeConfig,
  clusters: Cluster[],
  tweets: FilteredTweet[]
): Promise<DigestItem[]> {
  const ranked = rankClusters(theme, clusters, tweets);
  ctx.log(
    `[${theme.id}] summarize: top ${ranked.length} clusters (of ${clusters.length})`
  );
  const byId = new Map(tweets.map((t) => [t.id, t]));

  const items = await pMap(
    ranked,
    async (cluster, i) => {
      try {
        const item = await summarizeCluster(ctx, theme, cluster, byId);
        ctx.log(
          `[${theme.id}] summarize: ${i + 1}/${ranked.length} "${item.headline.slice(0, 60)}"`
        );
        return item;
      } catch (err) {
        ctx.log(
          `[${theme.id}] summarize: cluster "${cluster.key}" FAILED: ${String(err)}`
        );
        return null;
      }
    },
    CONCURRENCY
  );
  return items.filter((i): i is DigestItem => i !== null);
}

async function summarizeCluster(
  ctx: PipelineCtx,
  theme: ThemeConfig,
  cluster: RankedCluster,
  byId: Map<string, FilteredTweet>
): Promise<DigestItem> {
  const members = cluster.tweetIds
    .map((id) => byId.get(id))
    .filter((t): t is FilteredTweet => t !== undefined)
    .sort((a, b) => engagement(b) - engagement(a));

  const paper =
    theme.fetchAbstracts && !ctx.mock
      ? await resolveAbstract(cluster.canonicalIds, cluster.urls)
      : null;

  const page =
    theme.fetchPages && !ctx.mock ? await fetchCallPage(cluster.urls) : null;

  const tweetListing = members
    .slice(0, MAX_TWEETS_IN_PROMPT)
    .map(
      (t) =>
        `- @${t.authorHandle} (${engagement(t)} engagement): ${safeTruncate(t.text, 500).replace(/\n/g, " ")}`
    )
    .join("\n");

  const paperSection = paper
    ? `\n\nPaper title: ${paper.title ?? "(unknown)"}\nAbstract (from ${paper.source}):\n${paper.abstract ?? "(unavailable)"}`
    : theme.fetchAbstracts
      ? "\n\nAbstract unavailable — base the summary only on the tweet discussion and hedge accordingly."
      : "";

  const pageSection = page
    ? `\n\nLinked page content (fetched from ${page.url}):\n${page.text}`
    : theme.fetchPages
      ? "\n\nThe linked page could not be fetched — base the summary only on the tweet discussion, hedge accordingly, and say the account is based on the linked discussion."
      : "";

  const linkHint = theme.primaryLinkHosts?.length
    ? `\nPrefer primaryLinks whose host matches one of: ${theme.primaryLinkHosts.join(", ")} — but only URLs that appear in the list above.`
    : "";

  const categoryIds = theme.categories?.map((c) => c.id);
  const categoryField = categoryIds ? ', "category": "..."' : "";
  const categoryHint = categoryIds
    ? `\ncategory must be exactly one of: ${categoryIds.join(", ")}.`
    : "";

  // Evidence-based themes also get a study-type caption. Only the design/scale
  // phrase comes from the model; the summary's basis (abstract vs discussion)
  // is appended in code from what the pipeline actually fetched.
  const studyTypeField = theme.fetchAbstracts ? ', "studyType": "..."' : "";
  const studyTypeHint = theme.fetchAbstracts
    ? `\nstudyType is a short plain-English phrase naming the study design and scale exactly as the source states it, e.g. "Randomized trial of 1,200 adults" or "Meta-analysis of 24 cohort studies". If the design is not stated, write "Study type unclear" — never guess.`
    : "";

  // Opportunity themes also get a structured deadline/location/funding strip.
  const oppField = theme.extractOpportunityMeta
    ? ', "deadline": "...", "location": "...", "funding": "..."'
    : "";
  const oppHint = theme.extractOpportunityMeta
    ? `\ndeadline is the application deadline as an ISO date (YYYY-MM-DD) exactly as stated in the source, or null when the source does not state one — never guess or infer a date. location is "City, Country" for in-person opportunities, "Remote" when participation is online-only, or null when not stated. funding must be exactly one of: ${FUNDING_IDS.join(", ")}.`
    : "";

  const system = `You write one item for a weekly "${theme.label}" digest built from Twitter discussion.
Digest date: ${ctx.date}. Interpret deadlines and time-sensitive claims relative to this date.
Style: ${theme.summaryStyle}
Respond ONLY with JSON:
{"headline": "...", "summary": "...", "primaryLinks": [{"url": "...", "title": "..."}]${categoryField}${studyTypeField}${oppField}}
primaryLinks must be chosen from the URLs provided — never invent URLs. headline is a specific, factual title (max 100 chars).${categoryHint}${studyTypeHint}${oppHint}${linkHint}`;

  const prompt = `Topic: ${cluster.label}

Tweets discussing it:
${tweetListing}

URLs appearing in the discussion:
${cluster.urls.slice(0, 20).join("\n") || "(none)"}${paperSection}${pageSection}`;

  const result = await ctx.llm.json<{
    headline: string;
    summary: string;
    primaryLinks: { url: string; title: string }[];
    category?: string;
    studyType?: string;
    deadline?: string | null;
    location?: string | null;
    funding?: string | null;
  }>({
    model: MODEL_SMART,
    system,
    prompt,
    maxTokens: 2000,
    mock: () => ({
      headline: `[mock] ${cluster.label.slice(0, 80)}`,
      summary: members[0]?.text.slice(0, 300) ?? "(no tweets)",
      primaryLinks: cluster.urls.slice(0, 2).map((u) => ({ url: u, title: u })),
      category: categoryIds?.[categoryIds.length - 1],
      ...(theme.fetchAbstracts ? { studyType: "Study type unclear" } : {}),
      ...(theme.extractOpportunityMeta
        ? {
            deadline: "2026-12-31",
            location: "Mock City, Mockland",
            funding: "funding-unclear",
          }
        : {}),
    }),
  });

  // Guard against invented links: keep only URLs actually in the cluster.
  const known = new Set(cluster.urls);
  const primaryLinks = (result.primaryLinks ?? []).filter((l) => known.has(l.url));

  // The model paraphrases (and sometimes garbles) link titles. When the
  // abstract resolver gave us the paper's exact title, use it verbatim for any
  // link that points at that paper.
  if (paper?.title) {
    for (const link of primaryLinks) {
      const ids = extractCanonicalIds([link.url], theme.canonicalPatterns);
      if (ids.some((id) => cluster.canonicalIds.includes(id))) {
        link.title = paper.title;
      }
    }
  }

  // Unknown category ids fall back to "other" (or drop if no such category).
  const category = categoryIds?.includes(result.category ?? "")
    ? result.category
    : categoryIds?.includes("other")
      ? "other"
      : undefined;

  // Validate extracted opportunity meta: a malformed deadline or location is
  // dropped rather than displayed; funding falls back to "funding-unclear".
  let opportunity: OpportunityMeta | undefined;
  if (theme.extractOpportunityMeta) {
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(result.deadline ?? "")
      ? result.deadline!
      : undefined;
    const location = result.location?.trim() || undefined;
    const funding = FUNDING_IDS.includes(result.funding as OpportunityFunding)
      ? (result.funding as OpportunityFunding)
      : "funding-unclear";
    opportunity = {
      ...(deadline ? { deadline } : {}),
      ...(location ? { location } : {}),
      funding,
    };
  }

  return {
    headline: result.headline,
    summary: result.summary,
    ...(categoryIds ? { category } : {}),
    ...(theme.fetchAbstracts
      ? {
          evidenceNote: buildEvidenceNote(
            result.studyType,
            Boolean(paper?.abstract)
          ),
        }
      : {}),
    ...(opportunity ? { opportunity } : {}),
    ...(page?.image ? { image: page.image } : {}),
    primaryLinks,
    sourceTweets: members.slice(0, MAX_SOURCE_TWEET_LINKS).map((t) => ({
      url: `https://x.com/${t.authorHandle}/status/${t.id}`,
      authorHandle: t.authorHandle,
    })),
    stats: {
      tweetCount: cluster.tweetCount,
      distinctAuthors: cluster.distinctAuthors,
      engagement: cluster.engagement,
    },
    dedupeKeys: dedupeKeysForCluster(theme, cluster),
  };
}

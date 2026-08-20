import { THEMES } from "@/config/themes";
import { LlmClient } from "@/lib/openrouter";
import { TweetFetcher } from "@/lib/fetcher/types";
import { Storage, digestKey, indexKey, stageKey } from "@/lib/storage";
import {
  Digest,
  DigestIndexEntry,
  DigestItem,
  Stage,
  STAGES,
  ThemeConfig,
} from "@/lib/types";
import { fetchStage } from "@/lib/pipeline/fetch";
import { filterStage } from "@/lib/pipeline/filter";
import { clusterStage } from "@/lib/pipeline/cluster";
import { summarizeStage } from "@/lib/pipeline/summarize";
import {
  filterPreviouslySeenClusters,
  filterPreviouslySeenTweets,
  HistoryScope,
  loadThemeHistory,
  recordThemeHistory,
  seenKeysBefore,
} from "@/lib/history";

export interface PipelineCtx {
  date: string; // YYYY-MM-DD — source windows end at 11:00 UTC on this date
  storage: Storage;
  fetcher: TweetFetcher;
  llm: LlmClient;
  mock: boolean;
  historyScope: HistoryScope;
  forceFrom?: Stage;
  log: (msg: string) => void;
}

const STAGE_FILES: Record<Stage, string> = {
  fetch: "01-raw",
  filter: "02-filtered",
  cluster: "03-clusters",
  summarize: "04-digest-items",
};

function shouldForce(ctx: PipelineCtx, stage: Stage): boolean {
  if (!ctx.forceFrom) return false;
  return STAGES.indexOf(stage) >= STAGES.indexOf(ctx.forceFrom);
}

// Run one stage with checkpointing: skip (and return the stored result) when a
// checkpoint exists, unless --force-from covers this stage.
async function runStage<T>(
  ctx: PipelineCtx,
  theme: ThemeConfig,
  stage: Stage,
  run: () => Promise<T>
): Promise<T> {
  const key = stageKey(ctx.date, theme.id, STAGE_FILES[stage]);
  if (!shouldForce(ctx, stage)) {
    const cached = await ctx.storage.getJson<T>(key);
    if (cached !== null) {
      ctx.log(`[${theme.id}] ${stage}: checkpoint exists, skipping`);
      return cached;
    }
  }
  const started = Date.now();
  const result = await run();
  await ctx.storage.putJson(key, result);
  ctx.log(
    `[${theme.id}] ${stage}: done in ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
  return result;
}

export async function runThemePipeline(
  ctx: PipelineCtx,
  theme: ThemeConfig
): Promise<DigestItem[]> {
  const raw = await runStage(ctx, theme, "fetch", () => fetchStage(ctx, theme));
  const history = await loadThemeHistory(
    ctx.storage,
    ctx.historyScope,
    theme.id
  );
  const seen = seenKeysBefore(history, ctx.date);
  const unseenRaw = filterPreviouslySeenTweets(theme, raw, seen);
  ctx.log(
    `[${theme.id}] history: skipped ${raw.length - unseenRaw.length} previously processed tweets; ${unseenRaw.length} remain`
  );
  const filtered = await runStage(ctx, theme, "filter", () =>
    filterStage(ctx, theme, unseenRaw)
  );
  const clusters = await runStage(ctx, theme, "cluster", () =>
    clusterStage(ctx, theme, filtered)
  );
  const unseenClusters = filterPreviouslySeenClusters(theme, clusters, seen);
  ctx.log(
    `[${theme.id}] history: skipped ${clusters.length - unseenClusters.length} previously processed clusters; ${unseenClusters.length} remain`
  );
  const items = await runStage(ctx, theme, "summarize", () =>
    summarizeStage(ctx, theme, unseenClusters, filtered)
  );
  await recordThemeHistory(
    ctx.storage,
    ctx.historyScope,
    theme,
    ctx.date,
    items
  );
  return items;
}

export async function runPipeline(
  ctx: PipelineCtx,
  themeIds?: string[]
): Promise<Digest> {
  const themes = THEMES.filter((t) => !themeIds || themeIds.includes(t.id));
  if (themes.length === 0) {
    throw new Error(`No themes matched ${JSON.stringify(themeIds)}`);
  }

  const digest: Digest = {
    date: ctx.date,
    generatedAt: new Date().toISOString(),
    themes: {},
  };
  for (const theme of themes) {
    ctx.log(`=== theme: ${theme.id} ===`);
    digest.themes[theme.id] = await runThemePipeline(ctx, theme);
  }

  // Merge with any themes already present for this date (per-theme runs).
  const existing = await ctx.storage.getJson<Digest>(digestKey(ctx.date));
  if (existing) {
    digest.themes = { ...existing.themes, ...digest.themes };
  }
  await ctx.storage.putJson(digestKey(ctx.date), digest);

  const index =
    (await ctx.storage.getJson<DigestIndexEntry[]>(indexKey())) ?? [];
  const entry: DigestIndexEntry = {
    date: ctx.date,
    themes: Object.fromEntries(
      Object.entries(digest.themes).map(([id, items]) => [id, items.length])
    ),
  };
  const next = [entry, ...index.filter((e) => e.date !== ctx.date)].sort(
    (a, b) => b.date.localeCompare(a.date)
  );
  await ctx.storage.putJson(indexKey(), next);

  ctx.log(
    `digest ${ctx.date} written: ` +
      Object.entries(digest.themes)
        .map(([id, items]) => `${id}=${items.length}`)
        .join(", ")
  );
  return digest;
}

// Rolling source window ending at the cron hour (11:00 UTC).
export function windowFor(
  date: string,
  lookbackDays = 1
): { sinceIso: string; untilIso: string } {
  if (!Number.isInteger(lookbackDays) || lookbackDays < 1) {
    throw new Error(`lookbackDays must be a positive integer, got ${lookbackDays}`);
  }
  const end = new Date(`${date}T11:00:00Z`).getTime();
  return {
    sinceIso: new Date(end - lookbackDays * 24 * 60 * 60 * 1000).toISOString(),
    untilIso: new Date(end).toISOString(),
  };
}

// Small concurrency-limited map used by several stages.
export async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i], i);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

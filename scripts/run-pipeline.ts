// Local pipeline runner — the dev loop and the production fallback.
//
//   npm run pipeline -- --mock --date 2026-08-18
//   npm run pipeline -- --date 2026-08-20 --theme longevity --force-from filter
//
// Loads .env.local itself (no --env-file needed). Local runs default to .data/;
// GitHub Actions sets DIGEST_DATA_DIR=data for committed durable output.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createLlm } from "@/lib/openrouter";
import { MockFetcher } from "@/lib/fetcher/mock";
import { TwitterApiIoFetcher } from "@/lib/fetcher/twitterapiio";
import { createStorage } from "@/lib/storage";
import { Stage, STAGES } from "@/lib/types";
import { PipelineCtx, runPipeline } from "@/lib/pipeline/index";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main() {
  const mock = flag("mock");
  // --mock-fetch: fixture tweets but real LLM calls — for testing prompts
  // without a twitterapi.io key.
  const mockFetch = mock || flag("mock-fetch");
  const date = arg("date") ?? new Date().toISOString().slice(0, 10);
  const themeArg = arg("theme");
  const forceFrom = arg("force-from") as Stage | undefined;
  if (forceFrom && !STAGES.includes(forceFrom)) {
    throw new Error(`--force-from must be one of: ${STAGES.join(", ")}`);
  }

  const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
  const ctx: PipelineCtx = {
    date,
    storage: createStorage(),
    fetcher: mockFetch ? new MockFetcher() : new TwitterApiIoFetcher(log),
    llm: createLlm({ mock }),
    mock,
    historyScope: mockFetch ? "fixtures" : "live",
    forceFrom,
    log,
  };

  log(
    `pipeline start: date=${date} mock=${mock} mockFetch=${mockFetch} storage=${process.env.DIGEST_DATA_DIR ?? ".data"}` +
      (themeArg ? ` theme=${themeArg}` : "") +
      (forceFrom ? ` force-from=${forceFrom}` : "")
  );
  const digest = await runPipeline(ctx, themeArg ? [themeArg] : undefined);
  for (const [themeId, items] of Object.entries(digest.themes)) {
    console.log(`\n=== ${themeId} (${items.length} items) ===`);
    items.forEach((item, i) =>
      console.log(
        `${i + 1}. ${item.headline} [${item.stats.tweetCount} tweets / ${item.stats.distinctAuthors} authors]`
      )
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

# twitternews

Daily themed digest of Twitter/X discussion. Each day a pipeline fetches tweets
from curated accounts + search queries, filters them per theme, clusters them by
topic, ranks by breadth of discussion, and writes an LLM-summarized digest
browsable by date.

Themes are pure config (`config/themes.ts`): **science** (papers/preprints —
summarizes the paper via its abstract plus the Twitter commentary) and **news**
(serious world events — "just the facts" with links to professional sources).
Adding a theme = adding one config entry.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in keys (see comments in the file)
```

- `ANTHROPIC_API_KEY` — required for real runs.
- `TWITTERAPI_IO_KEY` — required for real tweet fetching (twitterapi.io,
  ~$0.15/1k tweets).
- `BLOB_READ_WRITE_TOKEN` — optional locally; without it, data goes to `.data/`.
- `CRON_SECRET` — required in production for the cron endpoint.

## Run the pipeline

```bash
npm run pipeline -- --mock --date 2026-08-18        # fixtures + mock LLM, no keys needed
npm run pipeline -- --mock-fetch --date 2026-08-18  # fixtures + real LLM (tests prompts)
npm run pipeline -- --date 2026-08-18               # full real run
npm run pipeline -- --date 2026-08-18 --theme science --force-from filter
```

Every stage checkpoints to storage (`pipeline/{date}/{theme}/0N-*.json`); a
re-run skips completed stages, so failed runs resume where they died.
`--force-from <fetch|filter|cluster|summarize>` re-runs from that stage onward.

## View

```bash
npm run dev   # http://localhost:3000 — redirects to the latest digest
```

`/digest/[date]?theme=news` for a specific day/theme, `/archive` for all dates.

## Production (Vercel)

`vercel.json` schedules `/api/cron/digest` daily at 11:00 UTC. The route
requires `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it
automatically once the env var is set). Manual backfill:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://<app>/api/cron/digest?date=2026-08-17"
```

If a run times out, hit the endpoint again — it resumes from checkpoints.
`?theme=science` limits a run to one theme.

## Cost

Roughly $2/day at default caps (`maxTweets: 1500`/theme): ~$0.5–0.7 twitterapi.io,
~$0.8 Haiku filtering/clustering, ~$0.75 Sonnet summaries. Tune via `maxTweets`,
`topN`, and the `min_faves` thresholds in the search queries.

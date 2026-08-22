# twitterdigest

A weekly static digest of Twitter/X discussion, published on GitHub Pages. The
pipeline fetches posts, filters and clusters them, writes LLM summaries, and
exports a static site with no runtime server or exposed API keys.

The configured themes are **Practical Longevity** (human evidence with an
actionability/uncertainty check) and **Artist Opportunities** (currently open
European residencies plus grants, prizes, commissions, and fellowships a
Europe-based artist can apply to, presented as application briefs).

## Local setup

```bash
npm install
cp .env.example .env.local
```

- `OPENROUTER_API_KEY` — required for real LLM runs.
- `OPENROUTER_MODEL` — defaults to `google/gemini-3.7-flash`. Optional
  `OPENROUTER_MODEL_FAST` and `OPENROUTER_MODEL_SMART` values override the
  filtering/clustering and summarization tiers.
- `TWITTERAPI_IO_KEY` — required for real tweet fetching.
- `TWITTERAPI_MIN_INTERVAL_MS` — optional request spacing; defaults to 5000 to
  avoid entry-tier rate limits.
- `DIGEST_DATA_DIR` — optional storage root; local runs default to `.data/`.

## Run and view locally

```bash
npm run pipeline -- --mock                         # fixtures + mock LLM
npm run pipeline -- --mock-fetch --theme longevity # fixtures + real LLM
npm run pipeline -- --theme longevity               # full real run
npm run dev -- --port 3001                           # http://localhost:3001
```

Every stage checkpoints to
`pipeline/{date}/{theme}/0N-*.json`. `--force-from
<fetch|filter|cluster|summarize>` reruns that stage and everything after it.

Completed items are recorded in a per-theme ledger under `history/live/`.
Later rolling-window runs skip matching DOI, PubMed, and normalized URL
identities before filtering and summarization. Mock data uses
`history/fixtures/`, so it never suppresses a live item.

The homepage contains every published refresh, newest first and grouped by
date. Theme tabs switch between the longevity and artist-opportunity feeds; there
are no separate archive or per-date pages.

## Topic configuration

Edit `config/themes.ts`. Each theme defines source searches, inclusion and
exclusion rules, summary instructions, categories, `topN`, `lookbackDays`, and
`maxTweets`.

- Longevity looks back 14 days and labels items `Applicable now`, `Discuss with
  a clinician`, or `Research watch`.
- Artist opportunities look back 30 days, reject expired/unverifiable calls,
  and label items by opportunity type (residency, grant, prize, commission,
  fellowship/program); funding level is stated in the summary text. The
  summarizer fetches the linked call page (`fetchPages`) to ground summaries
  and capture an og:image, and `tasteNotes` steers borderline filter
  decisions toward the reader's preferences.

## Weekly GitHub Pages deployment

The repository contains two workflows:

- `refresh-weekly-digest` runs Mondays at 11:00 UTC and can also be started
  manually. It generates the digest and commits only `data/digests/` and
  `data/history/`; raw pipeline checkpoints are ignored.
- `deploy-pages` runs after changes reach `main` or after the weekly refresh
  completes, exports the static Next.js site, and deploys `out/` to GitHub Pages.

Repository setup:

1. Add `OPENROUTER_API_KEY` and `TWITTERAPI_IO_KEY` under **Settings → Secrets
   and variables → Actions**.
2. Under **Settings → Pages**, choose **GitHub Actions** as the source.
3. Run **refresh-weekly-digest** once from the Actions tab to publish the first
   real digest.

The project Pages URL is:

`https://simonwisdom.github.io/twitterdigest/`

For a local production export using the committed data directory:

```bash
DIGEST_DATA_DIR=data NEXT_PUBLIC_BASE_PATH=/twitterdigest npm run build
```

The generated site is written to `out/`.

## Cost controls

Twitter and LLM spend varies with search volume and model pricing. Current caps
are 800 longevity tweets and 600 residency tweets, with at most 12 and 15 new
items summarized per refresh. Adjust `maxTweets`, `topN`, and query
`min_faves` thresholds in `config/themes.ts`.

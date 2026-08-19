import { NextRequest, NextResponse } from "next/server";
import { createLlm } from "@/lib/claude";
import { TwitterApiIoFetcher } from "@/lib/fetcher/twitterapiio";
import { createStorage } from "@/lib/storage";
import { PipelineCtx, runPipeline } from "@/lib/pipeline/index";

// Sweeper / manual trigger. The primary daily run is the GitHub Action
// (.github/workflows/daily-digest.yml) — it has no duration limit. This route
// resumes from stage checkpoints, so a cron hit after the Action's window
// finishes whatever is left (or no-ops cheaply). Requires
// "Authorization: Bearer <CRON_SECRET>". ?theme= limits to one theme;
// ?date=YYYY-MM-DD backfills. 300s is the Hobby-plan ceiling.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date =
    request.nextUrl.searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);
  const theme = request.nextUrl.searchParams.get("theme") ?? undefined;

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  const ctx: PipelineCtx = {
    date,
    storage: createStorage(),
    fetcher: new TwitterApiIoFetcher(log),
    llm: createLlm(),
    mock: false,
    log,
  };

  try {
    const digest = await runPipeline(ctx, theme ? [theme] : undefined);
    return NextResponse.json({
      ok: true,
      date,
      themes: Object.fromEntries(
        Object.entries(digest.themes).map(([id, items]) => [id, items.length])
      ),
      logs,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, date, error: String(err), logs },
      { status: 500 }
    );
  }
}

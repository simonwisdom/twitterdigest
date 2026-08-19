import { notFound } from "next/navigation";
import { getTheme, THEMES } from "@/config/themes";
import { createStorage, digestKey, indexKey } from "@/lib/storage";
import { Digest, DigestIndexEntry } from "@/lib/types";
import DateNav from "@/components/DateNav";
import DigestItemCard from "@/components/DigestItemCard";
import ThemeTabs from "@/components/ThemeTabs";

export const dynamic = "force-dynamic";

export default async function DigestPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { date } = await params;
  const { theme: themeParam } = await searchParams;

  const storage = createStorage();
  const [digest, index] = await Promise.all([
    storage.getJson<Digest>(digestKey(date)),
    storage.getJson<DigestIndexEntry[]>(indexKey()),
  ]);
  if (!digest) notFound();

  const themeIds = Object.keys(digest.themes);
  const activeTheme =
    themeParam && themeIds.includes(themeParam) ? themeParam : themeIds[0];
  const items = digest.themes[activeTheme] ?? [];

  // index is newest-first
  const dates = (index ?? []).map((e) => e.date);
  const i = dates.indexOf(date);
  const next = i > 0 ? dates[i - 1] : undefined;
  const prev = i >= 0 && i < dates.length - 1 ? dates[i + 1] : undefined;

  const tabs = themeIds.map((id) => ({
    id,
    label: getTheme(id)?.label ?? id,
    count: digest.themes[id].length,
  }));

  const categoryById = new Map(
    (getTheme(activeTheme)?.categories ?? []).map((c) => [c.id, c])
  );

  return (
    <main className="space-y-10">
      <header className="space-y-5">
        <h1 className="font-headline text-5xl sm:text-6xl">Daily Twitter Digest</h1>
        <DateNav date={date} prev={prev} next={next} theme={activeTheme} />
        <ThemeTabs date={date} themes={tabs} active={activeTheme} />
      </header>

      {items.length === 0 ? (
        <p className="text-muted">No items for this theme on {date}.</p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {items.map((item, idx) => (
            <DigestItemCard
              key={idx}
              item={item}
              category={
                item.category ? categoryById.get(item.category) : undefined
              }
            />
          ))}
        </div>
      )}

      <footer className="pt-4 text-xs text-muted">
        Generated {new Date(digest.generatedAt).toUTCString()} · themes:{" "}
        {THEMES.map((t) => t.label).join(", ")}
      </footer>
    </main>
  );
}

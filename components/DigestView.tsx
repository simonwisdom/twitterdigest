"use client";

import { useState } from "react";
import { Digest, ThemeCategory } from "@/lib/types";
import DateNav from "@/components/DateNav";
import DigestItemCard from "@/components/DigestItemCard";
import ThemeTabs from "@/components/ThemeTabs";

interface ThemePresentation {
  id: string;
  label: string;
  categories: ThemeCategory[];
}

export default function DigestView({
  digest,
  themes,
  prev,
  next,
}: {
  digest: Digest;
  themes: ThemePresentation[];
  prev?: string;
  next?: string;
}) {
  const themeIds = Object.keys(digest.themes);
  const initialTheme =
    themeIds.find((id) => digest.themes[id].length > 0) ?? themeIds[0] ?? "";
  const [activeTheme, setActiveTheme] = useState(initialTheme);
  const items = digest.themes[activeTheme] ?? [];
  const theme = themes.find((candidate) => candidate.id === activeTheme);
  const categoryById = new Map(
    (theme?.categories ?? []).map((category) => [category.id, category])
  );
  const tabs = themeIds.map((id) => ({
    id,
    label: themes.find((candidate) => candidate.id === id)?.label ?? id,
    count: digest.themes[id].length,
  }));

  return (
    <main className="space-y-10">
      <header className="space-y-5">
        <h1 className="font-headline text-5xl sm:text-6xl">Weekly Digest</h1>
        <DateNav date={digest.date} prev={prev} next={next} />
        <ThemeTabs
          themes={tabs}
          active={activeTheme}
          onSelect={setActiveTheme}
        />
      </header>

      {items.length === 0 ? (
        <p className="text-foreground/65">
          No new items for this theme in the latest refresh.
        </p>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {items.map((item, index) => (
            <DigestItemCard
              key={`${item.headline}-${index}`}
              item={item}
              category={
                item.category ? categoryById.get(item.category) : undefined
              }
            />
          ))}
        </div>
      )}

      <footer className="pt-4 text-xs text-foreground/60">
        Generated {new Date(digest.generatedAt).toUTCString()} · themes:{" "}
        {themes.map((candidate) => candidate.label).join(", ")}
      </footer>
    </main>
  );
}

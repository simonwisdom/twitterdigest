"use client";

import { useState } from "react";
import { Digest, ThemeCategory } from "@/lib/types";
import DigestItemCard from "@/components/DigestItemCard";
import ThemeTabs from "@/components/ThemeTabs";

interface ThemePresentation {
  id: string;
  label: string;
  categories: ThemeCategory[];
}

export default function DigestView({
  digests,
  themes,
}: {
  digests: Digest[];
  themes: ThemePresentation[];
}) {
  const themeIds = themes
    .map((theme) => theme.id)
    .filter((id) => digests.some((digest) => id in digest.themes));
  const initialTheme =
    themeIds.find((id) =>
      digests.some((digest) => (digest.themes[id]?.length ?? 0) > 0)
    ) ?? themeIds[0] ?? "";
  const [activeTheme, setActiveTheme] = useState(initialTheme);
  const theme = themes.find((candidate) => candidate.id === activeTheme);
  const categoryById = new Map(
    (theme?.categories ?? []).map((category) => [category.id, category])
  );
  const tabs = themeIds.map((id) => ({
    id,
    label: themes.find((candidate) => candidate.id === id)?.label ?? id,
    count: digests.reduce(
      (total, digest) => total + (digest.themes[id]?.length ?? 0),
      0
    ),
  }));
  const editions = digests
    .map((digest) => ({
      date: digest.date,
      generatedAt: digest.generatedAt,
      items: digest.themes[activeTheme] ?? [],
    }))
    .filter((edition) => edition.items.length > 0);

  return (
    <main className="space-y-10">
      <header className="space-y-5">
        <h1 className="font-headline text-5xl sm:text-6xl">Weekly Digest</h1>
        <p className="max-w-2xl text-foreground/65">
          All published entries, newest first. Refreshed once a week.
        </p>
        <ThemeTabs
          themes={tabs}
          active={activeTheme}
          onSelect={setActiveTheme}
        />
      </header>

      {editions.length === 0 ? (
        <p className="text-foreground/65">
          No published items for this theme yet.
        </p>
      ) : (
        editions.map((edition) => (
          <section key={edition.date} className="space-y-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
              <h2 className="font-headline text-3xl">{edition.date}</h2>
              <span className="text-sm text-foreground/60">
                {edition.items.length} {edition.items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              {edition.items.map((item, index) => (
                <DigestItemCard
                  key={`${edition.date}-${item.headline}-${index}`}
                  item={item}
                  category={
                    item.category
                      ? categoryById.get(item.category)
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      <footer className="pt-4 text-xs text-foreground/60">
        Last generated {new Date(digests[0].generatedAt).toUTCString()} · themes:{" "}
        {themes.map((candidate) => candidate.label).join(", ")}
      </footer>
    </main>
  );
}

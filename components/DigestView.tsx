"use client";

import { useEffect, useState } from "react";
import { Digest, ThemeCategory } from "@/lib/types";
import DigestItemCard from "@/components/DigestItemCard";
import ThemeTabs from "@/components/ThemeTabs";
import CategoryFilter from "@/components/CategoryFilter";
import { formatEditionDate, formatEditionDateShort } from "@/lib/format";

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // The active theme lives in the URL hash so views are linkable and the back
  // button works. Hashes that are not theme ids (edition anchors) are ignored.
  useEffect(() => {
    const applyHash = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (themeIds.includes(hash)) {
        setActiveTheme(hash);
        setActiveCategory(null);
      } else if (hash === "") {
        // Back button to the bare URL restores the default view.
        setActiveTheme(initialTheme);
        setActiveCategory(null);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
    // themeIds derives from static props; joining keeps the dep primitive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeIds.join(",")]);

  const selectTheme = (id: string) => {
    setActiveTheme(id);
    setActiveCategory(null);
    window.location.hash = id;
  };

  const theme = themes.find((candidate) => candidate.id === activeTheme);
  const tabs = themeIds.map((id) => ({
    id,
    label: themes.find((candidate) => candidate.id === id)?.label ?? id,
    count: digests.reduce(
      (total, digest) => total + (digest.themes[id]?.length ?? 0),
      0
    ),
  }));

  const categoryCounts = new Map<string, number>();
  for (const digest of digests) {
    for (const item of digest.themes[activeTheme] ?? []) {
      if (item.category) {
        categoryCounts.set(
          item.category,
          (categoryCounts.get(item.category) ?? 0) + 1
        );
      }
    }
  }

  const editions = digests
    .map((digest) => ({
      date: digest.date,
      generatedAt: digest.generatedAt,
      items: (digest.themes[activeTheme] ?? []).filter(
        (item) => activeCategory === null || item.category === activeCategory
      ),
    }))
    .filter((edition) => edition.items.length > 0);

  return (
    <main className="space-y-10">
      <header className="space-y-5">
        <h1 className="font-headline text-4xl font-bold text-accent sm:text-5xl">
          Weekly Digest
        </h1>
        <p className="max-w-2xl text-foreground/75">
          All published entries, newest first. Refreshed once a week. Summaries
          are AI-generated from the linked sources and X discussion — click
          through to the source before acting on anything here.
        </p>
        <ThemeTabs themes={tabs} active={activeTheme} onSelect={selectTheme} />
        <CategoryFilter
          categories={theme?.categories ?? []}
          counts={categoryCounts}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
        {editions.length > 1 && (
          <nav
            aria-label="Editions"
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-foreground/75"
          >
            <span>Jump to:</span>
            {editions.map((edition) => (
              <a
                key={edition.date}
                href={`#${edition.date}`}
                className="hover:underline"
              >
                {formatEditionDateShort(edition.date)}
              </a>
            ))}
          </nav>
        )}
      </header>

      {editions.length === 0 ? (
        <p className="text-foreground/75">
          No published items for this selection yet.
        </p>
      ) : (
        editions.map((edition) => (
          <section
            key={edition.date}
            id={edition.date}
            className="scroll-mt-6 space-y-5"
          >
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
              <h2 className="font-headline text-3xl">
                {formatEditionDate(edition.date)}
              </h2>
              <span className="text-sm text-foreground/70">
                {edition.items.length}{" "}
                {edition.items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="grid items-start gap-6 sm:grid-cols-2">
              {edition.items.map((item, index) => (
                <DigestItemCard
                  key={`${edition.date}-${item.headline}-${index}`}
                  item={item}
                  editionDate={edition.date}
                  category={
                    item.category
                      ? theme?.categories.find(
                          (category) => category.id === item.category
                        )
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      <footer className="flex flex-wrap items-baseline gap-x-3 pt-4 text-xs text-foreground/70">
        <span>
          Last generated {new Date(digests[0].generatedAt).toUTCString()} ·
          themes: {themes.map((candidate) => candidate.label).join(", ")}
        </span>
        <a href="feed.xml" className="text-accent hover:underline">
          RSS
        </a>
      </footer>
    </main>
  );
}

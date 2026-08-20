"use client";

import { ThemeCategory } from "@/lib/types";

// Chip row for filtering the active theme's items by category. The active
// chip's description doubles as the legend for what the label means.
export default function CategoryFilter({
  categories,
  counts,
  active,
  onSelect,
}: {
  categories: ThemeCategory[];
  counts: Map<string, number>;
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  const shown = categories.filter((c) => (counts.get(c.id) ?? 0) > 0);
  if (shown.length < 2) return null;

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const activeCategory = shown.find((c) => c.id === active);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={active === null}
          className={
            "rounded-full px-3 py-1 text-xs " +
            (active === null
              ? "bg-foreground text-background"
              : "border border-border bg-card hover:border-muted")
          }
        >
          All <span className="opacity-60">({total})</span>
        </button>
        {shown.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => onSelect(active === category.id ? null : category.id)}
            aria-pressed={active === category.id}
            title={category.description}
            className={
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs " +
              (active === category.id
                ? "text-white"
                : "border border-border bg-card hover:border-muted")
            }
            style={
              active === category.id
                ? { backgroundColor: category.color }
                : undefined
            }
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  active === category.id ? "white" : category.color,
              }}
            />
            {category.label}{" "}
            <span className="opacity-60">({counts.get(category.id)})</span>
          </button>
        ))}
      </div>
      {activeCategory?.description && (
        <p className="text-sm text-foreground/75">{activeCategory.description}</p>
      )}
    </div>
  );
}

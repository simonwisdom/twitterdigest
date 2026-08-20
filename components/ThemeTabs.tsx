"use client";

export default function ThemeTabs({
  themes,
  active,
  onSelect,
}: {
  themes: { id: string; label: string; count: number }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Digest themes">
      {themes.map((t) => (
        <button
          type="button"
          key={t.id}
          onClick={() => onSelect(t.id)}
          aria-pressed={t.id === active}
          className={
            "rounded-full px-4 py-1.5 text-sm " +
            (t.id === active
              ? "bg-foreground text-background"
              : "border border-border bg-card hover:border-muted")
          }
        >
          {t.label} <span className="opacity-60">({t.count})</span>
        </button>
      ))}
    </nav>
  );
}

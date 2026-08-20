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
    <nav
      className="flex flex-wrap gap-6 border-b border-border"
      aria-label="Digest themes"
    >
      {themes.map((t) => (
        <button
          type="button"
          key={t.id}
          onClick={() => onSelect(t.id)}
          aria-pressed={t.id === active}
          className={
            "-mb-px border-b-[3px] pb-2.5 text-sm " +
            (t.id === active
              ? "border-accent font-semibold text-foreground"
              : "border-transparent font-medium text-muted hover:text-foreground")
          }
        >
          {t.label} <span className="opacity-60">({t.count})</span>
        </button>
      ))}
    </nav>
  );
}

import Link from "next/link";

export default function ThemeTabs({
  date,
  themes,
  active,
}: {
  date: string;
  themes: { id: string; label: string; count: number }[];
  active: string;
}) {
  return (
    <nav className="flex gap-2">
      {themes.map((t) => (
        <Link
          key={t.id}
          href={`/digest/${date}?theme=${t.id}`}
          className={
            "rounded-full px-4 py-1.5 text-sm " +
            (t.id === active
              ? "bg-foreground text-background"
              : "border border-border bg-card hover:border-muted")
          }
        >
          {t.label} <span className="opacity-60">({t.count})</span>
        </Link>
      ))}
    </nav>
  );
}

import Link from "next/link";

export default function DateNav({
  date,
  prev,
  next,
}: {
  date: string;
  prev?: string;
  next?: string;
}) {
  const link = (d: string) => `/digest/${d}`;
  return (
    <div className="flex items-center gap-3 text-sm">
      {prev ? (
        <Link href={link(prev)} className="font-medium text-blue-900 hover:underline">
          ← {prev}
        </Link>
      ) : (
        <span className="text-foreground/60">←</span>
      )}
      <span className="font-medium">{date}</span>
      {next ? (
        <Link href={link(next)} className="font-medium text-blue-900 hover:underline">
          {next} →
        </Link>
      ) : (
        <span className="text-foreground/60">→</span>
      )}
      <Link href="/archive" className="ml-auto text-foreground/70 hover:underline">
        archive
      </Link>
    </div>
  );
}

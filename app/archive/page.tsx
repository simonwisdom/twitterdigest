import Link from "next/link";
import { getTheme } from "@/config/themes";
import { createStorage, indexKey } from "@/lib/storage";
import { DigestIndexEntry } from "@/lib/types";

export default async function ArchivePage() {
  const index =
    (await createStorage().getJson<DigestIndexEntry[]>(indexKey())) ?? [];

  return (
    <main className="space-y-6">
      <h1 className="font-headline text-4xl">Digest Archive</h1>
      {index.length === 0 ? (
        <p className="text-muted">No digests yet.</p>
      ) : (
        <ul className="space-y-2">
          {index.map((entry) => (
            <li key={entry.date}>
              <Link
                href={`/digest/${entry.date}`}
                className="text-accent hover:underline"
              >
                {entry.date}
              </Link>{" "}
              <span className="text-sm text-foreground/70">
                {Object.entries(entry.themes)
                  .map(
                    ([id, count]) =>
                      `${getTheme(id)?.label ?? id}: ${count}`
                  )
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

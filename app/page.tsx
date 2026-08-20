import Link from "next/link";
import { THEMES } from "@/config/themes";
import DigestView from "@/components/DigestView";
import { createStorage, digestKey, indexKey } from "@/lib/storage";
import { Digest, DigestIndexEntry } from "@/lib/types";

export default async function Home() {
  const storage = createStorage();
  const index =
    (await storage.getJson<DigestIndexEntry[]>(indexKey())) ?? [];
  const latestDate = index[0]?.date;
  const digest = latestDate
    ? await storage.getJson<Digest>(digestKey(latestDate))
    : null;

  if (!digest) {
    return (
      <main className="space-y-4">
        <h1 className="font-headline text-5xl sm:text-6xl">Weekly Digest</h1>
        <p className="text-foreground/65">
          No digest has been published yet. Run the weekly refresh workflow to
          create the first one.
        </p>
        <Link href="/archive" className="text-accent hover:underline">
          View archive
        </Link>
      </main>
    );
  }

  return (
    <DigestView
      digest={digest}
      themes={THEMES.map(({ id, label, categories }) => ({
        id,
        label,
        categories: categories ?? [],
      }))}
      prev={index[1]?.date}
    />
  );
}

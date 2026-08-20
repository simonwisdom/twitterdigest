import { THEMES } from "@/config/themes";
import DigestView from "@/components/DigestView";
import { createStorage, digestKey, indexKey } from "@/lib/storage";
import { Digest, DigestIndexEntry } from "@/lib/types";

export default async function Home() {
  const storage = createStorage();
  const index =
    (await storage.getJson<DigestIndexEntry[]>(indexKey())) ?? [];
  const digests = (
    await Promise.all(
      index.map((entry) => storage.getJson<Digest>(digestKey(entry.date)))
    )
  ).filter((digest): digest is Digest => digest !== null);

  if (digests.length === 0) {
    return (
      <main className="space-y-4">
        <h1 className="font-headline text-5xl sm:text-6xl">Weekly Digest</h1>
        <p className="text-foreground/65">
          No digest has been published yet. Run the weekly refresh workflow to
          create the first one.
        </p>
      </main>
    );
  }

  return (
    <DigestView
      digests={digests}
      themes={THEMES.map(({ id, label, categories }) => ({
        id,
        label,
        categories: categories ?? [],
      }))}
    />
  );
}

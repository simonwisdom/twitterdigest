import { notFound } from "next/navigation";
import { THEMES } from "@/config/themes";
import DigestView from "@/components/DigestView";
import { createStorage, digestKey, indexKey } from "@/lib/storage";
import { Digest, DigestIndexEntry } from "@/lib/types";

export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ date: string }[]> {
  const index =
    (await createStorage().getJson<DigestIndexEntry[]>(indexKey())) ?? [];
  return index.map((entry) => ({ date: entry.date }));
}

export default async function DigestPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const storage = createStorage();
  const [digest, index] = await Promise.all([
    storage.getJson<Digest>(digestKey(date)),
    storage.getJson<DigestIndexEntry[]>(indexKey()),
  ]);
  if (!digest) notFound();

  const dates = (index ?? []).map((entry) => entry.date);
  const position = dates.indexOf(date);
  const next = position > 0 ? dates[position - 1] : undefined;
  const prev =
    position >= 0 && position < dates.length - 1
      ? dates[position + 1]
      : undefined;

  return (
    <DigestView
      digest={digest}
      themes={THEMES.map(({ id, label, categories }) => ({
        id,
        label,
        categories: categories ?? [],
      }))}
      prev={prev}
      next={next}
    />
  );
}

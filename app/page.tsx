import { redirect } from "next/navigation";
import { createStorage, indexKey } from "@/lib/storage";
import { DigestIndexEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const index = await createStorage().getJson<DigestIndexEntry[]>(indexKey());
  if (index && index.length > 0) {
    redirect(`/digest/${index[0].date}`);
  }
  return (
    <main>
      <h1 className="font-headline text-4xl">twitternews</h1>
      <p className="mt-4 text-muted">
        No digests yet. Run the pipeline to generate the first one.
      </p>
    </main>
  );
}

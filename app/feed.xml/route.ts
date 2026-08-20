import { THEMES } from "@/config/themes";
import { createStorage, digestKey, indexKey } from "@/lib/storage";
import { Digest, DigestIndexEntry } from "@/lib/types";

// Rendered once at build time into out/feed.xml by the static export.
export const dynamic = "force-static";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://simonwisdom.github.io/twitterdigest";
const MAX_FEED_ITEMS = 100;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const storage = createStorage();
  const index = (await storage.getJson<DigestIndexEntry[]>(indexKey())) ?? [];
  const digests = (
    await Promise.all(
      index.map((entry) => storage.getJson<Digest>(digestKey(entry.date)))
    )
  ).filter((digest): digest is Digest => digest !== null);

  const items: string[] = [];
  for (const digest of digests) {
    if (items.length >= MAX_FEED_ITEMS) break;
    const pubDate = new Date(digest.generatedAt).toUTCString();
    for (const theme of THEMES) {
      for (const item of digest.themes[theme.id] ?? []) {
        if (items.length >= MAX_FEED_ITEMS) break;
        const link =
          item.primaryLinks[0]?.url ?? `${SITE_URL}/#${theme.id}`;
        const categoryLabel = theme.categories?.find(
          (category) => category.id === item.category
        )?.label;
        items.push(
          [
            "    <item>",
            `      <title>${escapeXml(`${theme.label}: ${item.headline}`)}</title>`,
            `      <link>${escapeXml(link)}</link>`,
            `      <guid isPermaLink="false">${escapeXml(
              `${digest.date}/${theme.id}/${item.headline}`
            )}</guid>`,
            `      <pubDate>${pubDate}</pubDate>`,
            ...(categoryLabel
              ? [`      <category>${escapeXml(categoryLabel)}</category>`]
              : []),
            `      <description>${escapeXml(item.summary)}</description>`,
            "    </item>",
          ].join("\n")
        );
      }
    }
  }

  const lastBuildDate = digests[0]
    ? new Date(digests[0].generatedAt).toUTCString()
    : new Date(0).toUTCString();

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>Weekly Digest</title>",
    `    <link>${escapeXml(`${SITE_URL}/`)}</link>`,
    "    <description>A weekly digest of practical longevity research and European art residencies</description>",
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

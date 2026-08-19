import { DigestItem, ThemeCategory } from "@/lib/types";

// Presentation contract: summary is the dominant content; primary links are
// normal-weight; source tweets are ONE muted footer line of plain <a> links —
// never an embed, widget, or quoted tweet text.
export default function DigestItemCard({
  item,
  category,
}: {
  item: DigestItem;
  category?: ThemeCategory;
}) {
  const shownTweets = item.sourceTweets.slice(0, 5);
  const extra = item.stats.tweetCount - shownTweets.length;

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {category && (
        <div
          className="px-8 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: category.color }}
        >
          {category.label}
        </div>
      )}
      <div className="p-8">
      <h2 className="font-headline text-3xl leading-tight">{item.headline}</h2>
      <p className="mt-5 whitespace-pre-line leading-relaxed">{item.summary}</p>

      {item.primaryLinks.length > 0 && (
        <ul className="mt-3 space-y-1">
          {item.primaryLinks.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-accent hover:underline"
              >
                {link.title || link.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-border pt-2 text-xs text-muted">
        Discussion: {item.stats.tweetCount} tweets from {item.stats.distinctAuthors}{" "}
        authors ·{" "}
        {shownTweets.map((t, i) => (
          <span key={t.url}>
            {i > 0 && ", "}
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              @{t.authorHandle}
            </a>
          </span>
        ))}
        {extra > 0 && ` +${extra}`}
      </p>
      </div>
    </article>
  );
}

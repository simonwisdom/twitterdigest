import { DigestItem, ThemeCategory } from "@/lib/types";
import { linkLabel, splitSummary } from "@/lib/format";

// Presentation contract: the takeaway (or lead) is the dominant content, with
// the rest of the summary behind a native disclosure; primary links are
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
  const summary = splitSummary(item.summary);

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {category && (
        <div
          className="px-8 py-1.5 text-xs font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: category.color }}
          title={category.description}
        >
          {category.label}
        </div>
      )}
      <div className="p-8">
        <h3 className="font-headline text-2xl leading-tight">{item.headline}</h3>

        {item.evidenceNote && (
          <p className="mt-2 text-xs text-muted">{item.evidenceNote}</p>
        )}

        <p className="mt-4 leading-relaxed">
          {summary.isTakeaway && (
            <strong className="font-semibold">Practical meaning: </strong>
          )}
          {summary.visible}
        </p>

        {summary.rest && (
          <details className="mt-3 group">
            <summary className="cursor-pointer text-sm text-accent select-none">
              <span className="group-open:hidden">Full summary</span>
              <span className="hidden group-open:inline">Hide full summary</span>
            </summary>
            <p className="mt-2 whitespace-pre-line leading-relaxed">
              {summary.rest}
            </p>
          </details>
        )}

        {item.primaryLinks.length > 0 && (
          <ul className="mt-4 space-y-1">
            {item.primaryLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-accent hover:underline"
                >
                  {linkLabel(link)}
                </a>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 border-t border-border pt-2 text-xs text-muted">
          Discussion: {item.stats.tweetCount} tweets from{" "}
          {item.stats.distinctAuthors} authors ·{" "}
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

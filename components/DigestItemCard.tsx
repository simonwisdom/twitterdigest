import { DigestItem, ThemeCategory } from "@/lib/types";
import {
  describeDeadline,
  linkLabel,
  splitEvidenceNote,
  splitSummary,
} from "@/lib/format";

// Presentation contract (Examine-inspired skin): category chip on the top
// row, Lora headline, study type or
// deadline/location as a muted caption, the takeaway in a tinted callout,
// remaining summary behind a native disclosure; source tweets stay ONE muted
// footer line of plain <a> links — never an embed, widget, or quoted tweet
// text.
export default function DigestItemCard({
  item,
  category,
  editionDate,
}: {
  item: DigestItem;
  category?: ThemeCategory;
  editionDate: string;
}) {
  const shownTweets = item.sourceTweets.slice(0, 5);
  const extra = item.stats.tweetCount - shownTweets.length;
  const summary = splitSummary(item.summary);
  const evidence = splitEvidenceNote(item.evidenceNote);
  const opportunity = item.opportunity;
  const deadline = opportunity
    ? describeDeadline(opportunity.deadline, editionDate)
    : null;

  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
      {category && (
        <span
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
          style={{ color: category.color }}
          title={category.description}
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          {category.label}
        </span>
      )}

      <h3 className="mt-2.5 font-headline text-xl leading-snug font-semibold">
        {item.headline}
      </h3>

      {evidence?.studyType && (
        <p className="mt-1.5 text-xs text-muted">{evidence.studyType}</p>
      )}

      {deadline && (
        <p className="mt-1.5 text-xs text-muted">
          <span
            className={
              deadline.tone === "normal"
                ? undefined
                : "font-semibold text-danger-fg"
            }
          >
            {deadline.text}
          </span>
          {opportunity?.location && <> · {opportunity.location}</>}
        </p>
      )}

      {item.image && (
        // Hotlinked og:image from the call page; static export has no image
        // pipeline, and a broken/blocked image simply hides itself.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="mt-3 max-h-40 w-full rounded-md border border-border object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {summary.isTakeaway ? (
        <div className="mt-3 rounded-md bg-accent-tint px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
            Practical meaning
          </p>
          <p className="mt-1 text-sm leading-relaxed">{summary.visible}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed">{summary.visible}</p>
      )}

      {summary.rest && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm text-accent select-none">
            <span className="group-open:hidden">Full summary</span>
            <span className="hidden group-open:inline">Hide full summary</span>
          </summary>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
            {summary.rest}
          </p>
        </details>
      )}

      {item.primaryLinks.length > 0 && (
        <ul className="mt-3 space-y-1">
          {item.primaryLinks.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words text-sm text-accent hover:underline"
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
    </article>
  );
}

// Presentation helpers for rendering digest content. Pure functions, no DOM.

export interface SplitSummary {
  // The always-visible line: the "Practical meaning:" takeaway when the
  // summary has one, otherwise the opening sentence(s).
  visible: string;
  // Whether `visible` is a takeaway (rendered with its label) or just a lead.
  isTakeaway: boolean;
  // The remaining text, shown behind a disclosure. Empty when the whole
  // summary fits in `visible`.
  rest: string;
}

const TAKEAWAY_MARKER = /practical meaning:\s*/i;
const MAX_LEAD_LENGTH = 240;

export function splitSummary(summary: string): SplitSummary {
  const text = summary.trim();
  const match = TAKEAWAY_MARKER.exec(text);
  if (match) {
    return {
      visible: text.slice(match.index + match[0].length).trim(),
      isTakeaway: true,
      rest: text.slice(0, match.index).trim(),
    };
  }

  const sentences = text.split(/(?<=[.!?])\s+/);
  let lead = sentences[0] ?? "";
  if (
    sentences.length > 1 &&
    lead.length + sentences[1].length + 1 <= MAX_LEAD_LENGTH
  ) {
    lead = `${lead} ${sentences[1]}`;
  }
  return {
    visible: lead,
    isTakeaway: false,
    rest: text.slice(lead.length).trim(),
  };
}

// Human label for a link: its title when present, otherwise the host name
// instead of a raw URL. A title that just repeats the URL counts as missing.
export function linkLabel(link: { url: string; title: string }): string {
  const title = link.title.trim();
  if (title && title !== link.url) return title;
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return link.url;
  }
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// "2026-08-20" -> "Week of August 20, 2026". Parses the parts directly so the
// result never shifts with the viewer's timezone.
export function formatEditionDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const name = MONTHS[month - 1];
  if (!name || !day || !year) return date;
  return `Week of ${name} ${day}, ${year}`;
}

// Short form for navigation: "Aug 20, 2026".
export function formatEditionDateShort(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const name = MONTHS[month - 1];
  if (!name || !day || !year) return date;
  return `${name.slice(0, 3)} ${day}, ${year}`;
}

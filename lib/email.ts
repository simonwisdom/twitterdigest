import { THEMES } from "@/config/themes";
import {
  describeDeadline,
  formatEditionDate,
  formatEditionDateShort,
  fundingLabel,
  linkLabel,
  splitSummary,
} from "@/lib/format";
import { Digest, DigestItem, ThemeConfig } from "@/lib/types";

export const DEFAULT_DIGEST_SITE_URL =
  "https://simonwisdom.github.io/twitterdigest";

export interface RenderedDigestEmail {
  subject: string;
  html: string;
  text: string;
}

interface ThemeEdition {
  config: ThemeConfig;
  items: DigestItem[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlText(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizedSiteUrl(value: string): string {
  return (safeHttpUrl(value) ?? DEFAULT_DIGEST_SITE_URL).replace(/\/$/, "");
}

function categoryFor(theme: ThemeConfig, item: DigestItem) {
  return theme.categories?.find((category) => category.id === item.category);
}

function themeEditions(digest: Digest): ThemeEdition[] {
  const knownIds = new Set(THEMES.map((theme) => theme.id));
  const known = THEMES.map((config) => ({
    config,
    items: digest.themes[config.id] ?? [],
  }));
  const unknown = Object.entries(digest.themes)
    .filter(([id]) => !knownIds.has(id))
    .map(([id, items]) => ({
      config: {
        id,
        label: id,
        accounts: [],
        searchQueries: [],
        inclusionCriteria: "",
        exclusionCriteria: "",
        clusterStrategy: "topic" as const,
        summaryStyle: "",
        fetchAbstracts: false,
        topN: items.length,
        maxTweets: 0,
      },
      items,
    }));
  return [...known, ...unknown].filter((edition) => edition.items.length > 0);
}

function itemMeta(
  theme: ThemeConfig,
  item: DigestItem,
  date: string,
  includeCategory = true
): string[] {
  const category = categoryFor(theme, item);
  const meta = [
    includeCategory ? category?.label : undefined,
    item.evidenceNote,
  ].filter((value): value is string => Boolean(value));
  if (item.opportunity) {
    meta.push(describeDeadline(item.opportunity.deadline, date).text);
    if (item.opportunity.location) meta.push(item.opportunity.location);
    if (item.opportunity.funding) {
      meta.push(fundingLabel(item.opportunity.funding));
    }
  }
  return meta;
}

function renderHtmlItem(
  theme: ThemeConfig,
  item: DigestItem,
  date: string
): string {
  const category = categoryFor(theme, item);
  const categoryColor = /^#[0-9a-f]{6}$/i.test(category?.color ?? "")
    ? category!.color
    : "#8a4f32";
  const summary = splitSummary(item.summary);
  const meta = itemMeta(theme, item, date, false);
  const primaryLinks = item.primaryLinks
    .map((link) => ({ ...link, safeUrl: safeHttpUrl(link.url) }))
    .filter((link) => link.safeUrl !== null);
  const sourceTweets = item.sourceTweets
    .slice(0, 5)
    .map((tweet) => ({ ...tweet, safeUrl: safeHttpUrl(tweet.url) }))
    .filter((tweet) => tweet.safeUrl !== null);
  const extraTweets = Math.max(0, item.stats.tweetCount - sourceTweets.length);

  return `
    <tr>
      <td style="padding:0 0 18px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #ddd7cf;border-radius:8px;background:#ffffff">
          <tr>
            <td style="padding:22px">
              ${
                category
                  ? `<div style="margin:0 0 8px;color:${categoryColor};font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(category.label)}</div>`
                  : ""
              }
              <h3 style="margin:0;color:#27231f;font-family:Georgia,serif;font-size:22px;line-height:1.25">${escapeHtml(item.headline)}</h3>
              ${
                meta.length > 0
                  ? `<p style="margin:8px 0 0;color:#716a62;font-family:Arial,sans-serif;font-size:12px;line-height:1.5">${meta.map(escapeHtml).join(" &middot; ")}</p>`
                  : ""
              }
              ${
                summary.isTakeaway
                  ? `<div style="margin:16px 0 0;padding:13px 15px;border-radius:6px;background:#f5eee8"><div style="margin:0 0 5px;color:#8a4f32;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Practical meaning</div><p style="margin:0;color:#27231f;font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${htmlText(summary.visible)}</p></div>${summary.rest ? `<p style="margin:14px 0 0;color:#403b36;font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${htmlText(summary.rest)}</p>` : ""}`
                  : `<p style="margin:14px 0 0;color:#403b36;font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${htmlText(item.summary)}</p>`
              }
              ${
                primaryLinks.length > 0
                  ? `<div style="margin:14px 0 0">${primaryLinks
                      .map(
                        (link) =>
                          `<div style="margin:5px 0"><a href="${escapeHtml(link.safeUrl!)}" style="color:#8a4f32;font-family:Arial,sans-serif;font-size:14px;text-decoration:underline">${escapeHtml(linkLabel(link))}</a></div>`
                      )
                      .join("")}</div>`
                  : ""
              }
              ${
                sourceTweets.length > 0
                  ? `<p style="margin:16px 0 0;padding-top:10px;border-top:1px solid #ece8e2;color:#716a62;font-family:Arial,sans-serif;font-size:12px;line-height:1.5">Discussion: ${item.stats.tweetCount} tweets from ${item.stats.distinctAuthors} authors &middot; ${sourceTweets
                      .map(
                        (tweet) =>
                          `<a href="${escapeHtml(tweet.safeUrl!)}" style="color:#716a62;text-decoration:underline">@${escapeHtml(tweet.authorHandle)}</a>`
                      )
                      .join(", ")}${extraTweets > 0 ? ` +${extraTweets}` : ""}</p>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderTextItem(
  theme: ThemeConfig,
  item: DigestItem,
  date: string
): string {
  const meta = itemMeta(theme, item, date);
  const links = item.primaryLinks
    .map((link) => ({ label: linkLabel(link), url: safeHttpUrl(link.url) }))
    .filter((link): link is { label: string; url: string } => link.url !== null)
    .map((link) => `${link.label}: ${link.url}`);
  return [
    item.headline,
    ...(meta.length > 0 ? [meta.join(" · ")] : []),
    "",
    item.summary,
    ...(links.length > 0 ? ["", ...links] : []),
  ].join("\n");
}

export function renderDigestEmail(
  digest: Digest,
  siteUrl = DEFAULT_DIGEST_SITE_URL
): RenderedDigestEmail {
  const editions = themeEditions(digest);
  const itemCount = editions.reduce(
    (total, edition) => total + edition.items.length,
    0
  );
  const itemLabel = `${itemCount} new ${itemCount === 1 ? "item" : "items"}`;
  const subject = `Weekly Digest — ${formatEditionDateShort(digest.date)} — ${itemLabel}`;
  const siteRoot = normalizedSiteUrl(siteUrl);

  const sections = editions
    .map(
      ({ config, items }) => `
        <tr>
          <td style="padding:18px 0 12px">
            <h2 style="margin:0;color:#8a4f32;font-family:Georgia,serif;font-size:27px;line-height:1.2">${escapeHtml(config.label)}</h2>
            <p style="margin:5px 0 0;color:#716a62;font-family:Arial,sans-serif;font-size:12px">${items.length} ${items.length === 1 ? "item" : "items"}</p>
          </td>
        </tr>
        ${items.map((item) => renderHtmlItem(config, item, digest.date)).join("")}`
    )
    .join("");

  const emptyState =
    itemCount === 0
      ? `<tr><td style="padding:24px 0;color:#403b36;font-family:Arial,sans-serif;font-size:15px;line-height:1.6">No new items passed the filters this week.</td></tr>`
      : "";

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
  <body style="margin:0;padding:0;background:#f6f3ef">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(`${itemLabel} across ${editions.length} ${editions.length === 1 ? "theme" : "themes"}.`)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3ef">
      <tr>
        <td align="center" style="padding:28px 14px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px">
            <tr>
              <td style="padding:0 0 18px">
                <p style="margin:0 0 6px;color:#8a4f32;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">${escapeHtml(formatEditionDate(digest.date))}</p>
                <h1 style="margin:0;color:#27231f;font-family:Georgia,serif;font-size:38px;line-height:1.15">Weekly Digest</h1>
                <p style="margin:10px 0 0;color:#716a62;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${escapeHtml(itemLabel)}. Summaries are AI-generated from linked sources and X discussion; click through before acting on them.</p>
              </td>
            </tr>
            ${sections}${emptyState}
            <tr>
              <td align="center" style="padding:14px 0 8px">
                <a href="${escapeHtml(`${siteRoot}/`)}" style="display:inline-block;padding:11px 17px;border-radius:6px;background:#8a4f32;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none">Open the full digest</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:12px 0 0;color:#8a837b;font-family:Arial,sans-serif;font-size:11px;line-height:1.5">Generated ${escapeHtml(new Date(digest.generatedAt).toUTCString())}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textSections = editions.map(({ config, items }) =>
    [
      config.label.toUpperCase(),
      `${items.length} ${items.length === 1 ? "item" : "items"}`,
      "",
      items.map((item) => renderTextItem(config, item, digest.date)).join("\n\n---\n\n"),
    ].join("\n")
  );
  const text = [
    "WEEKLY DIGEST",
    formatEditionDate(digest.date),
    itemLabel,
    "",
    ...(textSections.length > 0
      ? textSections
      : ["No new items passed the filters this week."]),
    "",
    `Full digest: ${siteRoot}/`,
    "",
    "Summaries are AI-generated from linked sources and X discussion; click through before acting on them.",
  ].join("\n");

  return { subject, html, text };
}

export interface ResendEmailOptions {
  apiKey: string;
  from: string;
  to: string[];
  idempotencyKey: string;
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export async function sendEmailViaResend(
  email: RenderedDigestEmail,
  options: ResendEmailOptions,
  fetchImpl: FetchLike = fetch
): Promise<{ id: string }> {
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": options.idempotencyKey,
    },
    body: JSON.stringify({
      from: options.from,
      to: options.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  const raw = await response.text();
  let data: { id?: string; message?: string } = {};
  try {
    data = JSON.parse(raw) as { id?: string; message?: string };
  } catch {
    // Keep the stable HTTP error below when the provider returns non-JSON.
  }
  if (!response.ok || !data.id) {
    const detail = data.message ? `: ${data.message}` : "";
    throw new Error(`Resend email request failed (${response.status})${detail}`);
  }
  return { id: data.id };
}

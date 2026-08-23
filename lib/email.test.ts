import assert from "node:assert/strict";
import { test } from "node:test";
import { Digest } from "./types";
import { renderDigestEmail, sendEmailViaResend } from "./email";

const digest: Digest = {
  date: "2026-08-24",
  generatedAt: "2026-08-24T11:15:00.000Z",
  themes: {
    longevity: [
      {
        headline: "Exercise <script>alert('x')</script>",
        summary:
          "A randomized trial found a modest benefit. Practical meaning: regular movement may help.",
        category: "applicable-now",
        evidenceNote:
          "Randomized trial · summary based on the abstract",
        primaryLinks: [
          { url: "https://example.org/study", title: "Original study" },
          { url: "javascript:alert(1)", title: "Unsafe link" },
        ],
        sourceTweets: [
          { url: "https://x.com/researcher/status/1", authorHandle: "researcher" },
        ],
        stats: { tweetCount: 1, distinctAuthors: 1, engagement: 42 },
      },
    ],
    "art-residencies": [
      {
        headline: "New media residency",
        summary: "A supported residency for artists working with sound and code.",
        category: "residency",
        opportunity: {
          deadline: "2026-09-01",
          location: "Berlin, Germany",
          funding: "fully-funded",
        },
        primaryLinks: [
          { url: "https://example.org/apply", title: "Apply" },
        ],
        sourceTweets: [],
        stats: { tweetCount: 2, distinctAuthors: 2, engagement: 10 },
      },
    ],
  },
};

test("renderDigestEmail renders every theme in HTML and plain text", () => {
  const email = renderDigestEmail(digest, "https://digest.example.test/base/");
  assert.equal(
    email.subject,
    "Weekly Digest — Aug 24, 2026 — 2 new items"
  );
  assert.match(email.html, /Practical Longevity/);
  assert.match(email.html, /Artist Opportunities/);
  assert.match(email.html, /Deadline September 1, 2026/);
  assert.match(email.html, /Fully funded/);
  assert.match(email.html, /https:\/\/digest\.example\.test\/base\//);
  assert.match(email.text, /Original study: https:\/\/example\.org\/study/);
  assert.match(email.text, /A supported residency/);
});

test("renderDigestEmail escapes content and drops unsafe links", () => {
  const email = renderDigestEmail(digest);
  assert.ok(!email.html.includes("<script>alert"));
  assert.match(email.html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assert.ok(!email.html.includes('href="javascript:'));
  assert.ok(!email.text.includes("javascript:alert"));
});

test("renderDigestEmail produces a useful empty edition message", () => {
  const email = renderDigestEmail({ ...digest, themes: {} });
  assert.match(email.subject, /0 new items/);
  assert.match(email.html, /No new items passed the filters this week/);
  assert.match(email.text, /No new items passed the filters this week/);
});

test("sendEmailViaResend sends both formats with an idempotency key", async () => {
  const email = renderDigestEmail(digest);
  let request: { input?: string; init?: RequestInit } = {};
  const result = await sendEmailViaResend(
    email,
    {
      apiKey: "re_test",
      from: "Digest <digest@example.org>",
      to: ["reader@example.org"],
      idempotencyKey: "weekly-digest-2026-08-24",
    },
    async (input, init) => {
      request = { input: input.toString(), init };
      return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
    }
  );

  assert.deepEqual(result, { id: "email_123" });
  assert.equal(request.input, "https://api.resend.com/emails");
  assert.equal(
    (request.init?.headers as Record<string, string>)["Idempotency-Key"],
    "weekly-digest-2026-08-24"
  );
  const body = JSON.parse(request.init?.body as string) as Record<string, unknown>;
  assert.equal(body.subject, email.subject);
  assert.equal(body.html, email.html);
  assert.equal(body.text, email.text);
});

test("sendEmailViaResend surfaces provider errors without leaking the key", async () => {
  await assert.rejects(
    sendEmailViaResend(
      renderDigestEmail(digest),
      {
        apiKey: "re_secret",
        from: "digest@example.org",
        to: ["reader@example.org"],
        idempotencyKey: "weekly-digest-2026-08-24",
      },
      async () =>
        new Response(JSON.stringify({ message: "Domain is not verified" }), {
          status: 422,
        })
    ),
    /Resend email request failed \(422\): Domain is not verified/
  );
});

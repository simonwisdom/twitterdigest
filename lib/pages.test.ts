import assert from "node:assert/strict";
import { test } from "node:test";
import { extractPageText, extractOgImage } from "./pages";

test("extractPageText drops scripts, styles, and tags but keeps body text", () => {
  const html = `<html><head><title>Call</title><style>.x{color:red}</style>
<script>var x = "ignore me";</script></head>
<body><nav>Home | About</nav><h1>Open Call 2026</h1>
<p>A prize of &euro;15,000 for new media artists. Deadline 1 November 2026.</p>
</body></html>`;
  const text = extractPageText(html);
  assert.ok(text.includes("Open Call 2026"));
  assert.ok(text.includes("15,000"));
  assert.ok(!text.includes("ignore me"));
  assert.ok(!text.includes("color:red"));
});

test("extractPageText collapses whitespace and caps length", () => {
  const html = `<body><p>${"word ".repeat(3000)}</p></body>`;
  const text = extractPageText(html);
  assert.ok(text.length <= 4000);
  assert.ok(!/\s{2,}/.test(text));
});

test("extractOgImage returns an absolute og:image URL", () => {
  const html = `<head><meta property="og:image" content="https://example.org/banner.jpg"/></head>`;
  assert.equal(
    extractOgImage(html, "https://example.org/call"),
    "https://example.org/banner.jpg"
  );
});

test("extractOgImage resolves relative URLs against the page URL", () => {
  const html = `<head><meta content="/img/banner.png" property="og:image"></head>`;
  assert.equal(
    extractOgImage(html, "https://example.org/call/2026"),
    "https://example.org/img/banner.png"
  );
});

test("extractOgImage rejects missing or non-http images", () => {
  assert.equal(extractOgImage("<head></head>", "https://example.org"), undefined);
  const dataUri = `<head><meta property="og:image" content="data:image/png;base64,xyz"></head>`;
  assert.equal(extractOgImage(dataUri, "https://example.org"), undefined);
});

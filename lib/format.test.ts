import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEvidenceNote,
  formatEditionDate,
  formatEditionDateShort,
  linkLabel,
  splitSummary,
} from "./format";

test("splitSummary extracts a Practical meaning takeaway", () => {
  const result = splitSummary(
    "A cohort study of 10,000 adults found an association. The main limitation is confounding. Practical meaning: this supports, but does not prove, the benefit of exercise."
  );
  assert.equal(result.isTakeaway, true);
  assert.equal(
    result.visible,
    "this supports, but does not prove, the benefit of exercise."
  );
  assert.equal(
    result.rest,
    "A cohort study of 10,000 adults found an association. The main limitation is confounding."
  );
});

test("splitSummary falls back to the opening sentences", () => {
  const result = splitSummary(
    "Location: Catalonia, Spain. Deadline: September 12, 2026. The call invites artists working in rural contexts."
  );
  assert.equal(result.isTakeaway, false);
  assert.equal(result.visible, "Location: Catalonia, Spain. Deadline: September 12, 2026.");
  assert.equal(result.rest, "The call invites artists working in rural contexts.");
});

test("splitSummary keeps a single long sentence whole with no rest", () => {
  const long = `A single sentence ${"that goes on ".repeat(30)}without a break.`;
  const result = splitSummary(long);
  assert.equal(result.visible, long);
  assert.equal(result.rest, "");
});

test("linkLabel prefers the title and falls back to the hostname", () => {
  assert.equal(
    linkLabel({ url: "https://doi.org/10.1/x", title: "Paper title" }),
    "Paper title"
  );
  assert.equal(
    linkLabel({ url: "https://www.pubmed.ncbi.nlm.nih.gov/123", title: "" }),
    "pubmed.ncbi.nlm.nih.gov"
  );
  assert.equal(linkLabel({ url: "not a url", title: " " }), "not a url");
  assert.equal(
    linkLabel({
      url: "https://doi.org/10.1/x",
      title: "https://doi.org/10.1/x",
    }),
    "doi.org"
  );
});

test("buildEvidenceNote joins the study type with the summary basis", () => {
  assert.equal(
    buildEvidenceNote("Observational study of 152,435 adults", true),
    "Observational study of 152,435 adults · summary based on the abstract"
  );
  assert.equal(
    buildEvidenceNote("Meta-analysis of 24 randomized trials.", false),
    "Meta-analysis of 24 randomized trials · summary based on tweet discussion only (no abstract)"
  );
});

test("buildEvidenceNote falls back to the basis alone without a study type", () => {
  assert.equal(
    buildEvidenceNote(undefined, true),
    "Summary based on the abstract"
  );
  assert.equal(
    buildEvidenceNote("  ", false),
    "Summary based on tweet discussion only (no abstract)"
  );
});

test("formatEditionDate humanizes ISO dates without timezone shifts", () => {
  assert.equal(formatEditionDate("2026-08-20"), "Week of August 20, 2026");
  assert.equal(formatEditionDateShort("2026-08-20"), "Aug 20, 2026");
  assert.equal(formatEditionDate("garbage"), "garbage");
});

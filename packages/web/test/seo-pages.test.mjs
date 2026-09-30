import assert from "node:assert/strict";
import test from "node:test";
import { issueCounts, scoreBand, seoScore, siteScore, sortIssues } from "../src/components/seo-pages/seo-pages-math.ts";
import { SEO_ISSUE_CATALOG } from "../src/components/seo-pages/seo-issue-catalog.ts";

const issue = (id, severity, fixed = false, code = id) => ({ id, code, severity, fixed });

test("seoScore subtracts open issues by weight and floors at 0", () => {
  assert.equal(seoScore([]), 100);
  assert.equal(seoScore([issue("a", "error"), issue("b", "warning"), issue("c", "info")]), 85);
  assert.equal(seoScore([issue("a", "error", true)]), 100);
  assert.equal(seoScore(Array.from({ length: 20 }, (_, i) => issue(`e${i}`, "error"))), 0);
});

test("scoreBand thresholds", () => {
  assert.equal(scoreBand(90), "good");
  assert.equal(scoreBand(89), "fair");
  assert.equal(scoreBand(50), "fair");
  assert.equal(scoreBand(49), "poor");
});

test("issueCounts ignores fixed issues", () => {
  assert.deepEqual(issueCounts([issue("a", "error"), issue("b", "error", true), issue("c", "info")]), { error: 1, warning: 0, info: 1, total: 2 });
});

test("siteScore averages page scores and is 0 with no pages", () => {
  assert.equal(siteScore([]), 0);
  assert.equal(siteScore([{ issues: [] }, { issues: [issue("a", "error")] }]), 95);
});

test("sortIssues puts open before fixed, then errors first", () => {
  const sorted = sortIssues([issue("i", "info"), issue("f", "error", true), issue("e", "error"), issue("w", "warning")]);
  assert.deepEqual(sorted.map((x) => x.id), ["e", "w", "i", "f"]);
});

test("every catalog entry has English and Arabic text", () => {
  for (const [code, entry] of Object.entries(SEO_ISSUE_CATALOG)) {
    for (const lang of ["en", "ar"]) {
      assert.ok(entry[lang].title && entry[lang].why && entry[lang].fix, `${code} ${lang}`);
    }
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { SEO_LIMITS, breadcrumbFor, estimatePixelWidth, hostOf, lengthMeter, pathSegments, textLength, truncateAt } from "../src/components/seo-preview/seo-math.ts";

test("textLength trims, collapses whitespace and counts code points", () => {
  assert.equal(textLength("  a   b  "), 3);
  assert.equal(textLength("😀😀"), 2);
  assert.equal(textLength(""), 0);
});

test("lengthMeter title bands", () => {
  assert.equal(lengthMeter("title", "").status, "empty");
  assert.equal(lengthMeter("title", "x".repeat(29)).status, "short");
  assert.equal(lengthMeter("title", "x".repeat(30)).status, "good");
  assert.equal(lengthMeter("title", "x".repeat(60)).status, "good");
  const long = lengthMeter("title", "x".repeat(65));
  assert.equal(long.status, "long");
  assert.equal(long.over, 5);
  assert.equal(long.fraction, 1);
});

test("lengthMeter description bands and fraction", () => {
  assert.equal(SEO_LIMITS.description.max, 160);
  assert.equal(lengthMeter("description", "x".repeat(69)).status, "short");
  assert.equal(lengthMeter("description", "x".repeat(70)).status, "good");
  assert.equal(lengthMeter("description", "x".repeat(161)).status, "long");
  assert.equal(lengthMeter("description", "x".repeat(80)).fraction, 0.5);
});

test("Arabic text is measured too", () => {
  assert.equal(lengthMeter("title", "دليل كامل لتصميم واجهات من اليمين إلى اليسار").status, "good");
});

test("estimatePixelWidth is monotonic and wider for capitals", () => {
  assert.ok(estimatePixelWidth("MMMM") > estimatePixelWidth("iiii"));
  assert.ok(estimatePixelWidth("hello world") > estimatePixelWidth("hello"));
  assert.equal(estimatePixelWidth(""), 0);
});

test("truncateAt cuts on a word boundary and adds an ellipsis", () => {
  assert.equal(truncateAt("short", 20), "short");
  const out = truncateAt("The quick brown fox jumps over the lazy dog", 25);
  assert.ok(out.endsWith("…"));
  assert.ok([...out].length <= 26);
  assert.ok(!out.includes("jumps over the"));
});

test("hostOf, pathSegments and breadcrumbFor", () => {
  assert.equal(hostOf("https://www.example.com/a/b"), "example.com");
  assert.deepEqual(pathSegments("https://example.com/blog/rtl-guide"), ["blog", "rtl guide"]);
  assert.deepEqual(breadcrumbFor("https://example.com/blog/rtl-guide"), ["example.com", "blog", "rtl guide"]);
  assert.deepEqual(breadcrumbFor("https://example.com/x", ["Home", "Docs"]), ["Home", "Docs"]);
});

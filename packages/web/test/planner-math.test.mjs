import assert from "node:assert/strict";
import test from "node:test";
import { classifyIntent, clusterKeywords, findCannibalization, keywordTokens, normalizeUrl } from "../src/components/keyword-planner/planner-math.ts";

test("classifyIntent in English and Arabic", () => {
  assert.equal(classifyIntent("buy react components"), "transactional");
  assert.equal(classifyIntent("react ui kit pricing"), "transactional");
  assert.equal(classifyIntent("best design system"), "commercial");
  assert.equal(classifyIntent("figma vs storybook"), "commercial");
  assert.equal(classifyIntent("how to build a design system"), "informational");
  assert.equal(classifyIntent("acme dashboard login"), "navigational");
  assert.equal(classifyIntent("سعر مكتبة المكونات"), "transactional");
  assert.equal(classifyIntent("أفضل مكتبة مكونات"), "commercial");
  assert.equal(classifyIntent("كيف أبني نظام تصميم"), "informational");
  assert.equal(classifyIntent("design tokens"), "informational");
});

test("keywordTokens drops stop words and folds plurals", () => {
  assert.deepEqual(keywordTokens("The best Components for React"), ["component", "react"]);
});

test("clusterKeywords groups long tails under the biggest keyword", () => {
  const rows = [
    { id: "1", keyword: "react components", volume: 1000 },
    { id: "2", keyword: "react component library", volume: 400 },
    { id: "3", keyword: "rtl support", volume: 300 },
    { id: "4", keyword: "rtl support tailwind", volume: 90 },
    { id: "5", keyword: "react components examples", volume: 50 },
  ];
  const clusters = clusterKeywords(rows);
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].head, "react components");
  assert.deepEqual(clusters[0].keywords.map((k) => k.id), ["1", "2", "5"]);
  assert.equal(clusters[0].volume, 1450);
  assert.equal(clusters[1].head, "rtl support");
  assert.equal(clusterKeywords([]).length, 0);
});

test("normalizeUrl ignores query, fragment, trailing slash, www and case", () => {
  assert.equal(normalizeUrl("/Blog/"), normalizeUrl("/blog"));
  assert.equal(normalizeUrl("https://www.example.com/blog?x=1#top"), "example.com/blog");
  assert.equal(normalizeUrl("/"), "/");
});

test("findCannibalization needs two distinct pages within the depth", () => {
  const rows = [
    { keyword: "a", rankingUrls: [{ url: "/x", position: 4 }, { url: "/x/", position: 6 }] },
    { keyword: "b", rankingUrls: [{ url: "/x", position: 4 }, { url: "/y", position: 9 }] },
    { keyword: "c", rankingUrls: [{ url: "/x", position: 4 }, { url: "/y", position: 40 }] },
    { keyword: "d", ownerUrl: "/y", rankingUrls: [{ url: "/x", position: 2 }, { url: "/y", position: 7 }] },
    { keyword: "e" },
  ];
  const out = findCannibalization(rows);
  assert.deepEqual(out.map((o) => o.keyword), ["d", "b"]);
  assert.equal(out[1].keep, "/x");
  assert.equal(out[0].keep, "/y");
  assert.deepEqual(out[1].urls.map((u) => u.url), ["/x", "/y"]);
});

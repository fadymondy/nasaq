import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addSeries,
  chartRows,
  cloneBlock,
  convertBlock,
  htmlToText,
  newBlock,
  parseNumber,
  readingMinutes,
  removeSeries,
  reportIssues,
  tocOf,
  wordCount,
} from "../src/components/report-editor/report-math.ts";

const report = () => ({
  title: "R",
  blocks: [
    { id: "a", type: "heading", text: "Intro", level: 1 },
    { id: "b", type: "text", html: "<p>Hello &amp; welcome</p><p>Second</p>" },
    { id: "c", type: "heading", text: "  ", level: 2 },
    { id: "d", type: "heading", text: "Results", level: 2 },
  ],
});

test("toc lists only headings with text", () => {
  assert.deepEqual(tocOf(report()).map((e) => e.text), ["Intro", "Results"]);
});

test("htmlToText strips tags and decodes entities", () => {
  assert.equal(htmlToText("<p>Hello &amp; welcome</p><p>Second</p>"), "Hello & welcome\nSecond");
});

test("wordCount counts Latin and Arabic words", () => {
  assert.equal(wordCount({ title: "", blocks: [{ id: "x", type: "text", html: "<p>مرحبا بكم في التقرير</p>" }] }), 4);
  assert.equal(wordCount(report()), 5);
});

test("readingMinutes", () => {
  assert.equal(readingMinutes(0), 0);
  assert.equal(readingMinutes(10), 1);
  assert.equal(readingMinutes(600), 3);
});

test("convertBlock keeps the id and carries text over", () => {
  const converted = convertBlock({ id: "b", type: "text", html: "<p>Hi</p>" }, "heading");
  assert.equal(converted.id, "b");
  assert.equal(converted.type, "heading");
  assert.equal(converted.text, "Hi");
  const back = convertBlock(converted, "text");
  assert.equal(back.html, "<p>Hi</p>");
});

test("cloneBlock gives new ids, also to metrics", () => {
  const m = newBlock("metrics");
  const c = cloneBlock(m);
  assert.notEqual(c.id, m.id);
  assert.notEqual(c.items[0].id, m.items[0].id);
});

test("chart series add and remove keep rows aligned", () => {
  let c = newBlock("chart");
  c = addSeries(c, "B");
  assert.ok(c.rows.every((r) => r.values.length === 2));
  c = removeSeries(c, 0);
  assert.equal(c.series.length, 1);
  assert.ok(c.rows.every((r) => r.values.length === 1));
  assert.equal(removeSeries(c, 0), c);
  assert.deepEqual(chartRows({ ...c, rows: [{ label: "x", values: [NaN] }] }), [{ label: "x", s0: 0 }]);
});

test("parseNumber reads Arabic digits and separators", () => {
  assert.equal(parseNumber("١٢٣٤"), 1234);
  assert.equal(parseNumber("1,250.5"), 1250.5);
  assert.equal(parseNumber("١٬٢٥٠٫٥"), 1250.5);
  assert.equal(parseNumber("abc"), 0);
  assert.equal(parseNumber(""), 0);
});

test("reportIssues flags empty blocks", () => {
  const kinds = reportIssues(report()).map((i) => i.kind);
  assert.deepEqual(kinds, ["empty-heading"]);
});

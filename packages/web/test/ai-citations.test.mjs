import assert from "node:assert/strict";
import test from "node:test";
import {
  citationCoverage,
  citationHref,
  citedNumbers,
  latencyParts,
  linkCitations,
  markerNumbers,
  parseCitationHref,
  splitHighlight,
} from "../src/components/ai-citations/ai-citations-logic.ts";

test("citation href round trips and rejects other links", () => {
  assert.equal(parseCitationHref(citationHref(3)), 3);
  assert.equal(parseCitationHref("https://example.com"), null);
  assert.equal(parseCitationHref("#nq-cite-0"), null);
  assert.equal(parseCitationHref("#nq-cite-x"), null);
  assert.equal(parseCitationHref(undefined), null);
});

test("markerNumbers reads lists and ranges, drops out of range", () => {
  assert.deepEqual(markerNumbers("1, 3", 5), [1, 3]);
  assert.deepEqual(markerNumbers("2-4", 5), [2, 3, 4]);
  assert.deepEqual(markerNumbers("4-9", 5), [4, 5]);
  assert.deepEqual(markerNumbers("7", 5), []);
  assert.equal(markerNumbers("1-999", 999).length, 12);
});

test("linkCitations links markers but leaves code and unknown numbers", () => {
  assert.equal(linkCitations("Fact [1].", 2), "Fact [1](#nq-cite-1).");
  assert.equal(linkCitations("Both [1, 2]", 2), "Both [1](#nq-cite-1)[2](#nq-cite-2)");
  assert.equal(linkCitations("Out [9]", 2), "Out [9]");
  assert.equal(linkCitations("Code `a[1]` and [1]", 1), "Code `a[1]` and [1](#nq-cite-1)");
  assert.equal(linkCitations("```\n[1]\n```", 1), "```\n[1]\n```");
  assert.equal(linkCitations("A [link](http://x.y) [1]", 1), "A [link](http://x.y) [1](#nq-cite-1)");
  assert.equal(linkCitations("x [1]", 0), "x [1]");
});

test("citedNumbers lists each source once in order", () => {
  assert.deepEqual(citedNumbers("a [2] b [1] c [2]", 3), [2, 1]);
  assert.deepEqual(citedNumbers("`[1]`", 3), []);
});

test("citationCoverage counts prose paragraphs", () => {
  assert.deepEqual(citationCoverage("# Title\n\nOne [1].\n\nTwo.", 2), { cited: 1, total: 2 });
  assert.deepEqual(citationCoverage("", 2), { cited: 0, total: 0 });
});

test("splitHighlight marks matches and escapes regex characters", () => {
  assert.deepEqual(splitHighlight("Revenue grew 12%", ["grew"]), [
    { text: "Revenue ", hit: false },
    { text: "grew", hit: true },
    { text: " 12%", hit: false },
  ]);
  assert.deepEqual(
    splitHighlight("a (b) c", "(b)").map((p) => p.hit),
    [false, true, false],
  );
  assert.deepEqual(splitHighlight("abc", []), [{ text: "abc", hit: false }]);
  assert.deepEqual(
    splitHighlight("ABC", "b").map((p) => p.text),
    ["A", "B", "C"],
  );
});

test("latencyParts switches unit at one second", () => {
  assert.deepEqual(latencyParts(480), { value: 480, unit: "ms" });
  assert.deepEqual(latencyParts(1240), { value: 1.2, unit: "s" });
  assert.deepEqual(latencyParts(-4), { value: 0, unit: "ms" });
  assert.deepEqual(latencyParts(Number.NaN), { value: 0, unit: "ms" });
});

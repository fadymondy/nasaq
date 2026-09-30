import assert from "node:assert/strict";
import { test } from "node:test";
import {
  confidenceLevel,
  confidencePercent,
  cycleIndex,
  groupAiActions,
  nextRevealLength,
  safePartialMarkdown,
  scoreAction,
  stepState,
  summaryToText,
} from "../src/components/ai-states/ai-states-logic.ts";

test("confidence buckets and clamps", () => {
  assert.equal(confidenceLevel(0.9), "high");
  assert.equal(confidenceLevel(0.8), "high");
  assert.equal(confidenceLevel(0.6), "medium");
  assert.equal(confidenceLevel(0.2), "low");
  assert.equal(confidenceLevel(5), "high");
  assert.equal(confidenceLevel(Number.NaN), "low");
  assert.equal(confidencePercent(0.876), 88);
  assert.equal(confidencePercent(-1), 0);
});

test("stepState and cycleIndex", () => {
  assert.deepEqual([0, 1, 2].map((i) => stepState(i, 1)), ["done", "active", "pending"]);
  assert.equal(stepState(2, 3), "done");
  assert.equal(cycleIndex(2, 3), 0);
  assert.equal(cycleIndex(0, 0), 0);
});

test("nextRevealLength advances, catches up and stops at the end", () => {
  const text = "x".repeat(1000);
  assert.equal(nextRevealLength(1000, 1000, 16, text), 1000);
  const small = nextRevealLength(0, 10, 16, text);
  assert.ok(small >= 1 && small <= 10);
  const slow = nextRevealLength(0, 20, 16, text);
  const fast = nextRevealLength(0, 1000, 16, text);
  assert.ok(fast > slow);
  assert.equal(nextRevealLength(0, 1000, 100000, text), 1000);
  assert.ok(nextRevealLength(0, 5, 0, text) >= 1);
});

test("nextRevealLength does not stop between the halves of a surrogate pair", () => {
  const text = "ab\u{1F600}cd";
  // From 1, one character is due: that lands after the high surrogate (index 3), so it must move on to 4.
  assert.equal(nextRevealLength(2, text.length, 1, text, 0) , 4);
});

test("safePartialMarkdown closes code fences", () => {
  assert.equal(safePartialMarkdown("Run:\n```ts\nconst a = 1;"), "Run:\n```ts\nconst a = 1;\n```");
  assert.equal(safePartialMarkdown("```ts\nx\n```\ndone"), "```ts\nx\n```\ndone");
  assert.equal(safePartialMarkdown("~~~\nabc\n"), "~~~\nabc\n~~~");
});

test("safePartialMarkdown repairs the last line", () => {
  assert.equal(safePartialMarkdown("This is **bold"), "This is **bold**");
  assert.equal(safePartialMarkdown("Use `npm ins"), "Use `npm ins`");
  assert.equal(safePartialMarkdown("See [the docs](https://exa"), "See the docs");
  assert.equal(safePartialMarkdown("See [the do"), "See the do");
  assert.equal(safePartialMarkdown("Done **"), "Done ");
  assert.equal(safePartialMarkdown("A *slanted"), "A *slanted*");
  assert.equal(safePartialMarkdown("Fine **all** here"), "Fine **all** here");
  assert.equal(safePartialMarkdown("first\n| a | b"), "first");
  assert.equal(safePartialMarkdown("| a | b |"), "| a | b |");
});

test("scoreAction ranks exact over prefix over contains, and matches Arabic", () => {
  const a = { id: "1", label: "Summarize" };
  assert.ok(scoreAction(a, "summarize") > scoreAction(a, "sum"));
  assert.ok(scoreAction(a, "sum") > scoreAction(a, "mar"));
  assert.equal(scoreAction(a, "zzz"), 0);
  assert.equal(scoreAction({ id: "2", label: "تلخيص", keywords: ["summary"] }, "تلخ") > 0, true);
  assert.ok(scoreAction({ id: "3", label: "Rewrite", keywords: ["edit"] }, "edit") > 0);
});

test("groupAiActions splits recommended and filters by query", () => {
  const list = [
    { id: "a", label: "Translate" },
    { id: "b", label: "Summarize", recommended: true },
    { id: "c", label: "Fix grammar" },
  ];
  const g = groupAiActions(list);
  assert.deepEqual(g.recommended.map((x) => x.id), ["b"]);
  assert.deepEqual(g.others.map((x) => x.id), ["a", "c"]);
  const q = groupAiActions(list, "tra");
  assert.deepEqual(q.recommended, []);
  assert.deepEqual(q.others.map((x) => x.id), ["a"]);
  assert.equal(groupAiActions(list, "nothing").others.length, 0);
});

test("summaryToText", () => {
  assert.equal(summaryToText({ tldr: "Short.", points: ["One", "Two"] }), "Short.\n\n- One\n- Two");
  assert.equal(summaryToText({ tldr: "Short.", full: "Long." }), "Short.");
  assert.equal(summaryToText({ tldr: "Short.", full: "Long." }, { includeFull: true }), "Short.\n\nLong.");
});

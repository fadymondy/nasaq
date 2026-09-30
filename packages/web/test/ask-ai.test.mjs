import assert from "node:assert/strict";
import test from "node:test";
import { deltaTone, normalizeSelection, readOutcome, shortenMiddle } from "../src/components/ask-ai/ask-ai-logic.ts";

test("normalizeSelection collapses whitespace and bounds length", () => {
  assert.deepEqual(normalizeSelection("  hello \n\n  world  "), { text: "hello world", truncated: false });
  assert.deepEqual(normalizeSelection("ab"), { text: "", truncated: false });
  assert.deepEqual(normalizeSelection("   "), { text: "", truncated: false });
  const long = normalizeSelection("x".repeat(50), 3, 10);
  assert.equal(long.text.length, 10);
  assert.equal(long.truncated, true);
  assert.equal(normalizeSelection("مرحبا").text, "مرحبا");
});

test("normalizeSelection counts characters, not code units", () => {
  const out = normalizeSelection("😀".repeat(6), 3, 4);
  assert.equal([...out.text].length, 4);
  assert.equal(out.truncated, true);
});

test("shortenMiddle keeps both ends", () => {
  assert.equal(shortenMiddle("short", 20), "short");
  const out = shortenMiddle("The quick brown fox jumps over the lazy dog", 20);
  assert.ok(out.startsWith("The quick"));
  assert.ok(out.endsWith("y dog"));
  assert.ok(out.includes("…"));
  assert.ok([...out].length <= 21);
});

test("readOutcome accepts strings and objects", () => {
  assert.deepEqual(readOutcome("Answer"), { text: "Answer" });
  assert.deepEqual(readOutcome({ text: "A" }), { text: "A" });
  assert.deepEqual(readOutcome({ error: "boom" }), { error: "boom" });
  assert.deepEqual(readOutcome({ text: "A", error: "boom" }), { error: "boom" });
  assert.deepEqual(readOutcome(""), { error: "" });
  assert.deepEqual(readOutcome(undefined), { error: "" });
  assert.deepEqual(readOutcome({}), { error: "" });
});

test("deltaTone respects invert", () => {
  assert.equal(deltaTone(0.1), "positive");
  assert.equal(deltaTone(-0.1), "negative");
  assert.equal(deltaTone(-0.1, true), "positive");
  assert.equal(deltaTone(0.1, true), "negative");
  assert.equal(deltaTone(0), "neutral");
  assert.equal(deltaTone(Number.NaN), "neutral");
});

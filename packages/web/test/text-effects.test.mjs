import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countTextTokens,
  hasJoiningScript,
  marqueeCopies,
  marqueeDuration,
  nextFlipIndex,
  revealTextTokens,
  splitText,
  textStaggerDelay,
} from "../src/components/text-effects/text-effects-model.ts";

const AR = "مرحبا بكم في نسق";

test("joining scripts are detected", () => {
  assert.equal(hasJoiningScript(AR), true);
  assert.equal(hasJoiningScript("Hello"), false);
  assert.equal(hasJoiningScript("Hello مرحبا"), true);
});

test("words keep their spaces and joining the pieces returns the input", () => {
  for (const text of ["Ship faster, together.", AR, "  leading and  double  ", "", "one"]) {
    const { tokens } = splitText(text, "word");
    assert.equal(tokens.map((t) => t.text).join(""), text);
  }
  const { tokens } = splitText("a b", "word");
  assert.deepEqual(tokens.map((t) => [t.text, t.space, t.order]), [["a", false, 0], [" ", true, -1], ["b", false, 1]]);
});

test("Arabic is never split letter by letter, even when graphemes are requested", () => {
  const r = splitText(AR, "grapheme");
  assert.equal(r.mode, "word");
  assert.deepEqual(r.tokens.filter((t) => !t.space).map((t) => t.text), ["مرحبا", "بكم", "في", "نسق"]);
  // Diacritics stay with their letters and the word stays whole.
  const marked = splitText("مَرْحَبًا بِكُمْ", "grapheme");
  assert.equal(marked.mode, "word");
  assert.equal(marked.tokens.filter((t) => !t.space).length, 2);
});

test("Latin graphemes keep combining marks and emoji whole", () => {
  const r = splitText("é\u{1F468}‍\u{1F469}‍\u{1F467}x", "grapheme");
  assert.equal(r.mode, "grapheme");
  assert.deepEqual(r.tokens.map((t) => t.text), ["é", "\u{1F468}‍\u{1F469}‍\u{1F467}", "x"]);
});

test("mixed Arabic and Latin text falls back to words", () => {
  const r = splitText("Nasaq نسق", "grapheme");
  assert.equal(r.mode, "word");
  assert.equal(countTextTokens(r.tokens), 2);
});

test("revealTextTokens shows whole words in order", () => {
  const { tokens } = splitText(AR, "word");
  assert.equal(revealTextTokens(tokens, 0), "");
  assert.equal(revealTextTokens(tokens, 1), "مرحبا");
  assert.equal(revealTextTokens(tokens, 2), "مرحبا بكم");
  assert.equal(revealTextTokens(tokens, 99), AR);
});

test("nextFlipIndex wraps or stops", () => {
  assert.equal(nextFlipIndex(0, 3), 1);
  assert.equal(nextFlipIndex(2, 3), 0);
  assert.equal(nextFlipIndex(2, 3, false), 2);
  assert.equal(nextFlipIndex(0, 0), -1);
});

test("marquee timing and copies", () => {
  assert.equal(marqueeDuration(600, 60), 10);
  assert.equal(marqueeDuration(30, 60), 1);
  assert.equal(marqueeDuration(0, 60), 0);
  assert.equal(marqueeCopies(1000, 400), 4);
  assert.equal(marqueeCopies(300, 400), 2);
  assert.equal(marqueeCopies(0, 0), 2);
});

test("stagger is capped", () => {
  assert.equal(textStaggerDelay(0, 10), 0);
  assert.equal(textStaggerDelay(3, 10), 120);
  assert.equal(textStaggerDelay(49, 50, 40, 600), 600);
  assert.equal(textStaggerDelay(1, 1), 0);
});

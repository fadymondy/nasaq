import assert from "node:assert/strict";
import { test } from "node:test";
import { linkifyText, linkifyTrim, progressiveNextCount, progressiveRemaining, scrollFadeMask, scrollFadeState } from "../src/components/text-utilities/text-utilities-logic.ts";

test("linkify finds urls and trims sentence punctuation", () => {
  const segs = linkifyText("See https://nasaq.dev/docs, then (www.example.com/a_(b)). Done.");
  const links = segs.filter((s) => s.type !== "text");
  assert.equal(links[0].text, "https://nasaq.dev/docs");
  assert.equal(links[1].text, "www.example.com/a_(b)");
  assert.equal(links[1].href, "https://www.example.com/a_(b)");
  assert.equal(segs.map((s) => s.text).join(""), "See https://nasaq.dev/docs, then (www.example.com/a_(b)). Done.");
});

test("linkify stops at Arabic punctuation and finds emails", () => {
  const segs = linkifyText("زر https://nasaq.dev، أو راسل hello@example.com");
  assert.deepEqual(segs.filter((s) => s.type !== "text").map((s) => s.text), ["https://nasaq.dev", "hello@example.com"]);
  assert.equal(segs.find((s) => s.type === "email").href, "mailto:hello@example.com");
  assert.equal(linkifyText("a@b.co", { emails: false }).length, 1);
});

test("linkify never produces script links or bare-domain links", () => {
  assert.deepEqual(linkifyText("javascript:alert(1) example.com").map((s) => s.type), ["text"]);
  assert.equal(linkifyTrim("https://a.b/x)."), "https://a.b/x");
});

test("scroll fade edges", () => {
  assert.deepEqual(scrollFadeState({ scrollStart: 0, clientSize: 100, scrollSize: 100 }), { start: false, end: false });
  assert.deepEqual(scrollFadeState({ scrollStart: 0, clientSize: 100, scrollSize: 300 }), { start: false, end: true });
  assert.deepEqual(scrollFadeState({ scrollStart: 100, clientSize: 100, scrollSize: 300 }), { start: true, end: true });
  assert.deepEqual(scrollFadeState({ scrollStart: 200, clientSize: 100, scrollSize: 300 }), { start: true, end: false });
  assert.equal(scrollFadeMask({ start: false, end: false }, 24, false), undefined);
  assert.match(scrollFadeMask({ start: false, end: true }, 24, false), /to right/);
  assert.match(scrollFadeMask({ start: true, end: false }, 24, true), /to left, transparent 0/);
});

test("progressive counts", () => {
  assert.equal(progressiveNextCount(3, 10, 4), 7);
  assert.equal(progressiveNextCount(9, 10, 4), 10);
  assert.deepEqual(progressiveRemaining(3, 10, 4), { next: 4, left: 7 });
  assert.deepEqual(progressiveRemaining(10, 10, 4), { next: 0, left: 0 });
});

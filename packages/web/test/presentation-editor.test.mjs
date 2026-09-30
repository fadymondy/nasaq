import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bulletText,
  clampIndex,
  duplicateSlide,
  formatElapsed,
  insertSlide,
  keyAction,
  lines,
  moveSlide,
  newSlide,
  notesCount,
  progressOf,
  removeSlide,
  safeImageSrc,
  slideTitle,
  swipeAction,
} from "../src/components/presentation-editor/presentation-math.ts";

test("keyAction follows the reading direction for arrows only", () => {
  assert.equal(keyAction("ArrowRight", false), "next");
  assert.equal(keyAction("ArrowRight", true), "prev");
  assert.equal(keyAction("ArrowLeft", true), "next");
  assert.equal(keyAction("ArrowLeft", false), "prev");
  assert.equal(keyAction(" ", true), "next");
  assert.equal(keyAction("PageUp", true), "prev");
  assert.equal(keyAction("Home", false), "first");
  assert.equal(keyAction("End", false), "last");
  assert.equal(keyAction("n", false), "notes");
  assert.equal(keyAction("F", false), "fullscreen");
  assert.equal(keyAction("q", false), null);
});

test("swipeAction needs a mostly horizontal, long enough drag and mirrors in RTL", () => {
  assert.equal(swipeAction(-80, 5, false), "next");
  assert.equal(swipeAction(80, 5, false), "prev");
  assert.equal(swipeAction(80, 5, true), "next");
  assert.equal(swipeAction(-80, 5, true), "prev");
  assert.equal(swipeAction(-20, 0, false), null);
  assert.equal(swipeAction(-60, 90, false), null);
});

test("progress and clamp", () => {
  assert.equal(progressOf(0, 4), 0.25);
  assert.equal(progressOf(3, 4), 1);
  assert.equal(progressOf(9, 4), 1);
  assert.equal(progressOf(0, 0), 0);
  assert.equal(clampIndex(-3, 5), 0);
  assert.equal(clampIndex(9, 5), 4);
  assert.equal(clampIndex(3, 0), 0);
});

test("formatElapsed", () => {
  assert.equal(formatElapsed(0), "0:00");
  assert.equal(formatElapsed(65), "1:05");
  assert.equal(formatElapsed(3729), "1:02:09");
  assert.equal(formatElapsed(-5), "0:00");
});

test("safeImageSrc allows web, relative and data images only", () => {
  assert.equal(safeImageSrc("https://a.example/x.png"), "https://a.example/x.png");
  assert.equal(safeImageSrc("/uploads/x.png"), "/uploads/x.png");
  assert.ok(safeImageSrc("data:image/png;base64,AAAA"));
  assert.equal(safeImageSrc("javascript:alert(1)"), undefined);
  assert.equal(safeImageSrc("//evil.example/x.png"), undefined);
  assert.equal(safeImageSrc("data:text/html,<script>"), undefined);
  assert.equal(safeImageSrc("   "), undefined);
  assert.equal(safeImageSrc(undefined), undefined);
});

test("slide list operations never mutate", () => {
  const a = newSlide("title", { title: "A" });
  const b = newSlide("content", { title: "B" });
  const c = newSlide("quote", { title: "C" });
  const list = [a, b, c];
  assert.deepEqual(moveSlide(list, 0, 2).map((s) => s.title), ["B", "C", "A"]);
  assert.deepEqual(moveSlide(list, 2, 0).map((s) => s.title), ["C", "A", "B"]);
  assert.deepEqual(removeSlide(list, 1).map((s) => s.title), ["A", "C"]);
  assert.deepEqual(insertSlide(list, 1, newSlide("blank", { title: "X" })).map((s) => s.title), ["A", "X", "B", "C"]);
  assert.equal(list.length, 3);
  const copy = duplicateSlide(b);
  assert.notEqual(copy.id, b.id);
  assert.equal(copy.title, "B");
  assert.equal(newSlide("section").theme, "brand");
});

test("text helpers", () => {
  assert.deepEqual(lines("a\n\n  b \r\n- c"), ["a", "b", "- c"]);
  assert.equal(bulletText("- one"), "one");
  assert.equal(bulletText("• two"), "two");
  assert.equal(bulletText("plain"), "plain");
  assert.equal(slideTitle({ id: "1", layout: "content", title: " ", body: "first\nsecond" }, "Untitled"), "first");
  assert.equal(slideTitle({ id: "1", layout: "blank", title: "" }, "Untitled"), "Untitled");
  assert.equal(notesCount({ title: "", slides: [{ id: "1", layout: "blank", title: "", notes: "hi" }, { id: "2", layout: "blank", title: "", notes: " " }] }), 1);
});

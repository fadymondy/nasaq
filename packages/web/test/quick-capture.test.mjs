import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCapture,
  canSaveCapture,
  captureShortcutKeys,
  extractCaptureTags,
  extractCaptureUrl,
  isCaptureSaveKey,
  matchesCaptureShortcut,
  parseCaptureShortcut,
} from "../src/components/quick-capture/quick-capture-logic.ts";

const ev = (over) => ({ key: "k", code: "KeyK", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...over });

test("parseCaptureShortcut needs a key and a modifier", () => {
  assert.deepEqual(parseCaptureShortcut("Mod+Shift+K"), { mod: true, ctrl: false, meta: false, alt: false, shift: true, key: "k" });
  assert.equal(parseCaptureShortcut("K"), null);
  assert.equal(parseCaptureShortcut("Shift+K"), null);
  assert.equal(parseCaptureShortcut("Ctrl+"), null);
  assert.equal(parseCaptureShortcut(null), null);
  assert.equal(parseCaptureShortcut("Ctrl K L"), null);
});

test("matchesCaptureShortcut uses Cmd on Apple and Ctrl elsewhere", () => {
  const spec = parseCaptureShortcut("Mod+Shift+K");
  assert.equal(matchesCaptureShortcut(spec, ev({ ctrlKey: true, shiftKey: true }), false), true);
  assert.equal(matchesCaptureShortcut(spec, ev({ metaKey: true, shiftKey: true }), true), true);
  assert.equal(matchesCaptureShortcut(spec, ev({ ctrlKey: true, shiftKey: true }), true), false);
});

test("matchesCaptureShortcut refuses extra modifiers, IME and null specs", () => {
  const spec = parseCaptureShortcut("Mod+Shift+K");
  assert.equal(matchesCaptureShortcut(spec, ev({ ctrlKey: true }), false), false);
  assert.equal(matchesCaptureShortcut(spec, ev({ ctrlKey: true, shiftKey: true, altKey: true }), false), false);
  assert.equal(matchesCaptureShortcut(spec, ev({ ctrlKey: true, shiftKey: true, isComposing: true }), false), false);
  assert.equal(matchesCaptureShortcut(null, ev({ ctrlKey: true }), false), false);
});

test("matchesCaptureShortcut matches by key position on an Arabic layout", () => {
  const spec = parseCaptureShortcut("Ctrl+Alt+N");
  assert.equal(matchesCaptureShortcut(spec, { key: "ى", code: "KeyN", ctrlKey: true, metaKey: false, altKey: true, shiftKey: false }, false), true);
  assert.equal(matchesCaptureShortcut(spec, { key: "ى", code: "KeyM", ctrlKey: true, metaKey: false, altKey: true, shiftKey: false }, false), false);
});

test("captureShortcutKeys draws the platform's keys", () => {
  const spec = parseCaptureShortcut("Mod+Shift+K");
  assert.deepEqual(captureShortcutKeys(spec, true), ["⌘", "⇧", "K"]);
  assert.deepEqual(captureShortcutKeys(spec, false), ["Ctrl", "Shift", "K"]);
  assert.deepEqual(captureShortcutKeys(null, false), []);
});

test("isCaptureSaveKey is Ctrl or Cmd plus Enter", () => {
  assert.equal(isCaptureSaveKey(ev({ key: "Enter", ctrlKey: true })), true);
  assert.equal(isCaptureSaveKey(ev({ key: "Enter", metaKey: true })), true);
  assert.equal(isCaptureSaveKey(ev({ key: "Enter" })), false);
  assert.equal(isCaptureSaveKey(ev({ key: "Enter", ctrlKey: true, isComposing: true })), false);
});

test("tags: Latin and Arabic, lower-cased, unique, not inside words", () => {
  assert.deepEqual(extractCaptureTags("Buy milk #Home #home and #عمل, foo#bar"), ["home", "عمل"]);
});

test("url: first link, trailing punctuation removed", () => {
  assert.equal(extractCaptureUrl("see https://nasaq.dev/docs, then"), "https://nasaq.dev/docs");
  assert.equal(extractCaptureUrl("no link"), undefined);
});

test("buildCapture: note, link and clip", () => {
  const now = Date.parse("2026-09-30T10:00:00Z");
  const note = buildCapture({ text: "  Call Sara\nabout the deck #work ", tags: ["Ideas"], now });
  assert.equal(note.kind, "note");
  assert.equal(note.title, "Call Sara");
  assert.deepEqual(note.tags, ["ideas", "work"]);
  assert.equal(note.capturedAt, "2026-09-30T10:00:00.000Z");

  const link = buildCapture({ text: "https://nasaq.dev", now });
  assert.equal(link.kind, "link");
  assert.equal(link.url, "https://nasaq.dev");

  const clip = buildCapture({ text: "", page: { title: "A page", url: "https://x.dev/p", selection: "quote" }, destinationId: "inbox", now });
  assert.equal(clip.kind, "clip");
  assert.equal(clip.title, "A page");
  assert.equal(clip.selection, "quote");
  assert.equal(clip.destinationId, "inbox");
});

test("buildCapture shortens long titles", () => {
  assert.ok(buildCapture({ text: "x".repeat(200) }).title.length <= 80);
});

test("canSaveCapture needs text or a page", () => {
  assert.equal(canSaveCapture("   "), false);
  assert.equal(canSaveCapture("a"), true);
  assert.equal(canSaveCapture("", { url: "https://x.dev" }), true);
});

import assert from "node:assert/strict";
import test from "node:test";
import { inlineKeyAction, isHttpUrl, normalizeDigits, resolveInlineCommit } from "../src/components/inline-edit/inline-edit-logic.ts";

test("an unchanged draft closes without saving", () => {
  assert.equal(resolveInlineCommit({ draft: "  Hello ", initial: "Hello" }).kind, "unchanged");
});

test("a changed draft is trimmed and saved", () => {
  assert.deepEqual(resolveInlineCommit({ draft: "  New title ", initial: "Old" }), { kind: "save", value: "New title" });
});

test("required rejects an empty draft, optional saves it", () => {
  assert.equal(resolveInlineCommit({ draft: "  ", initial: "x", required: true }).reason, "required");
  assert.equal(resolveInlineCommit({ draft: "", initial: "x" }).kind, "save");
});

test("numbers accept Arabic-Indic digits and separators", () => {
  assert.deepEqual(resolveInlineCommit({ draft: "١٢٫٥", initial: "1", type: "number" }), { kind: "save", value: "12.5" });
  assert.equal(resolveInlineCommit({ draft: "abc", initial: "1", type: "number" }).reason, "type");
});

test("email and url are checked, javascript: is refused", () => {
  assert.equal(resolveInlineCommit({ draft: "a@b.co", initial: "", type: "email" }).kind, "save");
  assert.equal(resolveInlineCommit({ draft: "not-an-email", initial: "", type: "email" }).reason, "type");
  assert.equal(resolveInlineCommit({ draft: "https://nasaq.dev/x", initial: "", type: "url" }).kind, "save");
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(resolveInlineCommit({ draft: "javascript:alert(1)", initial: "", type: "url" }).reason, "type");
});

test("maxLength counts characters, not UTF-16 units", () => {
  assert.equal(resolveInlineCommit({ draft: "😀😀😀", initial: "", maxLength: 3 }).kind, "save");
  assert.equal(resolveInlineCommit({ draft: "😀😀😀😀", initial: "", maxLength: 3 }).reason, "length");
});

test("validate returns its message", () => {
  const r = resolveInlineCommit({ draft: "admin", initial: "x", validate: (v) => (v === "admin" ? "Reserved" : undefined) });
  assert.deepEqual([r.kind, r.reason, r.message], ["invalid", "custom", "Reserved"]);
});

test("normalizeDigits maps Arabic-Indic and Persian digits", () => {
  assert.equal(normalizeDigits("٠١٢٣٤٥٦٧٨٩ ۰۱۲"), "0123456789 012");
});

test("keys: Enter saves a line, Ctrl/Cmd+Enter saves a paragraph, Escape cancels, IME is ignored", () => {
  assert.equal(inlineKeyAction({ key: "Enter" }, false), "save");
  assert.equal(inlineKeyAction({ key: "Enter", shiftKey: true }, false), null);
  assert.equal(inlineKeyAction({ key: "Enter" }, true), null);
  assert.equal(inlineKeyAction({ key: "Enter", ctrlKey: true }, true), "save");
  assert.equal(inlineKeyAction({ key: "Enter", metaKey: true }, true), "save");
  assert.equal(inlineKeyAction({ key: "Escape" }, true), "cancel");
  assert.equal(inlineKeyAction({ key: "Enter", isComposing: true }, false), null);
  assert.equal(inlineKeyAction({ key: "a" }, false), null);
});

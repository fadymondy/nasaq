import assert from "node:assert/strict";
import { test } from "node:test";
import { availableContext, filterCommands, hostOf, isPreviewUrl, isSafeUrl, slashQuery, stepCounts, transcriptToMarkdown, visibleMessages, withoutContext, withoutSlash } from "../src/components/copilot-chat/copilot-chat-format.ts";

test("isSafeUrl only allows http and https", () => {
  assert.equal(isSafeUrl("https://a.com/x"), true);
  assert.equal(isSafeUrl("http://a.com"), true);
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("nonsense"), false);
  assert.equal(isSafeUrl(undefined), false);
});

test("hostOf strips www and rejects unsafe urls", () => {
  assert.equal(hostOf("https://www.docs.example.com/a"), "docs.example.com");
  assert.equal(hostOf("javascript:x"), "");
});

test("stepCounts", () => {
  const c = stepCounts([
    { id: "1", label: "a", status: "done" },
    { id: "2", label: "b", status: "running" },
    { id: "3", label: "c", status: "error" },
  ]);
  assert.deepEqual(c, { total: 3, running: 1, error: 1, done: 1 });
  assert.equal(stepCounts(undefined).total, 0);
});

test("transcriptToMarkdown skips empty and lists sources", () => {
  const md = transcriptToMarkdown(
    [
      { id: "1", role: "user", text: "Hi" },
      { id: "2", role: "assistant", text: "", streaming: true },
      { id: "3", role: "assistant", text: "Hello", sources: [{ id: "s", title: "Doc", url: "https://a.com" }, { id: "t", title: "Note" }] },
    ],
    { user: "You", assistant: "Copilot" },
  );
  assert.equal(md, "**You**\n\nHi\n\n---\n\n**Copilot**\n\nHello\n\n1. [Doc](https://a.com)\n2. Note");
});

test("context helpers", () => {
  const a = { id: "a", label: "A" };
  const b = { id: "b", label: "B" };
  assert.deepEqual(withoutContext([a, b], "a"), [b]);
  assert.deepEqual(availableContext([a, b], [a]), [b]);
});

test("slashQuery finds a command being typed at the caret", () => {
  assert.deepEqual(slashQuery("/sum", 4), { query: "sum", start: 0 });
  assert.deepEqual(slashQuery("hi /tr", 6), { query: "tr", start: 3 });
  assert.equal(slashQuery("a/b", 3), null);
  assert.equal(slashQuery("/sum x", 6), null);
});

test("filterCommands ranks prefix matches first and skips chosen", () => {
  const cmds = [{ id: "translate", label: "Translate" }, { id: "summarize", label: "Summarize" }, { id: "rate", label: "Rate" }];
  assert.deepEqual(filterCommands(cmds, "", []).map((c) => c.id), ["translate", "summarize", "rate"]);
  assert.deepEqual(filterCommands(cmds, "ra", []).map((c) => c.id), ["rate", "translate"]);
  assert.deepEqual(filterCommands(cmds, "", ["rate"]).map((c) => c.id), ["translate", "summarize"]);
});

test("withoutSlash removes the typed command", () => {
  assert.equal(withoutSlash("hi /tr", 6), "hi ");
});

test("isPreviewUrl and visibleMessages", () => {
  assert.equal(isPreviewUrl("blob:x"), true);
  assert.equal(isPreviewUrl("data:image/svg+xml,<svg/>"), false);
  assert.equal(isPreviewUrl("javascript:x"), false);
  assert.equal(visibleMessages([{ id: "1", role: "user", text: "", hidden: true }, { id: "2", role: "user", text: "" }]).length, 1);
});

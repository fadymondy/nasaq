import assert from "node:assert/strict";
import { test } from "node:test";
import { buildThread, countComments, linkMentions, mentionIdFromHref } from "../src/components/comment-thread/comment-thread-logic.ts";

const a = { id: "u1", name: "Sara" };
const c = (id, at, extra = {}) => ({ id, author: a, body: id, createdAt: at, ...extra });

test("roots are oldest first and replies sit under them", () => {
  const nodes = buildThread([c("r2", 30), c("x", 20, { parentId: "r1" }), c("r1", 10), c("y", 15, { parentId: "r1" })]);
  assert.deepEqual(nodes.map((n) => n.comment.id), ["r1", "r2"]);
  assert.deepEqual(nodes[0].replies.map((r) => r.id), ["y", "x"]);
});

test("a reply to a reply joins the same thread, an orphan becomes a root", () => {
  const nodes = buildThread([c("r", 1), c("a", 2, { parentId: "r" }), c("b", 3, { parentId: "a" }), c("o", 4, { parentId: "gone" })]);
  assert.deepEqual(nodes.map((n) => n.comment.id), ["r", "o"]);
  assert.deepEqual(nodes[0].replies.map((r) => r.id), ["a", "b"]);
});

test("a parent loop does not hang", () => {
  const nodes = buildThread([c("a", 1, { parentId: "b" }), c("b", 2, { parentId: "a" })]);
  assert.ok(Array.isArray(nodes));
});

test("countComments can skip pending", () => {
  const list = [c("a", 1), c("b", 2, { pending: true })];
  assert.equal(countComments(list), 2);
  assert.equal(countComments(list, false), 1);
});

test("mentions become links, longest name first, only on word starts", () => {
  const m = [{ id: "1", name: "Sara" }, { id: "2", name: "Sara Ali" }];
  assert.equal(linkMentions("hi @Sara Ali and @sara", m), "hi [@Sara Ali](#mention-2) and [@sara](#mention-1)");
  assert.equal(linkMentions("mail me@Sara", m), "mail me@Sara");
  assert.equal(linkMentions("@Sarah", m), "@Sarah");
  assert.equal(linkMentions("plain", []), "plain");
});

test("arabic names and special characters", () => {
  const m = [{ id: "a b", name: "سارة" }];
  assert.equal(linkMentions("شكرا @سارة", m), "شكرا [@سارة](#mention-a%20b)");
  assert.equal(mentionIdFromHref("#mention-a%20b"), "a b");
  assert.equal(mentionIdFromHref("https://x.dev"), null);
  assert.equal(mentionIdFromHref(undefined), null);
});

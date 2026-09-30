import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applySnippet,
  collectMedia,
  countViews,
  filterConversations,
  filterSnippets,
  findMatches,
  formatCoords,
  formatDuration,
  isLat,
  padToPoint,
  pointToPad,
  previewOf,
  snoozePresets,
  splitByQuery,
} from "../src/components/inbox/inbox-format.ts";

const words = { voice: "Voice", location: "Location", attachment: "File" };
const c = (id, over = {}) => ({ id, channel: "chat", contact: { id: `u${id}`, name: `Name ${id}` }, messages: [{ id: `m${id}`, direction: "in", body: "hello", at: 1000 }], status: "open", ...over });

test("filterConversations puts pinned first, then newest", () => {
  const list = [c("1"), c("2", { messages: [{ id: "x", direction: "in", body: "b", at: 5000 }] }), c("3", { pinned: true })];
  assert.deepEqual(filterConversations(list).map((x) => x.id), ["3", "2", "1"]);
});

test("filterConversations by scope, channel, view and query", () => {
  const list = [c("1", { assigneeId: "me" }), c("2", { channel: "email", assigneeId: null }), c("3", { status: "closed" }), c("4", { archived: true })];
  assert.deepEqual(filterConversations(list, { scope: "mine", me: "me" }).map((x) => x.id), ["1"]);
  assert.deepEqual(filterConversations(list, { scope: "unassigned" }).map((x) => x.id), ["2"]);
  assert.deepEqual(filterConversations(list, { channel: "email" }).map((x) => x.id), ["2"]);
  assert.deepEqual(filterConversations(list, { view: "closed" }).map((x) => x.id), ["3"]);
  assert.deepEqual(filterConversations(list, { view: "archived" }).map((x) => x.id), ["4"]);
  assert.deepEqual(filterConversations(list, { query: "name 2" }).map((x) => x.id), ["2"]);
});

test("countViews ignores archived and muted unread", () => {
  const n = countViews([c("1", { unread: 2 }), c("2", { unread: 1, muted: true }), c("3", { status: "snoozed" }), c("4", { archived: true })]);
  assert.equal(n.active, 2);
  assert.equal(n.unread, 1);
  assert.equal(n.snoozed, 1);
  assert.equal(n.archived, 1);
});

test("previewOf names voice, location and attachments", () => {
  assert.equal(previewOf({ id: "1", direction: "in", kind: "voice", body: "", at: 1, voice: { duration: 4 } }, words), "Voice");
  assert.equal(previewOf({ id: "1", direction: "in", kind: "location", body: "", at: 1 }, words), "Location");
  assert.equal(previewOf({ id: "1", direction: "in", body: "", at: 1, attachments: [{ id: "a", name: "a", kind: "file" }] }, words), "File");
  assert.equal(previewOf({ id: "1", direction: "in", body: "hi", at: 1 }, words), "hi");
});

test("splitByQuery and findMatches count each match", () => {
  assert.deepEqual(splitByQuery("Foo bar foo", "foo"), [{ text: "Foo", match: true }, { text: " bar ", match: false }, { text: "foo", match: true }]);
  const msgs = [{ id: "a", direction: "in", body: "foo foo", at: 1 }, { id: "b", direction: "in", body: "none", at: 2 }, { id: "c", direction: "out", body: "FOO", at: 3 }];
  assert.deepEqual(findMatches(msgs, "foo"), [{ messageId: "a", nth: 0 }, { messageId: "a", nth: 1 }, { messageId: "c", nth: 0 }]);
  assert.deepEqual(findMatches(msgs, ""), []);
});

test("snoozePresets are in the future and ordered", () => {
  const now = new Date(2026, 0, 7, 10, 0).getTime();
  const p = snoozePresets(now);
  assert.ok(p.length >= 3);
  for (const x of p) assert.ok(x.at > now);
});

test("applySnippet fills variables and leaves unknown ones", () => {
  assert.equal(applySnippet("Hi {{name}}, {{agent}} {{other}}", { name: "Sara", agent: "Omar" }), "Hi Sara, Omar {{other}}");
});

test("filterSnippets matches shortcut and title", () => {
  const list = [{ id: "1", shortcut: "refund", title: "Refund policy", body: "x" }, { id: "2", shortcut: "hello", title: "Greeting", body: "y" }];
  assert.deepEqual(filterSnippets(list, "ref").map((s) => s.id), ["1"]);
  assert.equal(filterSnippets(list, "").length, 2);
});

test("collectMedia gathers images, files and links", () => {
  const msgs = [
    { id: "1", direction: "in", body: "see https://a.example/x", at: 1, attachments: [{ id: "i", name: "p.png", kind: "image", url: "u" }, { id: "f", name: "d.pdf", kind: "file" }] },
  ];
  const kinds = collectMedia(msgs).map((m) => m.kind).sort();
  assert.deepEqual(kinds, ["file", "image", "link"]);
});

test("formatDuration and coordinates", () => {
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(9), "0:09");
  assert.ok(isLat(24.7) && !isLat(91));
  assert.match(formatCoords({ lat: 24.7136, lng: 46.6753 }), /24\.7136/);
  const center = { lat: 24.7136, lng: 46.6753 };
  const pad = pointToPad(center, { lat: 24.72, lng: 46.68 });
  const back = padToPoint(center, pad.x, pad.y);
  assert.ok(Math.abs(back.lat - 24.72) < 1e-5 && Math.abs(back.lng - 46.68) < 1e-5);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByKind, rankOptions, splitMentions } from "../src/components/mention-textarea/mention-model.ts";

const norm = (s) => s.toLowerCase();
const opts = [
  { id: "1", name: "Sara Nasser", handle: "sara" },
  { id: "2", name: "Omar Sarhan" },
  { id: "3", name: "Design", kind: "team", keywords: ["ux"] },
  { id: "4", name: "Sales group", kind: "group" },
  { id: "5", name: "Lina", description: "Works with Sara" },
];

test("rankOptions ranks prefix before word start before contains, people first", () => {
  const r = rankOptions(opts, "sa", norm).map((o) => o.id);
  assert.deepEqual(r, ["1", "2", "5", "4"]);
  assert.deepEqual(rankOptions(opts, "ara", norm).map((o) => o.id), ["1", "5"]);
});

test("rankOptions matches description and keywords last, honours limit", () => {
  assert.deepEqual(rankOptions(opts, "ux", norm).map((o) => o.id), ["3"]);
  assert.deepEqual(rankOptions(opts, "", norm, 2).map((o) => o.id), ["1", "2"]);
  assert.deepEqual(rankOptions(opts, "zzz", norm), []);
});

test("groupByKind orders people, teams, groups and drops empty sections", () => {
  const g = groupByKind(opts);
  assert.deepEqual(g.map((x) => x.kind), ["person", "team", "group"]);
  assert.deepEqual(groupByKind([opts[2]]).map((x) => x.kind), ["team"]);
});

test("splitMentions cuts text and skips bad ranges", () => {
  const segs = splitMentions("Hi @Sara and @Omar!", [
    { id: "2", name: "Omar", start: 13, end: 18 },
    { id: "1", name: "Sara", start: 3, end: 8 },
    { id: "x", name: "bad", start: 4, end: 6 },
    { id: "y", name: "out", start: 10, end: 99 },
  ]);
  assert.deepEqual(segs.map((s) => s.text), ["Hi ", "@Sara", " and ", "@Omar", "!"]);
  assert.equal(segs[1].type, "mention");
  assert.deepEqual(splitMentions("plain", []), [{ type: "text", text: "plain" }]);
});

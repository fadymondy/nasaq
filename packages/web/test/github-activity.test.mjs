import assert from "node:assert/strict";
import { test } from "node:test";
import { commitBody, commitTitle, countBy, isActive, matches, mergeActivity, shortSha } from "../src/components/github-activity/github-activity-format.ts";

test("shortSha, commitTitle and commitBody", () => {
  assert.equal(shortSha("4f2a91c0d3e5b7a9"), "4f2a91c");
  assert.equal(commitTitle("fix: retry on 502\n\nLonger body."), "fix: retry on 502");
  assert.equal(commitBody("fix: retry on 502\n\nLonger body."), "Longer body.");
  assert.equal(commitBody("only a title"), "");
});

test("matches is case-insensitive and ignores empty fields", () => {
  assert.ok(matches("", "anything"));
  assert.ok(matches("SARA", "opened by sara"));
  assert.ok(matches("42", 42));
  assert.ok(!matches("zzz", "abc", undefined, null));
});

test("isActive", () => {
  assert.ok(isActive("in_progress"));
  assert.ok(isActive("queued"));
  assert.ok(!isActive("success"));
});

test("mergeActivity sorts newest first across feeds and keeps input order on ties", () => {
  const commits = [{ id: "c1", at: 100 }, { id: "c2", at: 300 }];
  const runs = [{ id: "r1", at: 200 }, { id: "r2", at: 300 }];
  const out = mergeActivity([
    { kind: "commit", items: commits, time: (c) => c.at },
    { kind: "run", items: runs, time: (r) => r.at },
  ]);
  assert.deepEqual(
    out.map((e) => e.id),
    ["c2", "r2", "r1", "c1"],
  );
});

test("countBy", () => {
  assert.deepEqual(countBy([{ s: "a" }, { s: "b" }, { s: "a" }], (x) => x.s), { a: 2, b: 1 });
});

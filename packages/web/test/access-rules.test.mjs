import assert from "node:assert/strict";
import test from "node:test";
import { allows, grantCounts, isReadOnlyApp, levelOf, setLevel, summarizeScopes } from "../src/components/access-grants/access-rules.ts";

test("levelOf defaults to none and setLevel does not mutate", () => {
  const g = { a1: { docs: "read" } };
  assert.equal(levelOf(g, "a1", "docs"), "read");
  assert.equal(levelOf(g, "a1", "billing"), "none");
  assert.equal(levelOf(g, "zz", "docs"), "none");
  const next = setLevel(g, "a1", "billing", "write");
  assert.equal(next.a1.billing, "write");
  assert.equal(next.a1.docs, "read");
  assert.equal(g.a1.billing, undefined);
});

test("write includes read, read does not include write", () => {
  assert.equal(allows("write", "read"), true);
  assert.equal(allows("read", "write"), false);
  assert.equal(allows("none", "read"), false);
});

test("grantCounts and scope summaries", () => {
  const g = { a1: { docs: "write", tasks: "read", billing: "none" } };
  assert.deepEqual(grantCounts(g, "a1", ["docs", "tasks", "billing"]), { read: 2, write: 1 });
  assert.deepEqual(summarizeScopes(["a", "b", "c", "d", "e"], 3), { shown: ["a", "b", "c"], more: 2 });
  assert.equal(isReadOnlyApp(["docs:read", "tasks.read"]), true);
  assert.equal(isReadOnlyApp(["docs:read", "tasks:write"]), false);
});

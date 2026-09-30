import assert from "node:assert/strict";
import test from "node:test";
import { changeKind, diffRecords, expiringCount, filterEntries, retentionCutoff } from "../src/components/audit-log/audit-rules.ts";

test("diffRecords flattens nested objects and skips unchanged fields", () => {
  const d = diffRecords({ name: "A", role: "member", billing: { email: "a@x.com", plan: "pro" }, tags: ["x"] }, { name: "A", role: "admin", billing: { email: "b@x.com", plan: "pro" }, tags: ["x", "y"] });
  assert.deepEqual(
    d.map((c) => c.field),
    ["billing.email", "role", "tags"],
  );
  assert.equal(d.find((c) => c.field === "role").after, "admin");
});

test("diffRecords marks added and removed fields", () => {
  const d = diffRecords({ a: 1 }, { b: 2 });
  assert.equal(changeKind(d.find((c) => c.field === "a")), "removed");
  assert.equal(changeKind(d.find((c) => c.field === "b")), "added");
  assert.equal(changeKind({ field: "x", before: 1, after: 2 }), "changed");
});

const e = (id, at, o = {}) => ({ id, at, actor: { id: "u1", name: "U" }, action: "a.b", entity: { type: "member" }, channel: "web", ...o });

test("filterEntries combines facets and an inclusive date range", () => {
  const list = [e("1", "2026-03-10T09:00:00"), e("2", "2026-03-11T23:59:00", { channel: "api" }), e("3", "2026-03-12T00:01:00", { actor: null }), e("4", "2026-03-12T10:00:00", { channel: "mcp", entity: { type: "key" } })];
  assert.deepEqual(filterEntries(list, { from: new Date(2026, 2, 11), to: new Date(2026, 2, 11) }).map((x) => x.id), ["2"]);
  assert.deepEqual(filterEntries(list, { channels: ["api", "mcp"] }).map((x) => x.id), ["2", "4"]);
  assert.deepEqual(filterEntries(list, { actors: ["system"] }).map((x) => x.id), ["3"]);
  assert.deepEqual(filterEntries(list, { entities: ["key"], channels: ["mcp"] }).map((x) => x.id), ["4"]);
});

test("retention cutoff and expiring count", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  assert.equal(retentionCutoff(null, now), null);
  assert.equal(retentionCutoff(30, now), now.getTime() - 30 * 86_400_000);
  const list = [e("1", "2026-06-25T00:00:00Z"), e("2", "2026-04-01T00:00:00Z"), e("3", "2025-01-01T00:00:00Z")];
  assert.equal(expiringCount(list, 90, now), 1);
  assert.equal(expiringCount(list, 30, now), 2);
  assert.equal(expiringCount(list, null, now), 0);
});

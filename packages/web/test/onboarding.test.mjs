import assert from "node:assert/strict";
import { test } from "node:test";
import { checklistSummary, initialProgress, markCompleted, markSkipped, moveTo, parseInviteEmails, parseProgress, resumeIndex, serializeProgress } from "../src/components/onboarding-flow/onboarding-model.ts";

const ids = ["welcome", "profile", "invite", "finish"];

test("progress round-trips and resumes at the saved step", () => {
  let p = initialProgress("welcome", { a: 1 }, 1000);
  p = moveTo(markCompleted(p, "profile", 2000), "invite", 2000);
  const back = parseProgress(serializeProgress(p), ids, { now: 3000 });
  assert.deepEqual(back, p);
  assert.equal(resumeIndex(back, ids), 2);
  assert.equal(resumeIndex(null, ids), 0);
});

test("skipping never undoes a completed step, completing un-skips", () => {
  let p = initialProgress("welcome", {}, 1);
  p = markSkipped(p, "invite", 2);
  assert.deepEqual(p.skipped, ["invite"]);
  p = markCompleted(p, "invite", 3);
  assert.deepEqual(p.skipped, []);
  assert.deepEqual(markSkipped(p, "invite", 4).skipped, []);
});

test("parseProgress rejects junk, stale saves, and drops removed steps", () => {
  assert.equal(parseProgress(null, ids), null);
  assert.equal(parseProgress("{nope", ids), null);
  assert.equal(parseProgress(JSON.stringify({ current: 3 }), ids), null);
  const old = JSON.stringify({ current: "gone", completed: ["profile", "gone"], skipped: [], values: {}, updatedAt: 0 });
  assert.equal(parseProgress(old, ids, { maxAgeMs: 100, now: 1000 }), null);
  const kept = parseProgress(old, ids);
  assert.equal(kept.current, "welcome");
  assert.deepEqual(kept.completed, ["profile"]);
});

test("parseInviteEmails splits, validates and de-duplicates", () => {
  const r = parseInviteEmails("a@x.com, b@x.com;bad،A@X.com\n<c@y.io> d@x.com", ["d@x.com"]);
  assert.deepEqual(r.valid, ["a@x.com", "b@x.com", "c@y.io"]);
  assert.deepEqual(r.invalid, ["bad"]);
  assert.deepEqual(r.duplicates, ["A@X.com", "d@x.com"]);
});

test("checklistSummary counts and finds the next item", () => {
  assert.deepEqual(checklistSummary([]), { done: 0, total: 0, percent: 0, complete: false, nextIndex: -1 });
  const s = checklistSummary([{ id: "a", done: true }, { id: "b" }, { id: "c" }]);
  assert.deepEqual(s, { done: 1, total: 3, percent: 33, complete: false, nextIndex: 1 });
  assert.equal(checklistSummary([{ id: "a", done: true }]).complete, true);
});

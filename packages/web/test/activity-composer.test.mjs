import assert from "node:assert/strict";
import { test } from "node:test";
import { countByKind, fromLocalInput, isOpenTask, isOverdue, splitActivities, toLocalInput, validateActivity } from "../src/components/activity-composer/activity-logic.ts";

const rec = (id, kind, at, extra = {}) => ({ id, kind, body: id, at, ...extra });

test("open tasks come first, soonest due first; history is newest first", () => {
  const { open, history } = splitActivities([
    rec("n1", "note", 100),
    rec("t2", "task", 500),
    rec("c1", "call", 300),
    rec("t1", "task", 400),
    rec("t3", "task", 50, { done: true, doneAt: 350 }),
  ]);
  assert.deepEqual(open.map((a) => a.id), ["t1", "t2"]);
  assert.deepEqual(history.map((a) => a.id), ["t3", "c1", "n1"]);
});

test("overdue only for open tasks in the past", () => {
  assert.equal(isOverdue(rec("t", "task", 10), 20), true);
  assert.equal(isOverdue(rec("t", "task", 30), 20), false);
  assert.equal(isOverdue(rec("t", "task", 10, { done: true }), 20), false);
  assert.equal(isOverdue(rec("n", "note", 10), 20), false);
  assert.equal(isOpenTask(rec("n", "note", 10)), false);
});

test("counts by kind", () => {
  const counts = countByKind([rec("a", "note", 1), rec("b", "note", 2), rec("c", "call", 3)]);
  assert.equal(counts.note, 2);
  assert.equal(counts.call, 1);
  assert.equal(counts.task, 0);
});

test("validation", () => {
  const at = new Date(2026, 9, 1, 10, 0);
  assert.equal(validateActivity({ kind: "note", body: "  ", at }), "empty");
  assert.equal(validateActivity({ kind: "note", body: "x", at: null }), "badDate");
  assert.equal(validateActivity({ kind: "call", body: "x", at, durationMinutes: -5 }), "badDuration");
  assert.equal(validateActivity({ kind: "call", body: "x", at, durationMinutes: 2000 }), "badDuration");
  assert.equal(validateActivity({ kind: "call", body: "x", at, durationMinutes: 30 }), null);
});

test("datetime-local round trip keeps local wall time", () => {
  const d = new Date(2026, 9, 4, 9, 5);
  assert.equal(toLocalInput(d), "2026-10-04T09:05");
  assert.equal(fromLocalInput("2026-10-04T09:05").getTime(), d.getTime());
  assert.equal(fromLocalInput(""), null);
  assert.equal(fromLocalInput("nope"), null);
});

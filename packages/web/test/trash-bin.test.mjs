import assert from "node:assert/strict";
import { test } from "node:test";
import { trashExpiredIds, trashRetention, trashSortByPurge } from "../src/components/trash-bin/trash-math.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 8, 1, 12, 0, 0);

test("counts whole days left, rounded up", () => {
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 }).daysLeft, 30);
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 + 10 * DAY }).daysLeft, 20);
  // One minute short of 20 days left rounds up to 21.
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 + 10 * DAY - 60_000 }).daysLeft, 21);
  // Under a day left reads "1 day", never "0 days".
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 + 30 * DAY - 3_600_000 }).daysLeft, 1);
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 + 30 * DAY - 3_600_000 }).hoursLeft, 1);
});

test("expires exactly at the end of the window", () => {
  const at = trashRetention(T0, { retentionDays: 30, now: T0 + 30 * DAY });
  assert.equal(at.expired, true);
  assert.equal(at.daysLeft, 0);
  assert.equal(at.urgency, "expired");
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 + 30 * DAY - 1 }).expired, false);
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 + 90 * DAY }).daysLeft, 0);
});

test("grades urgency by days left", () => {
  const u = (days) => trashRetention(T0, { retentionDays: 30, now: T0 + days * DAY }).urgency;
  assert.equal(u(0), "safe");
  assert.equal(u(22), "safe");
  assert.equal(u(23), "soon");
  assert.equal(u(27), "urgent");
  assert.equal(u(29.5), "urgent");
  assert.equal(u(30), "expired");
  assert.equal(trashRetention(T0, { retentionDays: 30, now: T0 + 20 * DAY, soonDays: 15, urgentDays: 10 }).urgency, "urgent");
});

test("an explicit purge date wins over the retention window", () => {
  const r = trashRetention(T0, { retentionDays: 30, purgeAt: T0 + 2 * DAY, now: T0 });
  assert.equal(r.daysLeft, 2);
  assert.equal(r.urgency, "urgent");
  assert.equal(r.purgeAt.getTime(), T0 + 2 * DAY);
});

test("no retention keeps items until the bin is emptied", () => {
  for (const retentionDays of [0, null]) {
    const r = trashRetention(T0, { retentionDays, now: T0 + 999 * DAY });
    assert.equal(r.urgency, "kept");
    assert.equal(r.daysLeft, null);
    assert.equal(r.expired, false);
    assert.equal(r.purgeAt, null);
  }
});

test("reports how much of the window has passed", () => {
  assert.equal(trashRetention(T0, { retentionDays: 10, now: T0 }).elapsed, 0);
  assert.equal(trashRetention(T0, { retentionDays: 10, now: T0 + 5 * DAY }).elapsed, 0.5);
  assert.equal(trashRetention(T0, { retentionDays: 10, now: T0 + 50 * DAY }).elapsed, 1);
});

test("accepts ISO strings and Dates", () => {
  const iso = new Date(T0).toISOString();
  assert.equal(trashRetention(iso, { retentionDays: 30, now: new Date(T0 + DAY) }).daysLeft, 29);
  assert.equal(trashRetention("not a date", { retentionDays: 30, now: T0 }).urgency, "kept");
});

test("finds expired items and sorts what disappears first", () => {
  const items = [
    { id: "a", deletedAt: T0 - 5 * DAY },
    { id: "b", deletedAt: T0 - 31 * DAY },
    { id: "c", deletedAt: T0 - 2 * DAY, purgeAt: T0 + DAY },
    { id: "d", deletedAt: T0 - 5 * DAY },
  ];
  const opts = { retentionDays: 30, now: T0 };
  assert.deepEqual(trashExpiredIds(items, opts), ["b"]);
  assert.deepEqual(trashSortByPurge(items, opts).map((i) => i.id), ["b", "c", "a", "d"]);
  assert.deepEqual(trashSortByPurge(items, { retentionDays: null, now: T0 }).map((i) => i.id), ["c", "a", "b", "d"]);
});

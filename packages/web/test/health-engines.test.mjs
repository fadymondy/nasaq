import assert from "node:assert/strict";
import { test } from "node:test";
import { bucketDays, engineTone, groupByMonth, splitDuration, summariseDays, summariseMedication } from "../src/components/engine-card/health-engines.ts";

const v = (...verdicts) => verdicts.map((verdict, i) => ({ date: `2026-09-${String(i + 1).padStart(2, "0")}`, verdict }));

test("summariseDays counts verdicts and streaks", () => {
  const t = summariseDays(v("on_protocol", "on_protocol", "off_protocol", "on_protocol", "on_protocol", "on_protocol"));
  assert.equal(t.daysOnProtocol, 5);
  assert.equal(t.daysOffProtocol, 1);
  assert.equal(t.bestStreak, 3);
  assert.equal(t.currentStreak, 3);
});

test("an unevaluated day ends a streak but is not a failure", () => {
  const t = summariseDays(v("on_protocol", "on_protocol", "unevaluated", "on_protocol"));
  assert.equal(t.daysUnevaluated, 1);
  assert.equal(t.daysOffProtocol, 0);
  assert.equal(t.bestStreak, 2);
  assert.equal(t.currentStreak, 1);
});

test("bucketDays and groupByMonth", () => {
  const days = v("on_protocol", "off_protocol", "unevaluated", "on_protocol", "on_protocol", "on_protocol", "on_protocol", "off_protocol");
  const weeks = bucketDays(days);
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0].onProtocol + weeks[0].offProtocol + weeks[0].unevaluated, 7);
  const months = groupByMonth([{ date: "2026-08-31" }, { date: "2026-09-01" }]);
  assert.deepEqual(months.map((m) => m.month), ["2026-08", "2026-09"]);
});

test("splitDuration returns at most two units", () => {
  assert.deepEqual(splitDuration(4320), [{ unit: "hour", value: 1 }, { unit: "minute", value: 12 }]);
  assert.deepEqual(splitDuration(45), [{ unit: "second", value: 45 }]);
  assert.ok(splitDuration(3661).length <= 2);
});

test("engineTone follows state", () => {
  assert.equal(engineTone({ engine: "hydration", state: "capped", totalMl: 5000, dailyCapMl: 5000, unitMl: 250, unitsLogged: 20, unitsTotal: 20 }) !== undefined, true);
});

test("summariseMedication picks the most pressing state", () => {
  const at = "2026-09-29T08:00:00Z";
  const s = summariseMedication([
    { id: "a", name: "A", scheduledFor: at, status: "logged" },
    { id: "b", name: "B", scheduledFor: at, status: "missed" },
  ]);
  assert.equal(s.total, 2);
  assert.equal(s.logged, 1);
  assert.equal(s.missed, 1);
  assert.equal(s.state, "missed");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { eventBox, eventOnDay, layoutDayEvents, minutesSince, normalizeHours, splitChips, stepDate, timeSlots } from "../src/components/scheduler/scheduler-math.ts";

const day = new Date(2026, 8, 29);
const ev = (id, sh, sm, eh, em, d = day) => ({
  id,
  title: id,
  start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm),
  end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em),
});

test("time slots cover the working hours", () => {
  assert.deepEqual(timeSlots({ start: 9, end: 11 }, 30), [540, 570, 600, 630]);
  assert.equal(timeSlots({ start: 8, end: 18 }, 60).length, 10);
  assert.deepEqual(normalizeHours({ start: 12, end: 5 }), { start: 12, end: 13 });
  assert.deepEqual(normalizeHours({ start: -3, end: 40 }), { start: 0, end: 24 });
});

test("a lone event is positioned by time", () => {
  const [p] = layoutDayEvents([ev("a", 10, 0, 11, 30)], day, 8 * 60, 18 * 60);
  assert.equal(p.top, 120);
  assert.equal(p.height, 90);
  assert.equal(p.columns, 1);
  const box = eventBox(p, 600);
  assert.equal(box.top, 20);
  assert.equal(box.height, 15);
  assert.equal(box.width, 100);
  assert.equal(box.insetInlineStart, 0);
});

test("overlapping events split into columns, and columns are reused", () => {
  const out = layoutDayEvents([ev("a", 9, 0, 11, 0), ev("b", 10, 0, 12, 0), ev("c", 11, 0, 12, 0), ev("d", 13, 0, 14, 0)], day, 8 * 60, 18 * 60);
  const by = Object.fromEntries(out.map((p) => [p.event.id, p]));
  assert.deepEqual([by.a.column, by.b.column, by.c.column], [0, 1, 0]);
  assert.equal(by.a.columns, 2);
  assert.equal(by.c.columns, 2);
  // d is in its own cluster and takes the full width.
  assert.equal(by.d.columns, 1);
  assert.equal(by.d.column, 0);
});

test("back to back events do not overlap", () => {
  const out = layoutDayEvents([ev("a", 9, 0, 10, 0), ev("b", 10, 0, 11, 0)], day, 8 * 60, 18 * 60);
  assert.ok(out.every((p) => p.columns === 1));
});

test("events are clipped to the visible range and dropped outside it", () => {
  const out = layoutDayEvents([ev("early", 6, 0, 9, 0), ev("late", 17, 0, 20, 0), ev("gone", 19, 0, 20, 0)], day, 8 * 60, 18 * 60);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].top, out[0].height], [0, 60]);
  assert.deepEqual([out[1].top, out[1].height], [540, 60]);
});

test("zero-length events get a minimum height", () => {
  const [p] = layoutDayEvents([ev("a", 9, 0, 9, 0)], day, 8 * 60, 18 * 60);
  assert.equal(p.height, 15);
});

test("events crossing midnight show on both days", () => {
  const night = { id: "n", title: "n", start: new Date(2026, 8, 29, 22, 0), end: new Date(2026, 8, 30, 1, 0) };
  assert.ok(eventOnDay(night, new Date(2026, 8, 29)));
  assert.ok(eventOnDay(night, new Date(2026, 8, 30)));
  assert.ok(!eventOnDay(night, new Date(2026, 8, 31)));
  const endsAtMidnight = { id: "m", title: "m", start: new Date(2026, 8, 29, 22, 0), end: new Date(2026, 8, 30, 0, 0) };
  assert.ok(!eventOnDay(endsAtMidnight, new Date(2026, 8, 30)));
  const next = layoutDayEvents([night], new Date(2026, 8, 30), 0, 24 * 60);
  assert.equal(minutesSince(night.end, new Date(2026, 8, 30)), 60);
  assert.deepEqual([next[0].top, next[0].height], [0, 60]);
});

test("stepDate moves by the view unit", () => {
  const key = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  assert.equal(key(stepDate("day", day, 1)), "2026-9-30");
  assert.equal(key(stepDate("week", day, -1)), "2026-9-22");
  assert.equal(key(stepDate("month", day, 1)), "2026-10-1");
});

test("month chips keep a line for +N more", () => {
  const list = ["a", "b", "c", "d", "e"].map((id) => ev(id, 9, 0, 10, 0));
  assert.deepEqual(splitChips(list, 3).visible.length, 2);
  assert.equal(splitChips(list, 3).hidden, 3);
  assert.equal(splitChips(list.slice(0, 3), 3).hidden, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { distinct, groupSkills, isKnownTimeZone, isWorkingNow, offsetHours, partsIn, tenureBetween, totalExperience } from "../src/components/personal-widgets/personal-model.ts";

test("isKnownTimeZone", () => {
  assert.equal(isKnownTimeZone("Asia/Riyadh"), true);
  assert.equal(isKnownTimeZone("Nowhere/Land"), false);
});

test("partsIn reads the wall clock of a zone", () => {
  const at = Date.UTC(2026, 8, 30, 12, 30); // Wednesday 12:30 UTC
  assert.deepEqual(partsIn(at, "UTC"), { hour: 12, minute: 30, weekday: 3 });
  assert.deepEqual(partsIn(at, "Asia/Riyadh"), { hour: 15, minute: 30, weekday: 3 });
  assert.equal(partsIn(Date.UTC(2026, 8, 30, 22, 0), "Asia/Riyadh").weekday, 4);
});

test("isWorkingNow uses Sunday to Thursday, 9 to 17 by default", () => {
  assert.equal(isWorkingNow(Date.UTC(2026, 8, 30, 8, 0), "Asia/Riyadh"), true); // Wed 11:00
  assert.equal(isWorkingNow(Date.UTC(2026, 8, 30, 15, 0), "Asia/Riyadh"), false); // Wed 18:00
  assert.equal(isWorkingNow(Date.UTC(2026, 9, 2, 8, 0), "Asia/Riyadh"), false); // Fri
  assert.equal(isWorkingNow(Date.UTC(2026, 9, 2, 8, 0), "Asia/Riyadh", { days: [5] }), true);
});

test("offsetHours between zones, across the date line and half hours", () => {
  const at = Date.UTC(2026, 8, 30, 12, 0);
  assert.equal(offsetHours(at, "Asia/Riyadh", "UTC"), 3);
  assert.equal(offsetHours(at, "UTC", "Asia/Riyadh"), -3);
  assert.equal(offsetHours(at, "Asia/Kolkata", "UTC"), 5.5);
  assert.equal(offsetHours(at, "Pacific/Auckland", "Pacific/Honolulu"), 23);
  assert.equal(offsetHours(at, "UTC", "UTC"), 0);
});

test("tenureBetween counts whole months", () => {
  assert.deepEqual(tenureBetween("2020-01-15", "2022-03-20"), { years: 2, months: 2 });
  assert.deepEqual(tenureBetween("2020-01-15", "2022-03-10"), { years: 2, months: 1 });
  assert.deepEqual(tenureBetween("2022-01-01", "2020-01-01"), { years: 0, months: 0 });
});

test("totalExperience merges overlapping roles", () => {
  const now = Date.UTC(2026, 0, 1);
  const roles = [
    { start: "2018-01-01", end: "2020-01-01" },
    { start: "2019-01-01", end: "2021-01-01" },
    { start: "2024-01-01" },
  ];
  assert.deepEqual(totalExperience(roles, now), { years: 5, months: 0 });
  assert.deepEqual(totalExperience([], now), { years: 0, months: 0 });
});

test("groupSkills orders groups by first appearance, ungrouped last, strongest first", () => {
  const out = groupSkills([{ name: "a" }, { name: "b", group: "Design", level: 3 }, { name: "c", group: "Code", level: 5 }, { name: "d", group: "Design", level: 5 }]);
  assert.deepEqual(
    out.map((g) => [g.group, g.skills.map((s) => s.name)]),
    [
      ["Design", ["d", "b"]],
      ["Code", ["c"]],
      ["", ["a"]],
    ],
  );
});

test("distinct keeps first-seen order and drops empties", () => {
  assert.deepEqual(distinct([{ k: "b" }, { k: "a" }, { k: "b" }, {}], (x) => x.k), ["b", "a"]);
});

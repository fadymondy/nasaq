import assert from "node:assert/strict";
import { test } from "node:test";
import { copyDay, emptyDay, hoursForDate, isOnVacation, makeWeek, nextRange, validateAvailability, vacationDays, weeklyMinutes, workedMinutes } from "../src/components/availability-editor/availability-math.ts";
import { busyMinutes, doctorsOnDuty, isOnDuty, roomCounts, roomOccupancy, waitingFigures } from "../src/components/clinic-dashboard/clinic-math.ts";
import { currentAppointment, findOverlaps, freeGaps, minutesLate, nextAppointment, STATUS_TONE, summariseAppointments, utilisation } from "../src/components/clinic-schedule/schedule-math.ts";
import { canFinishVisit, visitElapsedSeconds, followUpDate, formatVisitElapsed, isPrescriptionValid, prescriptionLine, validatePrescription, withoutBlankPrescriptions } from "../src/components/current-visit/visit-math.ts";

const at = (h, m = 0) => new Date(2026, 8, 30, h, m);
const appt = (id, sh, sm, eh, em, status = "confirmed") => ({ id, patient: id, service: "Check-up", start: at(sh, sm), end: at(eh, em), status });

test("day summary counts every status and the booked minutes", () => {
  const list = [appt("a", 9, 0, 9, 30, "done"), appt("b", 9, 30, 10, 0, "in_visit"), appt("c", 10, 0, 10, 30, "checked_in"), appt("d", 10, 30, 11, 0), appt("e", 11, 0, 11, 30, "cancelled"), appt("f", 11, 30, 12, 0, "no_show")];
  const s = summariseAppointments(list);
  assert.equal(s.total, 6);
  assert.equal(s.remaining, 2);
  assert.equal(s.byStatus.done, 1);
  assert.equal(s.bookedMinutes, 120, "cancelled and no-show take no time");
  assert.equal(currentAppointment(list).id, "b");
  assert.equal(STATUS_TONE.in_visit, "brand");
});

test("next appointment prefers a checked-in patient, then the earliest open one", () => {
  const list = [appt("a", 9, 0, 9, 30, "done"), appt("b", 10, 0, 10, 30), appt("c", 10, 30, 11, 0, "checked_in")];
  assert.equal(nextAppointment(list, at(9, 45)).id, "c");
  assert.equal(nextAppointment(list.filter((a) => a.id !== "c"), at(9, 45)).id, "b");
  assert.equal(nextAppointment([appt("a", 9, 0, 9, 30, "done")], at(9, 45)), undefined);
});

test("late minutes only for patients who have not started", () => {
  assert.equal(minutesLate(appt("a", 9, 0, 9, 30), at(9, 12)), 12);
  assert.equal(minutesLate(appt("a", 9, 0, 9, 30), at(8, 50)), 0);
  assert.equal(minutesLate(appt("a", 9, 0, 9, 30, "in_visit"), at(9, 12)), 0);
});

test("overlaps and free gaps", () => {
  const list = [appt("a", 9, 0, 10, 0), appt("b", 9, 30, 10, 30), appt("c", 11, 0, 11, 30), appt("x", 9, 0, 12, 0, "cancelled"), appt("n", 9, 0, 12, 0, "no_show")];
  assert.deepEqual(findOverlaps(list), [["a", "b"]]);
  const gaps = freeGaps(list, at(9), at(12), 15);
  assert.deepEqual(gaps.map((g) => [g.start.getHours() * 60 + g.start.getMinutes(), g.minutes]), [[630, 30], [690, 30]]);
  assert.equal(utilisation(list, 180), Math.min(1, (60 + 60 + 30) / 180));
  assert.equal(utilisation([], 0), 0);
});

test("weekly hours: worked minutes, lookup and vacations", () => {
  const week = makeWeek([0, 1, 2, 3, 4], [{ start: "09:00", end: "17:00" }], [{ start: "13:00", end: "14:00" }]);
  const av = { weekly: week, vacations: [{ id: "v1", from: "2026-10-04", to: "2026-10-08", reason: "Conference" }] };
  assert.equal(workedMinutes(week[1]), 7 * 60);
  assert.equal(workedMinutes(week[6]), 0, "Saturday is off");
  assert.equal(weeklyMinutes(av), 5 * 7 * 60);
  assert.equal(hoursForDate(av, new Date(2026, 8, 30)).ranges[0].start, "09:00"); // a Wednesday
  assert.equal(hoursForDate(av, new Date(2026, 9, 3)), null); // a Saturday
  assert.equal(hoursForDate(av, new Date(2026, 9, 5)), null); // Monday, on vacation
  assert.equal(isOnVacation(av, new Date(2026, 9, 5)).id, "v1");
  assert.equal(vacationDays(av.vacations[0]), 5);
});

test("availability validation finds every kind of problem", () => {
  const good = { weekly: makeWeek([1], [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "17:00" }], [{ start: "10:00", end: "10:15" }]), vacations: [] };
  assert.deepEqual(validateAvailability(good), []);
  const bad = { weekly: makeWeek([1, 2, 3, 4, 5], [{ start: "09:00", end: "12:00" }]), vacations: [] };
  bad.weekly[1].ranges = [{ start: "09:00", end: "12:00" }, { start: "11:00", end: "13:00" }];
  bad.weekly[2].ranges = [{ start: "12:00", end: "09:00" }];
  bad.weekly[3].breaks = [{ start: "12:00", end: "13:00" }];
  bad.weekly[4].ranges = [];
  bad.weekly[5].ranges = [{ start: "9", end: "10:00" }];
  bad.vacations = [
    { id: "v1", from: "2026-10-10", to: "2026-10-01" },
    { id: "v2", from: "2026-11-01", to: "2026-11-05" },
    { id: "v3", from: "2026-11-05", to: "2026-11-09" },
  ];
  const codes = validateAvailability(bad).map((i) => `${i.code}:${i.day ?? i.vacationId}`);
  assert.deepEqual(codes.sort(), ["break-outside-hours:3", "end-before-start:2", "invalid-time:5", "no-hours:4", "overlap:1", "vacation-order:v1", "vacation-overlap:v3"].sort());
  const off = { weekly: [{ enabled: false, ranges: [{ start: "12:00", end: "09:00" }], breaks: [] }, ...makeWeek([], []).slice(1)], vacations: [] };
  assert.deepEqual(validateAvailability(off), [], "off days are not checked");
});

test("editing helpers", () => {
  assert.deepEqual(nextRange([]), { start: "09:00", end: "10:00" });
  assert.deepEqual(nextRange([{ start: "09:00", end: "12:00" }], 30), { start: "12:00", end: "12:30" });
  assert.deepEqual(nextRange([{ start: "23:30", end: "24:00" }], 60), { start: "23:00", end: "24:00" });
  const week = makeWeek([1], [{ start: "09:00", end: "17:00" }], []);
  week[1].ranges = [{ start: "10:00", end: "14:00" }];
  const copied = copyDay(week, 1, [2, 3]);
  assert.equal(copied[2].enabled, true);
  assert.deepEqual(copied[3].ranges, [{ start: "10:00", end: "14:00" }]);
  copied[3].ranges[0].start = "08:00";
  assert.equal(copied[2].ranges[0].start, "10:00", "copies are independent");
  assert.equal(emptyDay().enabled, false);
});

test("prescriptions and finishing a visit", () => {
  const p = { id: "1", drug: "Amoxicillin", dose: "500 mg", frequency: "twice daily", days: 7 };
  assert.ok(isPrescriptionValid(p));
  assert.deepEqual(validatePrescription({ ...p, drug: " ", days: 0 }), { drug: "required", days: "invalid" });
  assert.deepEqual(validatePrescription({ ...p, days: Number.NaN }), { days: "required" });
  assert.equal(prescriptionLine(p), "Amoxicillin 500 mg, twice daily, 7 days");
  const blank = { id: "2", drug: "", dose: "", frequency: "", days: 5 };
  assert.deepEqual(withoutBlankPrescriptions([p, blank]).map((x) => x.id), ["1"]);
  assert.deepEqual(canFinishVisit({ notes: "", prescriptions: [blank] }), { ok: false, reason: "empty" });
  assert.deepEqual(canFinishVisit({ notes: "Rest", prescriptions: [blank] }), { ok: true });
  assert.deepEqual(canFinishVisit({ notes: "", prescriptions: [{ ...p, dose: "" }, { ...p, id: "3", dose: "" , drug: "x" }] }), { ok: false, reason: "invalid-prescription" });
});

test("visit timer and follow-up date", () => {
  assert.equal(visitElapsedSeconds(1000, 1000 + 754_000), 754);
  assert.equal(visitElapsedSeconds(5000, 1000), 0);
  assert.equal(formatVisitElapsed(754), "12:34");
  assert.equal(formatVisitElapsed(3725), "1:02:05");
  // 2026-09-30 is a Wednesday. Two weeks on lands on a Wednesday; a clinic closed Wednesday moves it to Thursday.
  assert.equal(followUpDate(at(10), 14).getDate(), 14);
  assert.equal(followUpDate(at(10), 14, [0, 1, 2, 4]).getDate(), 15);
  assert.equal(followUpDate(at(10), 3, [1]).getDay(), 1);
});

test("dashboard: duty, rooms and waiting figures", () => {
  const doctors = [
    { id: "a", name: "A", specialty: "GP", status: "available", shift: { start: "08:00", end: "16:00" }, waiting: 2 },
    { id: "b", name: "B", specialty: "GP", status: "off", waiting: 0 },
    { id: "c", name: "C", specialty: "GP", status: "in_visit", shift: { start: "14:00", end: "20:00" }, waiting: 1 },
  ];
  assert.ok(isOnDuty(doctors[0], at(10)));
  assert.ok(!isOnDuty(doctors[1], at(10)));
  assert.deepEqual(doctorsOnDuty(doctors, at(10)).map((d) => d.id), ["a"]);
  assert.deepEqual(doctorsOnDuty(doctors, at(15)).map((d) => d.id), ["a", "c"]);
  const rooms = [{ id: "1", name: "1", status: "busy", since: 0 }, { id: "2", name: "2", status: "free" }, { id: "3", name: "3", status: "closed" }, { id: "4", name: "4", status: "busy" }];
  assert.deepEqual(roomCounts(rooms), { free: 1, busy: 2, cleaning: 0, closed: 1 });
  assert.equal(roomOccupancy(rooms), 2 / 3);
  assert.equal(roomOccupancy([]), 0);
  assert.equal(busyMinutes(rooms[0], 12 * 60000 + 5), 12);
  assert.equal(busyMinutes(rooms[1], 99999), 0);
  const now = 100 * 60000;
  assert.deepEqual(waitingFigures([now - 30 * 60000, now - 10 * 60000], now), { waiting: 2, longestMinutes: 30, averageMinutes: 20 });
  assert.deepEqual(waitingFigures([], now), { waiting: 0, longestMinutes: 0, averageMinutes: 0 });
});

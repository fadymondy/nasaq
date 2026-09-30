import assert from "node:assert/strict";
import { test } from "node:test";
import {
  advance,
  bookingCode,
  bookingTicketValue,
  bookingTotals,
  buildIcs,
  canTransition,
  countBookingsByStatus,
  countSlots,
  dayPart,
  evaluatePolicy,
  firstAvailableDay,
  generateSlots,
  googleCalendarUrl,
  isPhoneValid,
  nextStatuses,
  normalizePhone,
  parseHm,
  primaryNext,
  toHm,
  validateDetails,
} from "../src/components/booking-flow/booking-math.ts";
import { parseTicketValue } from "../src/components/waiting-screen/queue-math.ts";

const day = new Date(2026, 8, 30);
const at = (h, m = 0) => new Date(2026, 8, 30, h, m);

test("parseHm and toHm", () => {
  assert.equal(parseHm("09:30"), 570);
  assert.equal(parseHm("9:05"), 545);
  assert.ok(Number.isNaN(parseHm("25:00")));
  assert.ok(Number.isNaN(parseHm("nine")));
  assert.equal(toHm(570), "09:30");
});

test("slots fit the opening range and skip breaks", () => {
  const slots = generateSlots({ day, hours: [{ start: "09:00", end: "12:00" }], breaks: [{ start: "10:00", end: "10:30" }], durationMinutes: 30 });
  assert.deepEqual(slots.map((s) => toHm(s.start.getHours() * 60 + s.start.getMinutes())), ["09:00", "09:30", "10:30", "11:00", "11:30"]);
  // A 45 minute service on a 30 minute step never runs past closing time.
  const long = generateSlots({ day, hours: [{ start: "09:00", end: "10:30" }], durationMinutes: 45, stepMinutes: 30 });
  assert.deepEqual(long.map((s) => s.start.getMinutes()), [0, 30]);
  assert.equal(long.at(-1).end.getHours() * 60 + long.at(-1).end.getMinutes(), 10 * 60 + 15);
});

test("slot states: booked is full, held is held, lead time is past", () => {
  const busy = [
    { start: at(9), end: at(9, 30) },
    { start: at(9, 30), end: at(10), held: true },
  ];
  const slots = generateSlots({ day, hours: [{ start: "08:30", end: "11:00" }], durationMinutes: 30, busy, now: at(8, 20), leadMinutes: 30 });
  const state = (h, m) => slots.find((s) => s.start.getTime() === at(h, m).getTime()).state;
  assert.equal(state(8, 30), "past");
  assert.equal(state(9, 0), "full");
  assert.equal(state(9, 30), "held");
  assert.equal(state(10, 0), "available");
  assert.deepEqual(countSlots(slots), { available: 2, full: 1, held: 1, past: 1 });
});

test("capacity lets a slot take more than one booking", () => {
  const busy = [{ start: at(9), end: at(10) }];
  const [slot] = generateSlots({ day, hours: [{ start: "09:00", end: "10:00" }], durationMinutes: 60, busy, capacity: 2 });
  assert.equal(slot.state, "available");
  assert.equal(slot.remaining, 1);
  const [full] = generateSlots({ day, hours: [{ start: "09:00", end: "10:00" }], durationMinutes: 60, busy: [...busy, ...busy], capacity: 2 });
  assert.equal(full.state, "full");
  assert.equal(full.remaining, 0);
});

test("closed day and bad input give no slots", () => {
  assert.deepEqual(generateSlots({ day, hours: [], durationMinutes: 30 }), []);
  assert.deepEqual(generateSlots({ day, hours: [{ start: "09:00", end: "10:00" }], durationMinutes: 0 }), []);
  assert.deepEqual(generateSlots({ day, hours: [{ start: "10:00", end: "09:00" }], durationMinutes: 30 }), []);
});

test("firstAvailableDay looks past full days", () => {
  const slots = [
    { start: at(9), state: "full" },
    { start: new Date(2026, 9, 2, 9), state: "available" },
  ];
  assert.equal(firstAvailableDay(slots, day).getDate(), 2);
  assert.equal(firstAvailableDay([], day), null);
  assert.equal(dayPart(at(9)), "morning");
  assert.equal(dayPart(at(12)), "afternoon");
  assert.equal(dayPart(at(17)), "evening");
});

test("status workflow allows only the defined moves", () => {
  assert.ok(canTransition("requested", "confirmed"));
  assert.ok(!canTransition("requested", "done"));
  assert.ok(!canTransition("done", "confirmed"));
  assert.ok(canTransition("no_show", "confirmed"));
  assert.deepEqual([...nextStatuses("confirmed")], ["checked_in", "no_show", "cancelled"]);
  assert.equal(primaryNext("checked_in"), "in_visit");
  assert.equal(primaryNext("done"), null);
  assert.equal(primaryNext("cancelled"), null);
  assert.equal(primaryNext("no_show"), "confirmed");
});

test("advance appends a transition or explains why not", () => {
  const t0 = new Date(2026, 8, 30, 9);
  const first = advance([], "requested", t0, "guest");
  assert.ok(first.ok);
  const ok = advance(first.history, "confirmed", t0, "reception");
  assert.ok(ok.ok);
  assert.equal(ok.history.length, 2);
  const bad = advance(ok.history, "done", t0);
  assert.ok(!bad.ok);
  assert.equal(bad.history.length, 2);
  assert.match(bad.reason, /not allowed/);
  assert.equal(countBookingsByStatus([{ status: "done" }, { status: "done" }, { status: "no_show" }]).done, 2);
});

test("totals are rounded per line and add up", () => {
  const t = bookingTotals([{ id: "a", price: 33.335 }, { id: "b", price: 10, quantity: 3 }], { taxRate: 0.14, discount: 5 });
  assert.equal(t.subtotal, 63.34);
  assert.equal(t.discount, 5);
  assert.equal(t.tax, 8.17);
  assert.equal(t.total, 66.51);
  assert.equal(bookingTotals([{ id: "a", price: 10 }], { discount: 50 }).total, 0);
});

test("cancel and reschedule policy", () => {
  const start = at(15);
  const policy = { cancelHours: 24, rescheduleHours: 6, lateFeePercent: 50 };
  const early = evaluatePolicy(start, new Date(2026, 8, 28, 15), policy);
  assert.ok(early.freeCancel && early.canReschedule);
  assert.equal(early.feePercent, 0);
  const late = evaluatePolicy(start, at(12), policy);
  assert.ok(late.canCancel && !late.freeCancel && !late.canReschedule);
  assert.equal(late.feePercent, 50);
  const started = evaluatePolicy(start, at(16), policy);
  assert.ok(!started.canCancel && !started.canReschedule);
  assert.ok(!evaluatePolicy(start, at(1), policy, "in_visit").canCancel);
});

test("phone and details validation", () => {
  assert.equal(normalizePhone("٠١٠٠ ١٢٣ ٤٥٦٧"), "01001234567");
  assert.equal(normalizePhone("+20 100 123 4567"), "+201001234567");
  assert.ok(isPhoneValid("0100 123 4567"));
  assert.ok(!isPhoneValid("123"));
  assert.deepEqual(validateDetails({ name: "", phone: "" }), { name: "required", phone: "required" });
  assert.deepEqual(validateDetails({ name: "Sara", phone: "12", email: "x" }), { phone: "invalid", email: "invalid" });
  assert.deepEqual(validateDetails({ name: "Sara", phone: "01001234567", forOther: true, otherName: " " }), { otherName: "required" });
  assert.deepEqual(validateDetails({ name: "Sara", phone: "01001234567", email: "" }), {});
});

test("booking codes are stable, readable and round-trip through the ticket QR", () => {
  const code = bookingCode("booking-1");
  assert.equal(code, bookingCode("booking-1"));
  assert.notEqual(code, bookingCode("booking-2"));
  assert.match(code, /^BK-[2-9A-HJKMNP-Z]{6}$/);
  assert.deepEqual(parseTicketValue(bookingTicketValue(code)), { kind: "booking", code });
});

test("ics escapes text and uses UTC", () => {
  const ics = buildIcs({ uid: "u1", title: "Check-up, Dr. Amal; room 2", start: new Date(Date.UTC(2026, 8, 30, 12, 0)), end: new Date(Date.UTC(2026, 8, 30, 12, 30)), location: "Clinic\nCairo" }, new Date(Date.UTC(2026, 8, 29)));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20260930T120000Z\r\n/);
  assert.match(ics, /DTEND:20260930T123000Z\r\n/);
  assert.match(ics, /SUMMARY:Check-up\\, Dr. Amal\\; room 2\r\n/);
  assert.match(ics, /LOCATION:Clinic\\nCairo\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  const url = googleCalendarUrl({ uid: "u1", title: "Visit", start: new Date(Date.UTC(2026, 8, 30, 12)), end: new Date(Date.UTC(2026, 8, 30, 13)) });
  assert.match(url, /^https:\/\/calendar\.google\.com\/calendar\/render\?/);
  assert.match(url, /dates=20260930T120000Z%2F20260930T130000Z/);
});

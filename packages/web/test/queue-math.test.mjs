import assert from "node:assert/strict";
import { test } from "node:test";
import {
  averageServiceMinutes,
  callNext,
  callTicket,
  checkIn,
  estimateWaitMinutes,
  finishVisit,
  findBookingForCheckIn,
  formatTicket,
  isCallOverdue,
  leaveQueue,
  markNoShow,
  newCalls,
  nextTicketNumber,
  nowServing,
  parseTicketValue,
  positionInQueue,
  recallTicket,
  recentCalls,
  roomBoard,
  samePhone,
  skipTicket,
  startVisit,
  waitingOrder,
} from "../src/components/waiting-screen/queue-math.ts";

const MIN = 60000;
const T0 = Date.UTC(2026, 8, 30, 9, 0);

function build() {
  let entries = [];
  const add = (id, at, opts = {}) => {
    entries = checkIn(entries, { id, at: T0 + at * MIN, ...opts }).entries;
  };
  add("a", 0);
  add("b", 5);
  add("c", 10, { priority: "appointment" });
  add("d", 12, { priority: "urgent" });
  add("e", 15);
  return entries;
}

test("tickets are numbered from the highest so far", () => {
  assert.equal(formatTicket("A", 7), "A-007");
  assert.equal(nextTicketNumber([]), 1);
  const q = build();
  assert.deepEqual(q.map((e) => e.ticket), ["A-001", "A-002", "A-003", "A-004", "A-005"]);
  assert.equal(nextTicketNumber(q), 6);
});

test("call order: urgent, then appointments, then walk-ins first come first served", () => {
  const q = build();
  assert.deepEqual(waitingOrder(q).map((e) => e.id), ["d", "c", "a", "b", "e"]);
  assert.equal(positionInQueue(q, "a"), 3);
  assert.equal(positionInQueue(q, "d"), 1);
  assert.equal(positionInQueue(q, "missing"), 0);
});

test("each provider only sees their own list plus the unassigned", () => {
  let q = [];
  q = checkIn(q, { id: "1", at: T0, providerId: "dr-a" }).entries;
  q = checkIn(q, { id: "2", at: T0 + MIN, providerId: "dr-b" }).entries;
  q = checkIn(q, { id: "3", at: T0 + 2 * MIN }).entries;
  assert.deepEqual(waitingOrder(q, "dr-a").map((e) => e.id), ["1", "3"]);
  assert.equal(positionInQueue(q, "2"), 1);
  assert.equal(positionInQueue(q, "3"), 3);
});

test("callNext moves the first ticket to a room and nothing else", () => {
  const q = build();
  const { entries, entry } = callNext(q, { room: "Room 2", at: T0 + 20 * MIN });
  assert.equal(entry.id, "d");
  assert.equal(entry.status, "called");
  assert.equal(entry.room, "Room 2");
  assert.equal(entries.filter((e) => e.status === "waiting").length, 4);
  assert.equal(q.find((e) => e.id === "d").status, "waiting", "input is not mutated");
  assert.equal(callNext([], { at: 0 }).entry, undefined);
});

test("skip then recall sends the ticket to the back of its class", () => {
  let q = build();
  q = callNext(q, { room: "1", at: T0 + 20 * MIN }).entries; // d
  q = callNext(q, { room: "2", at: T0 + 21 * MIN }).entries; // c
  q = skipTicket(q, "c").entries;
  assert.equal(q.find((e) => e.id === "c").status, "skipped");
  assert.equal(q.find((e) => e.id === "c").skips, 1);
  q = recallTicket(q, "c", T0 + 30 * MIN).entries;
  assert.equal(q.find((e) => e.id === "c").status, "waiting");
  // Appointments still come before walk-ins, so c is next, but a later appointment would pass it.
  assert.equal(waitingOrder(q)[0].id, "c");
  q = checkIn(q, { id: "f", at: T0 + 25 * MIN, priority: "appointment" }).entries;
  assert.deepEqual(waitingOrder(q).slice(0, 2).map((e) => e.id), ["f", "c"]);
});

test("recall on a called ticket repeats the call", () => {
  let q = callNext(build(), { room: "1", at: T0 + 20 * MIN }).entries;
  q = recallTicket(q, "d", T0 + 22 * MIN).entries;
  const d = q.find((e) => e.id === "d");
  assert.equal(d.status, "called");
  assert.equal(d.recalls, 1);
  assert.equal(d.calledAt, T0 + 22 * MIN);
});

test("invalid moves change nothing", () => {
  const q = build();
  assert.equal(finishVisit(q, "a", T0).entry, undefined);
  assert.equal(recallTicket(q, "a", T0).entry, undefined);
  assert.equal(markNoShow(q, "a").entry, undefined);
  assert.equal(callTicket(callNext(q, { at: T0 }).entries, "d", { at: T0 }).entry, undefined);
  assert.equal(skipTicket(q, "nope").entry, undefined);
});

test("full visit: called, serving, done, and the average of the last visits", () => {
  let q = callNext(build(), { room: "1", at: T0 + 20 * MIN }).entries;
  q = startVisit(q, "d", T0 + 21 * MIN).entries;
  assert.equal(q.find((e) => e.id === "d").status, "serving");
  q = finishVisit(q, "d", T0 + 33 * MIN).entries;
  assert.equal(q.find((e) => e.id === "d").status, "done");
  assert.equal(averageServiceMinutes(q, 10), 12);
  assert.equal(averageServiceMinutes([], 10), 10);
});

test("leaving and no-show", () => {
  let q = build();
  q = leaveQueue(q, "e").entries;
  assert.equal(q.find((e) => e.id === "e").status, "left");
  q = callNext(q, { at: T0 + 20 * MIN }).entries;
  q = skipTicket(q, "d").entries;
  q = markNoShow(q, "d").entries;
  assert.equal(q.find((e) => e.id === "d").status, "no_show");
  assert.ok(!isCallOverdue(q.find((e) => e.id === "d"), T0 + 60 * MIN, 5));
  const called = callNext(q, { at: T0 + 30 * MIN }).entries.find((e) => e.status === "called");
  assert.ok(!isCallOverdue(called, T0 + 34 * MIN, 5));
  assert.ok(isCallOverdue(called, T0 + 35 * MIN, 5));
});

test("estimated wait counts free rooms, then waves of visits", () => {
  const q = build(); // order d c a b e
  // One room, free: the first is called now, the second waits one visit.
  assert.equal(estimateWaitMinutes(q, "d", { averageMinutes: 10, rooms: 1 }), 0);
  assert.equal(estimateWaitMinutes(q, "c", { averageMinutes: 10, rooms: 1 }), 10);
  assert.equal(estimateWaitMinutes(q, "e", { averageMinutes: 10, rooms: 1 }), 40);
  // Two rooms: two people go straight in, then each wave clears two.
  assert.equal(estimateWaitMinutes(q, "c", { averageMinutes: 10, rooms: 2 }), 0);
  assert.equal(estimateWaitMinutes(q, "a", { averageMinutes: 10, rooms: 2 }), 10);
  assert.equal(estimateWaitMinutes(q, "e", { averageMinutes: 10, rooms: 2 }), 20);
  // A busy room is not free.
  const busy = callNext(q, { room: "1", at: T0 }).entries; // d called, waiting: c a b e
  assert.equal(estimateWaitMinutes(busy, "c", { averageMinutes: 10, rooms: 1 }), 10);
  assert.equal(estimateWaitMinutes(busy, "d", { averageMinutes: 10, rooms: 1 }), 0, "not waiting any more");
});

test("lobby board: now serving, recent calls, rooms and new calls", () => {
  let q = build();
  q = callNext(q, { room: "Room 1", at: T0 + 20 * MIN }).entries; // d
  q = callNext(q, { room: "Room 2", at: T0 + 22 * MIN }).entries; // c
  q = startVisit(q, "d", T0 + 23 * MIN).entries;
  assert.deepEqual(nowServing(q).map((e) => e.id), ["c", "d"]);
  assert.deepEqual(recentCalls(q, 1).map((e) => e.id), ["c"]);
  const board = roomBoard(q, ["Room 1", "Room 2", "Room 3"]);
  assert.equal(board[0].entry.id, "d");
  assert.equal(board[1].entry.id, "c");
  assert.equal(board[2].entry, undefined);
  assert.deepEqual(newCalls(q, T0 + 21 * MIN).map((e) => e.id), ["c"]);
});

test("ticket QR values and phone matching", () => {
  assert.deepEqual(parseTicketValue("booking:bk-7f3q9k"), { kind: "booking", code: "BK-7F3Q9K" });
  assert.deepEqual(parseTicketValue(" queue:A-012 "), { kind: "queue", code: "A-012" });
  assert.equal(parseTicketValue("https://example.com"), null);
  assert.equal(parseTicketValue("booking:"), null);
  assert.ok(samePhone("+20 100 123 4567", "0100 123 4567"));
  assert.ok(samePhone("٠١٠٠١٢٣٤٥٦٧", "01001234567"));
  assert.ok(!samePhone("0100 123 4567", "0100 123 4568"));
  assert.ok(!samePhone("123", "123"));
});

test("kiosk finds the booking by code or phone, and only near its time", () => {
  const now = T0 + 9 * 60 * MIN;
  const bookings = [
    { id: "1", code: "BK-AAAAAA", phone: "01001234567", name: "Sara", startsAt: now + 20 * MIN },
    { id: "2", code: "BK-BBBBBB", phone: "01001234567", name: "Sara", startsAt: now + 120 * MIN },
    { id: "3", code: "BK-CCCCCC", phone: "01112223334", name: "Omar", startsAt: now + 180 * MIN },
    { id: "4", code: "BK-DDDDDD", phone: "01223334445", name: "Old", startsAt: now - 24 * 60 * MIN },
  ];
  assert.equal(findBookingForCheckIn(bookings, "booking:BK-AAAAAA", { now }).kind, "found");
  const two = findBookingForCheckIn(bookings, "0100 123 4567", { now });
  assert.equal(two.kind, "multiple");
  assert.deepEqual(two.bookings.map((b) => b.id), ["1", "2"]);
  assert.equal(findBookingForCheckIn(bookings, "01112223334", { now }).kind, "too-early");
  assert.equal(findBookingForCheckIn(bookings, "01223334445", { now }).kind, "none");
  assert.equal(findBookingForCheckIn(bookings, "booking:BK-ZZZZZZ", { now }).kind, "none");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { formatBytes, nextRun, parseTime, pruneCandidates, totalSize, validateRetention } from "../src/components/backup-manager/backup-format.ts";

test("formatBytes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(842), "842 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(12.4 * 1024 * 1024), "12.4 MB");
  assert.equal(formatBytes(2 * 1024 ** 3), "2 GB");
  assert.equal(formatBytes(-5), "-");
});

test("parseTime", () => {
  assert.deepEqual(parseTime("02:30"), { h: 2, m: 30 });
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("2:5"), null);
});

const at = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi, 0, 0);

test("nextRun daily", () => {
  const s = { enabled: true, frequency: "daily", time: "02:30" };
  assert.deepEqual(nextRun(s, at(2026, 8, 29, 1, 0)), at(2026, 8, 29, 2, 30));
  assert.deepEqual(nextRun(s, at(2026, 8, 29, 2, 30)), at(2026, 8, 30, 2, 30));
  assert.deepEqual(nextRun(s, at(2026, 8, 29, 23, 0)), at(2026, 8, 30, 2, 30));
});

test("nextRun hourly, weekly, monthly, off", () => {
  assert.deepEqual(nextRun({ enabled: true, frequency: "hourly", time: "00:15" }, at(2026, 8, 29, 10, 20)), at(2026, 8, 29, 11, 15));
  // 2026-09-29 is a Tuesday (2). Weekly on Friday (5) is Oct 2.
  assert.deepEqual(nextRun({ enabled: true, frequency: "weekly", time: "03:00", dayOfWeek: 5 }, at(2026, 8, 29, 10, 0)), at(2026, 9, 2, 3, 0));
  assert.deepEqual(nextRun({ enabled: true, frequency: "weekly", time: "03:00", dayOfWeek: 2 }, at(2026, 8, 29, 10, 0)), at(2026, 9, 6, 3, 0));
  assert.deepEqual(nextRun({ enabled: true, frequency: "monthly", time: "04:00" }, at(2026, 8, 29, 10, 0)), at(2026, 9, 1, 4, 0));
  assert.equal(nextRun({ enabled: false, frequency: "daily", time: "02:30" }, at(2026, 8, 29, 1, 0)), null);
  assert.equal(nextRun({ enabled: true, frequency: "daily", time: "bad" }, at(2026, 8, 29, 1, 0)), null);
});

const DAY = 86_400_000;
const now = Date.UTC(2026, 8, 29);
const mk = (id, daysAgo, extra = {}) => ({ id, createdAt: now - daysAgo * DAY, status: "completed", ...extra });

test("pruneCandidates keeps the newest N", () => {
  const list = [mk("a", 1), mk("b", 2), mk("c", 3), mk("d", 4)];
  assert.deepEqual(pruneCandidates(list, { keepLast: 2 }, now), ["c", "d"]);
});

test("pruneCandidates honours max age, locked, running and always keeps the newest", () => {
  const list = [mk("a", 40), mk("b", 50), mk("c", 60, { locked: true }), mk("r", 0, { status: "running" }), mk("f", 70, { status: "failed" })];
  assert.deepEqual(pruneCandidates(list, { keepLast: 10, maxAgeDays: 45 }, now), ["b"]);
  assert.deepEqual(pruneCandidates(list, { keepLast: 0 }, now), ["b"]);
});

test("totalSize counts completed backups only", () => {
  assert.equal(totalSize([{ status: "completed", sizeBytes: 10 }, { status: "running", sizeBytes: 99 }, { status: "completed" }]), 10);
});

test("validateRetention", () => {
  assert.equal(validateRetention({ keepLast: 7, maxAgeDays: 30 }), null);
  assert.equal(validateRetention({ keepLast: 0 }), "keepLast");
  assert.equal(validateRetention({ keepLast: 1.5 }), "keepLast");
  assert.equal(validateRetention({ keepLast: 5, maxAgeDays: -1 }), "maxAgeDays");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { entriesUntil, filterLogs, LOG_RANGES, rangeSince } from "../src/components/log-viewer/log-viewer-format.ts";

const at = (id, iso, level = "info", message = `m${id}`) => ({ id, time: iso, level, message });
const logs = [
  at(1, "2026-03-01T10:00:00Z"),
  at(2, "2026-03-01T11:30:00Z", "warn"),
  at(3, "2026-03-01T11:55:00Z", "error", "timeout talking to db"),
];

test("filterLogs keeps entries at or after `since`, together with level and search", () => {
  const since = Date.parse("2026-03-01T11:00:00Z");
  assert.deepEqual(
    filterLogs(logs, { since }).entries.map((e) => e.id),
    [2, 3],
  );
  assert.deepEqual(
    filterLogs(logs, { since, query: "db" }).entries.map((e) => e.id),
    [3],
  );
  assert.deepEqual(
    filterLogs(logs, { since: null }).entries.map((e) => e.id),
    [1, 2, 3],
  );
  const bad = filterLogs(logs, { since, query: "(", regex: true });
  assert.equal(bad.invalid, true);
  assert.deepEqual(
    bad.entries.map((e) => e.id),
    [2, 3],
  );
});

test("rangeSince turns a range into a lower bound, and 'all time' into none", () => {
  const now = Date.parse("2026-03-01T12:00:00Z");
  const hour = LOG_RANGES.find((r) => r.id === "1h");
  assert.equal(rangeSince(hour, now), Date.parse("2026-03-01T11:00:00Z"));
  assert.equal(rangeSince(LOG_RANGES.find((r) => r.id === "all"), now), null);
  assert.equal(rangeSince(undefined, now), null);
  assert.ok(LOG_RANGES.every((r) => r.label && r.labelAr));
});

test("entriesUntil holds a paused list at its last entry", () => {
  const more = [...logs, at(4, "2026-03-01T11:58:00Z"), at(5, "2026-03-01T11:59:00Z")];
  assert.deepEqual(
    entriesUntil(more, 3).map((e) => e.id),
    [1, 2, 3],
  );
  assert.equal(entriesUntil(logs, 3), logs);
  assert.deepEqual(entriesUntil(logs, null), []);
  assert.equal(entriesUntil(logs, 99), logs);
  const older = [at(0, "2026-03-01T09:00:00Z"), ...more];
  assert.deepEqual(
    entriesUntil(older, 3).map((e) => e.id),
    [0, 1, 2, 3],
  );
});

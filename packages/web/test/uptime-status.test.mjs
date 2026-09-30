import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidStatusSlug, moveItem } from "../src/components/status-page-manager/status-page-manager-format.ts";
import { computeUptime, formatIncidentDuration, formatUptime, incidentMinutes, isOpenIncident, overallStatus, responseLabel, uptimeTone } from "../src/components/uptime-monitors/uptime-format.ts";

test("computeUptime ignores none and counts degraded as up", () => {
  assert.equal(computeUptime([]), null);
  assert.equal(computeUptime(["none", "none"]), null);
  assert.equal(computeUptime(["up", "down", "degraded", "none"]), (2 / 3) * 100);
});

test("formatUptime truncates and never shows a false 100%", () => {
  assert.equal(formatUptime(99.996), "99.99%");
  assert.equal(formatUptime(100), "100%");
  assert.equal(formatUptime(99.5), "99.50%");
  assert.equal(formatUptime(null), "–");
  assert.equal(formatUptime(-5), "0.00%");
});

test("uptimeTone thresholds", () => {
  assert.equal(uptimeTone(99.95), "success");
  assert.equal(uptimeTone(99.9), "success");
  assert.equal(uptimeTone(99.5), "warning");
  assert.equal(uptimeTone(98.9), "danger");
  assert.equal(uptimeTone(null), "neutral");
});

test("overallStatus picks the worst", () => {
  assert.equal(overallStatus(["up", "up"]), "operational");
  assert.equal(overallStatus(["up", "degraded"]), "degraded");
  assert.equal(overallStatus(["up", "down"]), "partial-outage");
  assert.equal(overallStatus(["down", "down"]), "major-outage");
  assert.equal(overallStatus(["up", "paused"]), "operational");
  assert.equal(overallStatus(["up"], true), "maintenance");
  assert.equal(overallStatus(["down"], true), "major-outage");
  assert.equal(overallStatus([]), "operational");
});

test("incident duration", () => {
  assert.equal(incidentMinutes("2026-01-01T10:00:00Z", "2026-01-01T10:42:00Z"), 42);
  assert.equal(incidentMinutes("2026-01-01T10:00:00Z", "2026-01-01T10:00:10Z"), 1);
  assert.equal(formatIncidentDuration(42), "42 min");
  assert.equal(formatIncidentDuration(185), "3 h 5 min");
  assert.equal(formatIncidentDuration(1440 + 240), "1 d 4 h");
  assert.equal(formatIncidentDuration(120), "2 h");
  assert.equal(isOpenIncident({ status: "monitoring" }), true);
  assert.equal(isOpenIncident({ status: "resolved" }), false);
});

test("responseLabel", () => {
  assert.equal(responseLabel(undefined), "–");
  assert.equal(responseLabel(184.4), "184 ms");
  assert.equal(responseLabel(1500), "1.5 s");
});

test("isValidStatusSlug and moveItem", () => {
  assert.equal(isValidStatusSlug("acme-status"), true);
  assert.equal(isValidStatusSlug("Acme"), false);
  assert.equal(isValidStatusSlug("-a"), false);
  assert.equal(isValidStatusSlug(""), false);
  assert.deepEqual(moveItem([1, 2, 3], 0, 1), [2, 1, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 2, -1), [1, 3, 2]);
});

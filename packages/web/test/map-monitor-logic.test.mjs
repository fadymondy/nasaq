import assert from "node:assert/strict";
import { test } from "node:test";
import { countMapAlerts, filterMapAlerts, isMapRegionView, mapAlertTime } from "../src/components/map-monitor/map-monitor-logic.ts";

const NOW = Date.UTC(2026, 9, 1, 12);
const H = 3_600_000;
const alerts = [
  { id: "old", lat: 0, lng: 0, title: "Old", severity: "critical", at: NOW - 10 * 24 * H },
  { id: "low", lat: 0, lng: 0, title: "Low", severity: "low", at: new Date(NOW - H) },
  { id: "mid", lat: 0, lng: 0, title: "Mid", at: new Date(NOW - 2 * H).toISOString() },
  { id: "hi", lat: 0, lng: 0, title: "High", severity: "high", at: NOW - 3 * H },
  { id: "hi2", lat: 0, lng: 0, title: "High newer", severity: "high", at: NOW - 30 * 60_000 },
  { id: "bad", lat: 0, lng: 0, title: "No time", at: "not a date" },
];

test("time range keeps recent alerts, most severe then newest first", () => {
  assert.deepEqual(filterMapAlerts(alerts, 24 * H, NOW).map((a) => a.id), ["hi2", "hi", "mid", "low"]);
  assert.deepEqual(filterMapAlerts(alerts, 30 * 24 * H, NOW).map((a) => a.id), ["old", "hi2", "hi", "mid", "low"]);
  assert.deepEqual(filterMapAlerts(alerts, null, NOW).map((a) => a.id), ["old", "hi2", "hi", "mid", "bad", "low"]);
});

test("counts by severity with medium as the default", () => {
  assert.deepEqual(countMapAlerts(alerts), { critical: 1, high: 2, medium: 2, low: 1 });
  assert.ok(Number.isNaN(mapAlertTime("nope")));
  assert.equal(mapAlertTime(new Date(5)), 5);
});

test("a region is active only while the view sits on it", () => {
  const region = { id: "riyadh", label: "Riyadh", center: { lat: 24.71, lng: 46.67 }, zoom: 10 };
  assert.equal(isMapRegionView({ center: { lat: 24.71, lng: 46.67 }, zoom: 10 }, region), true);
  assert.equal(isMapRegionView({ center: { lat: 24.72, lng: 46.67 }, zoom: 10 }, region), false);
  assert.equal(isMapRegionView({ center: region.center, zoom: 11 }, region), false);
  assert.equal(isMapRegionView(null, region), false);
});

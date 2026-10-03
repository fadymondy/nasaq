import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterHubIssues,
  moveLauncherSpot,
  parseLauncherSpot,
  snapLauncherSpot,
  spotFromPosition,
} from "../src/components/feedback-reporter/feedback-reporter-utils.ts";

const screen = { width: 1000, height: 800 };

test("a drop snaps to the nearer side, logical in RTL", () => {
  assert.deepEqual(snapLauncherSpot({ x: 900, y: 400 }, screen), { side: "end", y: 0.5 });
  assert.deepEqual(snapLauncherSpot({ x: 100, y: 200 }, screen), { side: "start", y: 0.25 });
  assert.deepEqual(snapLauncherSpot({ x: 100, y: 200 }, screen, true), { side: "end", y: 0.25 });
  assert.deepEqual(snapLauncherSpot({ x: 900, y: 200 }, screen, true), { side: "start", y: 0.25 });
});

test("a drop keeps the launcher off the top and bottom edges", () => {
  // 16px margin + half of a 48px launcher = 40px of 800.
  assert.equal(snapLauncherSpot({ x: 900, y: 0 }, screen, false, 48).y, 0.05);
  assert.equal(snapLauncherSpot({ x: 900, y: 800 }, screen, false, 48).y, 0.95);
  assert.equal(snapLauncherSpot({ x: 900, y: 10 }, { width: 100, height: 0 }).y, 0.5);
});

test("keyboard moves start from the fixed position and stay in bounds", () => {
  assert.deepEqual(spotFromPosition("bottom-end"), { side: "end", y: 0.9 });
  assert.deepEqual(spotFromPosition("edge-start"), { side: "start", y: 0.5 });
  assert.deepEqual(spotFromPosition("top-start"), { side: "start", y: 0.1 });
  assert.deepEqual(moveLauncherSpot({ side: "end", y: 0.9 }, "down"), { side: "end", y: 0.95 });
  assert.deepEqual(moveLauncherSpot({ side: "end", y: 0.95 }, "down"), { side: "end", y: 0.95 });
  assert.deepEqual(moveLauncherSpot({ side: "end", y: 0.5 }, "up"), { side: "end", y: 0.45 });
  assert.deepEqual(moveLauncherSpot({ side: "end", y: 0.5 }, "start"), { side: "start", y: 0.5 });
});

test("a saved spot is read back, and anything malformed is ignored", () => {
  assert.deepEqual(parseLauncherSpot('{"side":"start","y":0.3}'), { side: "start", y: 0.3 });
  assert.deepEqual(parseLauncherSpot('{"side":"end","y":4}'), { side: "end", y: 1 });
  assert.equal(parseLauncherSpot(null), null);
  assert.equal(parseLauncherSpot("not json"), null);
  assert.equal(parseLauncherSpot('{"side":"left","y":0.3}'), null);
  assert.equal(parseLauncherSpot('{"side":"end","y":"0.3"}'), null);
});

test("hub tabs: a status, all, or mine", () => {
  const issues = [
    { id: "1", title: "a", status: "open", mine: true },
    { id: "2", title: "b", status: "resolved" },
    { id: "3", title: "c", status: "open" },
  ];
  const ids = (list) => list.map((i) => i.id);
  assert.deepEqual(ids(filterHubIssues(issues, "all")), ["1", "2", "3"]);
  assert.deepEqual(ids(filterHubIssues(issues, "open")), ["1", "3"]);
  assert.deepEqual(ids(filterHubIssues(issues, "mine")), ["1"]);
});

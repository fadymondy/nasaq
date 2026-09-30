import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampRect, closeWindow, filterApps, focusedWindow, focusWindow, minimiseWindow, nextWindowId, openWindow, resizeRect, snapRect, snapWindow, snapZone, toggleMaximise, unsnapForDrag,
} from "../src/components/desktop-os-shell/desktop-math.ts";

const bounds = { w: 1000, h: 600 };

test("snapZone finds the edges", () => {
  assert.equal(snapZone({ x: 500, y: 2 }, bounds), "top");
  assert.equal(snapZone({ x: 3, y: 300 }, bounds), "start");
  assert.equal(snapZone({ x: 998, y: 300 }, bounds), "end");
  assert.equal(snapZone({ x: 500, y: 300 }, bounds), null);
});

test("snapRect halves the desktop", () => {
  assert.deepEqual(snapRect("start", bounds), { x: 0, y: 0, w: 500, h: 600 });
  assert.deepEqual(snapRect("end", bounds), { x: 500, y: 0, w: 500, h: 600 });
  assert.deepEqual(snapRect("top", bounds), { x: 0, y: 0, w: 1000, h: 600 });
});

test("clampRect keeps the title bar reachable", () => {
  const r = clampRect({ x: 2000, y: -50, w: 400, h: 300 }, bounds);
  assert.equal(r.x, 928);
  assert.equal(r.y, 0);
  assert.equal(clampRect({ x: -900, y: 900, w: 400, h: 300 }, bounds).x, -328);
  assert.equal(clampRect({ x: 0, y: 900, w: 400, h: 300 }, bounds).y, 560);
});

test("resizeRect respects the minimum and the anchored side", () => {
  const rect = { x: 100, y: 100, w: 400, h: 300 };
  assert.deepEqual(resizeRect(rect, "e", 50, 0), { x: 100, y: 100, w: 450, h: 300 });
  assert.deepEqual(resizeRect(rect, "w", 50, 0), { x: 150, y: 100, w: 350, h: 300 });
  assert.deepEqual(resizeRect(rect, "w", 400, 0), { x: 220, y: 100, w: 280, h: 300 });
  assert.deepEqual(resizeRect(rect, "n", 0, 30), { x: 100, y: 130, w: 400, h: 270 });
  assert.equal(resizeRect(rect, "n", 0, -300).y, 0);
  assert.equal(resizeRect(rect, "se", -900, -900).w, 280);
});

test("openWindow stacks, ids increment and single focuses the existing window", () => {
  let list = openWindow([], bounds, { appId: "notes" });
  list = openWindow(list, bounds, { appId: "notes" });
  assert.deepEqual(list.map((w) => w.id), ["notes-1", "notes-2"]);
  list = openWindow(list, bounds, { appId: "files", single: true });
  list = openWindow(list, bounds, { appId: "notes" });
  list = openWindow(list, bounds, { appId: "files", single: true });
  assert.equal(list.length, 4);
  assert.equal(list.at(-1).id, "files-1");
  assert.equal(nextWindowId(list, "notes"), "notes-4");
});

test("compact windows open full size", () => {
  const [w] = openWindow([], bounds, { appId: "a", compact: true });
  assert.equal(w.maximised, true);
  assert.equal(w.w, 1000);
});

test("focus, minimise and close reorder and hide", () => {
  let list = openWindow(openWindow([], bounds, { appId: "a" }), bounds, { appId: "b" });
  list = focusWindow(list, "a-1");
  assert.equal(focusedWindow(list).id, "a-1");
  list = minimiseWindow(list, "a-1");
  assert.equal(focusedWindow(list).id, "b-1");
  list = focusWindow(list, "a-1");
  assert.equal(list.at(-1).minimised, false);
  assert.deepEqual(closeWindow(list, "a-1").map((w) => w.id), ["b-1"]);
  assert.equal(focusedWindow(minimiseWindow(minimiseWindow(list, "a-1"), "b-1")), undefined);
});

test("toggleMaximise round-trips and snap restores", () => {
  let list = openWindow([], bounds, { appId: "a", size: { w: 500, h: 300 } });
  const before = { x: list[0].x, y: list[0].y, w: 500, h: 300 };
  list = toggleMaximise(list, "a-1", bounds);
  assert.equal(list[0].maximised, true);
  assert.equal(list[0].w, 1000);
  list = toggleMaximise(list, "a-1", bounds);
  assert.deepEqual({ x: list[0].x, y: list[0].y, w: list[0].w, h: list[0].h }, before);
  list = snapWindow(list, "a-1", "end", bounds);
  assert.equal(list[0].snap, "end");
  assert.equal(list[0].x, 500);
  list = toggleMaximise(list, "a-1", bounds);
  assert.equal(list[0].snap, null);
  assert.equal(list[0].w, 500);
});

test("unsnapForDrag restores size under the pointer", () => {
  let list = openWindow([], bounds, { appId: "a", size: { w: 400, h: 300 } });
  list = toggleMaximise(list, "a-1", bounds);
  const w = unsnapForDrag(list[0], 500, 10, 0.5, bounds);
  assert.equal(w.w, 400);
  assert.equal(w.x, 300);
  assert.equal(w.maximised, false);
});

test("filterApps matches title and keywords", () => {
  const apps = [{ title: "Notes", keywords: ["memo"] }, { title: "Files" }];
  assert.equal(filterApps(apps, "").length, 2);
  assert.equal(filterApps(apps, "MEMO").length, 1);
  assert.equal(filterApps(apps, "fil")[0].title, "Files");
});

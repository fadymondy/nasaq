import assert from "node:assert/strict";
import { test } from "node:test";
import { connector, networkLinks, rowsFor, sideConnector } from "../src/components/workflow-network/network-geometry.ts";

test("networkLinks: no links means the steps run in order", () => {
  assert.deepEqual(networkLinks(["a", "b", "c"]), [{ from: 0, to: 1 }, { from: 1, to: 2 }]);
  assert.deepEqual(networkLinks(["a"]), []);
});

test("networkLinks drops unknown ids and self links, keeps labels", () => {
  const out = networkLinks(["a", "b", "c"], [{ from: "a", to: "c", label: "Yes" }, { from: "a", to: "zzz" }, { from: "b", to: "b" }]);
  assert.deepEqual(out, [{ from: 0, to: 2, label: "Yes" }]);
});

test("rowsFor balances rows", () => {
  assert.deepEqual(rowsFor(5, 4), [3, 2]);
  assert.deepEqual(rowsFor(4, 4), [4]);
  assert.deepEqual(rowsFor(7, 3), [3, 3, 1]);
  assert.deepEqual(rowsFor(0, 3), []);
});

const box = (x, y, w = 100, h = 60) => ({ x, y, w, h });

test("connector joins neighbours side to side in either direction", () => {
  const ltr = connector(box(0, 0), box(160, 0));
  assert.ok(ltr.d.startsWith("M 100 30"));
  assert.equal(ltr.mid.x, 130);
  const rtl = connector(box(160, 0), box(0, 0));
  assert.ok(rtl.d.startsWith("M 160 30"));
});

test("connector arcs over a skipped card and drops between rows", () => {
  const skip = connector(box(0, 0), box(480, 0));
  assert.ok(skip.mid.y < 0);
  const down = connector(box(0, 0), box(0, 140));
  assert.ok(down.d.startsWith("M 50 60"));
});

test("sideConnector leaves from the chosen side", () => {
  assert.ok(sideConnector(box(0, 0), box(0, 300), "right").d.startsWith("M 100 30"));
  assert.ok(sideConnector(box(0, 0), box(0, 300), "left").d.startsWith("M 0 30"));
});

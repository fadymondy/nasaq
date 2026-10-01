import assert from "node:assert/strict";
import { test } from "node:test";
import { mapPointInPolygon } from "../src/components/map-view/map-geo.ts";

const square = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

test("mapPointInPolygon: inside and outside a square", () => {
  assert.equal(mapPointInPolygon({ x: 5, y: 5 }, square), true);
  assert.equal(mapPointInPolygon({ x: 11, y: 5 }, square), false);
  assert.equal(mapPointInPolygon({ x: 5, y: -1 }, square), false);
});

test("mapPointInPolygon: concave shape and degenerate rings", () => {
  const notch = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 5, y: 4 },
    { x: 0, y: 10 },
  ];
  assert.equal(mapPointInPolygon({ x: 5, y: 8 }, notch), false);
  assert.equal(mapPointInPolygon({ x: 5, y: 2 }, notch), true);
  assert.equal(mapPointInPolygon({ x: 1, y: 1 }, square.slice(0, 2)), false);
});

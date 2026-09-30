import assert from "node:assert/strict";
import { test } from "node:test";
import { BRAILLE_FRAMES, clampPercent, dotMatrixLevels, ringArc } from "../src/components/brand-loaders/loader-frames.ts";

test("BRAILLE_FRAMES are single braille cells", () => {
  assert.equal(BRAILLE_FRAMES.length, 10);
  for (const f of BRAILLE_FRAMES) assert.match(f, /^[⠀-⣿]$/);
});

test("clampPercent keeps 0..100 and survives NaN", () => {
  assert.equal(clampPercent(-4), 0);
  assert.equal(clampPercent(250), 100);
  assert.equal(clampPercent(Number.NaN), 0);
});

test("dotMatrixLevels fills left to right", () => {
  const empty = dotMatrixLevels({ cols: 4, rows: 2, value: 0 });
  assert.deepEqual(empty, [0, 0, 0, 0, 0, 0, 0, 0]);
  const full = dotMatrixLevels({ cols: 4, rows: 2, value: 100 });
  assert.ok(full.every((l) => l === 1));
  const half = dotMatrixLevels({ cols: 4, rows: 1, value: 50 });
  assert.deepEqual(half, [1, 1, 0.25, 0]);
});

test("dotMatrixLevels offsets odd rows by half a column", () => {
  const levels = dotMatrixLevels({ cols: 4, rows: 2, value: 50 });
  assert.equal(levels[2], 0.25);
  assert.equal(levels[4 + 1], 0.75);
  assert.equal(levels[4 + 2], 0);
});

test("indeterminate sweep moves with the tick", () => {
  const a = dotMatrixLevels({ cols: 8, rows: 1, value: null, tick: 2 });
  const b = dotMatrixLevels({ cols: 8, rows: 1, value: null, tick: 5 });
  assert.notDeepEqual(a, b);
  assert.equal(a[2], 1);
});

test("ringArc maps value to a dash offset", () => {
  const { circumference, dashOffset } = ringArc(25, 46);
  assert.ok(Math.abs(circumference - 2 * Math.PI * 46) < 1e-9);
  assert.ok(Math.abs(dashOffset - circumference * 0.75) < 1e-9);
  assert.equal(ringArc(100, 10).dashOffset, 0);
});

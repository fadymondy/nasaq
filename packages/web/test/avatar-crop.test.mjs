import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampCrop,
  cropRect,
  cropSide,
  imagePlacement,
  initialCrop,
  outputName,
  outputSide,
  panCrop,
  zoomCrop,
} from "../src/components/avatar-upload/crop-math.ts";

test("initial crop is the largest centred square", () => {
  const c = initialCrop(800, 400);
  assert.deepEqual(cropRect(c, 800, 400), { sx: 200, sy: 0, side: 400 });
  assert.deepEqual(cropRect(initialCrop(300, 600), 300, 600), { sx: 0, sy: 150, side: 300 });
});

test("zoom shrinks the window around the same centre", () => {
  const c = zoomCrop(initialCrop(400, 400), 2, 400, 400);
  assert.equal(cropSide(400, 400, c.zoom), 200);
  assert.deepEqual(cropRect(c, 400, 400), { sx: 100, sy: 100, side: 200 });
});

test("zoom is clamped to the allowed range", () => {
  assert.equal(zoomCrop(initialCrop(400, 400), 0.2, 400, 400).zoom, 1);
  assert.equal(zoomCrop(initialCrop(400, 400), 99, 400, 400).zoom, 4);
  assert.equal(zoomCrop(initialCrop(400, 400), 99, 400, 400, 2).zoom, 2);
  assert.equal(clampCrop({ zoom: NaN, cx: 0, cy: 0 }, 400, 400).zoom, 1);
});

test("at zoom 1 a square image cannot pan; a wide one pans sideways only", () => {
  const square = panCrop(initialCrop(400, 400), 0.5, 0.5, 400, 400);
  assert.deepEqual(cropRect(square, 400, 400), { sx: 0, sy: 0, side: 400 });
  const wide = panCrop(initialCrop(800, 400), -0.25, 0.4, 800, 400);
  // Dragging left by a quarter of the window moves the window right by 100 source px; y stays.
  assert.deepEqual(cropRect(wide, 800, 400), { sx: 300, sy: 0, side: 400 });
});

test("dragging right moves the window left across the source, and stops at the edge", () => {
  const z = zoomCrop(initialCrop(400, 400), 2, 400, 400);
  const right = panCrop(z, 0.5, 0, 400, 400);
  assert.equal(cropRect(right, 400, 400).sx, 0);
  const far = panCrop(z, -5, 5, 400, 400);
  assert.deepEqual(cropRect(far, 400, 400), { sx: 200, sy: 0, side: 200 });
});

test("zooming out re-clamps a panned window inside the image", () => {
  const z = panCrop(zoomCrop(initialCrop(400, 400), 4, 400, 400), -10, -10, 400, 400);
  assert.deepEqual(cropRect(z, 400, 400), { sx: 300, sy: 300, side: 100 });
  const out = zoomCrop(z, 1, 400, 400);
  assert.deepEqual(cropRect(out, 400, 400), { sx: 0, sy: 0, side: 400 });
});

test("output side never upscales", () => {
  assert.equal(outputSide({ side: 1000 }, 256), 256);
  assert.equal(outputSide({ side: 120.4 }, 256), 120);
  assert.equal(outputSide({ side: 0 }, 256), 1);
});

test("image placement covers the window at any zoom", () => {
  const p = imagePlacement(initialCrop(800, 400), 800, 400);
  assert.deepEqual(p, { width: 200, height: 100, left: -50, top: 0 });
  const z = imagePlacement(zoomCrop(initialCrop(400, 400), 2, 400, 400), 400, 400);
  assert.deepEqual(z, { width: 200, height: 200, left: -50, top: -50 });
});

test("output name swaps the extension for the exported type", () => {
  assert.equal(outputName("avatar", "image/webp"), "avatar.webp");
  assert.equal(outputName("me.jpeg", "image/png"), "me.png");
  assert.equal(outputName("photo", "image/jpeg"), "photo.jpg");
});

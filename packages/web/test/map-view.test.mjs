import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapDistance,
  mapFit,
  mapFormatCoordinates,
  mapFromScreen,
  mapGraticuleStep,
  mapPanBy,
  mapProject,
  mapRouteLength,
  mapScaleBar,
  mapTileUrl,
  mapToScreen,
  mapUnproject,
  mapVisibleTiles,
  mapZoomAt,
} from "../src/components/map-view/map-geo.ts";

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);
const SIZE = { width: 800, height: 600 };
const RIYADH = { lat: 24.7136, lng: 46.6753 };

test("projects and unprojects", () => {
  const p = mapProject({ lat: 0, lng: 0 }, 0);
  near(p.x, 128);
  near(p.y, 128);
  const back = mapUnproject(mapProject(RIYADH, 12), 12);
  near(back.lat, RIYADH.lat);
  near(back.lng, RIYADH.lng);
  // The poles are clamped, not infinite.
  assert.ok(Number.isFinite(mapProject({ lat: 90, lng: 0 }, 3).y));
});

test("the view centre lands in the middle of the screen", () => {
  const view = { center: RIYADH, zoom: 10 };
  const s = mapToScreen(RIYADH, view, SIZE);
  near(s.x, 400);
  near(s.y, 300);
  const east = mapToScreen({ lat: RIYADH.lat, lng: RIYADH.lng + 0.01 }, view, SIZE);
  assert.ok(east.x > 400);
  const back = mapFromScreen({ x: 500, y: 200 }, view, SIZE);
  const again = mapToScreen(back, view, SIZE);
  near(again.x, 500, 1e-4);
  near(again.y, 200, 1e-4);
});

test("takes the short way round the antimeridian", () => {
  const view = { center: { lat: 0, lng: 179.9 }, zoom: 6 };
  const s = mapToScreen({ lat: 0, lng: -179.9 }, view, SIZE);
  assert.ok(s.x > 400 && s.x < 800, `x=${s.x}`);
});

test("panning moves the centre opposite to the drag", () => {
  const view = { center: RIYADH, zoom: 10 };
  const moved = mapPanBy(view, 100, 0);
  assert.ok(moved.center.lng < RIYADH.lng);
  const back = mapPanBy(moved, -100, 0);
  near(back.center.lng, RIYADH.lng, 1e-9);
  near(back.center.lat, RIYADH.lat, 1e-9);
});

test("zooming keeps the point under the pointer still", () => {
  const view = { center: RIYADH, zoom: 8 };
  const anchor = { x: 650, y: 150 };
  const before = mapFromScreen(anchor, view, SIZE);
  const zoomed = mapZoomAt(view, 2, anchor, SIZE);
  assert.equal(zoomed.zoom, 10);
  const after = mapFromScreen(anchor, zoomed, SIZE);
  near(after.lat, before.lat, 1e-6);
  near(after.lng, before.lng, 1e-6);
  assert.equal(mapZoomAt(view, 99, anchor, SIZE, { max: 12 }).zoom, 12);
  const capped = { ...view, zoom: 12 };
  assert.equal(mapZoomAt(capped, 1, anchor, SIZE, { max: 12 }), capped);
});

test("fits every point inside the padded viewport", () => {
  const points = [RIYADH, { lat: 21.4858, lng: 39.1925 }, { lat: 26.4207, lng: 50.0888 }];
  const view = mapFit(points, SIZE, { padding: 40 });
  for (const p of points) {
    const s = mapToScreen(p, view, SIZE);
    assert.ok(s.x >= 40 - 0.5 && s.x <= 760 + 0.5, `x=${s.x}`);
    assert.ok(s.y >= 40 - 0.5 && s.y <= 560 + 0.5, `y=${s.y}`);
  }
  // One point, or none.
  assert.equal(mapFit([RIYADH], SIZE).zoom, 14);
  assert.equal(mapFit([RIYADH, RIYADH], SIZE, { singleZoom: 12 }).zoom, 12);
  assert.equal(mapFit([], SIZE).zoom, 1);
});

test("distance and route length", () => {
  const jeddah = { lat: 21.4858, lng: 39.1925 };
  const km = mapDistance(RIYADH, jeddah) / 1000;
  assert.ok(km > 840 && km < 860, `km=${km}`);
  near(mapRouteLength([RIYADH, jeddah, RIYADH]) / 1000, km * 2, 1e-6);
  assert.equal(mapRouteLength([RIYADH]), 0);
});

test("formats coordinates with hemispheres", () => {
  assert.equal(mapFormatCoordinates(RIYADH, 4), "24.7136° N, 46.6753° E");
  assert.equal(mapFormatCoordinates({ lat: -33.8688, lng: -70.5 }, 2), "33.87° S, 70.50° W");
});

test("fills tile URLs and refuses unsafe templates", () => {
  assert.equal(mapTileUrl("https://tiles.example/{z}/{x}/{y}.png", 3, 5, 4), "https://tiles.example/4/3/5.png");
  assert.equal(mapTileUrl("/tiles/{z}/{x}/{y}.png", 1, 2, 3), "/tiles/3/1/2.png");
  assert.equal(mapTileUrl("javascript:alert({x})", 1, 2, 3), null);
  assert.equal(mapTileUrl("data:text/html,{x}", 1, 2, 3), null);
});

test("lists the tiles that cover the viewport, wrapping around the world", () => {
  const tiles = mapVisibleTiles({ center: RIYADH, zoom: 10 }, SIZE);
  assert.ok(tiles.length >= 6 && tiles.length <= 20, `n=${tiles.length}`);
  assert.ok(tiles.every((t) => t.z === 10 && t.x >= 0 && t.x < 1024 && t.y >= 0 && t.y < 1024));
  assert.ok(tiles.some((t) => t.left <= 400 && t.left + t.size >= 400 && t.top <= 300 && t.top + t.size >= 300));
  const wrap = mapVisibleTiles({ center: { lat: 0, lng: 179.9 }, zoom: 4 }, SIZE);
  assert.ok(wrap.some((t) => t.x === 0), "wraps to tile 0");
  assert.ok(wrap.every((t) => t.x >= 0 && t.x < 16));
  // Fractional zoom scales the tiles of the nearest whole zoom.
  const frac = mapVisibleTiles({ center: RIYADH, zoom: 10.4 }, SIZE);
  assert.ok(frac.every((t) => t.z === 10 && Math.abs(t.size - 256 * 2 ** 0.4) < 1e-9));
});

test("picks a graticule step and a scale bar that stay readable", () => {
  for (const zoom of [1, 3, 6, 10, 15, 18]) {
    const step = mapGraticuleStep(zoom);
    const px = (256 * 2 ** zoom * step) / 360;
    assert.ok(px >= 72, `zoom ${zoom}: ${px}px`);
    const bar = mapScaleBar({ center: RIYADH, zoom });
    assert.ok(bar.px > 30 && bar.px <= 160, `bar ${bar.px}`);
    assert.ok([1, 2, 5].includes(bar.meters / 10 ** Math.floor(Math.log10(bar.meters))));
  }
});

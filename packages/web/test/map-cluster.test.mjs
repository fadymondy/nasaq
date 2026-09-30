import assert from "node:assert/strict";
import { test } from "node:test";
import { mapCluster, mapClusterExpand, mapToScreen, MAP_CLUSTER_MAX_ZOOM } from "../src/components/map-view/map-geo.ts";

const SIZE = { width: 800, height: 600 };
const RIYADH = { lat: 24.7136, lng: 46.6753 };

// Two tight groups about 5 km apart, plus one loner far away.
const pin = (id, lat, lng) => ({ id, lat, lng });
const PINS = [
  pin("a1", 24.7136, 46.6753),
  pin("a2", 24.7138, 46.6755),
  pin("a3", 24.7134, 46.6751),
  pin("b1", 24.76, 46.72),
  pin("b2", 24.7602, 46.7203),
  pin("far", 26.4, 50.1),
];
const clusters = (items) => items.filter((i) => i.type === "cluster");
const singles = (items) => items.filter((i) => i.type === "pin").map((i) => i.pin.id);

test("groups nearby pins into counted clusters and leaves loners alone", () => {
  const items = mapCluster(PINS, 11);
  const c = clusters(items);
  assert.equal(c.length, 2);
  assert.deepEqual(c.map((x) => x.count).sort(), [2, 3]);
  assert.deepEqual(singles(items), ["far"]);
  assert.equal(items.reduce((n, i) => n + (i.type === "cluster" ? i.count : 1), 0), PINS.length);
  const three = c.find((x) => x.count === 3);
  assert.deepEqual(three.pins.map((p) => p.id), ["a1", "a2", "a3"]);
  assert.ok(Math.abs(three.lat - 24.7136) < 0.001 && Math.abs(three.lng - 46.6753) < 0.001);
});

test("every pin lands in exactly one item and cluster members are within the radius", () => {
  const many = Array.from({ length: 200 }, (_, i) => pin(`p${i}`, 24.5 + ((i * 37) % 100) * 0.004, 46.4 + ((i * 53) % 100) * 0.004));
  for (const zoom of [8, 11, 13]) {
    const items = mapCluster(many, zoom, { radius: 50 });
    const ids = items.flatMap((i) => (i.type === "cluster" ? i.pins.map((p) => p.id) : [i.pin.id]));
    assert.equal(new Set(ids).size, many.length);
    assert.equal(ids.length, many.length);
    for (const c of clusters(items)) {
      const seed = mapToScreen(c.pins[0], { center: RIYADH, zoom }, SIZE);
      for (const p of c.pins) {
        const s = mapToScreen(p, { center: RIYADH, zoom }, SIZE);
        assert.ok(Math.hypot(s.x - seed.x, s.y - seed.y) <= 50 + 1e-6);
      }
    }
  }
});

test("clusters split as the zoom goes in and never depend on panning", () => {
  const counts = [4, 8, 9, 11, 13, 15, 16].map((zoom) => mapCluster(PINS, zoom).length);
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], `${counts}`);
  assert.equal(mapCluster(PINS, 4).length, 1); // the whole region in one bubble
  assert.equal(mapCluster(PINS, 4)[0].count, PINS.length);
  assert.equal(mapCluster(PINS, 9).length, 2); // both groups merged, far pin alone
  assert.equal(mapCluster(PINS, 11).length, 3); // the groups apart
  assert.equal(clusters(mapCluster(PINS, 15)).length, 2); // members are only metres apart
  assert.equal(mapCluster(PINS, 16).length, PINS.length); // past the max zoom, only the same spot clusters
  assert.deepEqual(mapCluster(PINS, 10), mapCluster(PINS, 10));
  // A wider radius merges more.
  assert.ok(mapCluster(PINS, 11, { radius: 400 }).length < mapCluster(PINS, 11, { radius: 20 }).length);
});

test("pins on the same spot stay a cluster at the max zoom, and only those", () => {
  const same = [pin("s1", 24.7, 46.7), pin("s2", 24.7, 46.7), pin("s3", 24.7, 46.7), pin("near", 24.70005, 46.70005)];
  const at = mapCluster(same, MAP_CLUSTER_MAX_ZOOM);
  const c = clusters(at);
  assert.equal(c.length, 1);
  assert.equal(c[0].count, 3);
  assert.deepEqual(singles(at), ["near"]);
  assert.equal(mapCluster(same, 19).length, 2);
  // Below the max zoom the near pin joins in.
  assert.equal(clusters(mapCluster(same, 12))[0].count, 4);
});

test("the selected pin is never hidden inside a cluster", () => {
  const items = mapCluster(PINS, 4, { selectedId: "a2" });
  assert.ok(singles(items).includes("a2"));
  const inside = clusters(items).flatMap((c) => c.pins.map((p) => p.id));
  assert.ok(!inside.includes("a2"));
  assert.equal(inside.length, PINS.length - 1);
  // Two pins where one is selected: no cluster of one.
  const two = mapCluster([pin("x", 1, 1), pin("y", 1, 1)], 8, { selectedId: "x" });
  assert.deepEqual(two.map((i) => i.type), ["pin", "pin"]);
  // An unknown selection changes nothing.
  assert.deepEqual(mapCluster(PINS, 10, { selectedId: "nope" }), mapCluster(PINS, 10));
});

test("clicking a cluster fits its pins at a zoom where they split", () => {
  const view = { center: RIYADH, zoom: 11 };
  const cluster = clusters(mapCluster(PINS, 11)).find((c) => c.pins.some((p) => p.id === "b1"));
  assert.ok(cluster);
  const { view: next, list } = mapClusterExpand(cluster.pins, view, SIZE);
  assert.equal(list, false);
  assert.ok(next.zoom > view.zoom && next.zoom <= MAP_CLUSTER_MAX_ZOOM);
  for (const p of cluster.pins) {
    const s = mapToScreen(p, next, SIZE);
    assert.ok(s.x >= 0 && s.x <= SIZE.width && s.y >= 0 && s.y <= SIZE.height, `${p.id} at ${s.x},${s.y}`);
  }
  assert.ok(Math.abs(next.center.lat - (24.76 + 24.7602) / 2) < 1e-3);
  // The pins are apart after the zoom.
  assert.equal(clusters(mapCluster(cluster.pins, next.zoom)).length, 0);
});

test("fit zoom is capped, and same-spot pins ask for a list", () => {
  const same = [pin("s1", 24.7, 46.7), pin("s2", 24.7, 46.7)];
  const first = mapClusterExpand(same, { center: RIYADH, zoom: 10 }, SIZE);
  assert.equal(first.view.zoom, MAP_CLUSTER_MAX_ZOOM);
  assert.equal(first.list, true);
  const again = mapClusterExpand(same, { center: RIYADH, zoom: 17 }, SIZE);
  assert.equal(again.view.zoom, 17); // never zooms back out
  assert.equal(again.list, true);
  assert.equal(mapClusterExpand(same, { center: RIYADH, zoom: 10 }, SIZE, { maxZoom: 12 }).view.zoom, 12);
  // Always at least one step in.
  const wide = mapClusterExpand([pin("w1", 10, 10), pin("w2", 60, 100)], { center: RIYADH, zoom: 2 }, SIZE);
  assert.ok(wide.view.zoom >= 3);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { adjacency, boundsOf, filterNodes, fitTransform, forceLayout, linksAmong, nodeRadius, sortRows } from "../src/components/graph-view/graph-layout.ts";

const nodes = [
  { id: "a", label: "Riyadh", kind: "place", description: "Capital" },
  { id: "b", label: "الرياض", kind: "place", tags: ["مدينة"] },
  { id: "c", label: "Khaled", kind: "person" },
  { id: "d", label: "Orphan", kind: "note" },
];
const links = [{ source: "a", target: "c" }, { source: "c", target: "b" }, { source: "a", target: "zzz" }];

test("forceLayout is deterministic, finite and centred", () => {
  const one = forceLayout(nodes, links);
  const two = forceLayout(nodes, links);
  assert.deepEqual([...one], [...two]);
  assert.equal(one.size, 4);
  let sx = 0;
  for (const p of one.values()) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
    sx += p.x;
  }
  assert.ok(Math.abs(sx) < 1e-6);
});

test("forceLayout keeps linked nodes closer than unlinked ones and separates all nodes", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` }));
  const ring = many.slice(1).map((n, i) => ({ source: `n${i}`, target: n.id }));
  const pos = forceLayout(many, ring);
  const dist = (a, b) => Math.hypot(pos.get(a).x - pos.get(b).x, pos.get(a).y - pos.get(b).y);
  assert.ok(dist("n0", "n1") < dist("n0", "n11"));
  for (const a of many) for (const b of many) if (a !== b) assert.ok(dist(a.id, b.id) > 5);
  assert.equal(forceLayout([], []).size, 0);
  assert.deepEqual(forceLayout([{ id: "x" }], []).get("x"), { x: 0, y: 0 });
});

test("boundsOf and fitTransform fit a box in a viewport", () => {
  const b = boundsOf([{ x: -100, y: -50 }, { x: 100, y: 50 }], 10);
  assert.deepEqual(b, { x: -110, y: -60, w: 220, h: 120 });
  assert.equal(boundsOf([]), null);
  const t = fitTransform(b, 440, 240);
  assert.equal(t.k, 1.4 < 2 ? 1.4 : 2);
  const wide = fitTransform({ x: 0, y: 0, w: 2000, h: 100 }, 500, 500);
  assert.equal(wide.k, 0.25);
  assert.equal(wide.x, 250 - 1000 * 0.25);
});

test("filterNodes by query (Arabic folding, tags) and kinds", () => {
  assert.deepEqual(filterNodes(nodes, { query: "riyadh" }).map((n) => n.id), ["a"]);
  assert.deepEqual(filterNodes(nodes, { query: "الرياض" }).map((n) => n.id), ["b"]);
  assert.deepEqual(filterNodes(nodes, { query: "مدينه" }).map((n) => n.id), ["b"]);
  assert.deepEqual(filterNodes(nodes, { kinds: ["person", "note"] }).map((n) => n.id), ["c", "d"]);
  assert.equal(filterNodes(nodes, { query: "  ", kinds: [] }).length, 4);
});

test("linksAmong and adjacency", () => {
  const ids = new Set(nodes.map((n) => n.id));
  assert.equal(linksAmong(links, ids).length, 2);
  const adj = adjacency(linksAmong(links, ids));
  assert.deepEqual([...adj.get("c")].sort(), ["a", "b"]);
  assert.equal(adj.get("d"), undefined);
  assert.ok(nodeRadius(0) < nodeRadius(9));
  assert.ok(nodeRadius(10000) <= 16);
});

test("sortRows by each key and direction", () => {
  const rows = [
    { label: "b", kind: "x", links: 1, updated: 30 },
    { label: "a", kind: "y", links: 5, updated: 10 },
    { label: "c", kind: "x", links: 5 },
  ];
  assert.deepEqual(sortRows(rows, "label", "asc").map((r) => r.label), ["a", "b", "c"]);
  assert.deepEqual(sortRows(rows, "links", "desc").map((r) => r.label), ["a", "c", "b"]);
  assert.deepEqual(sortRows(rows, "updated", "desc").map((r) => r.label), ["b", "a", "c"]);
  assert.deepEqual(sortRows(rows, "kind", "asc").map((r) => r.label), ["b", "c", "a"]);
});

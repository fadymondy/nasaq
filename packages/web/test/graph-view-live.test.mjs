import assert from "node:assert/strict";
import { test } from "node:test";
import { nodeRadius, pinchTransform, toGraphPoint, zoomAbout } from "../src/components/graph-view/graph-layout.ts";
import { orderByNeighbours, schemaColumns, schemaConnector, schemaFit } from "../src/components/graph-view/graph-schema.ts";
import { arrowPoints, boundaryDistance, dashFor, GRAPH_SHAPES, linkEnds, shapeExtent, shapePath } from "../src/components/graph-view/graph-shapes.ts";
import { createSimulation, settle } from "../src/components/graph-view/graph-sim.ts";

const chain = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, r: 8 }));
const chainLinks = chain.slice(1).map((n, i) => ({ source: `n${i}`, target: n.id }));

test("simulation cools, settles and stays finite", () => {
  const sim = createSimulation(chain, chainLinks);
  assert.equal(sim.settled, false);
  let ticks = 0;
  const first = sim.alpha;
  while (sim.tick()) ticks++;
  assert.ok(ticks > 50 && ticks < 600, `settled after ${ticks} ticks`);
  assert.ok(sim.alpha < first && sim.settled);
  assert.equal(sim.tick(), false);
  for (const p of sim.positions().values()) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});

test("simulation is deterministic and links pull nodes together", () => {
  assert.deepEqual([...settle(chain, chainLinks)], [...settle(chain, chainLinks)]);
  const pos = settle(chain, chainLinks);
  const dist = (a, b) => Math.hypot(pos.get(a).x - pos.get(b).x, pos.get(a).y - pos.get(b).y);
  assert.ok(dist("n0", "n1") < dist("n0", "n9"));
  for (const a of chain) for (const b of chain) if (a.id !== b.id) assert.ok(dist(a.id, b.id) > 8, `${a.id}-${b.id} overlap`);
});

test("simulation keeps a pinned node in place, follows a drag, and reheats", () => {
  const sim = createSimulation(chain, chainLinks);
  sim.pin("n3", 500, -200);
  for (let i = 0; i < 40; i++) sim.tick();
  const p = sim.positions().get("n3");
  assert.deepEqual([p.x, p.y], [500, -200]);
  assert.ok(sim.isPinned("n3"));
  while (sim.tick());
  assert.ok(sim.settled);
  // the neighbours were drawn towards the pinned node
  const n4 = sim.positions().get("n4");
  assert.ok(Math.hypot(n4.x - 500, n4.y + 200) < 250);
  sim.reheat(0.5);
  assert.equal(sim.settled, false);
  assert.equal(sim.tick(), true);
  sim.unpin("n3");
  assert.equal(sim.isPinned("n3"), false);
  // while dragging it never settles, and dropping lets it settle again
  sim.pin("n3", 0, 0, true);
  for (let i = 0; i < 800; i++) sim.tick();
  assert.equal(sim.settled, false);
  sim.drop();
  while (sim.tick());
  assert.ok(sim.settled);
  assert.ok(sim.isPinned("n3"));
});

test("simulation update keeps existing nodes, places new ones by a neighbour, and reheats", () => {
  const sim = createSimulation(chain, chainLinks);
  while (sim.tick());
  const before = sim.positions().get("n2");
  sim.update([...chain.slice(0, 5), { id: "new", r: 8 }], [...chainLinks.slice(0, 4), { source: "n4", target: "new" }]);
  assert.deepEqual(sim.positions().get("n2"), before);
  assert.ok(sim.alpha > 0.5 && !sim.settled);
  const n4 = sim.positions().get("n4");
  const fresh = sim.positions().get("new");
  assert.ok(Math.hypot(n4.x - fresh.x, n4.y - fresh.y) < 120);
});

test("a node that was filtered out comes back where it was", () => {
  const sim = createSimulation(chain, chainLinks);
  while (sim.tick());
  const at9 = sim.positions().get("n9");
  sim.update(chain.slice(0, 5), chainLinks.slice(0, 4));
  assert.equal(sim.positions().has("n9"), false);
  sim.update(chain, chainLinks);
  assert.deepEqual(sim.positions().get("n9"), at9);
});

test("simulation place and cool stop it; empty and single node are fine", () => {
  const sim = createSimulation(chain, chainLinks);
  sim.place(new Map(chain.map((n, i) => [n.id, { x: i * 10, y: 0 }])));
  assert.equal(sim.settled, true);
  assert.deepEqual(sim.positions().get("n4"), { x: 40, y: 0 });
  sim.pin("n4", 1, 1);
  sim.place(new Map([["n4", { x: 99, y: 99 }]]));
  assert.deepEqual(sim.positions().get("n4"), { x: 1, y: 1 });
  assert.equal(createSimulation([], []).positions().size, 0);
  const one = createSimulation([{ id: "a" }], []);
  while (one.tick());
  assert.ok(one.settled);
  assert.equal(createSimulation([{ id: "a" }, { id: "b" }], [{ source: "a", target: "zzz" }]).nodes.length, 2);
});

test("nodeRadius takes an explicit weight", () => {
  assert.ok(nodeRadius(0, 25) > nodeRadius(0, 4));
  assert.ok(nodeRadius(0, 100000) <= 24 && nodeRadius(0, 100000) > 16);
  assert.equal(nodeRadius(4), nodeRadius(4, undefined));
  assert.equal(nodeRadius(0, 4), nodeRadius(4));
});

test("every shape has a closed path, an extent and a sane boundary", () => {
  for (const shape of GRAPH_SHAPES) {
    const d = shapePath(shape, 10);
    assert.match(d, /^M /);
    assert.match(d, /Z$/);
    assert.ok(!d.includes("NaN"));
    const { hw, hh } = shapeExtent(shape, 10);
    assert.ok(hw > 0 && hh > 0);
    for (let a = 0; a < 6.3; a += 0.5) {
      const b = boundaryDistance(shape, 10, a);
      assert.ok(b > 0 && b <= Math.hypot(hw, hh) + 0.01, `${shape} ${a} ${b}`);
    }
  }
  assert.equal(boundaryDistance("circle", 10, 1), 10);
  assert.ok(Math.abs(boundaryDistance("diamond", 10, 0) - 11.5) < 0.01);
  assert.ok(Math.abs(boundaryDistance("square", 10, Math.PI / 2) - 9) < 0.01);
  assert.ok(Math.abs(boundaryDistance("hexagon", 10, 0) - 10.5) < 0.01);
  assert.ok(boundaryDistance("pill", 10, 0) > boundaryDistance("pill", 10, Math.PI / 2));
  assert.ok(boundaryDistance("diamond", 10, Math.PI / 4) < boundaryDistance("square", 10, Math.PI / 4));
});

test("linkEnds stop at the outlines and fall back when nodes touch", () => {
  const e = linkEnds({ x: 0, y: 0 }, "circle", 10, { x: 100, y: 0 }, "square", 10, 0);
  assert.ok(Math.abs(e.a.x - 10) < 1e-6 && Math.abs(e.b.x - 91) < 1e-6);
  assert.equal(e.length, 100);
  const close = linkEnds({ x: 0, y: 0 }, "circle", 10, { x: 15, y: 0 }, "circle", 10);
  assert.deepEqual(close.a, { x: 0, y: 0 });
  assert.equal(arrowPoints({ x: 10, y: 0 }, 0, 8).split(" ").length, 3);
  assert.equal(dashFor("solid"), undefined);
  assert.equal(dashFor(undefined), undefined);
  assert.ok(dashFor("dashed") && dashFor("flow") && dashFor("dashed") !== dashFor("flow"));
});

const sn = [
  { id: "p1", kind: "person" },
  { id: "p2", kind: "person" },
  { id: "d1", kind: "doc" },
  { id: "d2", kind: "doc" },
  { id: "x", kind: "other" },
];

test("schemaColumns follows kind order, appends unknown kinds and skips empty ones", () => {
  const cols = schemaColumns(sn, ["doc", "ghost", "person"]);
  assert.deepEqual(cols.map((c) => c.kind), ["doc", "person", "other"]);
  assert.deepEqual(cols[1].nodes.map((n) => n.id), ["p1", "p2"]);
  assert.deepEqual(schemaColumns([], ["a"]), []);
});

test("orderByNeighbours puts linked cards level with each other", () => {
  const cols = schemaColumns(sn, ["person", "doc"]);
  const ordered = orderByNeighbours(cols, [{ source: "p2", target: "d1" }, { source: "p1", target: "d2" }]);
  assert.deepEqual(ordered[0].nodes.map((n) => n.id), ["p1", "p2"]);
  assert.deepEqual(ordered[1].nodes.map((n) => n.id), ["d2", "d1"]);
  assert.deepEqual(orderByNeighbours(cols, [])[1].nodes.map((n) => n.id), ["d1", "d2"]);
});

test("schemaConnector joins facing sides whichever way the columns read", () => {
  const a = { x: 0, y: 0, w: 100, h: 40 };
  const b = { x: 300, y: 100, w: 100, h: 40 };
  const ltr = schemaConnector(a, b);
  assert.equal(ltr.d, "M 100 20 C 200 20, 200 120, 300 120");
  assert.equal(ltr.angle, 0);
  assert.deepEqual(ltr.end, { x: 300, y: 120 });
  const rtl = schemaConnector(b, a);
  assert.equal(rtl.d, "M 300 120 C 200 120, 200 20, 100 20");
  assert.equal(rtl.angle, Math.PI);
  const below = { x: 0, y: 200, w: 100, h: 40 };
  const same = schemaConnector(a, below, "right");
  assert.match(same.d, /^M 100 20 C /);
  assert.ok(same.mid.x > 100);
  assert.ok(schemaConnector(a, below, "left").mid.x < 0);
});

test("schemaFit anchors to the start edge and never enlarges", () => {
  assert.deepEqual(schemaFit({ w: 500, h: 300 }, { w: 1000, h: 600 }, false), { k: 1, x: 0, y: 0 });
  assert.deepEqual(schemaFit({ w: 500, h: 300 }, { w: 1000, h: 600 }, true), { k: 1, x: 500, y: 0 });
  assert.equal(schemaFit({ w: 2000, h: 300 }, { w: 1000, h: 600 }, false).k, 0.5);
  assert.equal(schemaFit({ w: 2000, h: 1800 }, { w: 1000, h: 600 }, false, { height: false }).k, 0.5);
  assert.ok(schemaFit({ w: 2000, h: 1800 }, { w: 1000, h: 600 }, false).k < 0.4);
  assert.equal(schemaFit({ w: 100000, h: 300 }, { w: 1000, h: 600 }, false).k, 0.3);
});

test("pan and zoom maths keeps the point under the cursor", () => {
  const tf = { x: 40, y: 20, k: 1 };
  const c = { x: 200, y: 150 };
  const before = toGraphPoint(c, tf);
  const z = zoomAbout(tf, 2, c);
  assert.equal(z.k, 2);
  const after = toGraphPoint(c, z);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9);
  assert.equal(zoomAbout(tf, 100, c).k, 3);
  assert.equal(zoomAbout(tf, 0.0001, c).k, 0.2);
  const p = pinchTransform(tf, { a: { x: 100, y: 100 }, b: { x: 200, y: 100 } }, { a: { x: 50, y: 100 }, b: { x: 250, y: 100 } });
  assert.equal(p.k, 2);
  const mid = toGraphPoint({ x: 150, y: 100 }, tf);
  const moved = toGraphPoint({ x: 150, y: 100 }, p);
  assert.ok(Math.abs(mid.x - moved.x) < 1e-9 && Math.abs(mid.y - moved.y) < 1e-9);
});

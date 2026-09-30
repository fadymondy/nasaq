import assert from "node:assert/strict";
import { test } from "node:test";
import { addStep, autoLayout, canConnect, removeNodes, runAtStep, runOrder, typeMap, validateWorkflow } from "../src/components/workflow-canvas/workflow-model.ts";

const types = typeMap([
  { id: "webhook", label: "Webhook", category: "trigger", icon: null, role: "trigger" },
  { id: "http", label: "HTTP", category: "action", icon: null, fields: [{ name: "url", label: "URL", kind: "url", required: true }] },
  { id: "if", label: "If", category: "flow", icon: null, outputs: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] },
  { id: "mail", label: "Mail", category: "action", icon: null },
]);
const n = (id, type, config = {}) => ({ id, type, config });
const e = (id, source, target, sourceHandle = null) => ({ id, source, target, sourceHandle });
const chain = { nodes: [n("t", "webhook"), n("a", "http", { url: "https://x.test" }), n("b", "mail")], edges: [e("1", "t", "a"), e("2", "a", "b")] };

test("validateWorkflow: empty, trigger, required fields", () => {
  assert.equal(validateWorkflow({ nodes: [], edges: [] }, types)[0].code, "empty");
  assert.deepEqual(validateWorkflow(chain, types), []);
  const noUrl = { ...chain, nodes: [n("t", "webhook"), n("a", "http"), n("b", "mail")] };
  assert.deepEqual(validateWorkflow(noUrl, types).map((i) => [i.code, i.nodeId, i.field]), [["missing-field", "a", "url"]]);
  assert.ok(validateWorkflow({ nodes: [n("a", "mail")], edges: [] }, types).some((i) => i.code === "no-trigger"));
});

test("validateWorkflow: unreachable, second trigger, cycle, unknown type", () => {
  const orphan = { nodes: [...chain.nodes, n("z", "mail")], edges: chain.edges };
  assert.deepEqual(validateWorkflow(orphan, types).map((i) => [i.code, i.level]), [["unreachable", "warning"]]);
  const two = { nodes: [...chain.nodes, n("t2", "webhook")], edges: chain.edges };
  assert.ok(validateWorkflow(two, types).some((i) => i.code === "multiple-triggers" && i.nodeId === "t2"));
  const loop = { nodes: chain.nodes, edges: [...chain.edges, e("3", "b", "a")] };
  assert.ok(validateWorkflow(loop, types).some((i) => i.code === "cycle"));
  assert.ok(validateWorkflow({ nodes: [n("t", "webhook"), n("q", "ghost")], edges: [e("1", "t", "q")] }, types).some((i) => i.code === "unknown-type"));
});

test("canConnect refuses cycles, self links, triggers as targets and duplicates of a handle", () => {
  assert.equal(canConnect(chain, types, "b", "a"), false);
  assert.equal(canConnect(chain, types, "a", "a"), false);
  assert.equal(canConnect(chain, types, "a", "t"), false);
  assert.equal(canConnect(chain, types, "t", "b"), true);
});

test("autoLayout puts children after parents and siblings apart", () => {
  const fan = { nodes: [n("t", "webhook"), n("i", "if"), n("y", "mail"), n("no", "mail")], edges: [e("1", "t", "i"), e("2", "i", "y", "yes"), e("3", "i", "no", "no")] };
  const pos = autoLayout(fan, "horizontal");
  assert.ok(pos.get("i").x > pos.get("t").x);
  assert.ok(pos.get("y").x > pos.get("i").x);
  assert.notEqual(pos.get("y").y, pos.get("no").y);
  const down = autoLayout(fan, "vertical");
  assert.ok(down.get("i").y > down.get("t").y);
});

test("addStep splices between and moves downstream; removeNodes rejoins", () => {
  const { graph, id } = addStep(chain, types, "mail", { sourceId: "a" });
  assert.equal(graph.nodes.length, 4);
  assert.ok(graph.edges.some((x) => x.source === "a" && x.target === id));
  assert.ok(graph.edges.some((x) => x.source === id && x.target === "b"));
  assert.ok(!graph.edges.some((x) => x.source === "a" && x.target === "b"));
  const b = graph.nodes.find((x) => x.id === "b");
  const inserted = graph.nodes.find((x) => x.id === id);
  assert.ok(b.position.x > inserted.position.x);
  const back = removeNodes(graph, [id]);
  assert.ok(back.edges.some((x) => x.source === "a" && x.target === "b"));
  assert.equal(back.nodes.length, 3);
});

test("addStep starts a workflow with a defaults copy", () => {
  const t = typeMap([{ id: "webhook", label: "W", category: "trigger", icon: null, defaults: { method: "POST" } }]);
  const { graph } = addStep({ nodes: [], edges: [] }, t, "webhook");
  assert.deepEqual(graph.nodes[0].config, { method: "POST" });
});

test("runOrder and runAtStep replay in execution order", () => {
  const run = { id: "r", status: "success", startedAt: 0, nodes: { t: { status: "success" }, a: { status: "success", items: 3 }, b: { status: "error", error: "x" } } };
  assert.deepEqual(runOrder(chain, run), ["t", "a", "b"]);
  const mid = runAtStep(chain, run, 1);
  assert.equal(mid.nodes.t.status, "success");
  assert.equal(mid.nodes.a.status, "running");
  assert.equal(mid.nodes.b, undefined);
  assert.equal(mid.status, "running");
  assert.equal(runAtStep(chain, run, 3).nodes.b.status, "error");
});

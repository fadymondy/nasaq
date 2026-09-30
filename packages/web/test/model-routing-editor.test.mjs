import assert from "node:assert/strict";
import test from "node:test";
import { isValidEndpoint, modelsFor, routingEquals, routingIssues, toggleModality, validateProvider } from "../src/components/model-routing-editor/routing-math.ts";

const models = [{ id: "a", modalities: ["text", "vision"] }, { id: "b" }, { id: "c", modalities: ["audio"] }];

test("modelsFor filters by the task modality; no modalities means text", () => {
  assert.deepEqual(modelsFor({ id: "t" }, models).map((m) => m.id), ["a", "b"]);
  assert.deepEqual(modelsFor({ id: "t", modality: "vision" }, models).map((m) => m.id), ["a"]);
  assert.deepEqual(modelsFor({ id: "t", modality: "audio" }, models).map((m) => m.id), ["c"]);
});

test("routingIssues: missing only when auto is off, same and unknown always", () => {
  const tasks = [{ id: "x" }, { id: "y" }];
  assert.deepEqual(routingIssues({ auto: true, routes: {} }, tasks, models), []);
  assert.deepEqual(routingIssues({ auto: false, routes: { x: { model: "a" } } }, tasks, models), [{ taskId: "y", kind: "missing" }]);
  assert.deepEqual(routingIssues({ auto: true, routes: { x: { model: "a", fallback: "a" } } }, tasks, models), [{ taskId: "x", kind: "same" }]);
  assert.deepEqual(routingIssues({ auto: true, routes: { x: { model: "gone" } } }, tasks, models), [{ taskId: "x", kind: "unknown" }]);
});

test("routingEquals treats empty strings and missing as equal", () => {
  assert.equal(routingEquals({ auto: true, routes: { x: { model: "a", fallback: "" } } }, { auto: true, routes: { x: { model: "a" } } }), true);
  assert.equal(routingEquals({ auto: true, routes: {} }, { auto: false, routes: {} }), false);
  assert.equal(routingEquals({ auto: true, routes: {}, backend: "p" }, { auto: true, routes: {} }), false);
});

test("toggleModality keeps canonical order", () => {
  assert.deepEqual(toggleModality(["text"], "vision"), ["text", "vision"]);
  assert.deepEqual(toggleModality(["vision"], "text"), ["text", "vision"]);
  assert.deepEqual(toggleModality(["text", "vision"], "text"), ["vision"]);
});

test("endpoint and provider validation", () => {
  assert.equal(isValidEndpoint("https://x.example/v1"), true);
  assert.equal(isValidEndpoint("ftp://x"), false);
  assert.equal(isValidEndpoint("nope"), false);
  assert.deepEqual(validateProvider({ name: " ", endpoint: "", modalities: [] }, []), { name: "required", endpoint: "required", modalities: "required" });
  assert.equal(validateProvider({ name: "Local", endpoint: "http://10.0.0.1", modalities: ["text"] }, [{ name: "local" }]).name, "duplicate");
  assert.equal(validateProvider({ name: "N", endpoint: "bad", modalities: ["text"] }, []).endpoint, "invalid");
  assert.deepEqual(validateProvider({ name: "N", endpoint: "", modalities: ["text"] }, [], false), {});
});

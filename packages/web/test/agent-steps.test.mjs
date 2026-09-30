import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_MASK,
  agentChangeKind,
  agentHighestRisk,
  agentRunState,
  agentStepCounts,
  currentStep,
  redactDeep,
  resultLanguage,
  selectedChangeIds,
  stringifyArgs,
  toggleId,
  totalDurationMs,
} from "../src/components/agent-steps/agent-steps-logic.ts";

const s = (id, status, extra = {}) => ({ id, tool: "t", status, ...extra });

test("run state: error beats awaiting beats running", () => {
  assert.equal(agentRunState([]), "idle");
  assert.equal(agentRunState([s("a", "done"), s("b", "done")]), "done");
  assert.equal(agentRunState([s("a", "done"), s("b", "running")]), "running");
  assert.equal(agentRunState([s("a", "running"), s("b", "awaiting")]), "awaiting");
  assert.equal(agentRunState([s("a", "awaiting"), s("b", "error")]), "error");
  assert.equal(agentRunState([s("a", "skipped")]), "done");
});

test("counts and current step", () => {
  const steps = [s("a", "done"), s("b", "running"), s("c", "pending"), s("d", "skipped")];
  assert.deepEqual(agentStepCounts(steps), { total: 4, done: 1, running: 1, awaiting: 0, error: 0, pending: 1, skipped: 1 });
  assert.equal(currentStep(steps)?.id, "b");
  assert.equal(currentStep([s("a", "done")]), undefined);
  assert.equal(currentStep([s("a", "running"), s("b", "awaiting")])?.id, "b");
});

test("totalDurationMs ignores missing durations", () => {
  assert.equal(totalDurationMs([s("a", "done", { durationMs: 120 }), s("b", "done"), s("c", "done", { durationMs: 30 })]), 150);
});

test("redaction is deep and case-insensitive, and copies", () => {
  const input = { q: "x", Token: "abc", nested: [{ password: "p", ok: 1 }] };
  const out = redactDeep(input, ["token", "password"]);
  assert.deepEqual(out, { q: "x", Token: AGENT_MASK, nested: [{ password: AGENT_MASK, ok: 1 }] });
  assert.equal(input.Token, "abc");
  assert.ok(!stringifyArgs(input, ["token", "password"]).includes("abc"));
  assert.equal(stringifyArgs(undefined), "");
});

test("resultLanguage detects JSON", () => {
  assert.equal(resultLanguage({ result: '{"a":1}' }), "json");
  assert.equal(resultLanguage({ result: "{not json" }), "text");
  assert.equal(resultLanguage({ result: "plain" }), "text");
  assert.equal(resultLanguage({ result: "plain", resultLanguage: "sql" }), "sql");
  assert.equal(resultLanguage({}), "text");
});

test("change kind and highest risk", () => {
  assert.equal(agentChangeKind({ after: "x" }), "create");
  assert.equal(agentChangeKind({ before: "x" }), "delete");
  assert.equal(agentChangeKind({ before: "x", after: "y" }), "edit");
  assert.equal(agentHighestRisk([]), "low");
  assert.equal(agentHighestRisk([{ risk: "medium" }, { risk: "high" }, {}]), "high");
  assert.equal(agentHighestRisk([{}, { risk: "medium" }]), "medium");
});

test("selection helpers keep order and do not mutate", () => {
  const changes = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const sel = new Set(["c", "a", "gone"]);
  assert.deepEqual(selectedChangeIds(changes, sel), ["a", "c"]);
  const next = toggleId(sel, "a");
  assert.ok(sel.has("a"));
  assert.ok(!next.has("a"));
  assert.ok(toggleId(next, "a").has("a"));
});

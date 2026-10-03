import assert from "node:assert/strict";
import { test } from "node:test";
import { countWorkflowSteps, numberWorkflow, workflowStepKind, workflowToNetwork } from "../src/components/workflow-views/workflow-views-logic.ts";

const tree = [
  { id: "a", title: "Trigger" },
  { id: "loop", title: "For each order", children: [{ id: "c1", title: "Check stock" }, { id: "c2", title: "Reserve" }] },
  {
    id: "if",
    title: "Paid?",
    branches: [
      { label: "Yes", steps: [{ id: "ship", title: "Ship" }] },
      { label: "No", steps: [] },
    ],
  },
  { id: "end", title: "Notify", kind: "output" },
];

test("outline numbers follow children and branches", () => {
  const rows = numberWorkflow(tree).map((r) => `${r.number}:${r.step.id}:${r.depth}`);
  assert.deepEqual(rows, ["1:a:0", "2:loop:0", "2.1:c1:1", "2.2:c2:1", "3:if:0", "3.a.1:ship:2", "4:end:0"]);
  assert.equal(countWorkflowSteps(tree), 7);
  assert.equal(workflowStepKind(tree[2]), "decision");
  assert.equal(workflowStepKind(tree[0]), "step");
});

test("the network links a sequence, enters children, labels branches and merges them", () => {
  const { steps, links } = workflowToNetwork(tree);
  assert.deepEqual(steps.map((s) => s.id), ["a", "loop", "c1", "c2", "if", "ship", "end"]);
  const l = links.map((x) => `${x.from}>${x.to}${x.label ? `(${x.label})` : ""}`);
  assert.deepEqual(l.sort(), ["a>loop", "loop>c1", "c1>c2", "c2>if", "if>ship(Yes)", "ship>end", "if>end(No)"].sort());
});

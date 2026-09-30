import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByStage, hasDoneStage, moveWithinStage, sortByStage, validateName } from "../src/components/status-label-manager/status-label-logic.ts";

const st = (id, stage) => ({ id, name: id, hue: "blue", stage });
const list = [st("a", "todo"), st("b", "active"), st("c", "todo"), st("d", "done")];

test("validateName", () => {
  assert.equal(validateName("  ", []), "empty");
  assert.equal(validateName("x".repeat(33), []), "tooLong");
  assert.equal(validateName("Bug", [{ id: "1", name: "bug" }]), "duplicate");
  assert.equal(validateName("Bug", [{ id: "1", name: "bug" }], "1"), null);
});

test("groupByStage keeps every stage in order", () => {
  const g = groupByStage(list);
  assert.deepEqual(g.map((x) => x.stage), ["backlog", "todo", "active", "review", "done", "canceled"]);
  assert.deepEqual(g[1].items.map((s) => s.id), ["a", "c"]);
});

test("moveWithinStage swaps with the neighbour in the same stage only", () => {
  assert.deepEqual(moveWithinStage(list, "c", -1), ["c", "b", "a", "d"]);
  assert.deepEqual(moveWithinStage(list, "a", -1), ["a", "b", "c", "d"]);
  assert.deepEqual(moveWithinStage(list, "b", 1), ["a", "b", "c", "d"]);
});

test("sortByStage and hasDoneStage", () => {
  assert.deepEqual(sortByStage(list).map((s) => s.id), ["a", "c", "b", "d"]);
  assert.equal(hasDoneStage(list), true);
  assert.equal(hasDoneStage([st("a", "todo")]), false);
});

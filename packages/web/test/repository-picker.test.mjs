import assert from "node:assert/strict";
import { test } from "node:test";
import { filterBranches, moveIndex, pickDefaultBranch, sortBranches, splitFullName } from "../src/components/repository-picker/repository-picker-format.ts";

test("splitFullName", () => {
  assert.deepEqual(splitFullName("fadymondy/nasaq"), { owner: "fadymondy", name: "nasaq" });
  assert.deepEqual(splitFullName("solo"), { owner: "", name: "solo" });
});

test("sortBranches puts default, then protected first", () => {
  const out = sortBranches([{ name: "zeta" }, { name: "release", protected: true }, { name: "main", default: true }, { name: "alpha" }]);
  assert.deepEqual(out.map((b) => b.name), ["main", "release", "alpha", "zeta"]);
});

test("filterBranches is case-insensitive", () => {
  const list = [{ name: "feature/Login" }, { name: "main" }];
  assert.deepEqual(filterBranches(list, "LOGIN").map((b) => b.name), ["feature/Login"]);
  assert.equal(filterBranches(list, "  ").length, 2);
});

test("pickDefaultBranch", () => {
  assert.equal(pickDefaultBranch([{ name: "a" }, { name: "b", default: true }]), "b");
  assert.equal(pickDefaultBranch([{ name: "a" }, { name: "master" }]), "master");
  assert.equal(pickDefaultBranch([{ name: "dev" }, { name: "x" }], "x"), "x");
  assert.equal(pickDefaultBranch([{ name: "q" }]), "q");
  assert.equal(pickDefaultBranch([]), null);
});

test("moveIndex wraps", () => {
  assert.equal(moveIndex(-1, 1, 3), 0);
  assert.equal(moveIndex(-1, -1, 3), 2);
  assert.equal(moveIndex(2, 1, 3), 0);
  assert.equal(moveIndex(0, -1, 3), 2);
  assert.equal(moveIndex(0, 1, 0), -1);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { diffRules, isValidCidr, isValidPort, lockoutRisk, rulesToApply, validateFirewallRule } from "../src/components/network-rules/network-format.ts";

test("isValidCidr", () => {
  assert.equal(isValidCidr("10.0.0.0/8"), true);
  assert.equal(isValidCidr("203.0.113.7"), true);
  assert.equal(isValidCidr("10.0.0.0/33"), false);
  assert.equal(isValidCidr("300.1.1.1"), false);
  assert.equal(isValidCidr("nonsense"), false);
});

test("isValidPort", () => {
  assert.equal(isValidPort("443"), true);
  assert.equal(isValidPort("8000-8100"), true);
  assert.equal(isValidPort("0"), false);
  assert.equal(isValidPort("70000"), false);
  assert.equal(isValidPort("9000-8000"), false);
});

test("validateFirewallRule", () => {
  assert.deepEqual(validateFirewallRule({ protocol: "tcp", port: "22", source: "0.0.0.0/0" }), []);
  assert.ok(validateFirewallRule({ protocol: "tcp", port: "", source: "0.0.0.0/0" }).length > 0);
  assert.ok(validateFirewallRule({ protocol: "tcp", port: "22", source: "bad" }).includes("source"));
});

test("diffRules stages adds, changes, removals", () => {
  const applied = [
    { id: "a", v: 1 },
    { id: "b", v: 1 },
    { id: "c", v: 1 },
  ];
  const staged = [
    { id: "a", v: 1 },
    { id: "b", v: 2 },
    { id: "c", v: 1 },
    { id: "d", v: 1 },
  ];
  const d = diffRules(applied, staged, new Set(["c"]));
  assert.equal(d.states.get("a"), "unchanged");
  assert.equal(d.states.get("b"), "changed");
  assert.equal(d.states.get("c"), "removed");
  assert.equal(d.states.get("d"), "added");
  assert.ok(d.count >= 3);
  assert.deepEqual(
    rulesToApply(staged, new Set(["c"])).map((r) => r.id),
    ["a", "b", "d"],
  );
});

test("diffRules with nothing staged has count 0", () => {
  const rules = [{ id: "a" }];
  assert.equal(diffRules(rules, rules).count, 0);
});

test("lockoutRisk flags an SSH deny", () => {
  const r = (id, action, port) => ({ id, action, protocol: "tcp", port, source: "0.0.0.0/0" });
  assert.equal(lockoutRisk([r("1", "allow", "22")]), null);
  assert.ok(lockoutRisk([r("1", "deny", "22")]));
});

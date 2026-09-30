import assert from "node:assert/strict";
import test from "node:test";
import { bucketFor, clampRollout, evaluateFlag, flagKeyFromName, flagState, hash32, isInRollout, isValidFlagKey, normalizeWeights, pickVariant } from "../src/components/feature-flags/flag-model.ts";
import { emptyRule, evaluateConditions } from "../src/components/rule-builder/rule-model.ts";

test("bucketFor is stable and within 0 to 100", () => {
  assert.equal(bucketFor("f", "u1"), bucketFor("f", "u1"));
  assert.notEqual(bucketFor("f", "u1"), bucketFor("g", "u1"));
  for (let i = 0; i < 500; i++) {
    const b = bucketFor("f", `u${i}`);
    assert.ok(b >= 0 && b < 100);
  }
  assert.equal(hash32("a"), hash32("a"));
});

test("rollout hits its target percentage over many users", () => {
  const users = Array.from({ length: 10_000 }, (_, i) => `user-${i}`);
  for (const pct of [10, 25, 50, 90]) {
    const on = users.filter((u) => isInRollout(bucketFor("checkout.new", u), pct)).length;
    assert.ok(Math.abs(on / users.length - pct / 100) < 0.02, `${pct}% got ${on / 100}%`);
  }
});

test("raising the rollout keeps the users who already had it", () => {
  const users = Array.from({ length: 2000 }, (_, i) => `user-${i}`);
  const at10 = users.filter((u) => isInRollout(bucketFor("f", u), 10));
  const at30 = new Set(users.filter((u) => isInRollout(bucketFor("f", u), 30)));
  assert.ok(at10.every((u) => at30.has(u)));
});

test("0 percent lets nobody in and 100 percent lets everybody in", () => {
  for (let i = 0; i < 300; i++) {
    const b = bucketFor("f", `u${i}`);
    assert.equal(isInRollout(b, 0), false);
    assert.equal(isInRollout(b, 100), true);
  }
  assert.equal(clampRollout(150), 100);
  assert.equal(clampRollout(-5), 0);
  assert.equal(clampRollout(Number.NaN), 0);
});

test("normalizeWeights adds up to exactly 100", () => {
  assert.deepEqual(normalizeWeights([1, 1]), [50, 50]);
  assert.equal(normalizeWeights([1, 1, 1]).reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(normalizeWeights([3, 1]), [75, 25]);
  assert.deepEqual(normalizeWeights([0, 0]), [50, 50]);
  assert.deepEqual(normalizeWeights([-1, 2]), [0, 100]);
  assert.deepEqual(normalizeWeights([]), []);
});

test("pickVariant follows the weights", () => {
  const variants = [{ key: "a", weight: 3 }, { key: "b", weight: 1 }];
  let a = 0;
  const n = 8000;
  for (let i = 0; i < n; i++) if (pickVariant("f", `u${i}`, variants) === "a") a += 1;
  assert.ok(Math.abs(a / n - 0.75) < 0.03);
  assert.equal(pickVariant("f", "u1", []), null);
  assert.equal(pickVariant("f", "u1", variants), pickVariant("f", "u1", variants));
});

const flag = (extra = {}) => ({
  key: "checkout.new",
  name: "New checkout",
  environments: { prod: { enabled: true, rollout: 100 }, dev: { enabled: false, rollout: 100 } },
  variants: [{ key: "control", weight: 1 }, { key: "new", weight: 1 }],
  rules: [],
  updatedAt: "2026-06-01",
  ...extra,
});
const fields = [{ id: "plan", label: "Plan", kind: "select", options: [{ value: "pro", label: "Pro" }] }];
const matches = (rule, ctx) => evaluateConditions(rule.conditions, ctx, fields);
const proRule = {
  ...emptyRule(),
  event: "evaluate",
  conditions: { kind: "group", id: "g", join: "and", children: [{ kind: "condition", id: "c", field: "plan", op: "is", value: "pro" }] },
  actions: [{ id: "a", type: "serve", config: { variant: "new" } }],
};

test("evaluateFlag: kill switch beats everything", () => {
  const r = evaluateFlag(flag({ killed: true }), "prod", { userId: "u1" });
  assert.deepEqual([r.on, r.reason, r.variant], [false, "killed", null]);
});

test("evaluateFlag: a disabled or unknown environment is off", () => {
  assert.equal(evaluateFlag(flag(), "dev", { userId: "u1" }).reason, "disabled");
  assert.equal(evaluateFlag(flag(), "nowhere", { userId: "u1" }).on, false);
});

test("evaluateFlag: a matching rule serves its variant and skips the rollout", () => {
  const f = flag({ rules: [proRule], environments: { prod: { enabled: true, rollout: 0 } } });
  const hit = evaluateFlag(f, "prod", { userId: "u1", plan: "pro" }, matches);
  assert.deepEqual([hit.on, hit.reason, hit.variant], [true, "rule", "new"]);
  const miss = evaluateFlag(f, "prod", { userId: "u1", plan: "free" }, matches);
  assert.deepEqual([miss.on, miss.reason], [false, "excluded"]);
});

test("evaluateFlag: rollout decides for everyone else, and is stable", () => {
  const f = flag({ environments: { prod: { enabled: true, rollout: 50 } } });
  const first = evaluateFlag(f, "prod", { userId: "u7" });
  assert.deepEqual(first, evaluateFlag(f, "prod", { userId: "u7" }));
  assert.equal(first.on, first.reason === "rollout");
  assert.equal(first.on, isInRollout(first.bucket, 50));
});

test("flagState", () => {
  assert.equal(flagState(flag({ killed: true }), "prod"), "killed");
  assert.equal(flagState(flag(), "dev"), "off");
  assert.equal(flagState(flag(), "prod"), "on");
  assert.equal(flagState(flag({ environments: { prod: { enabled: true, rollout: 40 } } }), "prod"), "partial");
  assert.equal(flagState(flag({ environments: { prod: { enabled: true, rollout: 0 } } }), "prod"), "off");
});

test("flag keys", () => {
  assert.equal(isValidFlagKey("checkout.new-flow"), true);
  assert.equal(isValidFlagKey("Checkout"), false);
  assert.equal(isValidFlagKey("a b"), false);
  assert.equal(isValidFlagKey(""), false);
  assert.equal(flagKeyFromName("New checkout flow!"), "new-checkout-flow");
});

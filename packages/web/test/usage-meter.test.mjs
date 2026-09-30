import assert from "node:assert/strict";
import test from "node:test";
import { burnProjection, overageAmount, overageTotal, usageFraction, usageTone } from "../src/components/usage-meter/usage-math.ts";

test("usageFraction handles unlimited and zero limits", () => {
  assert.equal(usageFraction(5, null), 0);
  assert.equal(usageFraction(0, 0), 0);
  assert.equal(usageFraction(3, 0), 1);
  assert.equal(usageFraction(25, 100), 0.25);
  assert.equal(usageFraction(150, 100), 1.5);
});

test("usageTone thresholds", () => {
  assert.equal(usageTone(74, 100), "ok");
  assert.equal(usageTone(75, 100), "warning");
  assert.equal(usageTone(90, 100), "danger");
  assert.equal(usageTone(100, 100), "danger");
  assert.equal(usageTone(101, 100), "over");
  assert.equal(usageTone(1e9, null), "ok");
  assert.equal(usageTone(50, 100, { warnAt: 0.5, dangerAt: 0.6 }), "warning");
});

test("overage amounts", () => {
  assert.equal(overageAmount({ used: 120, limit: 100, overageRate: 0.5 }), 10);
  assert.equal(overageAmount({ used: 80, limit: 100, overageRate: 0.5 }), 0);
  assert.equal(overageAmount({ used: 120, limit: null, overageRate: 0.5 }), 0);
  assert.equal(overageAmount({ used: 120, limit: 100 }), 0);
  assert.equal(
    overageTotal([
      { used: 120, limit: 100, overageRate: 1 },
      { used: 15, limit: 10, overageRate: 2 },
    ]),
    30,
  );
});

test("burnProjection is linear and clamps elapsed", () => {
  const p = burnProjection(50, 100, 0.25);
  assert.equal(p.projected, 200);
  assert.equal(p.willExceed, true);
  assert.equal(p.overBy, 100);
  assert.equal(p.remaining, 50);
  const q = burnProjection(10, 100, 0);
  assert.equal(q.projected, 10);
  assert.equal(q.willExceed, false);
  assert.equal(burnProjection(120, 100, 1).remaining, 0);
});

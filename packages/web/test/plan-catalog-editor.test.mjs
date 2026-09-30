import assert from "node:assert/strict";
import test from "node:test";
import { catalogIssues, countChanges, diffCatalog, emptyCatalog, makeId, sameValue } from "../src/components/plan-catalog-editor/catalog-math.ts";

const base = {
  ...emptyCatalog,
  apps: [{ id: "crm", name: "CRM", enabled: true }],
  features: [{ id: "sso", name: "SSO", appId: "crm" }],
  plans: [{ id: "pro", name: "Pro", subscribers: 4, price: 10 }],
};

test("sameValue is structural and order independent", () => {
  assert.equal(sameValue({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 }), true);
  assert.equal(sameValue([1, 2], [2, 1]), false);
  assert.equal(sameValue(null, undefined), false);
});

test("diffCatalog reports added, updated with fields, and removed", () => {
  const after = {
    ...base,
    apps: [
      { id: "crm", name: "CRM", enabled: false },
      { id: "hr", name: "HR", enabled: true },
    ],
    features: [],
  };
  const changes = diffCatalog(base, after);
  const byKey = Object.fromEntries(changes.map((c) => [`${c.entity}:${c.id}`, c]));
  assert.equal(byKey["apps:crm"].kind, "updated");
  assert.deepEqual(byKey["apps:crm"].fields, ["enabled"]);
  assert.equal(byKey["apps:hr"].kind, "added");
  assert.equal(byKey["features:sso"].kind, "removed");
  assert.deepEqual(countChanges(changes), { added: 1, updated: 1, removed: 1 });
});

test("diffCatalog ignores plan subscribers", () => {
  const after = { ...base, plans: [{ id: "pro", name: "Pro", subscribers: 99, price: 10 }] };
  assert.deepEqual(diffCatalog(base, after), []);
});

test("catalogIssues finds empty names, duplicates and missing apps", () => {
  const bad = {
    ...base,
    apps: [
      { id: "crm", name: " ", enabled: true },
      { id: "crm", name: "Dup", enabled: true },
    ],
    features: [{ id: "f", name: "F", appId: "ghost" }],
    bundles: [{ id: "b", name: "B", price: 1, appIds: ["crm", "ghost"] }],
  };
  const codes = catalogIssues(bad)
    .map((i) => `${i.entity}:${i.code}`)
    .sort();
  assert.deepEqual(codes, ["apps:duplicate", "apps:name", "bundles:missing-app", "features:missing-app"]);
  assert.deepEqual(catalogIssues(base), []);
});

test("makeId slugifies and de-duplicates", () => {
  assert.equal(makeId("Pro Plus", []), "pro-plus");
  assert.equal(makeId("Pro Plus", ["pro-plus"]), "pro-plus-2");
  assert.equal(makeId("Pro Plus", ["pro-plus", "pro-plus-2"]), "pro-plus-3");
  assert.equal(makeId("باقة", [], "plan"), "plan");
});

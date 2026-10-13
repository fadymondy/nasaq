import assert from "node:assert/strict";
import { test } from "node:test";
import { activeNavId, isNavActive, pickMobileTabs, productNavGroups, productNavProblems, sortSettings } from "../src/components/product-shell/product-nav.ts";
import { applyOnboardingAction, onboardingOpen, onboardingProgress, onboardingResumeIndex, PRODUCT_ONBOARDING_STEPS } from "../src/components/product-onboarding/onboarding-model.ts";

const labels = { reports: "Reports", integrations: "Integrations", settings: "Settings" };
const nav = () => ({
  dashboard: { id: "dashboard", label: "Dashboard", href: "/admin" },
  core: [
    { id: "sales", label: "Sales", items: [{ id: "orders", label: "Orders", href: "/admin/orders" }, { id: "hidden", label: "X", href: "/admin/x", hidden: true }] },
    { id: "empty", label: "Empty", items: [{ id: "gone", label: "Gone", href: "/admin/gone", hidden: true }] },
  ],
  reports: [{ id: "reports", label: "Reports", href: "/admin/reports" }],
  integrations: [{ id: "payments", label: "Payments", href: "/admin/payments" }, { id: "mcp", label: "AI & MCP", href: "/admin/mcp" }],
  settings: [
    { id: "billing", label: "Plan", href: "/admin/plan" },
    { id: "team", label: "Team", href: "/admin/team" },
    { id: "legal", label: "Legal", href: "/admin/legal" },
    { id: "settings", label: "Settings", href: "/admin/settings" },
  ],
});

test("groups follow the standard order and drop hidden/empty", () => {
  const groups = productNavGroups(nav(), labels);
  assert.deepEqual(groups.map((g) => g.section), ["dashboard", "core", "reports", "integrations", "settings"]);
  assert.equal(groups[0].label, undefined);
  assert.deepEqual(groups[1].items.map((i) => i.id), ["orders"]);
  assert.deepEqual(groups[3].items.map((i) => i.id), ["mcp", "payments"]);
  assert.deepEqual(groups[4].items.map((i) => i.id), ["settings", "legal", "team", "billing"]);
});

test("sortSettings puts unknown ids after branding", () => {
  const ids = sortSettings([{ id: "billing" }, { id: "x" }, { id: "branding" }, { id: "settings" }, { id: "domains" }]).map((i) => i.id);
  assert.deepEqual(ids, ["settings", "branding", "x", "domains", "billing"]);
});

test("active item: dashboard exact, others prefix, longest wins", () => {
  const groups = productNavGroups(nav(), labels);
  assert.equal(isNavActive({ href: "/admin", match: "exact" }, "/admin/orders"), false);
  assert.equal(activeNavId(groups, "/admin/"), "dashboard");
  assert.equal(activeNavId(groups, "/admin/orders/42?tab=1"), "orders");
  assert.equal(activeNavId(groups, "/elsewhere"), undefined);
});

test("mobile tabs default to the first four and honour ids", () => {
  const groups = productNavGroups(nav(), labels);
  assert.deepEqual(pickMobileTabs(groups).map((i) => i.id), ["dashboard", "orders", "reports", "mcp"]);
  assert.deepEqual(pickMobileTabs(groups, ["orders", "nope", "team"]).map((i) => i.id), ["orders", "team"]);
});

test("productNavProblems flags what breaks the standard", () => {
  assert.deepEqual(productNavProblems(nav()), []);
  const bad = nav();
  bad.integrations = [];
  bad.settings = [{ id: "team", label: "Team", href: "/t" }];
  bad.core[0].items.push({ id: "billing", label: "B", href: "/b" });
  const problems = productNavProblems(bad);
  assert.ok(problems.some((p) => p.includes('"settings"')));
  assert.ok(problems.some((p) => p.includes('"mcp"')));
  assert.ok(problems.some((p) => p.startsWith("core.sales")));
});

test("onboarding resumes at the first unhandled step", () => {
  const ids = [...PRODUCT_ONBOARDING_STEPS];
  assert.equal(onboardingResumeIndex(ids, { completed: [] }), 0);
  assert.equal(onboardingResumeIndex(ids, { completed: ["workspace"] }), 1);
  assert.equal(onboardingResumeIndex(ids, { completed: ["workspace", "business"], skipped: ["sample-data"] }), 3);
  assert.equal(onboardingResumeIndex(ids, { completed: ids }), ids.length - 1);
});

test("applyOnboardingAction mirrors the server", () => {
  let s = { completed: ["workspace"], skipped: [] };
  s = applyOnboardingAction(s, "sample-data", "skip");
  assert.deepEqual(s.skipped, ["sample-data"]);
  s = applyOnboardingAction(s, "sample-data", "complete");
  assert.deepEqual(s.skipped, []);
  assert.deepEqual(s.completed, ["workspace", "sample-data"]);
  s = applyOnboardingAction(s, "sample-data", "skip");
  assert.deepEqual(s.skipped, []);
  assert.equal(onboardingOpen(s), true);
  s = applyOnboardingAction(s, undefined, "finish", new Date("2026-10-13T00:00:00Z"));
  assert.equal(s.finishedAt, "2026-10-13T00:00:00.000Z");
  assert.equal(onboardingOpen(s), false);
  assert.equal(onboardingOpen({ completed: [], dismissed: true }), false);
  assert.deepEqual(onboardingProgress(PRODUCT_ONBOARDING_STEPS, { completed: ["workspace"], skipped: ["invite"] }), { done: 2, total: 5 });
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { canAcknowledge, canReopen, canResolve, countAlerts, filterAlerts, severityRank, sortAlerts, sourcesOf, urgentCount } from "../src/components/alerts/alerts-format.ts";

const a = (id, severity, status, createdAt, source = "api", title = id) => ({ id, title, severity, status, source, createdAt });
const list = [
  a("cpu", "medium", "open", 300, "db"),
  a("disk", "critical", "resolved", 100, "web"),
  a("login", "high", "open", 200, "auth", "Failed logins from 10.0.0.9"),
  a("cert", "low", "acknowledged", 400, "web"),
];

test("severityRank orders critical first", () => {
  assert.ok(severityRank("critical") < severityRank("high"));
  assert.ok(severityRank("low") < severityRank("info"));
});

test("filterAlerts by severity, status, source and query", () => {
  assert.deepEqual(filterAlerts(list, { severity: "high" }).map((x) => x.id), ["login"]);
  assert.deepEqual(filterAlerts(list, { status: "open" }).map((x) => x.id), ["cpu", "login"]);
  assert.deepEqual(filterAlerts(list, { source: "web" }).map((x) => x.id), ["disk", "cert"]);
  assert.deepEqual(filterAlerts(list, { query: "10.0.0.9" }).map((x) => x.id), ["login"]);
  assert.deepEqual(filterAlerts(list, { severity: "all", status: "all", source: "all", query: "  " }).length, 4);
  assert.deepEqual(filterAlerts(list, { query: "eu" }, (x) => (x.id === "cert" ? ["Europe"] : [])).map((x) => x.id), ["cert"]);
});

test("sortAlerts newest and by severity", () => {
  assert.deepEqual(sortAlerts(list, "newest").map((x) => x.id), ["cert", "cpu", "login", "disk"]);
  assert.deepEqual(sortAlerts(list, "severity").map((x) => x.id), ["login", "cpu", "cert", "disk"]);
});

test("countAlerts, sourcesOf and urgentCount", () => {
  const c = countAlerts(list);
  assert.equal(c.total, 4);
  assert.equal(c.bySeverity.critical, 1);
  assert.equal(c.byStatus.open, 2);
  assert.deepEqual(sourcesOf(list), ["api", "auth", "db", "web"].filter((s) => s !== "api"));
  assert.equal(urgentCount(list), 1);
});

test("which actions apply", () => {
  assert.ok(canAcknowledge("open") && !canAcknowledge("acknowledged"));
  assert.ok(canResolve("open") && canResolve("acknowledged") && !canResolve("resolved"));
  assert.ok(canReopen("resolved") && !canReopen("open"));
});

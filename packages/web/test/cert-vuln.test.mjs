import assert from "node:assert/strict";
import { test } from "node:test";
import { byExpiry, certStatus, certTone, certDaysLeft, isValidCertHost, summarizeCerts } from "../src/components/cert-monitor/cert-format.ts";
import { countBySeverity, isCveId, riskTone, topFindings, totalCount, trend } from "../src/components/vuln-report/vuln-format.ts";

const now = new Date("2026-06-01T12:00:00Z");

test("certDaysLeft rounds down and goes negative", () => {
  assert.equal(certDaysLeft("2026-07-01T12:00:00Z", now), 30);
  assert.equal(certDaysLeft("2026-06-01T20:00:00Z", now), 0);
  assert.equal(certDaysLeft("2026-05-30T12:00:00Z", now), -2);
  assert.equal(certDaysLeft("not a date", now), null);
});

test("certStatus and tone thresholds", () => {
  assert.equal(certStatus(31), "valid");
  assert.equal(certStatus(30), "expiring");
  assert.equal(certStatus(8), "expiring");
  assert.equal(certStatus(7), "critical");
  assert.equal(certStatus(0), "critical");
  assert.equal(certStatus(-1), "expired");
  assert.equal(certStatus(null), "error");
  assert.equal(certTone("valid"), "success");
  assert.equal(certTone("expiring"), "warning");
  assert.equal(certTone("expired"), "danger");
  assert.equal(certTone("error"), "neutral");
  assert.equal(certStatus(20, { warnDays: 14, criticalDays: 3 }), "valid");
});

test("byExpiry sorts soonest first, unknown last", () => {
  assert.deepEqual([null, 40, -2, 5].sort(byExpiry), [-2, 5, 40, null]);
});

test("summarizeCerts and host validation", () => {
  const s = summarizeCerts([90, 20, 3, -1, null]);
  assert.deepEqual(s, { total: 5, valid: 1, expiring: 1, critical: 1, expired: 1, error: 1 });
  assert.equal(isValidCertHost("app.example.com"), true);
  assert.equal(isValidCertHost("*.example.com"), true);
  assert.equal(isValidCertHost("localhost"), false);
  assert.equal(isValidCertHost("https://a.com"), false);
});

const f = (id, severity, cvss) => ({ id, severity, cvss });

test("counts and total", () => {
  const c = countBySeverity([f("A", "high"), f("B", "high"), f("C", "low")]);
  assert.deepEqual(c, { critical: 0, high: 2, medium: 0, low: 1 });
  assert.equal(totalCount(c), 3);
  assert.equal(totalCount({}), 0);
});

test("riskTone follows the worst severity", () => {
  assert.equal(riskTone({ critical: 1 }), "danger");
  assert.equal(riskTone({ high: 1 }), "danger");
  assert.equal(riskTone({ medium: 2 }), "warning");
  assert.equal(riskTone({ low: 2 }), "neutral");
  assert.equal(riskTone({}), "success");
});

test("topFindings orders by severity then CVSS and does not mutate", () => {
  const input = [f("L", "low", 2), f("H2", "high", 7.5), f("C", "critical", 9.8), f("H1", "high", 8.1)];
  const top = topFindings(input, 3);
  assert.deepEqual(
    top.map((x) => x.id),
    ["C", "H1", "H2"],
  );
  assert.equal(input[0].id, "L");
  assert.deepEqual(topFindings(input, 0), []);
});

test("isCveId and trend", () => {
  assert.equal(isCveId("CVE-2024-12345"), true);
  assert.equal(isCveId("CVE-24-1"), false);
  assert.equal(trend([{ counts: { high: 1 } }]), null);
  assert.equal(trend([{ counts: { high: 5 } }, { counts: { high: 2 } }]), -3);
});

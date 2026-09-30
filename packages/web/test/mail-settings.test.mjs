import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeDmarc, analyzeSpf, defaultSmtpPort, domainHealth, firstFailure, formatMegabytes, isEmail, isHostname, isLocalPart, quotaFraction, stepStates, validateAlias, validateMailbox, validateSmtp } from "../src/components/mail-settings/mail-format.ts";

test("smtp validation", () => {
  const ok = { host: "smtp.example.com", port: "587", encryption: "starttls", username: "", fromName: "", fromAddress: "a@example.com" };
  assert.deepEqual(validateSmtp(ok), []);
  assert.deepEqual(validateSmtp({ ...ok, host: "not a host", port: "0", fromAddress: "nope" }), ["host", "port", "fromAddress"]);
  assert.deepEqual(validateSmtp({ ...ok, port: "70000" }), ["port"]);
  assert.equal(defaultSmtpPort("tls"), 465);
  assert.equal(defaultSmtpPort("starttls"), 587);
  assert.equal(defaultSmtpPort("none"), 25);
  assert.equal(isHostname("192.0.2.10"), true);
  assert.equal(isHostname("300.1.1.1"), false);
  assert.equal(isEmail("a@b.co"), true);
  assert.equal(isEmail("a@b"), false);
});

test("test steps", () => {
  const steps = [{ id: "connect", ok: true }, { id: "tls", ok: true }, { id: "auth", ok: false, message: "535" }];
  assert.deepEqual(stepStates(steps), { connect: "pass", tls: "pass", auth: "fail", send: "skipped" });
  assert.equal(firstFailure(steps)?.id, "auth");
  assert.equal(firstFailure([{ id: "connect", ok: true }]), null);
});

test("domainHealth", () => {
  const pass = (kind) => ({ kind, status: "pass" });
  assert.equal(domainHealth([pass("spf"), pass("dkim"), pass("dmarc")]), "healthy");
  assert.equal(domainHealth([pass("spf"), pass("dkim")]), "critical");
  assert.equal(domainHealth([pass("spf"), pass("dkim"), { kind: "dmarc", status: "pending" }]), "attention");
  assert.equal(domainHealth([pass("spf"), pass("dkim"), { kind: "dmarc", status: "fail" }]), "critical");
});

test("spf and dmarc", () => {
  assert.deepEqual(analyzeSpf("v=spf1 include:_spf.example.com mx -all"), { valid: true, policy: "fail", lookups: 2 });
  assert.equal(analyzeSpf("v=spf1 +all").policy, "open");
  assert.equal(analyzeSpf("hello").valid, false);
  assert.deepEqual(analyzeDmarc("v=DMARC1; p=none; rua=mailto:d@example.com"), { valid: true, policy: "none", reportsTo: "d@example.com" });
  assert.equal(analyzeDmarc("v=DMARC1; p=bogus").valid, false);
});

test("mailboxes and aliases", () => {
  assert.deepEqual(validateMailbox({ local: "info", quotaMb: "1024", password: "longenough1" }), []);
  assert.deepEqual(validateMailbox({ local: ".bad", quotaMb: "0", password: "short" }), ["local", "quota", "password"]);
  assert.equal(isLocalPart("first.last"), true);
  assert.equal(isLocalPart("a..b"), false);
  assert.deepEqual(validateAlias({ source: "*", destination: "x@example.com" }), []);
  assert.deepEqual(validateAlias({ source: "a b", destination: "x" }), ["source", "destination"]);
  assert.equal(quotaFraction(50, 100), 0.5);
  assert.equal(quotaFraction(500, 100), 1);
  assert.equal(formatMegabytes(512), "512 MB");
  assert.equal(formatMegabytes(2048), "2 GB");
});

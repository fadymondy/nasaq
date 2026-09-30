import assert from "node:assert/strict";
import { test } from "node:test";
import { canForgetJob, canRetryJob, errorHeadline, isDisruptive, jobCounts, keyCoverage, parseSshPublicKey, serviceActionsFor, summarizeUpdates } from "../src/components/server-admin/server-admin-format.ts";

test("serviceActionsFor", () => {
  assert.deepEqual(serviceActionsFor({ state: "active", enabled: true }), ["restart", "reload", "stop", "disable"]);
  assert.deepEqual(serviceActionsFor({ state: "active", enabled: true, canReload: false }), ["restart", "stop", "disable"]);
  assert.deepEqual(serviceActionsFor({ state: "inactive", enabled: false }), ["start", "enable"]);
  assert.deepEqual(serviceActionsFor({ state: "activating", enabled: true }), ["stop"]);
  assert.equal(isDisruptive("restart"), true);
  assert.equal(isDisruptive("start"), false);
});

test("summarizeUpdates", () => {
  const s = summarizeUpdates([{ name: "a", kind: "security", sizeBytes: 10 }, { name: "b", kind: "regular" }]);
  assert.deepEqual(s, { total: 2, security: 1, kernel: 0, regular: 1, downloadBytes: 10 });
});

test("parseSshPublicKey", () => {
  const body = "AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl";
  const ok = parseSshPublicKey(`ssh-ed25519 ${body} me@laptop`);
  assert.equal(ok.ok, true);
  assert.equal(ok.type, "ed25519");
  assert.equal(ok.comment, "me@laptop");
  assert.equal(parseSshPublicKey("").problem, "empty");
  assert.equal(parseSshPublicKey("-----BEGIN OPENSSH PRIVATE KEY-----\nabc").problem, "private");
  assert.equal(parseSshPublicKey("hello").problem, "format");
  assert.equal(parseSshPublicKey(`foo-key ${body}`).problem, "type");
  assert.equal(parseSshPublicKey("ssh-rsa !!").problem, "body");
});

test("keyCoverage", () => {
  assert.equal(keyCoverage([], ["a", "b"]).level, "none");
  assert.equal(keyCoverage(["a"], ["a", "b"]).level, "some");
  assert.equal(keyCoverage(["a", "b", "z"], ["a", "b"]).level, "all");
});

test("jobs", () => {
  const c = jobCounts([{ status: "failed" }, { status: "failed" }, { status: "active" }]);
  assert.equal(c.failed, 2);
  assert.equal(canRetryJob("failed"), true);
  assert.equal(canRetryJob("completed"), false);
  assert.equal(canForgetJob("active"), false);
  assert.equal(errorHeadline("Boom\n at x"), "Boom");
  assert.equal(errorHeadline("x".repeat(100), 10).length, 10);
});

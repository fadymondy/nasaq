import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidHostname, normalizeHost, splitOverflow, summarizeDomains } from "../src/components/domains-manager/domains-format.ts";
import { isValidUpstream, parseHosts, tlsModeAllowsWebsockets, validateProxyHost } from "../src/components/proxy-hosts/proxy-format.ts";

test("normalizeHost strips scheme, path, case and dots", () => {
  assert.equal(normalizeHost("  HTTPS://App.Example.com/path?x=1 "), "app.example.com");
  assert.equal(normalizeHost("example.com."), "example.com");
});

test("isValidHostname", () => {
  assert.equal(isValidHostname("app.example.com"), true);
  assert.equal(isValidHostname("localhost"), false);
  assert.equal(isValidHostname("-bad.example.com"), false);
  assert.equal(isValidHostname("*.example.com"), false);
  assert.equal(isValidHostname("*.example.com", { wildcard: true }), true);
});

test("summarizeDomains counts per check", () => {
  const s = summarizeDomains([{ check: "verified" }, { check: "verified" }, { check: "failed" }, { check: "pending" }]);
  assert.equal(s.verified, 2);
  assert.equal(s.failed, 1);
});

test("splitOverflow never hides just one", () => {
  assert.deepEqual(splitOverflow([1, 2, 3], 3), { shown: [1, 2, 3], hidden: [] });
  assert.deepEqual(splitOverflow([1, 2, 3, 4], 3), { shown: [1, 2, 3, 4], hidden: [] });
  const r = splitOverflow([1, 2, 3, 4, 5, 6], 3);
  assert.deepEqual(r.shown, [1, 2, 3]);
  assert.deepEqual(r.hidden, [4, 5, 6]);
});

test("isValidUpstream", () => {
  assert.equal(isValidUpstream("http://127.0.0.1:3000"), true);
  assert.equal(isValidUpstream("127.0.0.1:3000"), false);
  assert.equal(isValidUpstream("http://app:99999"), false);
  assert.equal(isValidUpstream("https://app.internal/api"), true);
  assert.equal(isValidUpstream(""), false);
  assert.equal(isValidUpstream("no spaces allowed"), false);
});

test("parseHosts splits on commas, spaces and lines", () => {
  assert.deepEqual(parseHosts("a.com, b.com\nc.com  A.com"), ["a.com", "b.com", "c.com"]);
});

test("validateProxyHost", () => {
  assert.deepEqual(validateProxyHost({ hosts: ["a.com"], upstream: "http://127.0.0.1:80" }), []);
  assert.deepEqual(validateProxyHost({ hosts: [], upstream: "" }).sort(), ["hosts", "upstream"]);
});

test("passthrough disables websockets toggle", () => {
  assert.equal(tlsModeAllowsWebsockets("passthrough"), false);
  assert.equal(tlsModeAllowsWebsockets("auto"), true);
});

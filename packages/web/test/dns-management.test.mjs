import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTtl, fqdn, isHostname, isIPv4, isIPv6, relativeName, validateRecord } from "../src/components/dns-management/dns-format.ts";

const zone = "example.com";

test("isIPv4", () => {
  assert.ok(isIPv4("203.0.113.10"));
  assert.ok(!isIPv4("256.1.1.1"));
  assert.ok(!isIPv4("1.2.3"));
  assert.ok(!isIPv4("01.2.3.4"));
});

test("isIPv6", () => {
  assert.ok(isIPv6("2001:db8::1"));
  assert.ok(isIPv6("::1"));
  assert.ok(isIPv6("2001:0db8:0000:0000:0000:0000:0000:0001"));
  assert.ok(!isIPv6("2001:db8:::1"));
  assert.ok(!isIPv6("2001:db8"));
  assert.ok(!isIPv6("12345::1"));
  assert.ok(!isIPv6("1.2.3.4"));
});

test("isHostname", () => {
  assert.ok(isHostname("mail.example.com"));
  assert.ok(isHostname("mail.example.com."));
  assert.ok(!isHostname("-bad.example.com"));
  assert.ok(!isHostname("no spaces.com"));
  assert.ok(!isHostname(""));
});

test("relativeName and fqdn", () => {
  assert.equal(relativeName("example.com", zone), "@");
  assert.equal(relativeName("", zone), "@");
  assert.equal(relativeName("WWW.example.com.", zone), "www");
  assert.equal(relativeName("api", zone), "api");
  assert.equal(fqdn("@", zone), "example.com");
  assert.equal(fqdn("api", zone), "api.example.com");
});

test("formatTtl", () => {
  assert.equal(formatTtl(1), "Auto");
  assert.equal(formatTtl(45), "45 sec");
  assert.equal(formatTtl(300), "5 min");
  assert.equal(formatTtl(3600), "1 hour");
  assert.equal(formatTtl(14_400), "4 hours");
  assert.equal(formatTtl(86_400), "1 day");
});

const existing = [
  { id: "1", type: "A", name: "@", content: "203.0.113.10", ttl: 1 },
  { id: "2", type: "CNAME", name: "www", content: "example.com", ttl: 1 },
  { id: "3", type: "MX", name: "@", content: "mail.example.com", ttl: 3600, priority: 10 },
];

test("validateRecord accepts good records", () => {
  assert.deepEqual(validateRecord({ type: "A", name: "api", content: "203.0.113.11", ttl: 300 }, zone, existing), {});
  assert.deepEqual(validateRecord({ type: "MX", name: "@", content: "mail2.example.com", ttl: 3600, priority: 20 }, zone, existing), {});
});

test("validateRecord checks value against type", () => {
  assert.equal(validateRecord({ type: "A", name: "x", content: "nope", ttl: 1 }, zone).content, "ipv4");
  assert.equal(validateRecord({ type: "AAAA", name: "x", content: "1.2.3.4", ttl: 1 }, zone).content, "ipv6");
  assert.equal(validateRecord({ type: "CNAME", name: "x", content: "not a host", ttl: 1 }, zone).content, "hostname");
  assert.equal(validateRecord({ type: "TXT", name: "x", content: "", ttl: 1 }, zone).content, "content");
  assert.equal(validateRecord({ type: "MX", name: "@", content: "m.example.com", ttl: 1 }, zone).priority, "priority");
  assert.equal(validateRecord({ type: "A", name: "x", content: "1.2.3.4", ttl: 5 }, zone).ttl, "ttl");
});

test("validateRecord catches CNAME conflicts and duplicates", () => {
  assert.equal(validateRecord({ type: "CNAME", name: "@", content: "a.example.com", ttl: 1 }, zone).name, "cnameApex");
  assert.equal(validateRecord({ type: "CNAME", name: "www", content: "b.example.com", ttl: 1 }, zone, existing).name, "conflict");
  assert.equal(validateRecord({ type: "A", name: "www", content: "1.2.3.4", ttl: 1 }, zone, existing).name, "conflict");
  assert.equal(validateRecord({ type: "A", name: "@", content: "203.0.113.10", ttl: 1 }, zone, existing).content, "duplicate");
  // editing a record does not conflict with itself
  assert.deepEqual(validateRecord({ type: "A", name: "@", content: "203.0.113.10", ttl: 300 }, zone, existing, "1"), {});
});

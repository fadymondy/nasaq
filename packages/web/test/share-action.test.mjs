import assert from "node:assert/strict";
import test from "node:test";
import { expiryToDate, isEmail, mailtoLink, parseEmails, withExpiry } from "../src/components/share-action/share-helpers.ts";

test("expiryToDate adds days and returns null for never", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(expiryToDate("never", now), null);
  assert.equal(expiryToDate("1d", now).toISOString(), "2026-01-02T00:00:00.000Z");
  assert.equal(expiryToDate("7d", now).toISOString(), "2026-01-08T00:00:00.000Z");
  assert.equal(expiryToDate("30d", now).toISOString(), "2026-01-31T00:00:00.000Z");
});

test("isEmail accepts addresses and rejects junk", () => {
  assert.ok(isEmail("sara@example.com"));
  assert.ok(isEmail(" a.b+c@sub.example.co "));
  for (const bad of ["", "sara", "sara@", "@example.com", "a b@example.com", "a@b", "a@@b.com"]) assert.equal(isEmail(bad), false, bad);
});

test("parseEmails splits, lower-cases and de-duplicates", () => {
  assert.deepEqual(parseEmails("A@x.com, b@y.com; a@x.com\nc@z.com"), ["a@x.com", "b@y.com", "c@z.com"]);
  assert.deepEqual(parseEmails("  "), []);
});

test("withExpiry sets a query parameter only when it expires", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(withExpiry("https://x.dev/a", "never", now), "https://x.dev/a");
  assert.equal(new URL(withExpiry("https://x.dev/a?b=1", "1d", now)).searchParams.get("expires"), "2026-01-02T00:00:00.000Z");
  assert.equal(withExpiry("not a url", "1d", now), "not a url");
});

test("mailtoLink encodes subject and body", () => {
  const link = mailtoLink("https://x.dev/a?b=1", "Q3 plan", "Have a look");
  assert.ok(link.startsWith("mailto:?subject=Q3%20plan&body="));
  assert.ok(link.includes(encodeURIComponent("https://x.dev/a?b=1")));
});

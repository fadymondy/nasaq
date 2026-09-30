import assert from "node:assert/strict";
import { test } from "node:test";
import { highestRisk, isRepositoryUrl, pickFeatured, sortPermissions, validateDraft } from "../src/components/marketplace/marketplace-format.ts";

const ok = { name: "Mail sync", summary: "Sync mail", description: "", category: "comms", version: "1.0.0", repository: "https://github.com/acme/mail", price: 0, tags: [], permissions: [] };

test("validateDraft accepts a complete draft", () => {
  assert.deepEqual(validateDraft(ok), {});
});

test("validateDraft flags each field", () => {
  const e = validateDraft({ ...ok, name: " ", summary: "x".repeat(200), category: "", version: "v1", repository: "github.com/a/b", price: -1 });
  assert.deepEqual(e, { name: "required", summary: "tooLong", category: "required", version: "invalid", repository: "invalid", price: "invalid" });
  assert.equal(validateDraft({ ...ok, version: "1.2.3-beta.1" }).version, undefined);
});

test("isRepositoryUrl", () => {
  assert.ok(isRepositoryUrl("https://github.com/acme/mail"));
  assert.ok(isRepositoryUrl("https://gitlab.com/acme/mail/"));
  assert.ok(!isRepositoryUrl("https://github.com/acme"));
  assert.ok(!isRepositoryUrl("http://github.com/acme/mail"));
});

test("highestRisk and sortPermissions", () => {
  assert.equal(highestRisk([]), null);
  assert.equal(highestRisk([{}, { risk: "medium" }]), "medium");
  assert.equal(highestRisk([{ risk: "high" }, { risk: "low" }]), "high");
  const out = sortPermissions([{ id: "a" }, { id: "b", risk: "high" }, { id: "c", risk: "medium" }, { id: "d", risk: "high" }]);
  assert.deepEqual(out.map((p) => p.id), ["b", "d", "c", "a"]);
});

test("pickFeatured", () => {
  const items = [{ id: 1, featured: true, installs: 5 }, { id: 2, installs: 99 }, { id: 3, featured: true, installs: 50 }, { id: 4, featured: true }];
  assert.deepEqual(pickFeatured(items, 2).map((i) => i.id), [3, 1]);
});

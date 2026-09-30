import assert from "node:assert/strict";
import test from "node:test";
import { legalHashTarget, legalSectionUrl, resolveLegalSections } from "../src/components/legal-page/legal-model.ts";

test("sections get slugs, numbers and unique ids", () => {
  const r = resolveLegalSections([{ title: "Data we collect" }, { title: "Data we collect" }, { id: "cookies", title: "Cookies & tracking" }]);
  assert.deepEqual(r.map((x) => x.id), ["data-we-collect", "data-we-collect-2", "cookies"]);
  assert.deepEqual(r.map((x) => x.number), [1, 2, 3]);
});

test("Arabic titles keep their letters in the anchor", () => {
  const [a] = resolveLegalSections([{ title: "البيانات التي نجمعها" }]);
  assert.equal(a.id, "البيانات-التي-نجمعها");
});

test("an explicit id wins over the title", () => {
  assert.equal(resolveLegalSections([{ id: "privacy", title: "Anything" }])[0].id, "privacy");
});

test("legalHashTarget matches raw and percent-encoded hashes", () => {
  const ids = ["cookies", "البيانات-التي-نجمعها"];
  assert.equal(legalHashTarget("#cookies", ids), "cookies");
  assert.equal(legalHashTarget(`#${encodeURIComponent("البيانات-التي-نجمعها")}`, ids), "البيانات-التي-نجمعها");
  assert.equal(legalHashTarget("#missing", ids), undefined);
  assert.equal(legalHashTarget("", ids), undefined);
  assert.equal(legalHashTarget("#%E0%A4%A", ids), undefined);
});

test("legalSectionUrl replaces any existing hash", () => {
  assert.equal(legalSectionUrl("https://x.dev/terms#old", "cookies"), "https://x.dev/terms#cookies");
});

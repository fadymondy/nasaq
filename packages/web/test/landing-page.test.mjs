import assert from "node:assert/strict";
import { test } from "node:test";
import { createSection, duplicateSection, isSafeHref, isValidSlug, moveSection, patchSection, publishBlockers, slugify } from "../src/components/landing-page-editor/landing-page.ts";

const page = (over = {}) => ({ title: "T", slug: "launch", seoTitle: "", seoDescription: "", dir: "ltr", status: "draft", sections: [createSection("hero", "en")], ...over });

test("moveSection moves one step and refuses at the ends", () => {
  assert.deepEqual(moveSection(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepEqual(moveSection(["a", "b", "c"], 1, 1), ["a", "c", "b"]);
  const same = ["a", "b"];
  assert.equal(moveSection(same, 0, -1), same);
  assert.equal(moveSection(same, 1, 1), same);
});

test("createSection gives typed placeholder content in both languages with unique ids", () => {
  const a = createSection("features", "en");
  const b = createSection("features", "ar");
  assert.equal(a.type, "features");
  assert.equal(a.visible, true);
  assert.equal(a.data.items.length, 3);
  assert.notEqual(a.id, b.id);
  assert.match(b.data.title, /[؀-ۿ]/);
  assert.equal(new Set(a.data.items.map((i) => i.id)).size, 3);
});

test("patchSection merges into one section only", () => {
  const [x, y] = [createSection("cta", "en"), createSection("cta", "en")];
  const next = patchSection([x, y], y.id, { title: "New" });
  assert.equal(next[0].data.title, x.data.title);
  assert.equal(next[1].data.title, "New");
  assert.equal(next[1].data.body, y.data.body);
});

test("duplicateSection copies content with new ids", () => {
  const s = createSection("faq", "en");
  const d = duplicateSection(s);
  assert.notEqual(d.id, s.id);
  assert.equal(d.data.title, s.data.title);
  assert.notEqual(d.data.items[0].id, s.data.items[0].id);
});

test("slug rules", () => {
  assert.equal(slugify("  Zekra Launch_Page! "), "zekra-launch-page");
  assert.equal(slugify("مرحبا"), "");
  assert.equal(isValidSlug("zekra-launch"), true);
  assert.equal(isValidSlug("Zekra"), false);
  assert.equal(isValidSlug("a--b"), false);
  assert.equal(isValidSlug(""), false);
});

test("isSafeHref refuses script-like targets", () => {
  for (const ok of ["https://a.b", "/signup", "#faq", "mailto:a@b.c", "tel:+1"]) assert.equal(isSafeHref(ok), true, ok);
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "www.example.com", ""]) assert.equal(isSafeHref(bad), false, bad);
});

test("publishBlockers", () => {
  assert.deepEqual(publishBlockers(page()), []);
  assert.deepEqual(publishBlockers(page({ title: " " })), ["title"]);
  assert.deepEqual(publishBlockers(page({ slug: "Bad Slug" })), ["slug"]);
  assert.deepEqual(publishBlockers(page({ sections: [] })), ["sections"]);
  const hidden = { ...createSection("text", "en"), visible: false };
  assert.deepEqual(publishBlockers(page({ sections: [hidden] })), ["sections"]);
  const bad = createSection("cta", "en");
  bad.data.buttonHref = "javascript:x";
  assert.deepEqual(publishBlockers(page({ sections: [bad] })), ["href"]);
});

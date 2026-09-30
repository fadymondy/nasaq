import assert from "node:assert/strict";
import test from "node:test";
import { slugProblem, slugify } from "../src/components/workspace-settings/workspace-slug.ts";

test("slugify folds accents, punctuation and case", () => {
  assert.equal(slugify("Sahab Studio!"), "sahab-studio");
  assert.equal(slugify("  Café  déjà--vu "), "cafe-deja-vu");
  assert.equal(slugify("Team 42 / R&D"), "team-42-r-d");
});

test("slugify gives nothing for a name with no Latin letters", () => {
  assert.equal(slugify("سحاب للتصميم"), "");
  assert.equal(slugify("سحاب Studio"), "studio");
});

test("slugify caps the length without a trailing dash", () => {
  const s = slugify(`${"a".repeat(39)} b`);
  assert.ok(s.length <= 40);
  assert.ok(!s.endsWith("-"));
});

test("slugProblem names what is wrong", () => {
  assert.equal(slugProblem(""), "empty");
  assert.equal(slugProblem("ab"), "short");
  assert.equal(slugProblem("a".repeat(41)), "long");
  assert.equal(slugProblem("-abc"), "format");
  assert.equal(slugProblem("Abc"), "format");
  assert.equal(slugProblem("abc-def"), null);
});

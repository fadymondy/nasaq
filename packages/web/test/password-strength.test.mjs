import assert from "node:assert/strict";
import { test } from "node:test";
import { estimatePasswordStrength } from "../src/components/password-input/strength.ts";

test("empty, short and repetitive passwords score 0", () => {
  assert.equal(estimatePasswordStrength(""), 0);
  assert.equal(estimatePasswordStrength("abc12"), 0);
  assert.equal(estimatePasswordStrength("aaaaaaaaaaaa"), 0);
  assert.equal(estimatePasswordStrength("abababababab"), 0);
});

test("length and character classes raise the score", () => {
  assert.equal(estimatePasswordStrength("abcdefgh"), 1);
  assert.equal(estimatePasswordStrength("abcdefG1"), 2);
  assert.equal(estimatePasswordStrength("abcdefgH12"), 3);
  assert.equal(estimatePasswordStrength("abcdefgH12!x"), 4);
});

test("a long passphrase reaches the top", () => {
  assert.equal(estimatePasswordStrength("Correct Horse Battery 9"), 4);
});

test("Arabic letters count as a class", () => {
  assert.equal(estimatePasswordStrength("كلمةسرقوية12"), 2);
  assert.equal(estimatePasswordStrength("كلمةسرقوية12!"), 3);
});

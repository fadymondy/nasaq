import assert from "node:assert/strict";
import { test } from "node:test";
import { computePasswordRules, computeRuleScore, estimatePasswordStrength, passwordMeetsPolicy } from "../src/components/password-input/strength.ts";

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

test("computePasswordRules checks length then each required class", () => {
  const rules = computePasswordRules("abcdefgH1", { minLength: 8 });
  assert.deepEqual(
    rules.map((r) => [r.id, r.met]),
    [["length", true], ["upper", true], ["lower", true], ["digit", true], ["symbol", false]],
  );
  assert.equal(rules[0].min, 8);
  assert.deepEqual(computePasswordRules("ab", { require: ["digit"] }).map((r) => r.id), ["length", "digit"]);
  assert.equal(computePasswordRules("كلمة-مرور-طويلة")[0].met, true);
});

test("computeRuleScore stays 0 until the length passes", () => {
  assert.equal(computeRuleScore(computePasswordRules("A1!")), 0);
  assert.equal(computeRuleScore(computePasswordRules("aaaaaaaaaaaa")), 2);
  assert.equal(computeRuleScore(computePasswordRules("aaaaaaaaaaA1")), 4);
  assert.equal(computeRuleScore(computePasswordRules("aaaaaaaaaaA1!")), 4);
});

test("passwordMeetsPolicy needs every rule", () => {
  assert.equal(passwordMeetsPolicy(computePasswordRules("aaaaaaaaaaA1")), false);
  assert.equal(passwordMeetsPolicy(computePasswordRules("aaaaaaaaaaA1!")), true);
  assert.equal(passwordMeetsPolicy([]), true);
});

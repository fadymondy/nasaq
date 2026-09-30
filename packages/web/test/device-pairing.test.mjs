import assert from "node:assert/strict";
import { test } from "node:test";
import { codeSecondsLeft, effectiveCodeStatus, formatUserCode, isUserCodeComplete, normalizeUserCode, USER_CODE_ALPHABET } from "../src/components/device-pairing/device-code.ts";

test("normalizeUserCode strips separators and uppercases", () => {
  assert.equal(normalizeUserCode("wdjb-mjht"), "WDJBMJHT");
  assert.equal(normalizeUserCode(" wd jb_mj.ht "), "WDJBMJHT");
});

test("formatUserCode groups by four", () => {
  assert.equal(formatUserCode("wdjbmjht"), "WDJB-MJHT");
  assert.equal(formatUserCode("WDJB"), "WDJB");
  assert.equal(formatUserCode("abcdefghij", 5), "ABCDE-FGHIJ");
});

test("isUserCodeComplete", () => {
  assert.equal(isUserCodeComplete("WDJB-MJHT"), true);
  assert.equal(isUserCodeComplete("WDJB-MJH"), false);
  assert.equal(isUserCodeComplete("ABC", 3), true);
});

test("codeSecondsLeft and effectiveCodeStatus", () => {
  const now = 1_000_000;
  assert.equal(codeSecondsLeft(now + 90_500, now), 91);
  assert.equal(codeSecondsLeft(now - 5000, now), 0);
  assert.equal(effectiveCodeStatus("pending", now - 1, now), "expired");
  assert.equal(effectiveCodeStatus("pending", now + 5000, now), "pending");
  assert.equal(effectiveCodeStatus("approved", now - 1, now), "approved");
  assert.equal(effectiveCodeStatus("pending", undefined, now), "pending");
});

test("the alphabet has no vowels", () => {
  assert.doesNotMatch(USER_CODE_ALPHABET, /[AEIOU]/);
});

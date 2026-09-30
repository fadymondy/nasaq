import assert from "node:assert/strict";
import { test } from "node:test";
import { cardDigits, detectBrand, formatCardNumber, formatExpiry, isCardNumberValid, isCvcValid, isExpiryValid, lastFour, luhn } from "../src/components/checkout-steps/card-format.ts";

test("detectBrand", () => {
  assert.equal(detectBrand("4242 4242 4242 4242"), "visa");
  assert.equal(detectBrand("5555555555554444"), "mastercard");
  assert.equal(detectBrand("378282246310005"), "amex");
  assert.equal(detectBrand("4464040000000007"), "mada");
  assert.equal(detectBrand("9"), "unknown");
});

test("formatCardNumber groups by brand", () => {
  assert.equal(formatCardNumber("4242424242424242"), "4242 4242 4242 4242");
  assert.equal(formatCardNumber("378282246310005"), "3782 822463 10005");
  assert.equal(cardDigits("٤٢٤٢ 4242"), "42424242");
});

test("luhn and full validity", () => {
  assert.equal(luhn("4242424242424242"), true);
  assert.equal(luhn("4242424242424241"), false);
  assert.equal(isCardNumberValid("378282246310005"), true);
  assert.equal(isCardNumberValid("4242"), false);
  assert.equal(lastFour("4242 4242 4242 1881"), "1881");
});

test("expiry and cvc", () => {
  assert.equal(formatExpiry("1226"), "12/26");
  assert.equal(formatExpiry("3"), "03");
  const now = new Date(2026, 8, 29);
  assert.equal(isExpiryValid("09/26", now), true);
  assert.equal(isExpiryValid("08/26", now), false);
  assert.equal(isExpiryValid("13/30", now), false);
  assert.equal(isCvcValid("123", "visa"), true);
  assert.equal(isCvcValid("123", "amex"), false);
  assert.equal(isCvcValid("1234", "amex"), true);
});

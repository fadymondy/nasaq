import assert from "node:assert/strict";
import { test } from "node:test";
import { groupSecret, normalizeSecret, parseOtpAuthUri, recoveryCodesText } from "../src/components/two-factor-setup/format.ts";

test("groupSecret splits into fours and normalises", () => {
  assert.equal(groupSecret("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP");
  assert.equal(groupSecret("jbsw y3dp-ehpk 3pxp"), "JBSW Y3DP EHPK 3PXP");
  assert.equal(groupSecret("ABCDEFG"), "ABCD EFG");
  assert.equal(groupSecret(""), "");
  assert.equal(groupSecret("ABCDEF", 3), "ABC DEF");
});

test("normalizeSecret strips spaces and dashes", () => {
  assert.equal(normalizeSecret("abcd efgh-ijkl"), "ABCDEFGHIJKL");
});

test("parseOtpAuthUri reads secret, issuer and account", () => {
  const info = parseOtpAuthUri("otpauth://totp/Nasaq:fady%40example.com?secret=jbswy3dpehpk3pxp&issuer=Nasaq&digits=6");
  assert.deepEqual(info, { secret: "JBSWY3DPEHPK3PXP", issuer: "Nasaq", account: "fady@example.com" });
});

test("parseOtpAuthUri falls back to the label issuer and rejects other input", () => {
  assert.equal(parseOtpAuthUri("otpauth://totp/Acme:me?secret=ABCD")?.issuer, "Acme");
  assert.equal(parseOtpAuthUri("otpauth://totp/me?secret=ABCD")?.account, "me");
  assert.equal(parseOtpAuthUri("https://example.com?secret=ABCD"), null);
  assert.equal(parseOtpAuthUri("otpauth://totp/me"), null);
  assert.equal(parseOtpAuthUri("not a url"), null);
});

test("recoveryCodesText is one code per line", () => {
  assert.equal(recoveryCodesText(["a-1", "b-2"]), "a-1\nb-2\n");
  assert.equal(recoveryCodesText(["a-1"], "Nasaq"), "Nasaq\n\na-1\n");
});

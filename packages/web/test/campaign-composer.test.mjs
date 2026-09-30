import assert from "node:assert/strict";
import test from "node:test";
import { campaignPlainText, campaignProgress, campaignUnknownVariables, validateCampaign } from "../src/components/campaign-composer/campaign-logic.ts";

const ok = { channel: "email", audienceId: "a", audienceCount: 10, subject: "Hi", body: "<p>Hello {{name}}</p>", knownVariables: ["name"] };

test("plain text strips tags and entities", () => {
  assert.equal(campaignPlainText("<p>a &amp; b</p><p>c</p>"), "a & b\nc");
  assert.equal(campaignPlainText("<p></p>"), "");
  assert.equal(campaignPlainText("<p>&nbsp;</p>"), "");
});

test("a ready campaign has no issues", () => {
  assert.deepEqual(validateCampaign(ok), []);
});

test("each missing piece is reported", () => {
  assert.deepEqual(validateCampaign({ ...ok, audienceId: null }), ["audience-none"]);
  assert.deepEqual(validateCampaign({ ...ok, audienceCount: 0 }), ["audience-empty"]);
  assert.deepEqual(validateCampaign({ ...ok, audienceCount: null }), []);
  assert.deepEqual(validateCampaign({ ...ok, subject: "  " }), ["subject-empty"]);
  assert.deepEqual(validateCampaign({ ...ok, body: "<p></p>" }), ["body-empty"]);
  assert.deepEqual(validateCampaign({ ...ok, body: "<p>{{oops}}</p>" }), ["variable-unknown"]);
});

test("whatsapp has no subject and a length limit", () => {
  assert.deepEqual(validateCampaign({ ...ok, channel: "whatsapp", subject: "", body: "hello" }), []);
  assert.deepEqual(validateCampaign({ ...ok, channel: "whatsapp", body: "x".repeat(1025) }), ["body-too-long"]);
});

test("unknown variables", () => {
  assert.deepEqual(campaignUnknownVariables("{{a}} {{b}} {{a}} {{ name }}", ["name"]), ["a", "b"]);
});

test("progress", () => {
  assert.deepEqual(campaignProgress({ sent: 50, failed: 0, total: 200 }), { percent: 25, state: "sending", remaining: 150 });
  assert.deepEqual(campaignProgress({ sent: 200, failed: 0, total: 200 }), { percent: 100, state: "done", remaining: 0 });
  assert.deepEqual(campaignProgress({ sent: 195, failed: 5, total: 200 }), { percent: 100, state: "partial", remaining: 0 });
  assert.deepEqual(campaignProgress({ sent: 0, failed: 0, total: 0 }), { percent: 0, state: "done", remaining: 0 });
  assert.equal(campaignProgress({ sent: 500, failed: 0, total: 200 }).percent, 100);
});

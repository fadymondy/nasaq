import assert from "node:assert/strict";
import test from "node:test";
import { canConvertLead, canMoveLead, classifyLeadSource, leadAttributionEntries, leadHost, leadPipelineStates, leadStatusCounts } from "../src/components/leads-inbox/leads-inbox-logic.ts";

test("host", () => {
  assert.equal(leadHost("https://www.google.com/search?q=x"), "google.com");
  assert.equal(leadHost("example.org/page"), "example.org");
  assert.equal(leadHost(""), "");
});

test("a gclid is paid search whatever else it says", () => {
  assert.deepEqual(classifyLeadSource({ gclid: "abc", utmSource: "newsletter" }), { kind: "paid", name: "Google Ads", campaign: undefined });
});

test("classifies the usual sources", () => {
  assert.equal(classifyLeadSource({ utmSource: "linkedin", utmMedium: "cpc", utmCampaign: "q3" }).kind, "paid");
  assert.equal(classifyLeadSource({ utmSource: "linkedin", utmMedium: "social" }).kind, "social");
  assert.equal(classifyLeadSource({ utmSource: "newsletter", utmMedium: "email" }).kind, "email");
  assert.equal(classifyLeadSource({ referrer: "https://www.google.com/" }).kind, "organic");
  assert.equal(classifyLeadSource({ referrer: "https://www.instagram.com/" }).kind, "social");
  assert.deepEqual(classifyLeadSource({ referrer: "https://blog.partner.io/post" }), { kind: "referral", name: "blog.partner.io", campaign: undefined });
  assert.deepEqual(classifyLeadSource({}), { kind: "direct", name: "", campaign: undefined });
  assert.equal(classifyLeadSource(undefined).kind, "direct");
  assert.equal(classifyLeadSource({ utmSource: "q3", utmCampaign: "launch" }).campaign, "launch");
});

test("attribution entries skip blanks and keep the reading order", () => {
  assert.deepEqual(leadAttributionEntries({ landingPage: "/pricing", utmSource: "x", utmMedium: " " }), [
    { key: "utmSource", value: "x" },
    { key: "landingPage", value: "/pricing" },
  ]);
});

test("counts, moves and conversion rules", () => {
  const c = leadStatusCounts([{ status: "new" }, { status: "new" }, { status: "spam" }]);
  assert.deepEqual(c, { all: 3, new: 2, contacted: 0, qualified: 0, converted: 0, spam: 1 });
  assert.equal(canMoveLead("new", "qualified"), true);
  assert.equal(canMoveLead("new", "converted"), false);
  assert.equal(canMoveLead("converted", "new"), false);
  assert.equal(canMoveLead("spam", "new"), true);
  assert.equal(canMoveLead("new", "new"), false);
  assert.equal(canConvertLead("qualified"), true);
  assert.equal(canConvertLead("spam"), false);
  assert.equal(canConvertLead("converted"), false);
});

test("pipeline states", () => {
  assert.deepEqual(leadPipelineStates("contacted").map((s) => s.state), ["done", "current", "todo", "todo"]);
  assert.deepEqual(leadPipelineStates("spam").map((s) => s.state), ["todo", "todo", "todo", "todo"]);
});

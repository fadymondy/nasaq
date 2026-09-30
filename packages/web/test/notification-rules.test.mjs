import assert from "node:assert/strict";
import test from "node:test";
import { capProblem, channelState, DEFAULT_PREFS, destinationProblem, effectiveOn, isQuietNow, nextDigest, quietMinutes, setCell, setChannel } from "../src/components/notification-preferences/notification-rules.ts";

const kinds = [{ id: "comment", label: "Comments" }, { id: "security", label: "Security", locked: ["email"] }, { id: "billing", label: "Billing" }];

test("setCell and setChannel respect locked cells", () => {
  let p = setCell(DEFAULT_PREFS, kinds[0], "push", true);
  assert.equal(p.matrix.comment.push, true);
  assert.equal(DEFAULT_PREFS.matrix.comment, undefined);
  assert.equal(setCell(p, kinds[1], "email", false), p);
  p = setChannel(p, kinds, "email", true);
  assert.equal(p.matrix.security, undefined);
  assert.equal(p.matrix.billing.email, true);
  assert.equal(effectiveOn(p, kinds[1], "email"), true);
});

test("channelState ignores locked kinds", () => {
  assert.equal(channelState(DEFAULT_PREFS, kinds, "email"), "none");
  let p = setCell(DEFAULT_PREFS, kinds[0], "email", true);
  assert.equal(channelState(p, kinds, "email"), "some");
  p = setCell(p, kinds[2], "email", true);
  assert.equal(channelState(p, kinds, "email"), "all");
});

test("quiet hours cross midnight", () => {
  const q = { enabled: true, from: "22:00", to: "07:00" };
  assert.equal(quietMinutes(q), 9 * 60);
  assert.equal(isQuietNow(q, new Date(2026, 0, 1, 23, 30)), true);
  assert.equal(isQuietNow(q, new Date(2026, 0, 1, 6, 59)), true);
  assert.equal(isQuietNow(q, new Date(2026, 0, 1, 7, 0)), false);
  assert.equal(isQuietNow(q, new Date(2026, 0, 1, 12, 0)), false);
  assert.equal(isQuietNow({ ...q, enabled: false }, new Date(2026, 0, 1, 23, 30)), false);
  assert.equal(isQuietNow({ enabled: true, from: "09:00", to: "17:00" }, new Date(2026, 0, 1, 10, 0)), true);
  assert.equal(quietMinutes({ from: "08:00", to: "08:00" }), 0);
});

test("nextDigest daily and weekly", () => {
  const now = new Date(2026, 2, 11, 9, 0); // a Wednesday
  const daily = nextDigest({ enabled: true, frequency: "daily", time: "08:00", day: 1 }, now);
  assert.equal(daily.getDate(), 12);
  assert.equal(nextDigest({ enabled: true, frequency: "daily", time: "18:00", day: 1 }, now).getDate(), 11);
  const weekly = nextDigest({ enabled: true, frequency: "weekly", time: "08:00", day: 1 }, now);
  assert.equal(weekly.getDay(), 1);
  assert.equal(weekly.getDate(), 16);
  assert.equal(nextDigest({ enabled: false, frequency: "daily", time: "08:00", day: 1 }, now), null);
});

test("cap and destination validation", () => {
  assert.equal(capProblem(""), null);
  assert.equal(capProblem("20"), null);
  assert.equal(capProblem("0"), "format");
  assert.equal(capProblem("1.5"), "format");
  assert.equal(destinationProblem("email", "a@b.co"), null);
  assert.equal(destinationProblem("email", "nope"), "email");
  assert.equal(destinationProblem("webhook", "https://hooks.example.com/x"), null);
  assert.equal(destinationProblem("webhook", "http://hooks.example.com/x"), "https");
  assert.equal(destinationProblem("webhook", "hooks"), "url");
  assert.equal(destinationProblem("webhook", " "), "empty");
});

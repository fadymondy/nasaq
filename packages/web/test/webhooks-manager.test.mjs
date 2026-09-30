import assert from "node:assert/strict";
import { test } from "node:test";
import { canReplay, deliveryStats, deliveryStatus, groupEvents, groupState, isSourceStale, maskSecret, pollUnit, prettyJson, setEvents, validateEndpoint, validateEndpointUrl, verifySnippet } from "../src/components/webhooks-manager/webhooks-format.ts";

test("validateEndpointUrl", () => {
  assert.equal(validateEndpointUrl("https://example.com/hook").ok, true);
  assert.equal(validateEndpointUrl("http://localhost:3000/hook").ok, true);
  assert.equal(validateEndpointUrl("").problem, "empty");
  assert.equal(validateEndpointUrl("example.com").problem, "invalid");
  assert.equal(validateEndpointUrl("http://example.com").problem, "insecure");
  assert.equal(validateEndpointUrl("https://user:pw@example.com").problem, "credentials");
  assert.equal(validateEndpointUrl("ftp://example.com").problem, "invalid");
});

test("validateEndpoint", () => {
  assert.deepEqual(validateEndpoint({ name: "a", url: "https://example.com", events: ["x"] }), []);
  assert.deepEqual(validateEndpoint({ name: " ", url: "nope", events: [] }), ["name", "url", "events"]);
});

test("event selection", () => {
  const events = [{ id: "a", group: "G1" }, { id: "b", group: "G1" }, { id: "c" }];
  assert.deepEqual(groupEvents(events).map((g) => [g.group, g.events.length]), [["G1", 2], ["", 1]]);
  assert.deepEqual(setEvents(["a"], ["a", "b"], true), ["a", "b"]);
  assert.deepEqual(setEvents(["a", "b"], ["a"], false), ["b"]);
  assert.equal(groupState([], ["a", "b"]), "none");
  assert.equal(groupState(["a"], ["a", "b"]), "some");
  assert.equal(groupState(["a", "b"], ["a", "b"]), "all");
});

test("deliveries", () => {
  assert.equal(deliveryStatus({ code: 200 }), "success");
  assert.equal(deliveryStatus({ code: 500 }), "failed");
  assert.equal(deliveryStatus({ code: 200, error: "x" }), "failed");
  assert.equal(deliveryStatus({ pending: true }), "pending");
  assert.deepEqual(deliveryStats([{ status: "success" }, { status: "success" }, { status: "failed" }, { status: "pending" }]), { total: 4, success: 2, failed: 1, pending: 1, rate: 2 / 3 });
  assert.equal(deliveryStats([]).rate, null);
  assert.equal(canReplay("pending"), false);
  assert.equal(canReplay("failed"), true);
});

test("polling and secrets", () => {
  assert.deepEqual(pollUnit(300), { value: 5, unit: "minute" });
  assert.deepEqual(pollUnit(7200), { value: 2, unit: "hour" });
  assert.deepEqual(pollUnit(45), { value: 45, unit: "second" });
  const now = Date.now();
  assert.equal(isSourceStale(now - 10 * 60_000, 60, now), true);
  assert.equal(isSourceStale(now - 30_000, 60, now), false);
  assert.equal(isSourceStale(undefined, 60, now), false);
  assert.equal(maskSecret("abcd"), "whsec_••••••••abcd");
  assert.match(verifySnippet(), /createHmac/);
  assert.equal(prettyJson('{"a":1}'), '{\n  "a": 1\n}');
  assert.equal(prettyJson("not json"), "not json");
});

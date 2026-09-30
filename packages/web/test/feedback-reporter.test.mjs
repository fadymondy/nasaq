import assert from "node:assert/strict";
import { test } from "node:test";
import { countByStatus, feedbackInstallSnippet, isShake, motionDelta, normalizePosition } from "../src/components/feedback-reporter/feedback-reporter-utils.ts";

test("normalizePosition keeps tabs on an edge and pills off it", () => {
  assert.equal(normalizePosition("tab", "bottom-start"), "edge-start");
  assert.equal(normalizePosition("tab", "top-end"), "edge-end");
  assert.equal(normalizePosition("pill", "edge-end"), "bottom-end");
  assert.equal(normalizePosition("circle", "top-start"), "top-start");
});

test("feedbackInstallSnippet builds react code and json without a key", () => {
  const react = feedbackInstallSnippet({ shape: "tab", position: "bottom-end", label: "Feedback" }, "react");
  assert.match(react, /shape="tab"/);
  assert.match(react, /position="edge-end"/);
  assert.match(react, /NEXT_PUBLIC_MAHAAM_FEEDBACK_KEY/);
  assert.doesNotMatch(react, /pfk_/);
  const json = JSON.parse(feedbackInstallSnippet({ shape: "pill", position: "top-start", label: "Help" }, "json"));
  assert.deepEqual(json, { shape: "pill", position: "top-start", label: "Help" });
});

test("isShake needs enough recent spikes", () => {
  assert.equal(isShake([100, 300, 500], 600), true);
  assert.equal(isShake([100, 300], 600), false);
  assert.equal(isShake([0, 100, 200], 5000), false);
});

test("motionDelta is the vector distance", () => {
  assert.equal(motionDelta({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 }), 5);
});

test("countByStatus", () => {
  const c = countByStatus([{ id: "1", title: "a", status: "open" }, { id: "2", title: "b", status: "resolved" }, { id: "3", title: "c", status: "open" }]);
  assert.deepEqual(c, { all: 3, open: 2, "in-progress": 0, resolved: 1 });
});

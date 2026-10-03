import assert from "node:assert/strict";
import { test } from "node:test";
import { describeInteraction, reduceStream, retryPoint, splitStreamingText, startAnswer } from "../src/components/copilot-provider/copilot-provider-state.ts";

const card = { kind: "card", title: "Hi" };

test("deltas append and a finished artifact block becomes an artifact", () => {
  let s = startAnswer("a", 0);
  s = reduceStream(s, { type: "delta", text: "Here.\n```artifact\n" });
  assert.equal(s.message.text, "Here.");
  assert.equal(s.message.artifacts, undefined);
  s = reduceStream(s, { type: "delta", text: `${JSON.stringify(card)}\n\`\`\`\nDone.` });
  assert.equal(s.message.artifacts?.length, 1);
  assert.match(s.message.text, /Done\./);
  assert.doesNotMatch(s.message.text, /artifact/);
});

test("splitStreamingText hides an unfinished block", () => {
  assert.equal(splitStreamingText('Text\n```a2ui\n{"kind":').text, "Text");
});

test("steps upsert by id and done finishes running steps", () => {
  let s = startAnswer("a", 0);
  s = reduceStream(s, { type: "step", step: { id: "1", label: "Search", status: "running" } });
  s = reduceStream(s, { type: "step", step: { id: "2", label: "Read", status: "running" } });
  s = reduceStream(s, { type: "step", step: { id: "1", label: "Search", status: "done" } });
  assert.equal(s.message.steps?.length, 2);
  s = reduceStream(s, { type: "done" });
  assert.equal(s.message.streaming, false);
  assert.ok(s.message.steps?.every((x) => x.status === "done"));
});

test("invalid artifact events are dropped; valid ones kept", () => {
  let s = startAnswer("a", 0);
  s = reduceStream(s, { type: "artifact", artifact: { kind: "nope" } });
  assert.equal(s.message.artifacts, undefined);
  s = reduceStream(s, { type: "artifact", artifact: card });
  assert.equal(s.message.artifacts?.length, 1);
});

test("error stops streaming and keeps the message", () => {
  const s = reduceStream(startAnswer("a", 0), { type: "error", message: "boom" });
  assert.equal(s.message.streaming, false);
  assert.equal(s.message.error, "boom");
});

test("retryPoint finds the user message before an answer", () => {
  const msgs = [
    { id: "u1", role: "user", text: "one" },
    { id: "a1", role: "assistant", text: "1" },
    { id: "u2", role: "user", text: "two" },
    { id: "a2", role: "assistant", text: "2" },
  ];
  assert.equal(retryPoint(msgs)?.user.id, "u2");
  assert.equal(retryPoint(msgs, "a1")?.user.id, "u1");
  assert.equal(retryPoint(msgs, "a1")?.history.length, 0);
  assert.equal(retryPoint([]), null);
});

test("describeInteraction", () => {
  assert.equal(describeInteraction("pick", ["a", "b"]), "[picked] a, b");
  assert.equal(describeInteraction("action", "approve"), "[action] approve");
});

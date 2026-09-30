import assert from "node:assert/strict";
import test from "node:test";
import { appendSection, countWords, isPersonaDirty, personaProblems } from "../src/components/agent-persona-editor/persona-math.ts";

const base = { name: "Sara", color: "--nq-tag-blue", icon: "bot", persona: "## Role\n\nHelp.", traits: ["warm", "brief"] };

test("isPersonaDirty compares every field and trait order", () => {
  assert.equal(isPersonaDirty(base, { ...base }), false);
  assert.equal(isPersonaDirty(base, { ...base, tagline: "" }), false);
  assert.equal(isPersonaDirty(base, { ...base, name: "Sam" }), true);
  assert.equal(isPersonaDirty(base, { ...base, traits: ["brief", "warm"] }), true);
  assert.equal(isPersonaDirty(base, { ...base, traits: ["warm"] }), true);
  assert.equal(isPersonaDirty(base, { ...base, greeting: "Hi" }), true);
});

test("personaProblems flags an empty name and an overlong persona", () => {
  assert.deepEqual(personaProblems(base, 100), []);
  assert.deepEqual(personaProblems({ ...base, name: "  " }, 100), ["nameRequired"]);
  assert.deepEqual(personaProblems({ ...base, persona: "x".repeat(101) }, 100), ["personaTooLong"]);
  assert.deepEqual(personaProblems({ ...base, persona: "x".repeat(101) }, 0), []);
});

test("appendSection adds a heading once", () => {
  assert.equal(appendSection("", "Tone"), "## Tone\n\n");
  assert.equal(appendSection("Text  \n", "Tone"), "Text\n\n## Tone\n\n");
  assert.equal(appendSection("## tone\n\nx", "Tone"), "## tone\n\nx");
  assert.equal(appendSection("a", "  "), "a");
  assert.equal(appendSection("Tone of voice", "Tone of voice"), "Tone of voice\n\n## Tone of voice\n\n");
});

test("countWords", () => {
  assert.equal(countWords(""), 0);
  assert.equal(countWords("  a  b\nc "), 3);
});

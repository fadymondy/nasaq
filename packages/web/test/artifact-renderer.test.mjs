import assert from "node:assert/strict";
import test from "node:test";
import { extractArtifacts, frameDocument, frameHeight, localize, parseArtifact, safeColor } from "../src/components/artifact-renderer/artifact-renderer-logic.ts";

test("valid artifacts of every kind parse", () => {
  const cases = [
    { kind: "card", title: "T", fields: [{ label: "A", value: 1 }], badges: [{ label: "x", tone: "success" }] },
    { kind: "table", columns: [{ key: "a", label: "A", align: "end" }], rows: [{ a: 1 }] },
    { kind: "chart", xKey: "m", series: [{ key: "v", label: "V" }], data: [{ m: "Jan", v: 2 }] },
    { kind: "markdown", text: "# hi" },
    { kind: "code", code: "x", language: "ts" },
    { kind: "actions", actions: [{ id: "go", label: "Go" }] },
    { kind: "picker", options: [{ value: "a", label: "A" }] },
    { kind: "stats", items: [{ label: "Users", value: 4 }] },
    { kind: "html", html: "<b>x</b>" },
  ];
  for (const c of cases) assert.equal(parseArtifact(c).ok, true, c.kind);
});

test("invalid input never throws and explains itself", () => {
  const dupes = { kind: "picker", options: [{ value: "a", label: "A" }, { value: "a", label: "B" }] };
  for (const bad of [null, 4, "x", [], {}, { kind: "nope" }, { kind: "table" }, { kind: "chart", xKey: "m", series: [], data: [] }, dupes]) {
    const r = parseArtifact(bad);
    assert.equal(r.ok, false);
    assert.equal(typeof r.error, "string");
  }
  assert.equal(parseArtifact({ kind: "nope" }).kind, "nope");
});

test("limits are enforced", () => {
  const rows = Array.from({ length: 500 }, (_, i) => ({ a: i }));
  assert.equal(parseArtifact({ kind: "table", columns: [{ key: "a", label: "A" }], rows }).ok, false);
  assert.equal(parseArtifact({ kind: "markdown", text: "x".repeat(30_000) }).ok, false);
});

test("legacy bilingual keys are accepted", () => {
  const r = parseArtifact({ kind: "markdown", text: "x", title_en: "Hello", title_ar: "مرحبا" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.artifact.title, { en: "Hello", ar: "مرحبا" });
});

test("safeColor only allows theme variables", () => {
  assert.equal(safeColor("var(--nq-tag-teal)"), "var(--nq-tag-teal)");
  for (const bad of ["red", "#fff", "url(http://x)", "var(--a); background:url(x)", "expression(1)", 4, undefined]) assert.equal(safeColor(bad), undefined);
  const r = parseArtifact({ kind: "chart", xKey: "m", series: [{ key: "v", label: "V", color: "red" }], data: [{ m: "a", v: 1 }] });
  assert.equal(r.artifact.series[0].color, undefined);
});

test("chart data must be finite numbers", () => {
  assert.equal(parseArtifact({ kind: "chart", xKey: "m", series: [{ key: "v", label: "V" }], data: [{ m: "a", v: "1" }] }).ok, false);
  assert.equal(parseArtifact({ kind: "chart", xKey: "m", series: [{ key: "v", label: "V" }], data: [{ m: "a", v: Number.POSITIVE_INFINITY }] }).ok, false);
});

test("localize picks a language and falls back", () => {
  assert.equal(localize("plain", "ar"), "plain");
  assert.equal(localize({ en: "Hi", ar: "مرحبا" }, "ar-SA"), "مرحبا");
  assert.equal(localize({ en: "Hi" }, "ar"), "Hi");
  assert.equal(localize({ ar: "x" }, "en"), "x");
  assert.equal(localize(undefined, "en"), "");
});

test("html frame is clamped and locked down by CSP", () => {
  assert.equal(frameHeight(undefined), 240);
  assert.equal(frameHeight(5), 80);
  assert.equal(frameHeight(9999), 600);
  const doc = frameDocument("<p>x</p>");
  assert.match(doc, /default-src 'none'/);
  assert.ok(doc.endsWith("<p>x</p>"));
});

test("extractArtifacts pulls fenced blocks and keeps the prose", () => {
  const src = 'Intro\n\n```artifact\n{"kind":"markdown","text":"a"}\n```\n\nMid\n\n```a2ui\n{bad\n```\n\nEnd';
  const { text, artifacts } = extractArtifacts(src);
  assert.equal(artifacts.length, 2);
  assert.equal(artifacts[0].ok, true);
  assert.equal(artifacts[1].ok, false);
  assert.equal(text, "Intro\n\nMid\n\nEnd");
  const streaming = extractArtifacts('x\n```artifact\n{"kind":');
  assert.equal(streaming.artifacts.length, 0);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { aiLink, buildPrompt, execCommand, installCommand, stripPrompt, toMarkdown } from "../src/components/code-block-variants/code-block-variants-format.ts";
import { completedCount, deriveStatus, formatDuration, stepDuration, tailLines, totalDuration } from "../src/components/deploy-view/deploy-view-format.ts";
import { checkEnvKey, conflictingKeys, looksPublic, parseEnv, quoteEnvValue, serializeEnv } from "../src/components/env-list/env-list-format.ts";
import {
  compileMatcher,
  countByLevel,
  filterLogs,
  formatLogTime,
  logsToText,
  normalizeLevel,
  splitByRanges,
  virtualWindow,
} from "../src/components/log-viewer/log-viewer-format.ts";
import { parseAnsi, parseAnsiRows, stripAnsi } from "../src/components/terminal/terminal-ansi.ts";

const ESC = String.fromCharCode(27);

// ---- code-block-variants --------------------------------------------------------------------

test("toMarkdown fences code and widens the fence when the code has fences", () => {
  assert.equal(toMarkdown("a();\n", "ts"), "```ts\na();\n```");
  assert.equal(toMarkdown("x", "text", "a.txt"), "**a.txt**\n\n```\nx\n```");
  assert.equal(toMarkdown("```\nx\n```", "md"), "````md\n```\nx\n```\n````");
});

test("buildPrompt has an instruction and the snippet", () => {
  const p = buildPrompt({ code: "x", language: "js", instruction: "Fix it", target: "claude" });
  assert.ok(p.startsWith("Fix it\n\n```js\nx\n```"));
  assert.ok(buildPrompt({ code: "x", target: "cursor" }).includes("Apply this snippet"));
});

test("aiLink builds deep links and gives up on long prompts", () => {
  assert.ok(aiLink("claude", "hi there")?.startsWith("https://claude.ai/new?q=hi%20there"));
  assert.ok(aiLink("chatgpt", "hi")?.startsWith("https://chatgpt.com/?q="));
  assert.ok(aiLink("cursor", "hi")?.startsWith("cursor://"));
  assert.equal(aiLink("claude", "x".repeat(7000)), null);
});

test("package manager commands", () => {
  assert.equal(installCommand("pnpm", "left-pad"), "pnpm add left-pad");
  assert.equal(installCommand("npm", "left-pad", { dev: true }), "npm install -D left-pad");
  assert.equal(installCommand("yarn", "cli", { global: true }), "yarn global add cli");
  assert.equal(installCommand("bun", "x", { dev: true }), "bun add -d x");
  assert.equal(execCommand("npm", "shadcn init"), "npx shadcn init");
  assert.equal(execCommand("pnpm", "shadcn init"), "pnpm dlx shadcn init");
});

test("stripPrompt drops a leading prompt only", () => {
  assert.equal(stripPrompt("$ npm i x"), "npm i x");
  assert.equal(stripPrompt("  > npm i x  "), "npm i x");
  assert.equal(stripPrompt("echo $HOME"), "echo $HOME");
});

// ---- terminal -------------------------------------------------------------------------------

test("parseAnsi maps colours to tokens and carries style", () => {
  const { spans, style } = parseAnsi(`${ESC}[31mred${ESC}[1m bold${ESC}[0m plain`);
  assert.equal(spans.length, 3);
  assert.equal(spans[0].text, "red");
  assert.match(spans[0].style.fg, /--nq-danger-text/);
  assert.equal(spans[1].style.bold, true);
  assert.match(spans[1].style.fg, /--nq-danger-text/);
  assert.deepEqual(spans[2].style, {});
  assert.deepEqual(style, {});
});

test("parseAnsi handles 256 and truecolour and ignores bad values", () => {
  assert.equal(parseAnsi(`${ESC}[38;5;196mx`).spans[0].style.fg, "rgb(255 0 0)");
  assert.equal(parseAnsi(`${ESC}[38;2;1;2;3mx`).spans[0].style.fg, "rgb(1 2 3)");
  assert.equal(parseAnsi(`${ESC}[38;2;1;2;999mx`).spans[0].style.fg, undefined);
});

test("stripAnsi removes escapes and resolves carriage returns", () => {
  assert.equal(stripAnsi(`${ESC}[32mok${ESC}[0m`), "ok");
  assert.equal(stripAnsi("10%\r50%\r100%"), "100%");
  assert.equal(stripAnsi(`${ESC}]0;title\u0007hello`), "hello");
  assert.equal(stripAnsi("a\r\nb"), "a\nb");
});

test("parseAnsiRows keeps colour across lines", () => {
  const rows = parseAnsiRows(`${ESC}[33mone\ntwo${ESC}[0m`);
  assert.equal(rows.length, 2);
  assert.match(rows[1][0].style.fg, /--nq-warning-text/);
});

// ---- log-viewer -----------------------------------------------------------------------------

const logs = [
  { id: 1, time: "2026-09-29T10:00:00.005Z", level: "info", message: "server started", source: "api" },
  { id: 2, time: "2026-09-29T10:00:01.000Z", level: "error", message: "db refused", fields: { host: "db-1" } },
  { id: 3, time: "2026-09-29T10:00:02.000Z", level: "warn", message: "slow query (a.b)" },
];

test("normalizeLevel maps aliases", () => {
  assert.equal(normalizeLevel("WARNING"), "warn");
  assert.equal(normalizeLevel(" Critical "), "fatal");
  assert.equal(normalizeLevel("nope"), undefined);
});

test("formatLogTime is fixed width in UTC", () => {
  assert.equal(formatLogTime("2026-09-29T10:00:00.005Z", { utc: true }), "10:00:00.005");
  assert.equal(formatLogTime("2026-09-29T10:00:00.005Z", { utc: true, date: true, millis: false }), "2026-09-29 10:00:00");
  assert.equal(formatLogTime("garbage"), "--:--:--");
});

test("filterLogs by level, text, fields and regex", () => {
  assert.equal(filterLogs(logs, { levels: new Set(["error"]) }).entries.length, 1);
  assert.equal(filterLogs(logs, { query: "DB-1" }).entries[0].id, 2);
  assert.equal(filterLogs(logs, { query: "a.b" }).entries.length, 1);
  assert.equal(filterLogs(logs, { query: "d.-1", regex: true }).entries.length, 1);
  const bad = filterLogs(logs, { query: "(", regex: true });
  assert.equal(bad.invalid, true);
  assert.equal(bad.entries.length, 3);
});

test("compileMatcher escapes plain queries and returns ranges", () => {
  assert.equal(compileMatcher(""), null);
  assert.equal(compileMatcher("(", true), "invalid");
  const m = compileMatcher("a.b");
  assert.deepEqual(m.ranges("xa.bxaxb"), [[1, 4]]);
  assert.deepEqual(splitByRanges("abcdef", [[1, 3], [2, 4]]), [
    { text: "a", match: false },
    { text: "bcd", match: true },
    { text: "ef", match: false },
  ]);
});

test("countByLevel and logsToText", () => {
  assert.equal(countByLevel(logs).error, 1);
  assert.match(logsToText(logs, { utc: true }).split("\n")[0], /^2026-09-29 10:00:00\.005 INFO {2}api server started$/);
});

test("virtualWindow renders a small slice of a big list", () => {
  const w = virtualWindow({ scrollTop: 24000, viewport: 240, rowHeight: 24, count: 100000 });
  assert.equal(w.start, 992);
  assert.ok(w.end - w.start < 40);
  assert.deepEqual(virtualWindow({ scrollTop: 0, viewport: 100, rowHeight: 24, count: 0 }), { start: 0, end: 0 });
  assert.equal(virtualWindow({ scrollTop: 999999, viewport: 240, rowHeight: 24, count: 10 }).end, 10);
});

// ---- deploy-view ----------------------------------------------------------------------------

test("deriveStatus and completedCount", () => {
  assert.equal(deriveStatus([]), "pending");
  assert.equal(deriveStatus([{ status: "success" }, { status: "failed" }]), "failed");
  assert.equal(deriveStatus([{ status: "success" }, { status: "running" }]), "running");
  assert.equal(deriveStatus([{ status: "success" }, { status: "skipped" }]), "success");
  assert.equal(deriveStatus([{ status: "success" }, { status: "pending" }]), "running");
  assert.equal(completedCount([{ status: "success" }, { status: "skipped" }, { status: "failed" }]), 2);
});

test("durations tick while running", () => {
  assert.equal(stepDuration({ status: "running", startedAt: 1000 }, 4500), 3500);
  assert.equal(stepDuration({ status: "success", durationMs: 800 }, 4500), 800);
  assert.equal(totalDuration([{ status: "success", durationMs: 1000 }, { status: "running", startedAt: 0 }], 500), 1500);
});

test("formatDuration", () => {
  assert.equal(formatDuration(420), "420ms");
  assert.equal(formatDuration(12400), "12s");
  assert.equal(formatDuration(4200), "4.2s");
  assert.equal(formatDuration(125000), "2m 05s");
  assert.equal(formatDuration(3780000), "1h 03m");
  assert.equal(formatDuration(59600), "1m 00s");
  assert.equal(formatDuration(-1), "-");
});

test("tailLines keeps the end and counts the rest", () => {
  assert.deepEqual(tailLines("a\nb\nc\nd\n", 2), { text: "c\nd", hidden: 2 });
  assert.deepEqual(tailLines("a\nb", 5), { text: "a\nb", hidden: 0 });
});

// ---- env-list -------------------------------------------------------------------------------

test("parseEnv reads plain, exported, quoted and commented values", () => {
  const r = parseEnv(`# c\nA=1\nexport B="two words"\nC='it''s'\nD=x # note\n\nE=`);
  const map = Object.fromEntries(r.variables.map((v) => [v.key, v.value]));
  assert.equal(map.A, "1");
  assert.equal(map.B, "two words");
  assert.equal(map.D, "x");
  assert.equal(map.E, "");
  assert.deepEqual(r.issues.filter((i) => i.key !== "C"), []);
});

test("parseEnv handles escapes, multi-line values and duplicates", () => {
  const r = parseEnv('A="line1\\nline2"\nB="multi\nline"\nA=2');
  const map = Object.fromEntries(r.variables.map((v) => [v.key, v.value]));
  assert.equal(map.A, "2");
  assert.equal(map.B, "multi\nline");
  assert.deepEqual(r.duplicates, ["A"]);
  assert.equal(parseEnv('X="a\\nb"').variables[0].value, "a\nb");
});

test("parseEnv reports problems without values", () => {
  const r = parseEnv("1BAD=secret\nnoequals\nQ=\"open");
  assert.deepEqual(
    r.issues.map((i) => [i.line, i.problem]),
    [
      [1, "invalid-key"],
      [2, "no-equals"],
      [3, "unterminated-quote"],
    ],
  );
  assert.equal(JSON.stringify(r.issues).includes("secret"), false);
  assert.equal(JSON.stringify(r.issues).includes("open"), false);
});

test("serializeEnv round-trips awkward values", () => {
  const vars = [
    { key: "A", value: "plain" },
    { key: "B", value: 'has "quotes" and $dollar' },
    { key: "C", value: "two\nlines" },
    { key: "D", value: "back\\slash # hash" },
    { key: "E", value: "" },
  ];
  const back = parseEnv(serializeEnv(vars)).variables;
  assert.deepEqual(back, vars);
  assert.equal(quoteEnvValue("plain"), "plain");
  assert.equal(quoteEnvValue("a b"), '"a b"');
});

test("key validation, conflicts and public prefixes", () => {
  assert.equal(checkEnvKey("", []), "empty");
  assert.equal(checkEnvKey("1A", []), "invalid");
  assert.equal(checkEnvKey("A-B", []), "invalid");
  assert.equal(checkEnvKey("A", ["A"]), "duplicate");
  assert.equal(checkEnvKey("_ok1", ["A"]), null);
  assert.deepEqual(conflictingKeys([{ key: "A" }, { key: "B" }], [{ key: "B" }, { key: "C" }]), ["B"]);
  assert.equal(looksPublic("NEXT_PUBLIC_URL"), true);
  assert.equal(looksPublic("DATABASE_URL"), false);
});

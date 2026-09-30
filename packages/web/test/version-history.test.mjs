import assert from "node:assert/strict";
import { test } from "node:test";
import { diffLines, diffStats, foldDiff, sortVersions } from "../src/components/version-history/diff.ts";

const show = (l) => l.map((x) => (x.type === "add" ? "+" : x.type === "del" ? "-" : " ") + x.text);

test("identical and empty texts", () => {
  assert.deepEqual(diffStats(diffLines("a\nb", "a\nb")), { added: 0, removed: 0, changed: false });
  assert.deepEqual(diffLines("", ""), []);
  assert.deepEqual(show(diffLines("", "x\ny")), ["+x", "+y"]);
  assert.deepEqual(show(diffLines("x", "")), ["-x"]);
});

test("changes, additions and removals in the middle", () => {
  const d = diffLines("a\nb\nc\nd", "a\nB\nc\nd\ne");
  assert.deepEqual(show(d), [" a", "-b", "+B", " c", " d", "+e"]);
  assert.deepEqual(diffStats(d), { added: 2, removed: 1, changed: true });
});

test("line numbers follow each side", () => {
  const d = diffLines("a\nb\nc", "a\nc");
  assert.deepEqual(d.map((x) => [x.oldLine, x.newLine]), [[1, 1], [2, undefined], [3, 2]]);
});

test("CRLF is treated as LF", () => {
  assert.equal(diffStats(diffLines("a\r\nb", "a\nb")).changed, false);
});

test("a moved block shows as remove plus add, and interleaving matches by LCS", () => {
  assert.deepEqual(show(diffLines("1\n2\n3\n4", "2\n3\n4\n1")), ["-1", " 2", " 3", " 4", "+1"]);
});

test("unchanged runs fold", () => {
  const old = Array.from({ length: 20 }, (_, i) => `l${i}`).join("\n");
  const next = old.replace("l10", "X");
  const folded = foldDiff(diffLines(old, next), 2);
  const gaps = folded.filter((x) => x.type === "gap").map((x) => x.count);
  assert.deepEqual(gaps, [8, 7]);
  assert.equal(foldDiff(diffLines("a", "a"), 2).length, 1);
});

test("versions sort newest first", () => {
  const v = [{ version: 1, savedAt: 1000 }, { version: 3, savedAt: 3000 }, { version: 2, savedAt: 2000 }];
  assert.deepEqual(sortVersions(v).map((x) => x.version), [3, 2, 1]);
});

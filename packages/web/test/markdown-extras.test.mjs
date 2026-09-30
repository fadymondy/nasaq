import assert from "node:assert/strict";
import test from "node:test";
import {
  markdownCellNumber,
  codeDownloadName,
  compareMarkdownCells,
  filterMarkdownRows,
  frontmatterLabel,
  nextMarkdownSort,
  parseFenceMeta,
  parseMarkdownFrontmatter,
  sortMarkdownRows,
} from "../src/components/markdown-extras/markdown-extras-model.ts";

const row = (...texts) => ({ texts });

test("frontmatter: scalars, inline lists, dash lists and the body", () => {
  const src = `---\ntitle: "Hello: world"\ndraft: false\nviews: 42\ntags: [a, b]\nauthors:\n  - Fady\n  - Sara\n---\n# Body\n`;
  const { data, body } = parseMarkdownFrontmatter(src);
  assert.deepEqual(data, [
    ["title", "Hello: world"],
    ["draft", false],
    ["views", 42],
    ["tags", ["a", "b"]],
    ["authors", ["Fady", "Sara"]],
  ]);
  assert.equal(body, "# Body\n");
});

test("frontmatter: no closed block leaves the text alone", () => {
  assert.deepEqual(parseMarkdownFrontmatter("---\nnot closed\n"), { data: [], body: "---\nnot closed\n" });
  assert.deepEqual(parseMarkdownFrontmatter("plain"), { data: [], body: "plain" });
});

test("frontmatterLabel humanises keys", () => {
  assert.equal(frontmatterLabel("publishDate"), "Publish date");
  assert.equal(frontmatterLabel("og_image-url"), "Og image url");
});

test("nextMarkdownSort cycles asc, desc, off and restarts on a new column", () => {
  const a = nextMarkdownSort(null, 1);
  assert.deepEqual(a, { column: 1, direction: "asc" });
  const d = nextMarkdownSort(a, 1);
  assert.deepEqual(d, { column: 1, direction: "desc" });
  assert.equal(nextMarkdownSort(d, 1), null);
  assert.deepEqual(nextMarkdownSort(d, 2), { column: 2, direction: "asc" });
});

test("markdownCellNumber reads currency, percent, thousands and Arabic digits", () => {
  assert.equal(markdownCellNumber("$1,200.50"), 1200.5);
  assert.equal(markdownCellNumber("45%"), 45);
  assert.equal(markdownCellNumber("-3"), -3);
  assert.equal(markdownCellNumber("١٢٣"), 123);
  assert.equal(markdownCellNumber("abc"), null);
  assert.equal(markdownCellNumber(""), null);
});

test("compareMarkdownCells sorts numbers by value and text naturally", () => {
  assert.ok(compareMarkdownCells("9", "10") < 0);
  assert.ok(compareMarkdownCells("file2", "file10") < 0);
});

test("sortMarkdownRows is stable and keeps empty cells last both ways", () => {
  const rows = [row("b", "2"), row("a", ""), row("c", "10"), row("d", "2")];
  assert.deepEqual(sortMarkdownRows(rows, { column: 1, direction: "asc" }).map((r) => r.texts[0]), ["b", "d", "c", "a"]);
  assert.deepEqual(sortMarkdownRows(rows, { column: 1, direction: "desc" }).map((r) => r.texts[0]), ["c", "b", "d", "a"]);
  assert.deepEqual(sortMarkdownRows(rows, null), rows);
});

test("filterMarkdownRows needs every word in some cell and folds accents and Arabic forms", () => {
  const rows = [row("Résumé", "Cairo"), row("Other", "أحمد"), row("Third", "Dubai")];
  assert.equal(filterMarkdownRows(rows, "resume cairo").length, 1);
  assert.equal(filterMarkdownRows(rows, "احمد").length, 1);
  assert.equal(filterMarkdownRows(rows, "").length, 3);
  assert.equal(filterMarkdownRows(rows, "nothing").length, 0);
});

test("parseFenceMeta reads title, line numbers and highlight ranges", () => {
  assert.deepEqual(parseFenceMeta('title="app.ts" showLineNumbers {2,4-6}'), { title: "app.ts", lineNumbers: true, highlight: "2,4-6" });
  assert.deepEqual(parseFenceMeta(undefined), {});
});

test("codeDownloadName prefers the title and cleans unsafe characters", () => {
  assert.equal(codeDownloadName("ts", "src/app.ts"), "src-app.ts");
  assert.equal(codeDownloadName("python"), "code.py");
  assert.equal(codeDownloadName("weird"), "code.txt");
});

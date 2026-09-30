import assert from "node:assert/strict";
import test from "node:test";
import { docsAncestorIds, docsPageMarkdown, docsPages, docsPrevNext, docsSectionIds, docsTrail, filterDocsTree } from "../src/components/docs-shell/docs-model.ts";

const nav = [
  { id: "intro", title: "Introduction" },
  {
    id: "guides",
    title: "Guides",
    children: [
      { id: "install", title: "Installation" },
      { id: "theming", title: "Theming", children: [{ id: "tokens", title: "Design tokens" }] },
    ],
  },
  { id: "api", title: "API", children: [{ id: "button", title: "Button" }] },
];

test("docsPages lists leaves in reading order", () => {
  assert.deepEqual(docsPages(nav).map((p) => p.id), ["intro", "install", "tokens", "button"]);
});

test("docsTrail and docsAncestorIds give the path to a page", () => {
  assert.deepEqual(docsTrail(nav, "tokens").map((n) => n.id), ["guides", "theming", "tokens"]);
  assert.deepEqual(docsAncestorIds(nav, "tokens"), ["guides", "theming"]);
  assert.deepEqual(docsTrail(nav, "missing"), []);
});

test("docsPrevNext walks pages across sections", () => {
  assert.deepEqual(docsPrevNext(nav, "install"), { prev: nav[0], next: docsPages(nav)[2] });
  assert.equal(docsPrevNext(nav, "intro").prev, undefined);
  assert.equal(docsPrevNext(nav, "button").next, undefined);
  assert.deepEqual(docsPrevNext(nav, "missing"), {});
});

test("filterDocsTree keeps matching pages under their sections", () => {
  const out = filterDocsTree(nav, "token");
  assert.deepEqual(out.map((n) => n.id), ["guides"]);
  assert.deepEqual(docsPages(out).map((p) => p.id), ["tokens"]);
  assert.equal(filterDocsTree(nav, "nothing").length, 0);
  assert.equal(filterDocsTree(nav, "").length, 3);
});

test("a matching section keeps all its pages", () => {
  assert.deepEqual(docsPages(filterDocsTree(nav, "guides")).map((p) => p.id), ["install", "tokens"]);
});

test("docsSectionIds lists every section, nested included", () => {
  assert.deepEqual(docsSectionIds(nav), ["guides", "theming", "api"]);
});

test("docsPageMarkdown puts the title first and drops a duplicate h1", () => {
  const md = docsPageMarkdown({ title: "Install", description: "Get started.", markdown: "# Install\n\n## Step\n\nRun it.\n" });
  assert.equal(md, "# Install\n\nGet started.\n\n## Step\n\nRun it.\n");
});

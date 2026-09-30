import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyMarkdownFormat,
  backlinksOf,
  duplicateNote,
  exportNote,
  filterNotes,
  groupNotes,
  htmlToMarkdown,
  htmlToText,
  INITIAL_SAVE,
  markdownToText,
  matchNoteShortcut,
  noteExportFormats,
  notebookIds,
  notebookPath,
  notebookTree,
  normalizeText,
  saveReducer,
  scopeCounts,
  slugify,
  sortNotes,
  tagCounts,
  wikilinks,
  wordCount,
} from "../src/components/notes/notes-model.ts";

const T = Date.UTC(2026, 8, 30, 12);
const DAY = 86_400_000;
const n = (id, over = {}) => ({ id, title: `Note ${id}`, body: `<p>body ${id}</p>`, createdAt: T - DAY * 10, updatedAt: T - DAY * 10, ...over });
const books = [
  { id: "w", name: "Work" },
  { id: "w2", name: "Clients", parentId: "w" },
  { id: "p", name: "Personal" },
];

test("text helpers strip markup and count words in both scripts", () => {
  assert.equal(htmlToText("<h1>Hi</h1><p>a &amp; b</p><ul><li>x</li><li>y</li></ul>"), "Hi a & b x y");
  assert.equal(markdownToText("# Title\n- [ ] **bold** [link](http://x) [[Other]]"), "Title bold link Other");
  assert.equal(wordCount("مرحبا بالعالم hello world 42"), 5);
  assert.equal(wordCount(""), 0);
  assert.equal(normalizeText("إِنْشَاءٌ"), normalizeText("انشاء"));
  assert.equal(slugify("خطة الإطلاق: v2!"), "خطة-الإطلاق-v2");
  assert.equal(slugify("***"), "note");
});

test("notebooks: descendants, tree and path", () => {
  assert.deepEqual(notebookIds(books, "w").sort(), ["w", "w2"]);
  assert.deepEqual(notebookTree(books).map((x) => [x.notebook.id, x.children.map((c) => c.notebook.id)]), [["w", ["w2"]], ["p", []]]);
  assert.deepEqual(notebookPath(books, "w2"), ["Work", "Clients"]);
  assert.deepEqual(notebookPath(books, null), []);
});

test("filterNotes by scope: notebook includes sub-notebooks, archive is separate", () => {
  const notes = [n("1", { notebookId: "w" }), n("2", { notebookId: "w2" }), n("3", { notebookId: "p", pinned: true }), n("4", { archived: true, notebookId: "w" }), n("5", { tags: ["idea"], sealed: true })];
  const ids = (o) => filterNotes(notes, { notebooks: books, ...o }).map((x) => x.id);
  assert.deepEqual(ids({ scope: "all" }), ["1", "2", "3", "5"]);
  assert.deepEqual(ids({ scope: "nb:w" }), ["1", "2"]);
  assert.deepEqual(ids({ scope: "pinned" }), ["3"]);
  assert.deepEqual(ids({ scope: "archive" }), ["4"]);
  assert.deepEqual(ids({ scope: "tag:idea" }), ["5"]);
  assert.deepEqual(ids({ scope: "sealed" }), ["5"]);
});

test("filterNotes query searches title, tags and body, but not a locked sealed body", () => {
  const notes = [n("1", { title: "Launch plan", body: "<p>ship it</p>" }), n("2", { title: "Secret", sealed: true, body: "<p>ship the vault</p>" }), n("3", { tags: ["ship"] })];
  assert.deepEqual(filterNotes(notes, { query: "SHIP" }).map((x) => x.id), ["1", "3"]);
  assert.deepEqual(filterNotes(notes, { query: "ship", unlocked: ["2"] }).map((x) => x.id), ["1", "2", "3"]);
  assert.deepEqual(filterNotes(notes, { query: "secret" }).map((x) => x.id), ["2"]);
});

test("sortNotes puts pinned first then the key", () => {
  const notes = [n("a", { title: "b", updatedAt: 1 }), n("b", { title: "a", updatedAt: 3 }), n("c", { title: "c", updatedAt: 2, pinned: true })];
  assert.deepEqual(sortNotes(notes, "updated").map((x) => x.id), ["c", "b", "a"]);
  assert.deepEqual(sortNotes(notes, "title").map((x) => x.id), ["c", "b", "a"]);
  assert.deepEqual(sortNotes(notes, "title", { pinnedFirst: false }).map((x) => x.id), ["b", "a", "c"]);
});

test("groupNotes sections by day", () => {
  const notes = [n("p", { pinned: true }), n("t", { updatedAt: T }), n("y", { updatedAt: T - DAY }), n("w", { updatedAt: T - DAY * 3 }), n("e", { updatedAt: T - DAY * 20 })];
  assert.deepEqual(groupNotes(notes, "updated", T).map((g) => [g.kind, g.notes.map((x) => x.id)]), [["pinned", ["p"]], ["today", ["t"]], ["yesterday", ["y"]], ["week", ["w"]], ["earlier", ["e"]]]);
  assert.deepEqual(groupNotes(notes, "title", T).map((g) => g.kind), ["all"]);
  assert.deepEqual(groupNotes([], "updated", T), []);
});

test("scopeCounts and tagCounts", () => {
  const notes = [n("1", { notebookId: "w2", tags: ["a", "b"] }), n("2", { notebookId: "w", tags: ["a"], pinned: true }), n("3", { archived: true, tags: ["a"] }), n("4", { sealed: true })];
  const c = scopeCounts(notes, books);
  assert.equal(c.all, 3);
  assert.equal(c.archive, 1);
  assert.equal(c.pinned, 1);
  assert.equal(c.sealed, 1);
  assert.equal(c["nb:w"], 2);
  assert.equal(c["nb:w2"], 1);
  assert.equal(c["nb:p"], 0);
  assert.equal(c["tag:a"], 2);
  assert.deepEqual(tagCounts(notes), [{ tag: "a", count: 2 }, { tag: "b", count: 1 }]);
});

test("wikilinks and backlinks", () => {
  assert.deepEqual(wikilinks("see [[Launch plan]] and [[ Roadmap ]]"), ["Launch plan", "Roadmap"]);
  const target = n("t", { title: "Launch plan" });
  const notes = [target, n("1", { body: "<p>see [[launch plan]]</p>" }), n("2", { format: "markdown", body: "x [[Launch Plan]]" }), n("3", { sealed: true, body: "<p>[[Launch plan]]</p>" }), n("4", { archived: true, body: "[[Launch plan]]" })];
  assert.deepEqual(backlinksOf(target, notes).map((x) => x.id), ["1", "2"]);
  assert.deepEqual(backlinksOf(target, notes, ["3"]).map((x) => x.id), ["1", "2", "3"]);
});

test("duplicateNote drops pin, archive and seal", () => {
  const copy = duplicateNote(n("1", { pinned: true, sealed: true, archived: true, title: "Plan" }), { id: "2", now: 5, suffix: "copy" });
  assert.equal(copy.id, "2");
  assert.equal(copy.title, "Plan (copy)");
  assert.deepEqual([copy.pinned, copy.sealed, copy.archived, copy.createdAt, copy.updatedAt], [false, false, false, 5, 5]);
});

test("export: formats per note and file contents", () => {
  assert.deepEqual(noteExportFormats({ format: "markdown" }), ["markdown", "text"]);
  assert.deepEqual(noteExportFormats({}), ["html", "markdown", "text"]);
  const rich = n("1", { title: "Plan A", body: "<h2>Goals</h2><p>Ship <strong>fast</strong> &amp; <em>well</em></p><ul><li>one</li><li>two</li></ul>" });
  const md = exportNote(rich, "markdown");
  assert.equal(md.filename, "Plan-A.md");
  assert.equal(md.content, "# Plan A\n\n## Goals\n\nShip **fast** & *well*\n\n- one\n- two\n");
  assert.match(exportNote(rich, "html").content, /<h1>Plan A<\/h1>/);
  assert.equal(exportNote(rich, "text").content, "Plan A\n\nGoals Ship fast & well one two\n");
  const mdNote = n("2", { format: "markdown", body: "# x <b>" });
  assert.match(exportNote(mdNote, "html").content, /<pre># x &lt;b&gt;<\/pre>/);
  assert.equal(htmlToMarkdown("<ol><li>a</li><li>b</li></ol>"), "1. a\n2. b");
});

test("applyMarkdownFormat wraps, unwraps and inserts placeholders", () => {
  assert.deepEqual(applyMarkdownFormat("hello world", 6, 11, "bold"), { value: "hello **world**", start: 8, end: 13 });
  assert.deepEqual(applyMarkdownFormat("hello **world**", 8, 13, "bold"), { value: "hello world", start: 6, end: 11 });
  assert.deepEqual(applyMarkdownFormat("", 0, 0, "code"), { value: "``", start: 1, end: 1 });
  assert.equal(applyMarkdownFormat("Plan", 0, 4, "wikilink").value, "[[Plan]]");
  const link = applyMarkdownFormat("see docs", 4, 8, "link");
  assert.equal(link.value, "see [docs](url)");
  assert.equal(link.value.slice(link.start, link.end), "url");
});

test("applyMarkdownFormat line commands toggle and replace", () => {
  assert.equal(applyMarkdownFormat("Title", 0, 0, "h2").value, "## Title");
  assert.equal(applyMarkdownFormat("## Title", 3, 3, "h2").value, "Title");
  assert.equal(applyMarkdownFormat("# Title", 0, 0, "h3").value, "### Title");
  assert.equal(applyMarkdownFormat("a\nb\nc", 0, 5, "ordered").value, "1. a\n2. b\n3. c");
  assert.equal(applyMarkdownFormat("1. a\n2. b", 0, 9, "ordered").value, "a\nb");
  assert.equal(applyMarkdownFormat("- a", 0, 3, "task").value, "- [ ] a");
  assert.equal(applyMarkdownFormat("x\ny", 2, 3, "quote").value, "x\n> y");
  assert.equal(applyMarkdownFormat("- [ ] a", 0, 7, "bullet").value, "- a");
});

test("saveReducer: an edit during a save leaves the note dirty", () => {
  let s = INITIAL_SAVE;
  s = saveReducer(s, { type: "edit" });
  assert.equal(s.status, "dirty");
  s = saveReducer(s, { type: "start" });
  assert.equal(s.status, "saving");
  s = saveReducer(s, { type: "edit" });
  s = saveReducer(s, { type: "done" });
  assert.equal(s.status, "dirty");
  s = saveReducer(s, { type: "start" });
  s = saveReducer(s, { type: "done" });
  assert.equal(s.status, "saved");
  s = saveReducer(saveReducer(saveReducer(s, { type: "edit" }), { type: "start" }), { type: "fail" });
  assert.equal(s.status, "error");
  assert.equal(saveReducer(s, { type: "start" }).status, "saving");
  assert.equal(saveReducer(INITIAL_SAVE, { type: "start" }).status, "saved");
});

test("matchNoteShortcut uses the key code and the platform modifier", () => {
  const e = (code, over = {}) => ({ key: "", code, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...over });
  assert.equal(matchNoteShortcut(e("KeyN", { ctrlKey: true }), false), "new");
  assert.equal(matchNoteShortcut(e("KeyN", { metaKey: true }), false), null);
  assert.equal(matchNoteShortcut(e("KeyN", { metaKey: true }), true), "new");
  assert.equal(matchNoteShortcut(e("KeyN", { altKey: true }), false), "new");
  assert.equal(matchNoteShortcut(e("KeyP", { ctrlKey: true, shiftKey: true }), false), "pin");
  assert.equal(matchNoteShortcut(e("KeyL", { ctrlKey: true, shiftKey: true }), false), "seal");
  assert.equal(matchNoteShortcut(e("KeyM", { altKey: true }), false), "actions");
  assert.equal(matchNoteShortcut(e("KeyP", { ctrlKey: true }), false), null);
});

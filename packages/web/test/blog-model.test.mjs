import assert from "node:assert/strict";
import test from "node:test";
import {
  activeHeadingId,
  adjacentPosts,
  postCategoryCounts,
  countWords,
  extractToc,
  filterPosts,
  normalizeText,
  paginate,
  pickFeatured,
  readingProgress,
  readingTime,
  relatedPosts,
  remarkCallouts,
  slugifyHeading,
  tagCounts,
} from "../src/components/blog-index/blog-model.ts";

const post = (slug, over = {}) => ({ slug, title: slug, excerpt: "", category: "Design", tags: [], date: "2026-01-01", ...over });

test("countWords handles English and Arabic", () => {
  assert.equal(countWords("one two three"), 3);
  assert.equal(countWords("مرحبا بكم في نسق"), 4);
  assert.equal(countWords(""), 0);
});

test("readingTime is at least one minute and skips fenced code weight", () => {
  assert.equal(readingTime("hi").minutes, 1);
  const prose = Array(440).fill("word").join(" ");
  assert.equal(readingTime(prose).minutes, 2);
  const withCode = `${prose}\n\n\`\`\`ts\n${Array(440).fill("x").join(" ")}\n\`\`\`\n`;
  // 440 prose + 220 code-equivalent = 660 / 220 = 3
  assert.equal(readingTime(withCode).minutes, 3);
  assert.equal(readingTime(`${prose}\n\n![a](b.png)`).minutes, 3);
});

test("slugifyHeading keeps Arabic letters and strips marks", () => {
  assert.equal(slugifyHeading("Hello, World!"), "hello-world");
  assert.equal(slugifyHeading("لماذا  نسق؟"), "لماذا-نسق");
  assert.equal(slugifyHeading("كِتَاب"), "كتاب");
  assert.equal(slugifyHeading("???"), "section");
});

test("extractToc reads h2 and h3, skips code fences, dedupes ids and strips inline markup", () => {
  const md = ["# Title", "", "## Setup", "text", "```bash", "## not a heading", "```", "### [Link](x) and `code`", "## Setup", "#### deep", "## عنوان عربي ##"].join("\n");
  const toc = extractToc(md);
  assert.deepEqual(
    toc.map((t) => [t.id, t.level, t.text, t.line]),
    [
      ["setup", 2, "Setup", 3],
      ["link-and-code", 3, "Link and code", 8],
      ["setup-2", 2, "Setup", 9],
      ["عنوان-عربي", 2, "عنوان عربي", 11],
    ],
  );
  assert.equal(extractToc(md, { minLevel: 2, maxLevel: 2 }).length, 3);
});

test("activeHeadingId picks the last heading past the offset", () => {
  const tops = [
    { id: "a", top: -400 },
    { id: "b", top: 20 },
    { id: "c", top: 300 },
  ];
  assert.equal(activeHeadingId(tops, 96), "b");
  assert.equal(activeHeadingId([{ id: "a", top: 200 }], 96), null);
  assert.equal(activeHeadingId(tops.map((t) => ({ ...t, top: t.top - 1000 })), 96), "c");
});

test("readingProgress clamps to 0..1", () => {
  assert.equal(readingProgress(100, 3000, 800), 0);
  assert.equal(readingProgress(-1100, 3000, 800), 0.5);
  assert.equal(readingProgress(-5000, 3000, 800), 1);
  assert.equal(readingProgress(-10, 500, 800), 1);
});

test("remarkCallouts tags the blockquote and removes the marker", () => {
  const tree = {
    type: "root",
    children: [
      {
        type: "blockquote",
        children: [{ type: "paragraph", children: [{ type: "text", value: "[!WARNING]\nBe careful" }] }],
      },
      { type: "blockquote", children: [{ type: "paragraph", children: [{ type: "text", value: "plain quote" }] }] },
    ],
  };
  remarkCallouts()(tree);
  assert.equal(tree.children[0].data.hProperties["data-callout"], "warning");
  assert.equal(tree.children[0].children[0].children[0].value, "Be careful");
  assert.equal(tree.children[1].data, undefined);
});

test("filterPosts matches all words across fields, ignores Arabic diacritics", () => {
  const posts = [
    post("a", { title: "Design tokens at scale", tags: ["tokens"], category: "Design" }),
    post("b", { title: "كِتَابة الواجهات", tags: ["rtl"], category: "هندسة" }),
    post("c", { title: "Shipping fast", excerpt: "tokens too", category: "Product" }),
  ];
  assert.deepEqual(filterPosts(posts, { query: "tokens" }).map((p) => p.slug), ["a", "c"]);
  assert.deepEqual(filterPosts(posts, { query: "tokens scale" }).map((p) => p.slug), ["a"]);
  assert.deepEqual(filterPosts(posts, { query: "كتابة" }).map((p) => p.slug), ["b"]);
  assert.deepEqual(filterPosts(posts, { category: "Product" }).map((p) => p.slug), ["c"]);
  assert.deepEqual(filterPosts(posts, { tag: "rtl", query: "" }).map((p) => p.slug), ["b"]);
  assert.equal(filterPosts(posts, {}).length, 3);
  assert.equal(normalizeText("Résumé"), "resume");
});

test("counts are sorted by count then name", () => {
  const posts = [post("a", { category: "B", tags: ["x", "y"] }), post("b", { category: "A", tags: ["y"] }), post("c", { category: "B", tags: ["y", "y"] })];
  assert.deepEqual(postCategoryCounts(posts), [
    { value: "B", count: 2 },
    { value: "A", count: 1 },
  ]);
  assert.deepEqual(tagCounts(posts), [
    { value: "y", count: 3 },
    { value: "x", count: 1 },
  ]);
});

test("paginate clamps the page", () => {
  const items = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(paginate(items, 2, 4), { items: [4, 5, 6, 7], page: 2, pageCount: 3, total: 10 });
  assert.equal(paginate(items, 99, 4).page, 3);
  assert.equal(paginate(items, 0, 4).page, 1);
  assert.deepEqual(paginate([], 1, 4), { items: [], page: 1, pageCount: 1, total: 0 });
});

test("pickFeatured prefers the flagged post, else the newest", () => {
  const a = post("a", { date: "2026-03-01" });
  const b = post("b", { date: "2026-01-01", featured: true });
  assert.equal(pickFeatured([a, b]).slug, "b");
  assert.equal(pickFeatured([a, post("c", { date: "2026-02-01" })]).slug, "a");
  assert.equal(pickFeatured([]), undefined);
});

test("relatedPosts scores category and shared tags, excludes itself and zero scores", () => {
  const me = post("me", { category: "Design", tags: ["a", "b"] });
  const all = [
    me,
    post("same-cat", { category: "Design", date: "2026-02-01" }),
    post("two-tags", { category: "Other", tags: ["a", "b"], date: "2026-01-01" }),
    post("one-tag", { category: "Other", tags: ["a"] }),
    post("nothing", { category: "Other" }),
  ];
  assert.deepEqual(relatedPosts(me, all).map((p) => p.slug), ["two-tags", "same-cat", "one-tag"]);
  assert.equal(relatedPosts(me, all, 1).length, 1);
});

test("adjacentPosts returns newer and older by date", () => {
  const a = post("a", { date: "2026-03-01" });
  const b = post("b", { date: "2026-02-01" });
  const c = post("c", { date: "2026-01-01" });
  assert.equal(adjacentPosts(b, [c, a, b]).newer.slug, "a");
  assert.equal(adjacentPosts(b, [c, a, b]).older.slug, "c");
  assert.equal(adjacentPosts(a, [a, b]).newer, undefined);
  assert.deepEqual(adjacentPosts(post("zz"), [a]), {});
});

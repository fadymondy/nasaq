import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqBlogPost, NqCallout, NqPostBody, NqReadingProgress, NqTableOfContents, type BlogPostData } from ".";

const body = "Intro.\n\n## Why calm\n\nText.\n\n> [!WARNING]\n> Careful here.\n\n## Why calm\n\n### Deep dive\n\n```ts\n## not a heading\n```\n";
const post: BlogPostData = {
  slug: "calm",
  title: "Calm",
  excerpt: "Excerpt",
  category: "Design",
  tags: ["ux"],
  date: "2026-04-02",
  author: { name: "Sara Ali", bio: "Writes." },
  body,
};
const other = { slug: "other", title: "Other post", excerpt: "x", category: "Design", tags: ["ux"], date: "2026-03-01" };

describe("NqPostBody", () => {
  it("anchors h2 and h3 with unique ids and a permalink", () => {
    const w = mount(NqPostBody, { props: { markdown: body } });
    expect(w.attributes("data-slot")).toBe("post-body");
    const ids = w.findAll("h2, h3").map((h) => h.attributes("id"));
    expect(ids).toEqual(["why-calm", "why-calm-2", "deep-dive"]);
    expect(w.get("h2 a").attributes("href")).toBe("#why-calm");
    expect(w.get("h2 a").attributes("aria-label")).toBe("Link to this section");
  });

  it("turns a [!WARNING] blockquote into a callout without the marker", () => {
    const w = mount(NqPostBody, { props: { markdown: body } });
    const c = w.get('[data-slot="callout"]');
    expect(c.attributes("data-kind")).toBe("warning");
    expect(c.text()).toContain("Warning");
    expect(c.text()).toContain("Careful here.");
    expect(c.text()).not.toContain("[!WARNING]");
  });
});

describe("NqCallout", () => {
  it("shows the kind as the default title", () => {
    const w = mount(NqCallout, { props: { kind: "tip" }, slots: { default: "Body" } });
    expect(w.element.tagName).toBe("ASIDE");
    expect(w.text()).toContain("Tip");
  });
});

describe("NqTableOfContents", () => {
  it("marks the active heading with aria-current", () => {
    const items = [
      { id: "a", text: "A", level: 2, line: 1 },
      { id: "b", text: "B", level: 3, line: 2 },
    ];
    const w = mount(NqTableOfContents, { props: { items, activeId: "b" } });
    expect(w.get("nav").attributes("aria-label")).toBe("On this page");
    const links = w.findAll("a");
    expect(links[0]!.attributes("aria-current")).toBeUndefined();
    expect(links[1]!.attributes("aria-current")).toBe("location");
    expect(links[1]!.classes()).toContain("ps-6");
  });
});

describe("NqReadingProgress", () => {
  it("is a named progressbar", () => {
    const w = mount(NqReadingProgress);
    expect(w.attributes("role")).toBe("progressbar");
    expect(w.attributes("aria-label")).toBe("Reading progress");
    expect(w.attributes("aria-valuenow")).toBe("0");
  });
});

describe("NqBlogPost", () => {
  it("renders header, body, tags, author card, neighbours and comments", () => {
    const w = mount(NqBlogPost, { props: { post, posts: [post, other], url: "https://x.test/a", progress: false }, slots: { comments: "<p>Thread</p>" } });
    expect(w.attributes("data-slot")).toBe("blog-post");
    expect(w.get("h1").text()).toBe("Calm");
    expect(w.find('[data-slot="post-body"]').exists()).toBe(true);
    expect(w.text()).toContain("#ux");
    expect(w.text()).toContain("About the author");
    expect(w.findAll('[data-slot="post-adjacent"]')).toHaveLength(1);
    expect(w.findAll('[data-slot="post-card"]')).toHaveLength(1);
    expect(w.text()).toContain("Thread");
    expect(w.find('[data-slot="reading-progress"]').exists()).toBe(false);
  });

  it("links tags when tagHref is given and hides the TOC with toc=false", () => {
    const w = mount(NqBlogPost, { props: { post, tagHref: (t: string) => `/t/${t}`, toc: false, url: "https://x.test/a" } });
    expect(w.find('a[href="/t/ux"]').exists()).toBe(true);
    expect(w.find('[data-slot="table-of-contents"]').exists()).toBe(false);
  });
});

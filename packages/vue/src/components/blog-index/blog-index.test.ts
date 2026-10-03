import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqBlogIndex, NqPostCard, filterPosts, paginate, type BlogPostSummary } from ".";

const post = (n: number, extra: Partial<BlogPostSummary> = {}): BlogPostSummary => ({
  slug: `p${n}`,
  title: `Post ${n}`,
  excerpt: `Excerpt ${n}`,
  category: n % 2 ? "Design" : "Engineering",
  tags: n % 2 ? ["css"] : ["rtl"],
  date: `2026-01-${String(n).padStart(2, "0")}`,
  readingMinutes: n,
  ...extra,
});
const posts = Array.from({ length: 9 }, (_, i) => post(i + 1));

describe("blog model", () => {
  it("filters and paginates", () => {
    expect(filterPosts(posts, { category: "Design" })).toHaveLength(5);
    expect(paginate(posts, 9, 4).page).toBe(3);
  });
});

describe("NqPostCard", () => {
  it("renders the slot, variant, link and category badge", () => {
    const w = mount(NqPostCard, { props: { post: post(1), variant: "featured" } });
    expect(w.attributes("data-slot")).toBe("post-card");
    expect(w.attributes("data-variant")).toBe("featured");
    expect(w.get("h3 a").attributes("href")).toBe("#p1");
    expect(w.find('[data-slot="post-cover"]').exists()).toBe(true);
    expect(w.text()).toContain("Featured");
    expect(w.text()).toContain("1 min read");
  });

  it("compact has no cover", () => {
    const w = mount(NqPostCard, { props: { post: post(2), variant: "compact" } });
    expect(w.find('[data-slot="post-cover"]').exists()).toBe(false);
  });
});

describe("NqBlogIndex", () => {
  it("shows a featured post, a page of cards and pagination", () => {
    const w = mount(NqBlogIndex, { props: { posts, pageSize: 4 } });
    expect(w.attributes("data-slot")).toBe("blog-index");
    expect(w.get("h1").text()).toBe("Blog");
    expect(w.find('[data-variant="featured"]').exists()).toBe(true);
    expect(w.findAll('[data-variant="default"]')).toHaveLength(4);
    expect(w.get('[role="status"]').text()).toBe("9 articles");
    expect(w.find('nav[data-slot="pagination"]').exists()).toBe(true);
  });

  it("filters by category chip, hides the featured post and resets the page", async () => {
    const w = mount(NqBlogIndex, { props: { posts, pageSize: 4 } });
    const chip = w.findAll('[data-slot="chip"]').find((c) => c.text().startsWith("Design"))!;
    await chip.trigger("click");
    expect(w.find('[data-variant="featured"]').exists()).toBe(false);
    expect(w.get('[role="status"]').text()).toBe("5 articles");
    expect(w.findAll('[data-variant="default"]')).toHaveLength(4);
  });

  it("searches and shows the empty state with a way back", async () => {
    const w = mount(NqBlogIndex, { props: { posts } });
    await w.get('input[type="search"]').setValue("zzz");
    expect(w.text()).toContain("No articles match");
    await w.findAll("button").find((b) => b.text() === "Clear filters")!.trigger("click");
    expect(w.get('[role="status"]').text()).toBe("9 articles");
  });
});

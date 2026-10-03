import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqMarkdown } from ".";
import { parseMarkdown, safeUrl } from "./parse";

const render = (source: string, attrs: Record<string, unknown> = {}) => mount(NqMarkdown, { props: { source }, attrs });

describe("NqMarkdown", () => {
  it("renders headings, paragraphs and lists with Nasaq typography and dir=auto", () => {
    const w = render("## Release\n\nHello **bold** and `code`\n\n- one\n- two\n\n1. a\n2. b");
    expect(w.attributes("data-slot")).toBe("markdown");
    const h2 = w.find("h2");
    expect(h2.attributes("dir")).toBe("auto");
    expect(h2.classes()).toEqual(expect.arrayContaining(["text-h2", "mt-2", "text-start"]));
    expect(w.find("p").attributes("data-slot")).toBe("text");
    expect(w.find("strong").classes()).toContain("font-semibold");
    expect(w.find('[data-slot="inline-code"]').text()).toBe("code");
    expect(w.findAll("ul > li")).toHaveLength(2);
    expect(w.find("ol").classes()).toContain("list-decimal");
  });

  it("uses CodeBlock for fenced code with the language", () => {
    const w = render("```ts\nconst a = 1;\n```");
    const block = w.find('[data-slot="code-block"]');
    expect(block.attributes("data-language")).toBe("ts");
    expect(block.text()).toContain("const a = 1;");
  });

  it("renders GFM tables with logical alignment", () => {
    const w = render("| الميزة | Status |\n| :-- | --: |\n| البحث | Done |");
    expect(w.find('[data-slot="table"]').attributes("dir")).toBe("auto");
    const heads = w.findAll('[data-slot="table-head"]');
    expect(heads[0]!.classes()).toContain("text-start");
    expect(heads[1]!.classes()).toContain("text-end");
    expect(w.findAll('[data-slot="table-cell"]')[1]!.text()).toBe("Done");
  });

  it("renders task lists as disabled checkboxes", () => {
    const w = render("- [x] done\n- [ ] todo");
    const boxes = w.findAll('input[type="checkbox"]');
    expect(boxes).toHaveLength(2);
    expect((boxes[0]!.element as HTMLInputElement).checked).toBe(true);
    expect(boxes[1]!.attributes("disabled")).toBeDefined();
    expect(w.find("li").classes()).toContain("task-list-item");
  });

  it("opens external links in a new tab and drops unsafe URLs and raw HTML", () => {
    const w = render("[a](https://x.dev) [b](/local) [c](javascript:alert(1)) <script>alert(1)</script><b>hi</b>");
    const links = w.findAll("a");
    expect(links[0]!.attributes("target")).toBe("_blank");
    expect(links[0]!.attributes("rel")).toBe("noopener noreferrer");
    expect(links[1]!.attributes("target")).toBeUndefined();
    expect(links[2]!.attributes("href")).toBeUndefined();
    expect(w.html()).not.toContain("<script");
    expect(w.find("b").exists()).toBe(false);
  });

  it("reads the Markdown from the default slot and merges classes", () => {
    const w = mount(NqMarkdown, { slots: { default: "# Hi" }, attrs: { class: "gap-6" } });
    expect(w.find("h1").text()).toBe("Hi");
    expect(w.classes()).toContain("gap-6");
    expect(w.classes()).not.toContain("gap-3");
  });
});

describe("parseMarkdown", () => {
  it("parses blockquotes, rules and nested lists", () => {
    const blocks = parseMarkdown("> quote\n\n---\n\n- a\n  - b");
    expect(blocks.map((b) => b.t)).toEqual(["bq", "hr", "ul"]);
  });
  it("filters URLs like react-markdown", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://a.b")).toBe("https://a.b");
    expect(safeUrl("/a:b")).toBe("/a:b");
  });
});

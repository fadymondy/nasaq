import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { docsAncestorIds, docsPageMarkdown, docsPages, docsPrevNext, docsSectionIds, docsTrail, filterDocsTree, type DocsNavNode } from "./docs-model";
import { NqDocsShell } from ".";

const nav: DocsNavNode[] = [
  { id: "intro", title: "Introduction" },
  { id: "guides", title: "Guides", children: [{ id: "install", title: "Installation", badge: "New" }, { id: "theme", title: "Theming" }] },
];
const pages = {
  intro: { id: "intro", title: "Introduction", description: "Why Nasaq.", markdown: "## Why\n\nText.\n\n### Detail\n\nMore." },
  install: { id: "install", title: "Installation", markdown: "## Install\n\nRun `pnpm add`.", updated: "2026-09-01", editHref: "/edit/install" },
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("docs model", () => {
  it("walks the tree", () => {
    expect(docsPages(nav).map((p) => p.id)).toEqual(["intro", "install", "theme"]);
    expect(docsTrail(nav, "install").map((n) => n.id)).toEqual(["guides", "install"]);
    expect(docsAncestorIds(nav, "install")).toEqual(["guides"]);
    expect(docsPrevNext(nav, "install")).toMatchObject({ prev: { id: "intro" }, next: { id: "theme" } });
    expect(docsSectionIds(nav)).toEqual(["guides"]);
  });

  it("filters by every word and keeps the section of a match", () => {
    expect(filterDocsTree(nav, "install").map((n) => n.id)).toEqual(["guides"]);
    expect(filterDocsTree(nav, "install")[0]?.children?.map((n) => n.id)).toEqual(["install"]);
    expect(filterDocsTree(nav, "guides")[0]?.children).toHaveLength(2);
    expect(filterDocsTree(nav, "zzz")).toEqual([]);
    expect(filterDocsTree(nav, "")).toHaveLength(2);
  });

  it("builds the copied page", () => {
    expect(docsPageMarkdown({ title: "T", description: "D", markdown: "# T\n\nBody" })).toBe("# T\n\nD\n\nBody\n");
  });
});

describe("NqDocsShell", () => {
  it("renders the page, breadcrumb, rail and pager", () => {
    const w = mount(NqDocsShell, { props: { nav, page: pages.install } });
    expect(w.attributes("data-slot")).toBe("docs-shell");
    expect(w.find("h1").text()).toBe("Installation");
    expect(w.find("[data-slot='breadcrumb-page']").text()).toBe("Installation");
    expect(w.find("[data-slot='docs-body'] h2").text()).toContain("Install");
    expect(w.find("[data-slot='docs-toc'] a").text()).toBe("Install");
    expect(w.find("nav[aria-label='Previous and next pages']").text()).toContain("Introduction");
    expect(w.find("nav[aria-label='Previous and next pages']").text()).toContain("Theming");
    expect(w.find("a[href='/edit/install']").text()).toBe("Edit this page");
    expect(w.find("time").exists()).toBe(true);
  });

  it("emits navigate from the pager", async () => {
    const w = mount(NqDocsShell, { props: { nav, page: pages.install } });
    await w.findAll("nav[aria-label='Previous and next pages'] button")[1]!.trigger("click");
    expect(w.emitted("navigate")?.[0]).toEqual(["theme"]);
  });

  it("filters the sidebar and shows the empty message", async () => {
    const w = mount(NqDocsShell, { props: { nav, page: pages.intro } });
    const aside = w.find("[data-slot='docs-sidebar']");
    expect(aside.findAll("[role='treeitem']").length).toBeGreaterThan(0);
    await aside.find("input[type='search']").setValue("zzz");
    expect(aside.text()).toContain("No pages match “zzz”.");
    expect(aside.find("button[aria-label='Clear filter']").exists()).toBe(true);
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount(() => h(NasaqProvider, { locale: "ar" }, () => h(NqDocsShell, { nav, page: pages.intro })));
    expect(w.find("[data-slot='docs-sidebar'] input").attributes("aria-label")).toBe("تصفية الصفحات");
    expect(w.find("nav[aria-label='الصفحتان السابقة والتالية']").exists()).toBe(true);
  });

  it("renders a body slot instead of the Markdown", () => {
    const w = mount(NqDocsShell, { props: { nav, page: pages.intro }, slots: { body: "<p id='mine'>Custom</p>" } });
    expect(w.find("#mine").exists()).toBe(true);
    expect(w.find("[data-slot='post-body']").exists()).toBe(false);
  });
});

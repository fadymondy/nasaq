import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NqDownloadableCodeBlock, NqFrontmatterTable, NqMarkdownTable, NqRichMarkdown, parseFenceMeta, parseMarkdownFrontmatter } from ".";

const SOURCE = `---
title: Q3 numbers
tags: [finance, report]
published: 2026-09-01
draft: false
---

| Region | Revenue |
| --- | ---: |
| Riyadh | $12,400 |
| Cairo | $8,900 |
| Dubai | $100 |

\`\`\`ts title="sum.ts" showLineNumbers {2}
const a = 1;
const b = 2;
\`\`\`
`;

const rows = (w: ReturnType<typeof mount>) => w.findAll("tbody tr").map((r) => r.findAll("td").map((c) => c.text()));

describe("NqRichMarkdown", () => {
  it("renders the frontmatter table, a sortable table and a downloadable code block", () => {
    const w = mount(NqRichMarkdown, { props: { source: SOURCE } });
    expect(w.attributes("data-slot")).toBe("rich-markdown");
    const fm = w.find('[data-slot="frontmatter-table"]');
    expect(fm.find(".eyebrow").text()).toBe("Properties");
    expect(fm.findAll("th")[0]!.text()).toBe("Title");
    expect(fm.findAll('[data-slot="badge"]').map((b) => b.text())).toEqual(["finance", "report"]);
    expect(fm.find("time").attributes("datetime")).toContain("2026-09-01");
    expect(fm.text()).toContain("No");
    expect(w.find('[data-slot="markdown-table"]').exists()).toBe(true);
    // The table has fewer than 6 rows: no filter box.
    expect(w.find('input[type="search"]').exists()).toBe(false);
    const block = w.find('[data-slot="code-block"]');
    expect(block.attributes("data-language")).toBe("ts");
    expect(block.find('[data-slot="code-block-header"]').text()).toContain("sum.ts");
    expect(block.findAll("[data-line]")).toHaveLength(2);
    // showLineNumbers turns the gutter on, {2} highlights line 2.
    expect(block.findAll("[data-line] > span[aria-hidden]")).toHaveLength(2);
    expect(block.findAll("[data-line]")[1]!.attributes("data-highlighted")).toBeDefined();
    expect(block.find('[aria-label="Line numbers"]').attributes("aria-pressed")).toBe("true");
    expect(block.find('[aria-label="Download file"]').exists()).toBe(true);
  });

  it("hides the frontmatter, and tables/code can be switched off", () => {
    const w = mount(NqRichMarkdown, { props: { source: SOURCE, frontmatter: "hide", tables: false, code: false } });
    expect(w.find('[data-slot="frontmatter-table"]').exists()).toBe(false);
    expect(w.find('[data-slot="markdown-table"]').exists()).toBe(false);
    expect(w.find('[data-slot="table"]').attributes("dir")).toBe("auto");
    expect(w.find('[aria-label="Download file"]').exists()).toBe(false);
  });

  it("sorts a markdown table by clicking a header", async () => {
    const w = mount(NqRichMarkdown, { props: { source: SOURCE, frontmatter: "hide" } });
    expect(rows(w).map((r) => r[0])).toEqual(["Riyadh", "Cairo", "Dubai"]);
    const heads = w.findAll("th");
    expect(heads[1]!.attributes("aria-sort")).toBe("none");
    await heads[1]!.find("button").trigger("click");
    expect(rows(w).map((r) => r[0])).toEqual(["Dubai", "Cairo", "Riyadh"]);
    expect(w.findAll("th")[1]!.attributes("aria-sort")).toBe("ascending");
    await w.findAll("th")[1]!.find("button").trigger("click");
    expect(rows(w).map((r) => r[0])).toEqual(["Riyadh", "Cairo", "Dubai"]);
    expect(w.findAll("th")[1]!.attributes("aria-sort")).toBe("descending");
    await w.findAll("th")[1]!.find("button").trigger("click");
    expect(w.findAll("th")[1]!.attributes("aria-sort")).toBe("none");
    expect(w.findAll("th")[1]!.classes()).toContain("text-end");
  });
});

describe("NqMarkdownTable", () => {
  const columns = [{ header: "Name" }, { header: h("b", "Total"), text: "Total", align: "end" as const }];
  const many = Array.from({ length: 7 }, (_, i) => ({ cells: [`Item ${i + 1}`, `$${(7 - i) * 10}`] }));

  it("shows the filter from six rows, filters with Arabic folding and counts rows", async () => {
    const w = mount(NqMarkdownTable, { props: { columns: [{ header: "الاسم" }], rows: [{ cells: ["كِتَاب"] }, { cells: ["قلم"] }, { cells: ["أحمد"] }, { cells: ["إبراهيم"] }, { cells: ["آلة"] }, { cells: ["باب"] }] } });
    const input = w.find('input[type="search"]');
    expect(input.attributes("aria-label")).toBe("Filter rows");
    expect(w.text()).toContain("6 of 6 rows");
    await input.setValue("كتاب");
    expect(rows(w)).toEqual([["كِتَاب"]]);
    expect(w.text()).toContain("1 of 6 rows");
    await input.setValue("zzz");
    expect(w.find("tbody").text()).toContain("No rows match “zzz”.");
    await w.find('button[aria-label="Clear filter"]').trigger("click");
    expect(rows(w)).toHaveLength(6);
  });

  it("sorts numbers by value, keeps the sort button name and announces it", async () => {
    const w = mount(NqMarkdownTable, { props: { columns, rows: many } });
    const btn = w.findAll("th")[1]!.find("button");
    expect(btn.attributes("title")).toBe("Sort by Total");
    await btn.trigger("click");
    expect(rows(w)[0]).toEqual(["Item 7", "$10"]);
    expect(w.find('[role="status"]').text()).toContain("Sorted by Total, ascending");
    expect(w.findAll("th")[1]!.attributes("aria-sort")).toBe("ascending");
  });

  it("not sortable renders the plain header, defaultSort applies, labels override", () => {
    const w = mount(NqMarkdownTable, { props: { columns, rows: many, sortable: false, filterable: true, labels: { filter: "Find" } } });
    expect(w.findAll("th button")).toHaveLength(0);
    expect(w.findAll("th")[1]!.attributes("aria-sort")).toBeUndefined();
    expect(w.find('input[type="search"]').attributes("placeholder")).toBe("Find");
    const sorted = mount(NqMarkdownTable, { props: { columns, rows: many, defaultSort: { column: 1, direction: "desc" } } });
    expect(rows(sorted)[0]![1]).toBe("$70");
  });

  it("downloads the visible rows as CSV with a byte-order mark", async () => {
    const blobs: Blob[] = [];
    const create = vi.fn((b: Blob) => (blobs.push(b), "blob:x"));
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const w = mount(NqMarkdownTable, { props: { columns, rows: many.slice(0, 2), downloadable: true, downloadName: "orders.csv" } });
    const btn = w.findAll("button").find((b) => b.text().includes("Download CSV"))!;
    await btn.trigger("click");
    await nextTick();
    expect(create).toHaveBeenCalled();
    const text = await blobs[0]!.text();
    expect(text).toContain("Name,Total");
    expect(text).toContain("Item 1,$70");
  });
});

describe("NqFrontmatterTable", () => {
  it("shows nothing for empty data and formats values", () => {
    expect(mount(NqFrontmatterTable, { props: { data: {} } }).find("section").exists()).toBe(false);
    const w = mount(NqFrontmatterTable, { props: { data: { publishDate: "2026-09-01", site: "https://nasaq.app", count: 3, ok: true, name: "Plan" }, title: "Meta" } });
    expect(w.find(".eyebrow").text()).toBe("Meta");
    expect(w.findAll("th").map((t) => t.text())).toEqual(["Publish date", "Site", "Count", "Ok", "Name"]);
    expect(w.find("a").attributes("target")).toBe("_blank");
    expect(w.find("a").attributes("dir")).toBe("ltr");
    expect(w.find("bdi.tabular-nums").text()).toBe("3");
    expect(w.text()).toContain("Yes");
  });
});

describe("NqDownloadableCodeBlock", () => {
  it("toggles line numbers", async () => {
    const w = mount(NqDownloadableCodeBlock, { props: { code: "a\nb", language: "ts" } });
    expect(w.findAll("[data-line] > span[aria-hidden]")).toHaveLength(0);
    const toggle = w.find('[aria-label="Line numbers"]');
    expect(toggle.attributes("aria-pressed")).toBe("false");
    await toggle.trigger("click");
    expect(w.findAll("[data-line] > span[aria-hidden]")).toHaveLength(2);
    expect(w.find('[aria-label="Line numbers"]').classes()).toContain("bg-nq-selected");
  });

  it("can hide the toggle and the download", () => {
    const w = mount(NqDownloadableCodeBlock, { props: { code: "a", lineNumberToggle: false, download: false } });
    expect(w.find('[aria-label="Line numbers"]').exists()).toBe(false);
    expect(w.find('[aria-label="Download file"]').exists()).toBe(false);
    expect(w.find('[data-slot="copy-button"]').exists()).toBe(true);
  });
});

describe("helpers", () => {
  it("parses frontmatter and fence meta", () => {
    expect(parseMarkdownFrontmatter("---\na: 1\n---\nbody").body).toBe("body");
    expect(parseFenceMeta('title="app.ts" showLineNumbers {2,4-6}')).toEqual({ title: "app.ts", lineNumbers: true, highlight: "2,4-6" });
  });
});

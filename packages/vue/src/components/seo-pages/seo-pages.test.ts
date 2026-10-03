import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqSeoIssueChecklist, NqSeoPageList, SEO_ISSUE_CATALOG, issueCounts, openIssues, scoreBand, seoScore, siteScore, sortIssues, type SeoIssue, type SeoPageRow } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const issues: SeoIssue[] = [
  { id: "a", code: "alt-missing", severity: "warning", detail: "3 images have no alt text" },
  { id: "b", code: "title-missing", severity: "error" },
  { id: "c", code: "og-image-missing", severity: "info", fixed: true },
];

const pages: SeoPageRow[] = [
  { id: "p1", url: "https://x.dev/", title: "Home", indexStatus: "indexed", issues: [], vitals: { LCP: 1900, INP: 120, CLS: 0.04 }, lastCrawled: "2026-09-29T06:00:00Z" },
  { id: "p2", url: "https://x.dev/pricing", indexStatus: "not-indexed", issues, vitals: { LCP: 4200 } },
  { id: "p3", url: "https://x.dev/draft", indexStatus: "blocked", issues: [{ id: "d", code: "noindex", severity: "error" }] },
];

describe("seo maths", () => {
  it("scores open issues by weight and bands the result", () => {
    expect(seoScore(issues)).toBe(100 - 4 - 10);
    expect(seoScore([])).toBe(100);
    expect(scoreBand(95)).toBe("good");
    expect(scoreBand(60)).toBe("fair");
    expect(scoreBand(20)).toBe("poor");
    expect(issueCounts(issues)).toMatchObject({ error: 1, warning: 1, info: 0, total: 2 });
    expect(openIssues(issues)).toHaveLength(2);
    expect(sortIssues(issues).map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(siteScore(pages)).toBe(Math.round((100 + 86 + 90) / 3));
    expect(SEO_ISSUE_CATALOG["title-missing"]!.severity).toBe("error");
  });
});

describe("NqSeoPageList", () => {
  it("lists pages worst score first with counts, status and vitals", () => {
    const w = mount(NqSeoPageList, { props: { pages } });
    expect(w.attributes("data-slot")).toBe("seo-page-list");
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.text()).toContain("https://x.dev/pricing");
    expect(rows[0]!.text()).toContain("1 error");
    expect(rows[0]!.text()).toContain("1 warning");
    expect(rows[0]!.text()).toContain("Not indexed");
    expect(rows[0]!.text()).toContain("LCP 4.2 s");
    expect(w.text()).toContain("No issues");
    expect(w.text()).toContain("No field data");
    expect(w.find('[data-band="good"]').exists()).toBe(true);
  });

  it("has row actions for each handler, and request indexing only for pages that can be indexed", () => {
    const w = mount(NqSeoPageList, { props: { pages, onOpen: () => {}, onRecrawl: async () => {}, onRequestIndexing: async () => {} } });
    expect(w.findAll('[data-slot="data-table-row-actions"]')).toHaveLength(3);
  });

  it("shows an alert when recrawling fails", async () => {
    const onRecrawl = vi.fn(async () => ({ error: "Crawler busy" }));
    const w = mount(NqSeoPageList, { props: { pages, onRecrawl }, attachTo: document.body });
    await w.find('[data-slot="data-table-row-actions"] button, button[data-slot="data-table-row-actions"]').trigger("click");
    await flushPromises();
    const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((e) => e.textContent?.includes("Crawl again"));
    expect(item).toBeTruthy();
    item!.click();
    await flushPromises();
    expect(onRecrawl).toHaveBeenCalled();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain("Crawler busy");
  });

  it("takes label overrides", () => {
    const w = mount(NqSeoPageList, { props: { pages, labels: { pagesTitle: "Audit" } } });
    expect(w.text()).toContain("Audit");
  });
});

describe("NqSeoIssueChecklist", () => {
  it("lists issues most severe first with the score", () => {
    const w = mount(NqSeoIssueChecklist, { props: { issues, url: "https://x.dev/pricing" } });
    expect(w.attributes("data-slot")).toBe("seo-issue-checklist");
    const items = w.findAll("li[data-severity]");
    expect(items.map((i) => i.attributes("data-severity"))).toEqual(["error", "warning", "info"]);
    expect(items[2]!.attributes("data-fixed")).toBeDefined();
    expect(items[0]!.text()).toContain("Missing title");
    expect(w.text()).toContain("SEO score 86 of 100");
    expect(w.text()).toContain("2 issues are open.");
    expect(w.text()).toContain("3 images have no alt text");
  });

  it("toggles an issue optimistically and reports the change", async () => {
    const onToggleFixed = vi.fn(async () => {});
    const w = mount(NqSeoIssueChecklist, { props: { issues, onToggleFixed } });
    await w.findAll('[role="checkbox"]')[0]!.trigger("click");
    await flushPromises();
    expect(onToggleFixed).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }), true);
  });

  it("shows an alert when saving fails", async () => {
    const w = mount(NqSeoIssueChecklist, { props: { issues, onToggleFixed: async () => ({ error: "Nope" }) } });
    await w.findAll('[role="checkbox"]')[0]!.trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain("Nope");
  });

  it("uses a custom catalog and an empty state", () => {
    const catalog = { "x-1": { severity: "warning" as const, en: { title: "Custom", why: "w", fix: "f" }, ar: { title: "مخصص", why: "w", fix: "f" } } };
    const w = mount(NqSeoIssueChecklist, { props: { issues: [{ id: "z", code: "x-1", severity: "warning" }], catalog } });
    expect(w.text()).toContain("Custom");
    const empty = mount(NqSeoIssueChecklist, { props: { issues: [] } });
    expect(empty.text()).toContain("Nothing to fix");
  });
});

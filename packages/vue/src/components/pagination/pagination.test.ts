import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqCursorPager, NqLoadMore, NqPagination, getPaginationItems } from ".";

describe("getPaginationItems", () => {
  it("keeps a constant number of slots with ellipsis", () => {
    expect(getPaginationItems(1, 24)).toEqual([1, 2, 3, 4, 5, "end-ellipsis", 24]);
    expect(getPaginationItems(12, 24)).toEqual([1, "start-ellipsis", 11, 12, 13, "end-ellipsis", 24]);
    expect(getPaginationItems(24, 24)).toEqual([1, "start-ellipsis", 20, 21, 22, 23, 24]);
    expect(getPaginationItems(2, 3)).toEqual([1, 2, 3]);
  });
});

describe("NqPagination", () => {
  it("renders a labelled nav with aria-current and Page N names", () => {
    const w = mount(NqPagination, { props: { page: 3, pageCount: 24 } });
    expect(w.attributes("aria-label")).toBe("Pagination");
    expect(w.attributes("data-slot")).toBe("pagination");
    const current = w.find('[aria-current="page"]');
    expect(current.text()).toBe("3");
    expect(current.attributes("aria-label")).toBe("Page 3");
    expect(current.classes()).toEqual(expect.arrayContaining(["border-primary", "bg-nq-selected", "tabular-nums"]));
    expect(w.find('[data-slot="pagination-ellipsis"]').text()).toContain("…");
    expect(w.find('[aria-label="Previous"]').exists()).toBe(true);
  });

  it("v-model:page and pageChange", async () => {
    const w = mount(NqPagination, { props: { page: 1, pageCount: 5 } });
    expect(w.find('[aria-label="Previous"]').attributes("disabled")).toBeDefined();
    await w.find('[aria-label="Next"]').trigger("click");
    expect(w.emitted("update:page")![0]).toEqual([2]);
    expect(w.emitted("pageChange")![0]).toEqual([2]);
    await w.find('[aria-label="Page 4"]').trigger("click");
    expect(w.emitted("update:page")!.at(-1)).toEqual([4]);
  });

  it("is Arabic inside an Arabic provider, with mirrored chevrons", () => {
    const w = mount({ components: { NasaqProvider, NqPagination }, template: `<NasaqProvider locale="ar" target="scope"><NqPagination :page="2" :page-count="9" /></NasaqProvider>` });
    expect(w.find("nav").attributes("aria-label")).toBe("ترقيم الصفحات");
    expect(w.find('[aria-label="الصفحة 2"]').exists()).toBe(true);
    expect(w.find('[aria-label="السابق"] svg').classes()).toContain("rtl:-scale-x-100");
  });
});

describe("NqCursorPager", () => {
  it("shows the range and emits previous/next", async () => {
    const w = mount(NqCursorPager, { props: { from: 21, to: 40, total: 95, hasPrevious: true, hasNext: false } });
    expect(w.attributes("data-slot")).toBe("cursor-pager");
    expect(w.text()).toContain("Showing 21–40 of 95");
    const [prev, next] = w.findAll("button");
    expect(next!.attributes("disabled")).toBeDefined();
    await prev!.trigger("click");
    expect(w.emitted("previous")).toHaveLength(1);
  });

  it("disables both while loading and omits the total when unknown", () => {
    const w = mount(NqCursorPager, { props: { from: 1, to: 20, hasPrevious: true, hasNext: true, loading: true } });
    expect(w.text()).toContain("Showing 1–20");
    expect(w.text()).not.toContain(" of ");
    expect(w.findAll("button").every((b) => b.attributes("disabled") !== undefined)).toBe(true);
  });
});

describe("NqLoadMore", () => {
  it("is a secondary button with the load-more slot and default text", async () => {
    const w = mount(NqLoadMore);
    expect(w.attributes("data-slot")).toBe("load-more");
    expect(w.text()).toBe("Load more");
    expect(w.classes()).toContain("bg-card");
  });

  it("loading blocks clicks", async () => {
    let n = 0;
    const w = mount(NqLoadMore, { props: { loading: true }, attrs: { onClick: () => n++ } });
    expect(w.attributes("aria-busy")).toBe("true");
    await w.trigger("click");
    expect(n).toBe(0);
  });
});

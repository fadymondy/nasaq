import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqSearchPerformanceTable } from ".";

const rows = [
  { id: "a", label: "rtl react components", clicks: 420, impressions: 9800, position: 4.2, previousClicks: 380, previousPosition: 5.1 },
  { id: "b", label: "arabic design system", clicks: 900, impressions: 12000, position: 2.1 },
];

describe("NqSearchPerformanceTable", () => {
  it("renders rows sorted by clicks desc with change and CTR", () => {
    const w = mount(NqSearchPerformanceTable, { props: { rows } });
    expect(w.attributes("data-slot")).toBe("search-performance-table");
    expect(w.text()).toContain("Search queries");
    const body = w.findAll("tbody tr");
    expect(body).toHaveLength(2);
    expect(body[0]!.text()).toContain("arabic design system");
    expect(w.text()).toContain("+11%");
    expect(w.text()).toContain("4.3%");
  });

  it("filters by the search box and opens a row", async () => {
    const onRowClick = vi.fn();
    const w = mount(NqSearchPerformanceTable, { props: { rows, onRowClick } });
    await w.get("input").setValue("rtl");
    expect(w.findAll("tbody tr")).toHaveLength(1);
    await w.get("tbody tr").trigger("click");
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
  });

  it("shows the empty state", () => {
    const w = mount(NqSearchPerformanceTable, { props: { rows: [] } });
    expect(w.text()).toContain("No search data for this period");
  });
});

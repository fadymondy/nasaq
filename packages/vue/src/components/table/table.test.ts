import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from ".";

const Demo = defineComponent({
  components: { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow },
  props: ["tableProps"],
  template: `<NqTable v-bind="tableProps"><NqTableHeader><NqTableRow><NqTableHead>Key</NqTableHead></NqTableRow></NqTableHeader>
    <NqTableBody><NqTableRow data-state="selected"><NqTableCell class="text-end">MH-1</NqTableCell></NqTableRow></NqTableBody></NqTable>`,
});

describe("NqTable", () => {
  it("renders a labelled, focusable scroll region around the table with the React classes", () => {
    const w = mount(Demo, { props: { tableProps: { label: "Issues", class: "min-w-96" } } });
    const region = w.find('[data-slot="table-container"]');
    expect(region.attributes("role")).toBe("region");
    expect(region.attributes("tabindex")).toBe("0");
    expect(region.attributes("aria-label")).toBe("Issues");
    const table = w.find("table");
    expect(table.attributes("data-density")).toBe("default");
    expect(table.classes()).toEqual(expect.arrayContaining(["w-full", "caption-bottom", "min-w-96"]));
    expect(w.find("th").attributes("scope")).toBe("col");
    expect(w.find("th").classes()).toContain("px-4");
    expect(w.find("td").classes()).toEqual(expect.arrayContaining(["h-row", "text-end"]));
  });

  it("density, frame, bordered and striped flow to the cells and rows", () => {
    const w = mount(Demo, { props: { tableProps: { density: "compact", frame: true, bordered: true, striped: true, hover: false } } });
    expect(w.find('[data-slot="table-container"]').classes()).toContain("rounded-card");
    const table = w.find("table");
    expect(table.attributes("data-frame")).toBeDefined();
    expect(table.attributes("data-bordered")).toBeDefined();
    expect(table.attributes("data-striped")).toBeDefined();
    expect(w.find("td").classes()).toContain("px-2");
    const row = w.find("tbody tr");
    expect(row.classes()).toContain("even:bg-secondary/40");
    expect(row.classes()).not.toContain("hover:bg-nq-hover");
    expect(row.attributes("aria-selected")).toBe("true");
    expect(row.attributes("data-state")).toBe("selected");
  });
});

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import {
  NqDataTable,
  NqDataTableBulkActions,
  NqDataTablePagination,
  NqDataTableSearch,
  nextSorting,
  useDataTable,
  type DataTableColumn,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

interface Row {
  id: string;
  name: string;
  qty: number;
}
const data: Row[] = [
  { id: "a", name: "Bravo", qty: 3 },
  { id: "b", name: "Alpha", qty: 9 },
  { id: "c", name: "Charlie", qty: 1 },
];
const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name, searchValue: (r) => r.name },
  { id: "qty", header: "Qty", cell: (r) => String(r.qty), sortValue: (r) => r.qty, edit: { type: "number" } },
];

function host(opts: { pageSize?: number; selectable?: boolean; onCellEdit?: (...a: unknown[]) => unknown } = {}) {
  return defineComponent({
    setup() {
      const table = useDataTable({ data, columns, getRowId: (r) => r.id, pageSize: opts.pageSize, selectable: opts.selectable });
      return () =>
        h("div", [
          h(NqDataTableSearch, { table: table as never }),
          h(NqDataTable, { table: table as never, label: "Items", onCellEdit: opts.onCellEdit as never, rowActions: () => [{ id: "x", label: "Do", onSelect: () => {} }] }),
          h(NqDataTableBulkActions, { table: table as never }),
          h(NqDataTablePagination, { table: table as never }),
        ]);
    },
  });
}
const names = (w: ReturnType<typeof mount>) => w.findAll("tbody tr[data-row]").map((r) => r.findAll("td")[0]!.text());

describe("logic", () => {
  it("cycles sort", () => {
    expect(nextSorting([], "a")[0]).toMatchObject({ id: "a", direction: "asc" });
  });
});

describe("NqDataTable", () => {
  it("renders rows and headers", () => {
    const w = mount(host(), { attachTo: document.body });
    expect(w.find("table").exists()).toBe(true);
    expect(names(w)).toEqual(["Bravo", "Alpha", "Charlie"]);
    expect(w.find("[role=region]").attributes("aria-label")).toBe("Items");
  });
  it("sorts when a header is clicked", async () => {
    const w = mount(host(), { attachTo: document.body });
    await w.find("thead th button").trigger("click");
    expect(names(w)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(w.find("thead th").attributes("aria-sort")).toBe("ascending");
  });
  it("searches", async () => {
    const w = mount(host(), { attachTo: document.body });
    await w.find("input[type=search]").setValue("char");
    expect(names(w)).toEqual(["Charlie"]);
    await w.find("input[type=search]").trigger("keydown", { key: "Escape" });
    expect(names(w)).toHaveLength(3);
  });
  it("shows the filtered empty state", async () => {
    const w = mount(host(), { attachTo: document.body });
    await w.find("input[type=search]").setValue("zzz");
    expect(w.text()).toContain("No matching results");
  });
  it("selects rows and shows the bulk bar", async () => {
    const w = mount(host({ selectable: true }), { attachTo: document.body });
    const bar = w.find("[data-slot=data-table-bulk-actions]");
    expect(bar.attributes("hidden")).toBeDefined();
    await w.findAll("tbody [role=checkbox]")[0]!.trigger("click");
    expect(w.find("tbody tr[data-row]").attributes("data-state")).toBe("selected");
    expect(w.find("[data-slot=data-table-bulk-actions]").attributes("hidden")).toBeUndefined();
    expect(w.find("[data-slot=data-table-bulk-actions]").text()).toContain("1 selected");
  });
  it("paginates", async () => {
    const w = mount(host({ pageSize: 2 }), { attachTo: document.body });
    expect(names(w)).toHaveLength(2);
    expect(w.find("[data-slot=data-table-pagination]").text()).toContain("1–2 of 3");
    await w.find("[aria-label='Next page']").trigger("click");
    expect(names(w)).toHaveLength(1);
  });
  it("moves row focus with the arrow keys", async () => {
    const w = mount(host(), { attachTo: document.body });
    const rows = w.findAll("tbody tr[data-row]");
    (rows[0]!.element as HTMLElement).focus();
    await rows[0]!.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(rows[1]!.element);
  });
  it("edits a cell and calls onCellEdit", async () => {
    const onCellEdit = vi.fn(async () => undefined);
    const w = mount(host({ onCellEdit }), { attachTo: document.body });
    const cell = w.find("[data-cell-row=a][data-cell-col=qty]");
    await cell.trigger("dblclick");
    const input = w.find("[data-cell-row=a][data-cell-col=qty] input");
    expect(input.exists()).toBe(true);
    await input.setValue("12");
    await input.trigger("keydown", { key: "Enter" });
    await nextTick();
    expect(onCellEdit).toHaveBeenCalledWith(data[0], "qty", 12);
  });
  it("shows the loading skeleton and the error state", async () => {
    const T = defineComponent({
      setup() {
        const table = useDataTable({ data: [], columns, getRowId: (r: Row) => r.id });
        return () => h("div", [h(NqDataTable, { table: table as never, label: "x", loading: true }), h(NqDataTable, { table: table as never, label: "y", error: true })]);
      },
    });
    const w = mount(T);
    expect(w.find("[aria-busy=true]").exists()).toBe(true);
    expect(w.text()).toContain("Couldn't load this list");
  });
});

describe("NqDataTable: multi-sort, pinning, resizing, ranges, expansion", () => {
  function adv(opts: Record<string, unknown>, tableProps: Record<string, unknown> = {}) {
    const cols: DataTableColumn<Row>[] = [
      { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name, pin: "start", size: 200 },
      { id: "qty", header: "Qty", cell: (r) => String(r.qty), sortValue: (r) => r.qty, rangeValue: (r) => r.qty },
    ];
    let table!: ReturnType<typeof useDataTable<Row>>;
    const C = defineComponent({
      setup() {
        table = useDataTable({ data, columns: cols, getRowId: (r) => r.id, ...opts });
        return () => h(NqDataTable, { table: table as never, label: "Items", ...tableProps });
      },
    });
    return { w: mount(C, { attachTo: document.body }), get table() { return table; } };
  }
  const head = (w: ReturnType<typeof mount>, id: string) => w.find(`th[data-col=${id}]`);

  it("sorts by several columns with Shift and gives later keys a screen-reader priority", async () => {
    const { w } = adv({ multiSort: true });
    await head(w, "name").find("button").trigger("click");
    await head(w, "qty").find("button").trigger("click", { shiftKey: true });
    expect(head(w, "name").attributes("aria-sort")).toBe("ascending");
    expect(head(w, "qty").attributes("aria-sort")).toBeUndefined();
    expect(head(w, "qty").find(".sr-only").text()).toBe("sort 2, ascending");
    expect(head(w, "name").find(".sr-only").exists()).toBe(false);
    expect(head(w, "name").find("[data-slot=data-table-sort-index]").text()).toBe("1");
  });

  it("pins a column and moves it with pinColumn", async () => {
    const { w, table } = adv({});
    expect(head(w, "name").attributes("data-pin")).toBe("start");
    expect(head(w, "qty").attributes("data-pin")).toBeUndefined();
    table.pinColumn("qty", "end");
    await nextTick();
    expect(head(w, "qty").attributes("data-pin")).toBe("end");
    table.pinColumn("name", null);
    await nextTick();
    expect(head(w, "name").attributes("data-pin")).toBeUndefined();
  });

  it("resizes from the handle with the keyboard, within limits, and resets on double-click", async () => {
    const { w, table } = adv({ resizable: true });
    const handle = () => head(w, "name").find("[data-slot=data-table-resize-handle]");
    expect(handle().attributes("role")).toBe("separator");
    expect(handle().attributes("aria-valuenow")).toBe("200");
    await handle().trigger("keydown", { key: "ArrowRight" });
    expect(handle().attributes("aria-valuenow")).toBe("216");
    await handle().trigger("keydown", { key: "ArrowRight", shiftKey: true });
    expect(handle().attributes("aria-valuenow")).toBe("280");
    table.setColumnSize("name", 5000);
    await nextTick();
    expect(handle().attributes("aria-valuenow")).toBe("960");
    await handle().trigger("dblclick");
    expect(handle().attributes("aria-valuenow")).toBeUndefined();
  });

  it("filters by a numeric range", async () => {
    const { w, table } = adv({});
    table.setRange("qty", { min: 3 });
    await nextTick();
    expect(names(w)).toEqual(["Bravo", "Alpha"]);
    table.setRange("qty", { min: 3, max: 3 });
    await nextTick();
    expect(names(w)).toEqual(["Bravo"]);
    table.setRange("qty", null);
    await nextTick();
    expect(names(w)).toHaveLength(3);
  });

  it("expands a row to the details, only for rows that can expand", async () => {
    const { w } = adv({}, { renderExpanded: (r: Row) => h("p", `More on ${r.name}`), canExpand: (r: Row) => r.id !== "c" });
    const rows = w.findAll("tbody tr[data-row]");
    expect(rows[2]!.attributes("aria-expanded")).toBeUndefined();
    await rows[0]!.find("button[aria-expanded]").trigger("click");
    expect(w.find("[data-slot=data-table-expanded]").text()).toContain("More on Bravo");
    expect(w.find("[data-slot=data-table-expanded] section").attributes("aria-label")).toBe("Details for a");
    await w.findAll("tbody tr[data-row]")[0]!.find("button[aria-expanded]").trigger("click");
    expect(w.find("[data-slot=data-table-expanded]").exists()).toBe(false);
  });
});


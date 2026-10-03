import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqContentTableEditor, contentTableToCsv, type ContentTableValue } from ".";

const table = (): ContentTableValue => ({
  columns: [
    { id: "name", label: "Name", type: "text", required: true },
    { id: "qty", label: "Qty", type: "number" },
    { id: "ok", label: "Done", type: "checkbox" },
  ],
  rows: [
    { id: "r1", cells: { name: "Coffee", qty: 12, ok: false } },
    { id: "r2", cells: { name: "Tea", qty: 8, ok: true } },
    { id: "r3", cells: { name: "", qty: null, ok: false } },
  ],
});

const cells = (w: ReturnType<typeof mount>) => w.findAll('[role="gridcell"]');

describe("NqContentTableEditor", () => {
  it("renders the grid with sums and counts, and flags the required cell", () => {
    const w = mount(NqContentTableEditor, { props: { defaultValue: table() } });
    expect(w.attributes("data-slot")).toBe("content-table-editor");
    expect(w.find('table[role="grid"]').exists()).toBe(true);
    expect(cells(w)).toHaveLength(9);
    expect(w.find("tfoot").text()).toContain("20");
    expect(w.text()).toContain("1 to fix");
    expect(w.find('[data-row="r3"][data-col="0"]').attributes("aria-invalid")).toBe("true");
  });

  it("moves between cells with the arrow keys and edits by typing", async () => {
    const onUpdate = vi.fn();
    const w = mount(NqContentTableEditor, { props: { defaultValue: table(), "onUpdate:modelValue": onUpdate }, attachTo: document.body });
    const first = w.find('[data-row="r1"][data-col="0"]');
    expect(first.attributes("tabindex")).toBe("0");
    (first.element as HTMLElement).focus();
    await first.trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    expect(document.activeElement).toBe(w.find('[data-row="r2"][data-col="0"]').element);
    await w.find('[data-row="r2"][data-col="0"]').trigger("keydown", { key: "x" });
    const input = w.find('input[aria-label^="Name"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe("x");
    await input.setValue("Mint");
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(onUpdate).toHaveBeenCalled();
    const next = onUpdate.mock.calls.at(-1)![0] as ContentTableValue;
    expect(next.rows[1]!.cells.name).toBe("Mint");
    w.unmount();
  });

  it("sorts from the header and keeps empty cells last", async () => {
    const w = mount(NqContentTableEditor, { props: { defaultValue: table() } });
    await w.find("thead th[aria-sort] button")!.trigger("click");
    const names = w.findAll('[data-col="0"]').map((c) => c.text());
    expect(names.slice(0, 2)).toEqual(["Coffee", "Tea"]);
    expect(w.find("thead th[aria-sort]").attributes("aria-sort")).toBe("ascending");
  });

  it("filters rows by search and shows the count", async () => {
    const w = mount(NqContentTableEditor, { props: { defaultValue: table() } });
    await w.find('input[aria-label="Search rows"]').setValue("tea");
    expect(w.findAll('[data-col="0"]')).toHaveLength(1);
    expect(w.text()).toContain("1 of 3 rows");
  });

  it("toggles a checkbox cell, then undoes and redoes", async () => {
    const w = mount(NqContentTableEditor, { props: { defaultValue: table() } });
    const undo = () => w.find('button[aria-label="Undo"]');
    expect(undo().attributes("disabled")).toBeDefined();
    await w.find('[data-row="r1"][data-col="2"]').trigger("keydown", { key: " " });
    expect(w.find('[data-row="r1"][data-col="2"] [role="checkbox"]').attributes("aria-checked")).toBe("true");
    expect(w.find("tfoot").text()).toContain("2 checked");
    await undo().trigger("click");
    expect(w.find('[data-row="r1"][data-col="2"] [role="checkbox"]').attributes("aria-checked")).toBe("false");
    await w.find('button[aria-label="Redo"]').trigger("click");
    expect(w.find("tfoot").text()).toContain("2 checked");
  });

  it("adds a row and exports CSV through onExport", async () => {
    const onExport = vi.fn();
    const w = mount(NqContentTableEditor, { props: { defaultValue: table(), onExport } });
    await w.findAll("button").find((b) => b.text() === "Add row")!.trigger("click");
    expect(w.findAll("tbody tr")).toHaveLength(4);
    await w.findAll("button").find((b) => b.text() === "Export CSV")!.trigger("click");
    expect(onExport).toHaveBeenCalledTimes(1);
    expect((onExport.mock.calls[0]![0] as string).split("\r\n")[0]).toBe("Name,Qty,Done");
    expect(contentTableToCsv(table())).toContain("Coffee,12,false");
  });

  it("shows save states and blocks Save while there are issues", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const value = table();
    value.rows.pop();
    const w = mount(NqContentTableEditor, { props: { defaultValue: value, onSave } });
    const saveBtn = () => w.findAll("button").find((b) => b.text() === "Save")!;
    expect(w.text()).toContain("Saved");
    expect(saveBtn().attributes("disabled")).toBeDefined();
    await w.find('[data-row="r1"][data-col="2"]').trigger("keydown", { key: " " });
    expect(w.text()).toContain("Unsaved changes");
    await saveBtn().trigger("click");
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(w.text()).toContain("Saved");
  });

  it("is read only: no add, no row menus, no edits", async () => {
    const w = mount(NqContentTableEditor, { props: { defaultValue: table(), readOnly: true } });
    expect(w.findAll("button").some((b) => b.text() === "Add row")).toBe(false);
    expect(w.find('button[aria-label^="Actions for row"]').exists()).toBe(false);
    await w.find('[data-row="r1"][data-col="0"]').trigger("keydown", { key: "x" });
    expect(w.find('input[aria-label^="Name"]').exists()).toBe(false);
  });

  it("speaks Arabic with the Arabic locale", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqContentTableEditor, { defaultValue: table() })) });
    expect(w.text()).toContain("إضافة صف");
    expect(w.find('table[role="grid"]').attributes("aria-label")).toBe("جدول المحتوى");
  });
});

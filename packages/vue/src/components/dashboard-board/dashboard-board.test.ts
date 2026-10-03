import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NqDashboardBoard, dashboardBoardNormalize, dashboardBoardReorder, dashboardBoardTogglePin, boardColumns } from ".";

const widgets = [
  { type: "revenue", title: "Revenue", render: () => h("p", "48,200") },
  { type: "orders", title: "Orders", render: () => h("p", "318") },
  { type: "notes", title: "Notes", unique: true, render: () => h("p", "Hello") },
];
const layout = [
  { id: "revenue-1", type: "revenue", cols: 2, rows: 1 },
  { id: "orders-1", type: "orders", cols: 1, rows: 1 },
];

afterEach(() => {
  document.body.innerHTML = "";
});

const flush = async () => {
  await nextTick();
  await nextTick();
};
const byText = (root: ParentNode, text: string) => [...root.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);

describe("dashboard board math", () => {
  it("normalises, reorders, pins and picks columns", () => {
    const limits = widgets.map((w) => ({ type: w.type, minCols: 1, maxCols: 4, minRows: 1, maxRows: 4 }));
    expect(dashboardBoardNormalize([...layout, { id: "x", type: "ghost", cols: 1, rows: 1 }], limits)).toHaveLength(2);
    expect(dashboardBoardReorder(layout, "revenue-1", "orders-1").map((i) => i.id)).toEqual(["orders-1", "revenue-1"]);
    expect(dashboardBoardTogglePin(layout, "orders-1")[0]!.id).toBe("orders-1");
    expect([boardColumns(400), boardColumns(700), boardColumns(1200)]).toEqual([1, 2, 4]);
  });
});

describe("NqDashboardBoard", () => {
  it("renders titled cards with widget content and no editing controls", () => {
    const w = mount(NqDashboardBoard, { props: { widgets, layout, onSave: vi.fn(), title: "Overview" }, attachTo: document.body });
    const root = w.element as HTMLElement;
    expect(root.getAttribute("data-slot")).toBe("dashboard-board");
    expect(root.querySelector("h2")!.textContent).toBe("Overview");
    expect([...root.querySelectorAll("h3")].map((h) => h.textContent)).toEqual(["Revenue", "Orders"]);
    expect(root.textContent).toContain("48,200");
    expect(root.querySelectorAll('[data-slot="dashboard-board-card"]')).toHaveLength(2);
    expect(byText(root, "Customise")).toBeTruthy();
    expect(root.querySelector("[data-board-handle]")).toBeNull();
  });

  it("edits, shows handles and Save is disabled until something changes", async () => {
    const w = mount(NqDashboardBoard, { props: { widgets, layout, onSave: vi.fn() }, attachTo: document.body });
    const root = w.element as HTMLElement;
    byText(root, "Customise")!.click();
    await flush();
    expect(root.textContent).toContain("Editing the dashboard");
    expect(root.querySelectorAll("[data-board-handle]")).toHaveLength(2);
    const save = byText(root, "Save")!;
    expect(save.disabled).toBe(true);
    byText(root, "Cancel")!.click();
    await flush();
    expect(root.querySelector("[data-board-handle]")).toBeNull();
  });

  it("reorders with the keyboard and saves the new layout", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqDashboardBoard, { props: { widgets, layout, onSave, defaultEditing: true }, attachTo: document.body });
    const root = w.element as HTMLElement;
    const handle = root.querySelector<HTMLElement>('[data-board-handle="revenue-1"]')!;
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await flush();
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await flush();
    handle.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await flush();
    expect([...root.querySelectorAll("h3")].map((h) => h.textContent)).toEqual(["Orders", "Revenue"]);
    const save = byText(root, "Save")!;
    expect(save.disabled).toBe(false);
    save.click();
    await flush();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0].map((i: { id: string }) => i.id)).toEqual(["orders-1", "revenue-1"]);
  });

  it("pins from the card toggle and shows an error when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("no"));
    const w = mount(NqDashboardBoard, { props: { widgets, layout, onSave, defaultEditing: true }, attachTo: document.body });
    const root = w.element as HTMLElement;
    root.querySelectorAll<HTMLElement>('button[aria-pressed]:not([data-board-handle])')[1]!.click();
    await flush();
    expect(root.querySelectorAll("li[data-board-id]")[0]!.getAttribute("data-board-id")).toBe("orders-1");
    byText(root, "Save")!.click();
    await new Promise((r) => setTimeout(r, 10));
    await flush();
    expect(root.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("adds a widget from the catalogue", async () => {
    const w = mount(NqDashboardBoard, { props: { widgets, layout, onSave: vi.fn(), defaultEditing: true }, attachTo: document.body });
    const root = w.element as HTMLElement;
    byText(root, "Add widget")!.click();
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    const add = document.body.querySelector<HTMLButtonElement>('[aria-label="Add widget: Notes"]');
    expect(add).toBeTruthy();
    add!.click();
    await flush();
    expect([...root.querySelectorAll("h3")].map((h) => h.textContent)).toContain("Notes");
  });

  it("shows loading, error and empty states", () => {
    const loading = mount(NqDashboardBoard, { props: { widgets, layout, onSave: vi.fn(), loading: true } });
    expect(loading.find("ul[aria-label]").exists()).toBe(false);
    const empty = mount(NqDashboardBoard, { props: { widgets, layout: [], onSave: vi.fn() } });
    expect(empty.text()).toContain("Customise");
    const err = mount(NqDashboardBoard, { props: { widgets, layout, onSave: vi.fn(), error: "Broke" } });
    expect(err.text()).toContain("Broke");
  });
});

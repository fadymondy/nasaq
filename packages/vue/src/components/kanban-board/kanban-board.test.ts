import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NqKanbanBoard } from ".";
import { dropTarget, groupCards, keyMove, placeCard } from "./kanban-logic";

const columns = [
  { id: "todo", title: "To do" },
  { id: "done", title: "Done" },
];
const cards = [
  { id: "a", columnId: "todo", title: "Write the brief", labels: [{ label: "Docs", hue: "blue" as const }], assignee: { name: "Sara Ali" } },
  { id: "b", columnId: "todo", title: "Review copy" },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("kanban logic", () => {
  it("groups, places and finds drop targets", () => {
    const items = groupCards(columns, cards);
    expect(items).toEqual({ todo: ["a", "b"], done: [] });
    expect(placeCard(items, "a", "done", 0)).toEqual({ todo: ["b"], done: ["a"] });
    expect(placeCard(items, "a", "todo", 1)).toEqual({ todo: ["b", "a"], done: [] });
    const geo = [
      { id: "todo", left: 0, right: 100, centers: [10, 50] },
      { id: "done", left: 120, right: 220, centers: [] },
    ];
    expect(dropTarget(geo, 50, 30)).toEqual({ column: "todo", index: 1 });
    expect(dropTarget(geo, 115, 30)).toEqual({ column: "done", index: 0 });
  });

  it("maps arrow keys, flipping left and right in RTL", () => {
    const items = groupCards(columns, cards);
    expect(keyMove(items, columns, "a", "ArrowDown", false)).toEqual({ column: "todo", index: 1 });
    expect(keyMove(items, columns, "a", "ArrowRight", false)).toEqual({ column: "done", index: 0 });
    expect(keyMove(items, columns, "a", "ArrowLeft", true)).toEqual({ column: "done", index: 0 });
    expect(keyMove(items, columns, "a", "ArrowUp", false)).toBeNull();
  });
});

describe("NqKanbanBoard", () => {
  it("renders the columns, cards and counts", () => {
    const w = mount(NqKanbanBoard, { props: { columns, cards, onMove: () => {} }, attachTo: document.body });
    expect(w.findAll('[data-slot="kanban-column"]')).toHaveLength(2);
    expect(w.findAll('[data-slot="kanban-item"]')).toHaveLength(2);
    expect(w.find('[data-slot="kanban-empty"]').text()).toBe("No cards");
    expect(w.find('[data-slot="kanban-card"]').text()).toContain("Docs");
    expect(w.find('[data-slot="kanban-column-header"] [aria-label]').attributes("aria-label")).toBe("2 cards");
    w.unmount();
  });

  it("lifts with Space, moves with the arrows and drops with Space", async () => {
    const onMove = vi.fn();
    const w = mount(NqKanbanBoard, { props: { columns, cards, onMove }, attachTo: document.body });
    const item = () => w.find('[data-card-id="a"]');
    await item().trigger("keydown", { key: " " });
    expect(item().attributes("aria-pressed")).toBe("true");
    expect(w.find('[role="status"]').text()).toContain("Picked up Write the brief");
    await item().trigger("keydown", { key: "ArrowRight" });
    await nextTick();
    expect(w.findAll('[data-slot="kanban-column"]')[1]!.find('[data-card-id="a"]').exists()).toBe(true);
    await item().trigger("keydown", { key: " " });
    expect(onMove).toHaveBeenCalledWith("a", "done", 0);
    expect(w.find('[role="status"]').text()).toContain("Dropped Write the brief in Done");
    w.unmount();
  });

  it("cancels with Escape without calling onMove", async () => {
    const onMove = vi.fn();
    const w = mount(NqKanbanBoard, { props: { columns, cards, onMove }, attachTo: document.body });
    await w.find('[data-card-id="a"]').trigger("keydown", { key: "Enter" });
    await w.find('[data-card-id="a"]').trigger("keydown", { key: "ArrowDown" });
    await w.find('[data-card-id="a"]').trigger("keydown", { key: "Escape" });
    expect(onMove).not.toHaveBeenCalled();
    expect(w.findAll('[data-slot="kanban-list"]')[0]!.findAll("[data-card-id]").map((e) => e.attributes("data-card-id"))).toEqual(["a", "b"]);
    expect(w.find('[role="status"]').text()).toContain("Move cancelled");
    w.unmount();
  });

  it("drags with the pointer to another column", async () => {
    const onMove = vi.fn();
    const w = mount(NqKanbanBoard, { props: { columns, cards, onMove }, attachTo: document.body });
    const cols = w.findAll('[data-slot="kanban-column"]');
    const rect = (l: number, r: number) => ({ left: l, right: r, top: 0, bottom: 300, width: r - l, height: 300, x: l, y: 0, toJSON: () => ({}) }) as DOMRect;
    cols[0]!.element.getBoundingClientRect = () => rect(0, 100);
    cols[1]!.element.getBoundingClientRect = () => rect(120, 220);
    w.find('[data-card-id="a"]').element.getBoundingClientRect = () => rect(0, 100);
    await w.find('[data-card-id="a"]').trigger("pointerdown", { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 150, clientY: 20, bubbles: true, cancelable: true }));
    await nextTick();
    expect(w.find('[data-slot="kanban-overlay"]').exists()).toBe(true);
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: 150, clientY: 20, bubbles: true }));
    await nextTick();
    expect(onMove).toHaveBeenCalledWith("a", "done", 0);
    expect(w.find('[data-slot="kanban-overlay"]').exists()).toBe(false);
    w.unmount();
  });
});

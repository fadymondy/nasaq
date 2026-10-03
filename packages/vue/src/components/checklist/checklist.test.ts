import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqChecklist, toggleItem, type ChecklistItem } from ".";

const items: ChecklistItem[] = [
  { id: "1", text: "Write the brief", done: true },
  { id: "2", text: "Launch", done: false, subtasks: [{ id: "2a", text: "Draft", done: true }, { id: "2b", text: "Post", done: false }] },
];

describe("NqChecklist", () => {
  it("shows leaf progress, a mixed parent and subtasks", () => {
    const w = mount(NqChecklist, { props: { items, onToggle: vi.fn() } });
    expect(w.findAll('[data-slot="checklist-item"]')).toHaveLength(4);
    expect(w.find('[data-slot="progress"]').exists()).toBe(true);
    expect(w.text()).toContain("2 of 3 done");
    expect(w.find('[aria-label="Launch"]').attributes("aria-checked")).toBe("mixed");
  });

  it("toggles through the callback and shows a returned error", async () => {
    const onToggle = vi.fn(async () => ({ error: "Locked" }));
    const w = mount(NqChecklist, { props: { items, onToggle } });
    await w.find('[aria-label="Write the brief"]').trigger("click");
    await flushPromises();
    expect(onToggle).toHaveBeenCalledWith("1", false);
    expect(w.text()).toContain("Locked");
  });

  it("adds an item from the add row and hides it when read-only", async () => {
    const onAdd = vi.fn(async () => {});
    const w = mount(NqChecklist, { props: { items, onToggle: vi.fn(), onAdd } });
    await w.find('input[aria-label="New item"]').setValue("Ship it");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onAdd).toHaveBeenCalledWith("Ship it");
    await w.setProps({ readOnly: true });
    expect(w.find("form").exists()).toBe(false);
  });

  it("toggleItem cascades to subtasks", () => {
    const out = toggleItem(items, "2", true);
    expect(out[1]!.subtasks!.every((s) => s.done)).toBe(true);
  });
});

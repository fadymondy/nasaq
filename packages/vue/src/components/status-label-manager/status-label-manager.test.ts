import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqStatusLabelManager, groupByStage, moveWithinStage, validateName, type WorkStatus } from ".";

const statuses: WorkStatus[] = [
  { id: "s1", name: "To do", hue: "gray", stage: "todo", usage: 12 },
  { id: "s4", name: "Ready", hue: "teal", stage: "todo", usage: 0 },
  { id: "s3", name: "Shipped", hue: "green", stage: "done", usage: 31 },
];
const labels = [{ id: "l1", name: "Design", hue: "violet" as const, usage: 3 }];
const props = () => ({
  statuses,
  labels,
  onSaveStatus: vi.fn(async () => undefined),
  onDeleteStatus: vi.fn(async () => undefined),
  onReorderStatuses: vi.fn(async () => undefined),
  onSaveLabel: vi.fn(async () => undefined),
  onDeleteLabel: vi.fn(async () => undefined),
});
const byLabel = (label: string) => document.body.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
const buttonText = (text: string) => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;

describe("status label model", () => {
  it("validates, groups and reorders within a stage", () => {
    expect(validateName("", statuses)).toBe("empty");
    expect(validateName("to do", statuses)).toBe("duplicate");
    expect(validateName("to do", statuses, "s1")).toBeNull();
    expect(validateName("x".repeat(33), statuses)).toBe("tooLong");
    expect(groupByStage(statuses).map((g) => g.items.length)).toEqual([0, 2, 0, 0, 1, 0]);
    expect(moveWithinStage(statuses, "s1", 1)).toEqual(["s4", "s1", "s3"]);
    expect(moveWithinStage(statuses, "s1", -1)).toEqual(["s1", "s4", "s3"]);
  });
});

describe("NqStatusLabelManager", () => {
  it("renders a card per stage with usage, and no warning when a done stage exists", () => {
    const w = mount(NqStatusLabelManager, { props: props(), attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("status-label-manager");
    expect(w.findAll("[data-stage]").map((c) => c.attributes("data-stage"))).toEqual(["backlog", "todo", "active", "review", "done", "canceled"]);
    expect(w.get('[data-stage="todo"]').text()).toContain("Used by 12 items");
    expect(w.get('[data-stage="todo"]').text()).toContain("Not used");
    expect(w.get('[data-stage="backlog"]').text()).toContain("No statuses in this stage");
    expect(w.text()).not.toContain("Add a status in the Done stage");
    w.unmount();
  });

  it("warns when no status finishes work", () => {
    const w = mount(NqStatusLabelManager, { props: { ...props(), statuses: statuses.slice(0, 2) }, attachTo: document.body });
    expect(w.text()).toContain("Add a status in the Done stage");
    w.unmount();
  });

  it("disables moving at the ends and reorders", async () => {
    const p = props();
    const w = mount(NqStatusLabelManager, { props: p, attachTo: document.body });
    expect(byLabel("Move To do up").hasAttribute("disabled")).toBe(true);
    expect(byLabel("Move Ready down").hasAttribute("disabled")).toBe(true);
    byLabel("Move To do down").click();
    await flushPromises();
    expect(p.onReorderStatuses).toHaveBeenCalledWith(["s4", "s1", "s3"]);
    w.unmount();
  });

  it("creates a status through the dialog", async () => {
    const p = props();
    const w = mount(NqStatusLabelManager, { props: p, attachTo: document.body });
    buttonText("New status").click();
    await flushPromises();
    const form = document.body.querySelector<HTMLFormElement>('[data-slot="status-label-edit"] form')!;
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(p.onSaveStatus).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Give it a name.");
    const input = document.body.querySelector<HTMLInputElement>('[data-slot="status-label-edit"] input')!;
    input.value = "  Blocked ";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(p.onSaveStatus).toHaveBeenCalledWith({ id: undefined, name: "Blocked", hue: "blue", stage: "todo" });
    expect(document.body.querySelector('[data-slot="status-label-edit"]')).toBeNull();
    w.unmount();
  });

  it("shows the error a save returns and keeps the dialog open", async () => {
    const p = { ...props(), onSaveLabel: vi.fn(async () => ({ error: "Nope" })) };
    const w = mount(NqStatusLabelManager, { props: p, attachTo: document.body });
    [...document.body.querySelectorAll<HTMLElement>("[role=tab]")].find((t) => t.textContent === "Labels")!.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
    await flushPromises();
    byLabel("Edit Design").click();
    await flushPromises();
    document.body.querySelector('[data-slot="status-label-edit"] form')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(p.onSaveLabel).toHaveBeenCalledWith({ id: "l1", name: "Design", hue: "violet" });
    expect(document.body.textContent).toContain("Nope");
    expect(document.body.querySelector('[data-slot="status-label-edit"]')).not.toBeNull();
    w.unmount();
  });

  it("asks before deleting and says how many items lose the value", async () => {
    const p = props();
    const w = mount(NqStatusLabelManager, { props: p, attachTo: document.body });
    byLabel("Delete Shipped").click();
    await flushPromises();
    expect(document.body.textContent).toContain("Delete status Shipped?");
    expect(document.body.textContent).toContain("31 items use it");
    expect(p.onDeleteStatus).not.toHaveBeenCalled();
    const confirm = [...document.body.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].find((b) => b.textContent?.trim() === "Delete")!;
    confirm.click();
    await flushPromises();
    expect(p.onDeleteStatus).toHaveBeenCalledWith("s3");
    w.unmount();
  });
});

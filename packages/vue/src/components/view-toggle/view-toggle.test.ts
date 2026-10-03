import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NqViewToggle } from ".";

afterEach(() => localStorage.clear());
const toggles = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="toggle"]');

describe("NqViewToggle", () => {
  it("renders icon-only toggles named by aria-label, the first view pressed", () => {
    const w = mount(NqViewToggle, { props: { views: ["table", "grid", "board"] } });
    expect(w.attributes("data-slot")).toBe("view-toggle");
    expect(w.find('[data-slot="toggle-group"]').attributes("aria-label")).toBe("View");
    const [table, grid, board] = toggles(w);
    expect(table!.attributes("aria-label")).toBe("Table");
    expect(grid!.attributes("data-view")).toBe("grid");
    expect(board!.attributes("aria-label")).toBe("Board");
    expect(table!.attributes("data-pressed")).toBe("");
    expect(grid!.attributes("data-pressed")).toBeUndefined();
    expect(table!.find("svg").exists()).toBe(true);
  });

  it("showLabels adds the text and drops the aria-label", () => {
    const w = mount(NqViewToggle, { props: { showLabels: true } });
    const [table] = toggles(w);
    expect(table!.text()).toBe("Table");
    expect(table!.attributes("aria-label")).toBeUndefined();
  });

  it("swaps the pressed view and never clears it", async () => {
    const w = mount(NqViewToggle, { attachTo: document.body });
    let [table, grid] = toggles(w);
    await grid!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual(["grid"]);
    [table, grid] = toggles(w);
    expect(grid!.attributes("data-pressed")).toBe("");
    await grid!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")).toHaveLength(1);
    expect(grid!.attributes("data-pressed")).toBe("");
    expect(table!.attributes("data-pressed")).toBeUndefined();
    w.unmount();
  });

  it("remembers the choice under storageKey and restores it", async () => {
    const w = mount(NqViewToggle, { props: { storageKey: "t:view" }, attachTo: document.body });
    await toggles(w)[1]!.trigger("click");
    await flushPromises();
    expect(localStorage.getItem("t:view")).toBe("grid");
    w.unmount();
    const again = mount(NqViewToggle, { props: { storageKey: "t:view" }, attachTo: document.body });
    await flushPromises();
    expect(toggles(again)[1]!.attributes("data-pressed")).toBe("");
    expect(again.emitted("update:modelValue")![0]).toEqual(["grid"]);
    again.unmount();
  });
});

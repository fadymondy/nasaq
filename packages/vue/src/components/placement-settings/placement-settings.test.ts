import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { canBeDefaultPage, NqPlacementSettings, parseOrder, placementChanges, withMode } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("placement maths", () => {
  it("parses, switches and diffs", () => {
    expect(parseOrder(" 12 ")).toBe(12);
    expect(parseOrder("-1")).toBeNull();
    expect(parseOrder("1.5")).toBeNull();
    expect(canBeDefaultPage("fixed")).toBe(false);
    expect(withMode({ mode: "sidebar", order: 1, defaultPage: true }, "hidden").defaultPage).toBe(false);
    expect(placementChanges({ mode: "sidebar", order: 1 }, { mode: "header", order: 1 })).toEqual({ mode: "header" });
  });
});

describe("NqPlacementSettings", () => {
  const value = { mode: "sidebar", order: 2, defaultPage: false } as const;

  it("renders the five modes with overlays disabled by default", () => {
    const w = mount(NqPlacementSettings, { props: { value }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("placement-settings");
    expect(w.attributes("data-dirty")).toBeUndefined();
    expect(w.findAll('[data-slot="radio-card"]')).toHaveLength(5);
    expect(w.findAll('[data-slot="placement-diagram"]')).toHaveLength(5);
    expect(w.find('[data-mode="fixed"]').attributes("data-disabled")).toBeDefined();
    expect(w.find('[data-slot="placement-state"]').text()).toBe("All changes saved");
    expect(w.find('[data-slot="placement-default-page"]').exists()).toBe(false);
    w.unmount();
  });

  it("marks dirty on an order edit and saves only the change", async () => {
    const onSave = vi.fn();
    const w = mount(NqPlacementSettings, { props: { value, onSave }, attachTo: document.body });
    await w.find("input[type=number]").setValue("7");
    expect(w.attributes("data-dirty")).toBe("true");
    expect(w.find('[data-slot="placement-state"]').text()).toBe("Unsaved changes");
    const save = w.findAll("button").find((b) => b.text().includes("Save changes"))!;
    await save.trigger("click");
    expect(onSave).toHaveBeenCalledWith({ order: 7 });
    w.unmount();
  });

  it("blocks saving on an invalid order and discards", async () => {
    const onSave = vi.fn();
    const w = mount(NqPlacementSettings, { props: { value, onSave }, attachTo: document.body });
    await w.find("input[type=number]").setValue("abc");
    const buttons = w.findAll("button");
    expect(buttons.find((b) => b.text().includes("Save changes"))!.attributes("disabled")).toBeDefined();
    await buttons.find((b) => b.text().includes("Discard"))!.trigger("click");
    expect(w.attributes("data-dirty")).toBeUndefined();
    expect(onSave).not.toHaveBeenCalled();
    w.unmount();
  });

  it("shows the default page switch and the error", () => {
    const w = mount(NqPlacementSettings, { props: { value, allowDefaultPage: true, error: "Nope" }, attachTo: document.body });
    expect(w.find('[data-slot="placement-default-page"]').exists()).toBe(true);
    expect(w.find('[data-slot="alert"]').text()).toContain("Nope");
    w.unmount();
  });

  it("is Arabic under an Arabic provider", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqPlacementSettings, { value })) }, { attachTo: document.body });
    expect(w.text()).toContain("المظهر والموضع");
    w.unmount();
  });
});

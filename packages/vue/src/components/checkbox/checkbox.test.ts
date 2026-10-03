import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
const btn = (w: ReturnType<typeof mount>) => w.find("button");
import { NqCheckbox } from ".";

describe("NqCheckbox", () => {
  it("renders the React classes and slot", () => {
    const w = mount(NqCheckbox);
    expect(btn(w).attributes("data-slot")).toBe("checkbox");
    expect(btn(w).attributes("role")).toBe("checkbox");
    expect(btn(w).classes()).toEqual(expect.arrayContaining(["size-4", "rounded-[4px]", "data-checked:bg-primary"]));
    expect(btn(w).attributes("data-unchecked")).toBe("");
    expect(btn(w).attributes("data-checked")).toBeUndefined();
  });

  it("toggles with data-checked, the indicator and v-model", async () => {
    const w = mount(NqCheckbox, { props: { modelValue: false } });
    expect(w.find('[data-slot="checkbox-indicator"]').exists()).toBe(false);
    await btn(w).trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual([true]);
    await w.setProps({ modelValue: true });
    expect(btn(w).attributes("aria-checked")).toBe("true");
    expect(btn(w).attributes("data-checked")).toBe("");
    expect(w.find('[data-slot="checkbox-indicator"]').exists()).toBe(true);
  });

  it("indeterminate is mixed, with a dash", () => {
    const w = mount(NqCheckbox, { props: { indeterminate: true } });
    expect(btn(w).attributes("aria-checked")).toBe("mixed");
    expect(btn(w).attributes("data-indeterminate")).toBe("");
    expect(w.find('[data-slot="checkbox-indicator"] svg').exists()).toBe(true);
  });

  it("disabled sets data-disabled", () => {
    const w = mount(NqCheckbox, { props: { disabled: true } });
    expect(btn(w).attributes("data-disabled")).toBe("");
  });
});

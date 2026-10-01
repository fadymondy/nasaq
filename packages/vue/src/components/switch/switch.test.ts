import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
const btn = (w: ReturnType<typeof mount>) => w.find("button");
import { NqSwitch } from ".";

describe("NqSwitch", () => {
  it("renders the React classes and thumb", () => {
    const w = mount(NqSwitch);
    expect(btn(w).attributes("role")).toBe("switch");
    expect(btn(w).attributes("data-slot")).toBe("switch");
    expect(btn(w).classes()).toEqual(expect.arrayContaining(["h-5", "w-9", "data-checked:bg-primary"]));
    const thumb = w.find('[data-slot="switch-thumb"]');
    expect(thumb.classes()).toContain("rtl:data-checked:-translate-x-3.5");
    expect(btn(w).attributes("data-unchecked")).toBe("");
  });

  it("toggles state attributes and emits", async () => {
    const w = mount(NqSwitch, { props: { defaultChecked: true } });
    expect(btn(w).attributes("data-checked")).toBe("");
    await btn(w).trigger("click");
    await flushPromises();
    expect(btn(w).attributes("aria-checked")).toBe("false");
    expect(btn(w).attributes("data-unchecked")).toBe("");
    expect(w.find('[data-slot="switch-thumb"]').attributes("data-unchecked")).toBe("");
    expect(w.emitted("update:modelValue")![0]).toEqual([false]);
  });
});

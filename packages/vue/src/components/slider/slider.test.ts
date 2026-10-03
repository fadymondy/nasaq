import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { NqSlider } from ".";

describe("NqSlider", () => {
  it("renders the head, track, range and a labelled thumb", async () => {
    const w = mount(NqSlider, { props: { label: "Volume", defaultValue: 40 } });
    await nextTick();
    expect(w.attributes("data-slot")).toBe("slider");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "w-full", "flex-col"]));
    expect(w.find('[data-slot="slider-head"]').text()).toContain("Volume");
    expect(w.find('[data-slot="slider-value"]').text()).toBe("40");
    expect(w.find('[data-slot="slider-control"]').exists()).toBe(true);
    expect(w.find('[data-slot="slider-track"]').classes()).toContain("bg-nq-surface-soft");
    expect(w.find('[data-slot="slider-range"]').classes()).toContain("bg-primary");
    const thumb = w.find('[data-slot="slider-thumb"]');
    expect(thumb.attributes("role")).toBe("slider");
    expect(thumb.attributes("aria-valuenow")).toBe("40");
    expect(thumb.attributes("aria-valuetext")).toBe("40");
    expect(thumb.attributes("aria-labelledby")).toBe(w.find("span.text-label").attributes("id"));
    expect(thumb.classes()).toEqual(expect.arrayContaining(["size-4", "rounded-full", "border-primary"]));
  });

  it("moves with the keyboard, emits v-model and supports Home/End", async () => {
    const w = mount(NqSlider, { props: { label: "Volume", modelValue: 40, "onUpdate:modelValue": (v: unknown) => w.setProps({ modelValue: v as number }) }, attachTo: document.body });
    const thumb = () => w.find('[data-slot="slider-thumb"]');
    await thumb().trigger("keydown", { key: "ArrowRight" });
    expect(w.emitted("update:modelValue")![0]).toEqual([41]);
    expect(thumb().attributes("aria-valuenow")).toBe("41");
    await thumb().trigger("keydown", { key: "End" });
    expect(thumb().attributes("aria-valuenow")).toBe("100");
    await thumb().trigger("keydown", { key: "Home" });
    expect(thumb().attributes("aria-valuenow")).toBe("0");
    expect(w.find('[data-slot="slider-value"]').text()).toBe("0");
    w.unmount();
  });

  it("renders a range with named thumbs, a formatted value and marks", async () => {
    const w = mount(NqSlider, {
      props: {
        label: "Price",
        defaultValue: [20, 80],
        thumbLabels: ["Minimum price", "Maximum price"],
        format: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
        marks: [
          { value: 0, label: "$0" },
          { value: 100, label: "$100" },
        ],
      },
    });
    await nextTick();
    const thumbs = w.findAll('[data-slot="slider-thumb"]');
    expect(thumbs.map((t) => t.attributes("aria-label"))).toEqual(["Minimum price", "Maximum price"]);
    expect(thumbs.map((t) => t.attributes("aria-valuetext"))).toEqual(["$20", "$80"]);
    expect(w.find('[data-slot="slider-value"]').text()).toBe("$20 – $80");
    const marks = w.findAll('[data-slot="slider-mark"]');
    expect(marks).toHaveLength(2);
    expect(marks[1]!.attributes("style")).toContain("inset-inline-start: 100%");
    expect(w.find('[data-slot="slider-marks"]').attributes("aria-hidden")).toBe("true");
  });

  it("marks disabled state and merges classes", () => {
    const w = mount(NqSlider, { props: { defaultValue: 10, disabled: true, class: "max-w-xs" }, attrs: { "aria-label": "Brightness" } });
    expect(w.attributes("data-disabled")).toBe("");
    expect(w.attributes("aria-label")).toBe("Brightness");
    expect(w.classes()).toContain("max-w-xs");
    expect(w.find('[data-slot="slider-head"]').exists()).toBe(false);
    expect(w.find('[data-slot="slider-thumb"]').attributes("data-disabled")).toBe("");
  });
});

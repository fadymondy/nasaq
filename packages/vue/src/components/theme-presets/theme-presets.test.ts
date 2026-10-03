import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqThemePresetPicker, NqThemePresetScope, THEME_PRESETS, applyThemePreset, themePresetSwatches, themePresetVars, themeTextOn, themeToHex, useThemePreset } from ".";

describe("theme presets", () => {
  it("ships four families in dark and light", () => {
    expect(THEME_PRESETS).toHaveLength(8);
    expect(new Set(THEME_PRESETS.map((p) => p.mode))).toEqual(new Set(["dark", "light"]));
  });

  it("derives variables, swatches and readable text", () => {
    const p = THEME_PRESETS[0]!;
    const vars = themePresetVars(p, { brand: "#0e7490" });
    expect(Object.keys(vars).length).toBeGreaterThan(0);
    expect(themePresetSwatches(p).length).toBeGreaterThan(0);
    expect(themeToHex("#0e7490")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(themeTextOn("#ffffff")).not.toBe(themeTextOn("#000000"));
    expect(vars["--nq-brand-l"]!.toLowerCase()).toBe("#0e7490");
  });

  it("applyThemePreset writes variables and the returned function removes them", () => {
    const el = document.createElement("div");
    document.body.append(el);
    const undo = applyThemePreset(el, THEME_PRESETS[0]!, { brand: "#0e7490" });
    expect(el.getAttribute("data-brand")).toBe("runtime");
    const names = Object.keys(themePresetVars(THEME_PRESETS[0]!, { brand: "#0e7490" }));
    expect(el.style.getPropertyValue(names[0]!)).not.toBe("");
    undo();
    expect(el.hasAttribute("data-brand")).toBe(false);
    expect(el.style.getPropertyValue(names[0]!)).toBe("");
    el.remove();
  });

  it("the picker is a radio group of presets and reports the choice", async () => {
    const w = mount(NqThemePresetPicker, { props: { modelValue: THEME_PRESETS[0]!.id } });
    const radios = w.findAll('[role="radio"]');
    expect(radios).toHaveLength(THEME_PRESETS.length);
    await radios[1]!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual([THEME_PRESETS[1]!.id]);
  });

  it("the scope pins the mode and keeps the caller's class", () => {
    const w = mount(NqThemePresetScope, { props: { preset: THEME_PRESETS[0]!, class: "p-4" }, slots: { default: "hello" } });
    const outer = w.find('[data-slot="theme-preset-scope"]');
    expect(outer.attributes("data-theme")).toBe(THEME_PRESETS[0]!.mode);
    expect(outer.classes()).toContain("contents");
    const inner = outer.find('[data-brand="runtime"]');
    expect(inner.classes()).toEqual(expect.arrayContaining(["bg-background", "text-foreground", "p-4"]));
    expect(inner.text()).toBe("hello");
  });

  it("useThemePreset remembers the choice", () => {
    localStorage.removeItem("test-preset");
    let api!: ReturnType<typeof useThemePreset>;
    const C = defineComponent({
      setup() {
        api = useThemePreset({ apply: false, storageKey: "test-preset" });
        return () => h("div");
      },
    });
    mount({ components: { C, NasaqProvider }, template: `<NasaqProvider target="scope"><C /></NasaqProvider>` });
    api.setValue(THEME_PRESETS[2]!.id);
    expect(api.value.value).toBe(THEME_PRESETS[2]!.id);
    expect(localStorage.getItem("test-preset")).toBe(THEME_PRESETS[2]!.id);
    expect(api.preset.value?.id).toBe(THEME_PRESETS[2]!.id);
    localStorage.removeItem("test-preset");
  });
});

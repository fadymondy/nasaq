import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqCurrencyInput } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const input = (w: ReturnType<typeof mount>) => w.find<HTMLInputElement>('[data-slot="input-group-input"]');

async function type(w: ReturnType<typeof mount>, value: string) {
  await input(w).trigger("focus");
  input(w).element.value = value;
  await input(w).trigger("input");
}

describe("NqCurrencyInput", () => {
  it("shows a stored amount grouped and padded, with the symbol at the start", () => {
    const w = mount(NqCurrencyInput, { props: { modelValue: 125050 } });
    expect(w.attributes("data-slot")).toBe("currency-input");
    expect(w.attributes("data-currency")).toBe("USD");
    expect(input(w).element.value).toBe("1,250.50");
    expect(w.find('[data-slot="currency-symbol"]').text()).toBe("$");
    expect(input(w).attributes("inputmode")).toBe("decimal");
    expect(input(w).attributes("dir")).toBe("ltr");
  });

  it("emits minor units as the user types and stops at the currency decimals", async () => {
    const w = mount(NqCurrencyInput, { props: { modelValue: null } });
    await type(w, "12.345");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([1234]);
    expect(input(w).element.value).toBe("12.34");
  });

  it("reads Arabic-Indic digits to the same amount", async () => {
    const w = mount(NqCurrencyInput, { props: { modelValue: null } });
    await type(w, "١٢٫٥");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([1250]);
  });

  it("uses no decimals for JPY and three for KWD", async () => {
    const jpy = mount(NqCurrencyInput, { props: { modelValue: null, currency: "JPY" } });
    await type(jpy, "1200");
    expect(jpy.emitted("update:modelValue")?.at(-1)).toEqual([1200]);
    expect(input(jpy).attributes("inputmode")).toBe("numeric");
    const kwd = mount(NqCurrencyInput, { props: { modelValue: null, currency: "KWD" } });
    await type(kwd, "1.2345");
    expect(kwd.emitted("update:modelValue")?.at(-1)).toEqual([1234]);
  });

  it("steps with the arrow keys and Shift", async () => {
    const w = mount(NqCurrencyInput, { props: { modelValue: 1000 } });
    await input(w).trigger("keydown", { key: "ArrowUp" });
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([1100]);
    await input(w).trigger("keydown", { key: "ArrowUp", shiftKey: true });
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([2000]);
  });

  it("flags an out-of-range amount and clamps on blur when asked", async () => {
    const w = mount(NqCurrencyInput, { props: { modelValue: 5000, max: 3000, clampOnBlur: true } });
    expect(w.find('[data-slot="input-group"]').attributes("data-invalid")).toBe("");
    expect(input(w).attributes("aria-invalid")).toBe("true");
    expect(w.text()).toContain("Amount out of range");
    await input(w).trigger("blur");
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual([3000]);
  });

  it("carries the minor-unit integer in a hidden input", async () => {
    const w = mount(NqCurrencyInput, { props: { modelValue: 1999, name: "fee" } });
    expect(w.find<HTMLInputElement>('input[type="hidden"]').element.value).toBe("1999");
    await w.setProps({ modelValue: null });
    expect(w.find<HTMLInputElement>('input[type="hidden"]').element.value).toBe("");
  });

  it("defaults to SAR in Arabic and puts the symbol where the locale does", () => {
    const w = mount({ components: { NasaqProvider, NqCurrencyInput }, template: '<NasaqProvider locale="ar"><NqCurrencyInput :model-value="1000" /></NasaqProvider>' });
    expect(w.find('[data-slot="currency-input"]').attributes("data-currency")).toBe("SAR");
  });

  it("converts the amount when the picker changes currency and reports it", async () => {
    const w = mount(NqCurrencyInput, { props: { modelValue: 1250, currencies: ["USD", "KWD"] }, attachTo: document.body });
    expect(w.find('[data-slot="select-trigger"]').attributes("aria-label")).toBe("Currency");
    expect(w.find('[data-slot="select-trigger"]').text()).toContain("USD");
    w.findComponent({ name: "NqSelect" }).vm.$emit("update:modelValue", "KWD");
    await nextTick();
    expect(w.emitted("currencyChange")?.at(-1)).toEqual(["KWD", 12500]);
  });
});

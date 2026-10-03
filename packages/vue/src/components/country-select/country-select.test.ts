import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import type { LocationsDataSource } from "../address-input/locations-data";
import { NqCountrySelect } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const input = () => document.body.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const options = () => [...document.body.querySelectorAll('[data-slot="combobox-item"]')].map((o) => o.textContent?.trim());
const open = async () => {
  document.body.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
  await flushPromises();
};

describe("NqCountrySelect", () => {
  it("shows the chosen country's name and carries the ISO code in a hidden input", () => {
    const w = mount(NqCountrySelect, { props: { modelValue: "sa", name: "country" }, attachTo: document.body });
    expect(document.body.querySelector('[data-slot="country-select"]')).not.toBeNull();
    expect(input().value).toBe("Saudi Arabia");
    expect(document.body.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe("SA");
    w.unmount();
  });

  it("filters by English or Arabic name and emits the ISO code when picked", async () => {
    const w = mount(NqCountrySelect, { props: { modelValue: "" }, attachTo: document.body });
    await open();
    input().value = "مصر";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(options()).toEqual(["Egypt"]);
    document.body.querySelector<HTMLElement>('[data-slot="combobox-item"]')!.click();
    await flushPromises();
    expect(w.emitted("update:modelValue")?.at(-1)).toEqual(["EG"]);
    expect(w.emitted("valueChange")?.at(-1)).toEqual(["EG"]);
    w.unmount();
  });

  it("offers only the countries it is given", async () => {
    const countries = [
      { iso: "SA", dial: "966", en: "Saudi Arabia", ar: "السعودية" },
      { iso: "AE", dial: "971", en: "United Arab Emirates", ar: "الإمارات" },
    ];
    const w = mount(NqCountrySelect, { props: { countries }, attachTo: document.body });
    await open();
    expect(options()).toEqual(["Saudi Arabia", "United Arab Emirates"]);
    w.unmount();
  });

  it("loads from a data source", async () => {
    const dataSource: LocationsDataSource = {
      countries: async () => [{ id: 1, iso2: "jo", name_en: "Jordan", name_ar: "الأردن" }],
      cities: async () => [],
      areas: async () => [],
    };
    const w = mount(NqCountrySelect, { props: { dataSource, modelValue: "JO" }, attachTo: document.body });
    await flushPromises();
    expect(input().value).toBe("Jordan");
    await open();
    expect(options()).toEqual(["Jordan"]);
    w.unmount();
  });

  it("marks invalid and uses Arabic strings in an Arabic provider", async () => {
    const w = mount(
      { components: { NasaqProvider, NqCountrySelect }, template: '<NasaqProvider locale="ar"><NqCountrySelect invalid modelValue="" /></NasaqProvider>' },
      { attachTo: document.body },
    );
    await flushPromises();
    expect(input().getAttribute("placeholder")).toBe("اختر الدولة");
    expect(input().getAttribute("aria-invalid")).toBe("true");
    w.unmount();
  });
});

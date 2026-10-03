import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { createHubLocationsDataSource, NqAddressInput, placeName, type Address, type LocationsDataSource } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const source: LocationsDataSource = {
  countries: async () => [
    { id: 65, iso2: "EG", name_en: "Egypt", name_ar: "مصر" },
    { id: 187, iso2: "SA", name_en: "Saudi Arabia", name_ar: "السعودية" },
  ],
  cities: async (countryId) => (countryId === 65 ? [{ id: 1, country_id: 65, name_en: "", name_ar: "القاهرة" }] : [{ id: 10, country_id: 187, name_en: "Riyadh", name_ar: "الرياض" }]),
  areas: async (cityId) => [{ id: cityId * 100 + 1, city_id: cityId, name_en: "Downtown", name_ar: "وسط المدينة" }],
};

const slot = (name: string) => document.body.querySelector(`[data-slot="${name}"]`)!;
const comboInput = (name: string) => slot(name).querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const options = () => [...document.body.querySelectorAll('[data-slot="combobox-item"]')].map((o) => o.textContent?.trim());

async function pick(name: string, text: string) {
  slot(name).querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
  await flushPromises();
  const item = [...document.body.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')].find((o) => o.textContent?.includes(text))!;
  item.click();
  await flushPromises();
}

describe("places data", () => {
  it("falls back to the other language when a name is empty", () => {
    expect(placeName({ name_en: "", name_ar: "القاهرة" }, "en")).toBe("القاهرة");
    expect(placeName({ name_en: "Cairo", name_ar: "القاهرة" }, "ar")).toBe("القاهرة");
  });
  it("reads the hub API and caches the request", async () => {
    let calls = 0;
    const ds = createHubLocationsDataSource({
      baseUrl: "https://hub.test/",
      fetch: (async (url: string) => {
        calls++;
        expect(url).toBe("https://hub.test/api/locations/cities?country_id=1");
        return { ok: true, json: async () => ({ items: [{ id: 5, country_id: 1, name_en: "A", name_ar: "ا" }] }) };
      }) as unknown as typeof fetch,
    });
    expect(await ds.cities(1)).toHaveLength(1);
    await ds.cities(1);
    expect(calls).toBe(1);
  });
});

describe("NqAddressInput", () => {
  it("renders the fields, with city and area disabled until their parent is chosen", async () => {
    const w = mount(NqAddressInput, { props: { dataSource: source }, attachTo: document.body });
    await flushPromises();
    for (const s of ["country", "city", "area", "street", "building", "floor", "apartment", "postal-code", "landmark", "phone"]) {
      expect(slot(`address-input-${s}`)).not.toBeNull();
    }
    expect(comboInput("address-input-country").disabled).toBe(false);
    expect(comboInput("address-input-city").disabled).toBe(true);
    expect(comboInput("address-input-area").disabled).toBe(true);
    w.unmount();
  });

  it("cascades and clears children when the parent changes", async () => {
    const w = mount(NqAddressInput, { props: { dataSource: source }, attachTo: document.body });
    await flushPromises();
    await pick("address-input-country", "Saudi");
    expect((w.emitted("update:modelValue")!.at(-1)![0] as Address).country_id).toBe(187);
    expect(comboInput("address-input-city").disabled).toBe(false);
    await pick("address-input-city", "Riyadh");
    await pick("address-input-area", "Downtown");
    expect(w.emitted("update:modelValue")!.at(-1)![0]).toEqual({ street: "", country_id: 187, city_id: 10, area_id: 1001 });
    await pick("address-input-country", "Egypt");
    expect(w.emitted("update:modelValue")!.at(-1)![0]).toEqual({ street: "", country_id: 65 });
    expect(comboInput("address-input-area").disabled).toBe(true);
    w.unmount();
  });

  it("emits text fields and leaves empty optional ones out", async () => {
    const w = mount(NqAddressInput, { props: { dataSource: source, showPhone: false }, attachTo: document.body });
    await flushPromises();
    const street = slot("address-input-street").querySelector<HTMLInputElement>("input")!;
    street.value = "Olaya St";
    street.dispatchEvent(new Event("input", { bubbles: true }));
    const postal = slot("address-input-postal-code").querySelector<HTMLInputElement>("input")!;
    postal.value = "12345";
    postal.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    expect(postal.getAttribute("dir")).toBe("ltr");
    expect(w.emitted("update:modelValue")!.at(-1)![0]).toEqual({ street: "Olaya St", postal_code: "12345" });
    expect(document.body.querySelector('[data-slot="address-input-phone"]')).toBeNull();
    w.unmount();
  });

  it("shows a controlled address, marks invalid and disables everything", async () => {
    const w = mount(NqAddressInput, {
      props: { dataSource: source, modelValue: { street: "X", country_id: 187, city_id: 10 }, invalid: true, disabled: true },
      attachTo: document.body,
    });
    await flushPromises();
    expect(slot("address-input").getAttribute("data-invalid")).toBe("");
    expect(comboInput("address-input-country").value).toBe("Saudi Arabia");
    expect(comboInput("address-input-city").value).toBe("Riyadh");
    expect(comboInput("address-input-country").disabled).toBe(true);
    w.unmount();
  });

  it("uses Arabic strings, names and direction in an Arabic provider", async () => {
    const w = mount(
      { components: { NasaqProvider, NqAddressInput }, props: ["ds"], template: '<NasaqProvider locale="ar"><NqAddressInput :data-source="ds" /></NasaqProvider>' },
      { props: { ds: source }, attachTo: document.body },
    );
    await flushPromises();
    expect(slot("address-input").getAttribute("dir")).toBe("rtl");
    expect(slot("address-input-country").querySelector("label")!.textContent).toBe("الدولة");
    slot("address-input-country").querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
    await flushPromises();
    expect(options()).toEqual(["مصر", "السعودية"]);
    w.unmount();
  });
});

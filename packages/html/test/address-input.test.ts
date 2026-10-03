// The Blade address-input example (packages/php/examples/rendered/address-input.html) under real Alpine, with the locations API stubbed.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

vi.setConfig({ testTimeout: 30000 });
setup();

const data: Record<string, unknown[]> = {
  countries: [
    { id: 65, iso2: "EG", name_en: "Egypt", name_ar: "مصر" },
    { id: 187, iso2: "SA", name_en: "Saudi Arabia", name_ar: "السعودية" },
  ],
  "cities?country_id=187": [{ id: 10, country_id: 187, name_en: "Riyadh", name_ar: "الرياض" }],
  "cities?country_id=65": [{ id: 1, country_id: 65, name_en: "Cairo", name_ar: "القاهرة" }],
  "areas?city_id=10": [{ id: 1001, city_id: 10, name_en: "Downtown", name_ar: "وسط المدينة" }],
};
globalThis.fetch = (async (url: string) => {
  const key = String(url).split("/api/locations/")[1] ?? "";
  return { ok: key in data, json: async () => ({ items: data[key] ?? [] }) } as Response;
}) as typeof fetch;

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`)!;
const comboInput = (name: string) => slot(name).querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')].map((r) => r.textContent?.trim());

async function pick(name: string, text: string) {
  slot(name).querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
  await tick(60);
  [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')].find((r) => r.textContent?.includes(text))!.click();
  await tick(60);
}

describe("address-input (Blade example)", () => {
  it("renders the fields with city and area disabled until their parent is chosen", async () => {
    await mount("address-input");
    for (const s of ["country", "city", "area", "street", "building", "floor", "apartment", "postal-code", "landmark", "phone"]) {
      expect(slot(`address-input-${s}`), s).not.toBeNull();
    }
    expect(comboInput("address-input-country").disabled).toBe(false);
    expect(comboInput("address-input-city").disabled).toBe(true);
    expect(comboInput("address-input-area").disabled).toBe(true);
    expect(slot("address-input-postal-code").querySelector("input")!.getAttribute("dir")).toBe("ltr");
    const label = slot("address-input-country").querySelector("label")!;
    expect(label.getAttribute("for")).toBe(comboInput("address-input-country").id);
  });

  it("cascades, resets children when the parent changes and dispatches address-change", async () => {
    const host = await mount("address-input");
    const events: unknown[] = [];
    host.addEventListener("address-change", (e) => events.push((e as CustomEvent).detail.value));
    await tick(60);
    await pick("address-input-country", "Saudi");
    expect(comboInput("address-input-city").disabled).toBe(false);
    await pick("address-input-city", "Riyadh");
    await pick("address-input-area", "Downtown");
    expect(events.at(-1)).toEqual({ street: "", country_id: 187, city_id: 10, area_id: 1001 });
    expect(comboInput("address-input-area").value).toBe("Downtown");
    await pick("address-input-country", "Egypt");
    expect(events.at(-1)).toEqual({ street: "", country_id: 65 });
    expect(comboInput("address-input-area").disabled).toBe(true);
    expect(comboInput("address-input-city").value).toBe("");
  });

  it("filters the list by English or Arabic name", async () => {
    await mount("address-input");
    await tick(60);
    slot("address-input-country").querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!.click();
    await tick(60);
    expect(rows()).toEqual(["Egypt", "Saudi Arabia"]);
    const input = comboInput("address-input-country");
    input.value = "السعودية";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(60);
    expect(rows()).toEqual(["Saudi Arabia"]);
  });

  it("emits text fields and leaves empty optional ones out", async () => {
    const host = await mount("address-input");
    const events: Record<string, unknown>[] = [];
    host.addEventListener("address-change", (e) => events.push((e as CustomEvent).detail.value));
    const street = slot("address-input-street").querySelector<HTMLInputElement>("input")!;
    street.value = "Olaya St";
    street.dispatchEvent(new Event("input", { bubbles: true }));
    const postal = slot("address-input-postal-code").querySelector<HTMLInputElement>("input")!;
    postal.value = "12345";
    postal.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(60);
    expect(events.at(-1)).toEqual({ street: "Olaya St", postal_code: "12345" });
  });
});

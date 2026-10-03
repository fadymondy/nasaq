// The Blade country-select example (packages/php/examples/rendered/country-select.html) under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

vi.setConfig({ testTimeout: 30000 });
setup();
globalThis.fetch = (async () => new Response("")) as typeof fetch; // flags are fetched from a CDN in the browser

const input = () => document.querySelector<HTMLInputElement>('[data-slot="combobox-input"]')!;
const trigger = () => document.querySelector<HTMLElement>('[data-slot="combobox-trigger"]')!;
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"][name="country"]')!;
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')];
const names = () => rows().map((r) => r.textContent?.trim());

describe("country-select (Blade example)", () => {
  it("shows the chosen country and carries the ISO code in a hidden input", async () => {
    await mount("country-select");
    expect(document.querySelector('[data-slot="country-select"]')).not.toBeNull();
    expect(input().value).toBe("Saudi Arabia");
    expect(hidden().value).toBe("SA");
    expect(input().getAttribute("aria-label")).toBe("Country");
  });

  it("filters by English or Arabic name and picks a country", async () => {
    const host = await mount("country-select");
    const events: unknown[] = [];
    host.addEventListener("country-change", (e) => events.push((e as CustomEvent).detail));
    trigger().click();
    await tick();
    expect(rows().length).toBeGreaterThan(100);
    input().value = "مصر";
    input().dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(names()).toEqual(["Egypt"]);
    rows()[0]!.click();
    await tick();
    expect(hidden().value).toBe("EG");
    expect(input().value).toBe("Egypt");
    expect(events.at(-1)).toEqual({ value: "EG" });
  });
});

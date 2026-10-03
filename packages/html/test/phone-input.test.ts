// The Blade phone-input example (packages/php/examples/rendered/phone-input.html) under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

vi.setConfig({ testTimeout: 30000 });
setup();
globalThis.fetch = (async () => new Response("")) as typeof fetch; // flags are fetched from a CDN in the browser

const digits = () => document.querySelector<HTMLInputElement>('[data-slot="input-group-input"]')!;
const trigger = () => document.querySelector<HTMLElement>('[data-slot="phone-input-country"]')!;
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"][name="phone"]')!;
const popup = () => document.querySelector<HTMLElement>('[data-slot="phone-input-content"]')!;
const rows = () => [...popup().querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')];

describe("phone-input (Blade example)", () => {
  it("shows the national number grouped, the dial code and the hidden E.164 value", async () => {
    await mount("phone-input");
    expect(digits().value).toBe("50 123 4567");
    expect(trigger().textContent).toContain("+966");
    expect(trigger().getAttribute("aria-label")).toContain("+966");
    expect(hidden().value).toBe("+966501234567");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("updates the value as you type and groups the digits", async () => {
    await mount("phone-input");
    digits().value = "551234567";
    digits().dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(hidden().value).toBe("+966551234567");
    expect(digits().value).toBe("55 123 4567");
  });

  it("picks the country from a pasted international number", async () => {
    await mount("phone-input");
    digits().value = "+971501234567";
    digits().dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(hidden().value).toBe("+971501234567");
    expect(trigger().textContent).toContain("+971");
  });

  it("opens the list, filters it by name or code, and picks a country", async () => {
    await mount("phone-input");
    trigger().click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(rows().length).toBeGreaterThan(100);
    const search = document.querySelector<HTMLInputElement>('[data-slot="phone-input-search"]')!;
    search.value = "egypt";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(rows().filter((r) => r.style.display !== "none").length).toBe(1);
    rows()[0]!.click();
    await tick();
    expect(trigger().textContent).toContain("+20");
    expect(hidden().value).toBe("+2050123 4567".replace(" ", ""));
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("searches Arabic names and closes on Escape", async () => {
    await mount("phone-input");
    trigger().click();
    await tick();
    const search = document.querySelector<HTMLInputElement>('[data-slot="phone-input-search"]')!;
    search.value = "مصر";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await tick(400);
    await vi.waitFor(() => expect(rows()).toHaveLength(1), { timeout: 5000 });
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});

// The Blade combobox example (packages/php/examples/rendered/combobox.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("combobox");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
}

const roots = () => [...document.querySelectorAll<HTMLElement>('[data-slot="combobox"]')];
const inputs = () => [...document.querySelectorAll<HTMLInputElement>('[data-slot="combobox-input"]')];
const single = () => inputs()[0]!;
const multi = () => inputs()[1]!;
const popups = () => [...document.querySelectorAll<HTMLElement>('[data-slot="combobox-content"]')];
const visibleItems = (popup: HTMLElement) =>
  [...popup.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')].filter((i) => i.style.display !== "none").map((i) => i.textContent?.trim());
const hidden = (name: string) => [...document.querySelectorAll<HTMLInputElement>(`input[type="hidden"][name^="${name}"]`)].map((i) => i.value);

async function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}

describe("combobox (Blade example)", () => {
  it("shows the chosen label in the input and wires up the roles", async () => {
    await mount();
    expect(roots()).toHaveLength(2);
    expect(single().value).toBe("Egypt");
    expect(single().getAttribute("role")).toBe("combobox");
    expect(single().getAttribute("aria-expanded")).toBe("false");
    expect(hidden("country")).toEqual(["eg"]);
    expect(document.querySelector('[data-slot="combobox-clear"]')!.hasAttribute("data-hidden")).toBe(false);
  });

  it("filters while typing, shows the empty message, and picks with a click", async () => {
    await mount();
    await type(single(), "jor");
    expect(single().getAttribute("aria-expanded")).toBe("true");
    expect(visibleItems(popups()[0]!)).toEqual(["Jordan"]);
    await type(single(), "zzz");
    expect(visibleItems(popups()[0]!)).toEqual([]);
    expect(popups()[0]!.querySelector<HTMLElement>('[data-slot="combobox-empty"]')!.style.display).not.toBe("none");
    await type(single(), "sa");
    expect(visibleItems(popups()[0]!)).toEqual(["Saudi Arabia"]);
    popups()[0]!.querySelector<HTMLElement>('[data-slot="combobox-item"]:not([style*="none"])')!.click();
    await tick();
    expect(single().value).toBe("Saudi Arabia");
    expect(hidden("country")).toEqual(["sa"]);
    expect(single().getAttribute("aria-expanded")).toBe("false");
  });

  it("moves the highlight with the arrow keys and picks with Enter", async () => {
    await mount();
    single().focus();
    await type(single(), "");
    single().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick();
    single().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick();
    expect(popups()[0]!.querySelector('[data-highlighted]')).not.toBeNull();
    single().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await tick();
    expect(hidden("country")).not.toEqual(["eg"]);
  });

  it("multiple: renders chips, adds on pick, removes a chip and on Backspace", async () => {
    await mount();
    const chips = () => [...document.querySelectorAll('[data-slot="combobox-chip"]')].map((c) => c.textContent?.trim());
    expect(chips()).toEqual(["Saudi Arabia"]);
    expect(multi().hasAttribute("placeholder") && multi().getAttribute("placeholder")).toBeFalsy();
    await type(multi(), "jor");
    popups()[1]!.querySelector<HTMLElement>('[data-slot="combobox-item"]:not([style*="none"])')!.click();
    await tick();
    expect(chips()).toEqual(["Saudi Arabia", "Jordan"]);
    expect(hidden("markets")).toEqual(["sa", "jo"]);
    document.querySelector<HTMLElement>('[data-slot="combobox-chip-remove"]')!.click();
    await tick();
    expect(chips()).toEqual(["Jordan"]);
    multi().dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }));
    await tick();
    expect(chips()).toEqual([]);
    expect(multi().getAttribute("placeholder")).toBe("Pick markets");
  });
});

// The Blade select example (packages/php/examples/rendered/select.html) under real Alpine.
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
  host.innerHTML = rendered("select");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const trigger = () => document.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;
const items = () => [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"][name="type"]')!;

describe("select (Blade example)", () => {
  it("shows the chosen label on the trigger before it ever opens", async () => {
    await mount();
    expect(trigger().getAttribute("role")).toBe("combobox");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector('[data-slot="select-value"]')!.textContent).toBe("Bug");
    expect(hidden().value).toBe("bug");
  });

  it("opens, marks the selected item, and picks another with a click", async () => {
    await mount();
    trigger().click();
    await tick();
    expect(trigger().hasAttribute("data-popup-open")).toBe(true);
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(items()[0]!.hasAttribute("data-selected")).toBe(true);
    expect(items()[0]!.getAttribute("aria-selected")).toBe("true");
    items()[1]!.click();
    await tick();
    expect(document.querySelector('[data-slot="select-value"]')!.textContent).toBe("Feature request");
    expect(hidden().value).toBe("feature");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("moves with the arrow keys, picks with Enter and closes on Escape", async () => {
    await mount();
    trigger().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await tick();
    const popup = document.querySelector<HTMLElement>('[data-slot="select-content"]')!;
    expect(document.activeElement).toBe(items()[0]);
    items()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await tick();
    expect(document.activeElement).toBe(items()[1]);
    expect(items()[1]!.hasAttribute("data-highlighted")).toBe(true);
    items()[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    items()[2]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await tick();
    expect(hidden().value).toBe("question");

    trigger().click();
    await tick();
    popup.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
  });

  it("jumps to a matching label when you type", async () => {
    await mount();
    trigger().click();
    await tick();
    items()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "q", bubbles: true }));
    expect(document.activeElement).toBe(items()[2]);
  });
});

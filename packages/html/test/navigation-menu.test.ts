import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("navigation-menu (Blade example)", () => {
  it("opens a panel from its trigger and closes with Escape", async () => {
    const host = await mount("navigation-menu");
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="navigation-menu-trigger"]')!;
    const panel = host.querySelector<HTMLElement>('[data-slot="navigation-menu-positioner"]')!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(panel.style.display).toBe("none");

    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.hasAttribute("data-popup-open")).toBe(true);
    expect(panel.style.display).not.toBe("none");

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(400);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.hasAttribute("data-popup-open")).toBe(false);
    expect(panel.style.display).toBe("none");
  });

  it("closes on an outside click and moves focus with the arrow keys", async () => {
    const host = await mount("navigation-menu");
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="navigation-menu-trigger"]')!;
    const link = host.querySelector<HTMLAnchorElement>('[data-slot="navigation-menu-link"]')!;
    trigger.click();
    await tick();
    document.body.click();
    await tick(400);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(link);
  });
});

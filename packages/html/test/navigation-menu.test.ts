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

async function mount(name: string, transform: (html: string) => string = (h) => h) {
  const host = document.createElement("div");
  host.innerHTML = transform(rendered(name));
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

/** The Blade example plus a second panel ("company"), to test moving between triggers. */
const withSecondPanel = (html: string) => {
  const item = html.match(/<li data-slot="navigation-menu-item" class="relative"><button[\s\S]*?<\/button>[\s\S]*?<\/div><\/li>/)![0];
  const second = item.replaceAll("resources", "company").replace("Resources", "Company").replace("Documentation", "About us");
  return html.replace(item, item + second);
};

const q = <T extends HTMLElement>(host: HTMLElement, slot: string) => host.querySelector<T>(`[data-slot="${slot}"]`)!;

describe("navigation-menu (Blade example)", () => {
  it("renders one shared popup (positioner > popup > viewport) with the React classes", async () => {
    const host = await mount("navigation-menu");
    const positioner = q(host, "navigation-menu-positioner");
    const popup = q(host, "navigation-menu-popup");
    expect(host.querySelectorAll('[data-slot="navigation-menu-popup"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-slot="navigation-menu-viewport"]')).toHaveLength(1);
    expect(positioner.className).toContain("transition-[inset]");
    expect(positioner.className).toContain("w-[var(--positioner-width)]");
    expect(popup.className).toContain("h-[var(--popup-height)]");
    expect(popup.className).toContain("w-[var(--popup-width)]");
    expect(popup.className).toContain("data-ending-style:scale-95");
    expect(positioner.style.display).toBe("none");
  });

  it("opens a panel into the shared viewport and closes with Escape", async () => {
    const host = await mount("navigation-menu");
    const trigger = q<HTMLButtonElement>(host, "navigation-menu-trigger");
    const content = q(host, "navigation-menu-content");
    const viewport = q(host, "navigation-menu-viewport");
    const popup = q(host, "navigation-menu-popup");
    const positioner = q(host, "navigation-menu-positioner");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(content.style.display).toBe("none");

    trigger.click();
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.hasAttribute("data-popup-open")).toBe(true);
    expect(viewport.contains(content)).toBe(true);
    expect(content.style.display).not.toBe("none");
    expect(positioner.style.display).not.toBe("none");
    expect(popup.hasAttribute("data-open")).toBe(true);
    expect(popup.style.getPropertyValue("--popup-width")).toMatch(/px$/);
    expect(popup.style.getPropertyValue("--popup-height")).toMatch(/px$/);
    expect(positioner.style.getPropertyValue("--positioner-width")).toMatch(/px$/);

    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick(400);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.hasAttribute("data-popup-open")).toBe(false);
    expect(positioner.style.display).toBe("none");
    expect(popup.hasAttribute("data-open")).toBe(false);
    expect(content.parentElement).not.toBe(viewport); // back in its item
  });

  it("animates in and out with data-starting-style and data-ending-style", async () => {
    const style = document.createElement("style");
    style.textContent = '[data-slot="navigation-menu-popup"],[data-slot="navigation-menu-content"]{transition-duration:120ms}';
    document.head.append(style);
    const host = await mount("navigation-menu");
    const trigger = q<HTMLButtonElement>(host, "navigation-menu-trigger");
    const popup = q(host, "navigation-menu-popup");
    const content = q(host, "navigation-menu-content");
    trigger.click();
    await tick(1);
    expect(popup.hasAttribute("data-starting-style")).toBe(true);
    expect(content.hasAttribute("data-starting-style")).toBe(true);
    await tick(80);
    expect(popup.hasAttribute("data-starting-style")).toBe(false);
    trigger.click();
    await tick(1);
    expect(popup.hasAttribute("data-ending-style")).toBe(true);
    expect(content.hasAttribute("data-ending-style")).toBe(true);
    expect(q(host, "navigation-menu-positioner").style.display).not.toBe("none");
    await tick(300);
    expect(q(host, "navigation-menu-positioner").style.display).toBe("none");
    style.remove();
  });

  it("slides between triggers inside the same popup, with data-activation-direction", async () => {
    const style = document.createElement("style");
    style.textContent = '[data-slot="navigation-menu-content"]{transition-duration:150ms}';
    document.head.append(style);
    const host = await mount("navigation-menu", withSecondPanel);
    const [a, b] = [...host.querySelectorAll<HTMLButtonElement>('[data-slot="navigation-menu-trigger"]')];
    const [ca, cb] = [...host.querySelectorAll<HTMLElement>('[data-slot="navigation-menu-content"]')];
    const viewport = q(host, "navigation-menu-viewport");
    a!.click();
    await tick(100);
    expect(viewport.contains(ca!)).toBe(true);
    b!.click();
    await tick(1);
    // Both are in the one viewport; B comes from the right, A leaves towards the left.
    expect(host.querySelectorAll('[data-slot="navigation-menu-popup"]')).toHaveLength(1);
    expect(viewport.contains(ca!) && viewport.contains(cb!)).toBe(true);
    expect(cb!.getAttribute("data-activation-direction")).toBe("right");
    expect(ca!.getAttribute("data-activation-direction")).toBe("right");
    expect(ca!.hasAttribute("data-ending-style")).toBe(true);
    expect(cb!.hasAttribute("data-starting-style")).toBe(true);
    expect(a!.hasAttribute("data-popup-open")).toBe(false);
    expect(b!.hasAttribute("data-popup-open")).toBe(true);
    await tick(300);
    expect(viewport.contains(ca!)).toBe(false); // A went home once it finished leaving
    expect(cb!.hasAttribute("data-starting-style")).toBe(false);
    expect(q(host, "navigation-menu-popup").hasAttribute("data-open")).toBe(true);

    a!.click();
    await tick(1);
    expect(ca!.getAttribute("data-activation-direction")).toBe("left");
    expect(cb!.getAttribute("data-activation-direction")).toBe("left");
    style.remove();
  });

  it("closes on an outside click and moves focus with the arrow keys", async () => {
    const host = await mount("navigation-menu");
    const trigger = q<HTMLButtonElement>(host, "navigation-menu-trigger");
    const link = q<HTMLAnchorElement>(host, "navigation-menu-link");
    trigger.click();
    await tick();
    document.body.click();
    await tick(400);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(link);
  });

  it("ArrowDown opens the panel and focuses its first link inside the shared viewport", async () => {
    const host = await mount("navigation-menu");
    const trigger = q<HTMLButtonElement>(host, "navigation-menu-trigger");
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    await tick(50);
    expect(document.activeElement?.getAttribute("href")).toBe("/docs");
    expect(q(host, "navigation-menu-viewport").contains(document.activeElement)).toBe(true);
  });
});

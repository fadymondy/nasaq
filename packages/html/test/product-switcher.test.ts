// The Blade product-switcher example under real Alpine: the launcher popover and the sidebar group.
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();

const trigger = () => document.querySelector<HTMLElement>('[data-slot="product-switcher-trigger"]')!;
const tiles = () => [...document.querySelectorAll<HTMLElement>('[data-slot="product-tile"]')];

describe("product-switcher (Blade example)", () => {
  it("opens a grid of tiles; hrefs are links and the current one is marked", async () => {
    await mount("product-switcher");
    expect(trigger().getAttribute("aria-label")).toBe("Apps");
    trigger().click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(tiles().length).toBe(3);
    expect(tiles()[0]!.tagName).toBe("A");
    expect(tiles()[0]!.getAttribute("href")).toBe("https://mahaam.app");
    expect(tiles()[0]!.getAttribute("aria-current")).toBe("page");
    expect(tiles()[1]!.hasAttribute("aria-current")).toBe(false);
    expect(tiles()[2]!.tagName).toBe("BUTTON");
    expect(tiles()[2]!.textContent).toContain("C");
    expect(document.querySelector('[data-slot="product-all"]')!.getAttribute("href")).toBe("/apps");
  });

  it("choosing a tile fires nq-select and closes the popover; arrow keys move focus", async () => {
    await mount("product-switcher");
    const ids: string[] = [];
    document.addEventListener("nq-select", (e) => ids.push((e as CustomEvent).detail.id));
    trigger().click();
    await tick();
    tiles()[0]!.focus();
    tiles()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(tiles()[1]);
    tiles()[2]!.click();
    await tick();
    expect(ids).toContain("custom");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("the sidebar group lists the pinned products with the current one active and the badge", async () => {
    await mount("product-switcher");
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="sidebar-item"]')];
    expect(items.map((i) => i.textContent?.replace(/\s+/g, " ").trim())).toEqual(["Mahaam 3", "Zekra"]);
    expect(items[0]!.getAttribute("aria-current")).toBe("page");
    const ids: string[] = [];
    document.addEventListener("nq-select", (e) => ids.push((e as CustomEvent).detail.id));
    items[1]!.click();
    await tick();
    expect(ids).toContain("zekra");
  });
});

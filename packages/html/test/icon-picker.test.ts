// The Blade icon-picker example under real Alpine: popover, search, categories, paging, keyboard and recents.
import { beforeEach, describe, expect, it } from "vitest";
import { normalizeIconQuery, nextGridIndex } from "../src/alpine/icon-picker";
import { mount, setup, tick } from "./_float-setup";

setup();

beforeEach(() => localStorage.clear());

const trigger = () => document.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!;
const tiles = () => [...document.querySelectorAll<HTMLElement>('[data-slot="icon-picker-tile"]')];
const visible = () => tiles().filter((t) => t.style.display !== "none");
const search = () => document.querySelector<HTMLInputElement>('[data-slot="icon-picker"] input[type="search"]')!;
const type = async (value: string) => {
  search().value = value;
  search().dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};

describe("icon-picker helpers", () => {
  it("folds Arabic variants and moves the grid focus in reading order", () => {
    expect(normalizeIconQuery("أحمد")).toBe(normalizeIconQuery("احمد"));
    expect(nextGridIndex("ArrowRight", 3, 20, 8)).toBe(4);
    expect(nextGridIndex("ArrowRight", 3, 20, 8, true)).toBe(2);
    expect(nextGridIndex("ArrowDown", 15, 20, 8)).toBe(15);
  });
});

describe("icon-picker (Blade example)", () => {
  it("opens, shows one page of tiles and Show more reveals the rest", async () => {
    await mount("icon-picker");
    trigger().click();
    await tick();
    expect(tiles().length).toBeGreaterThan(200);
    expect(visible()).toHaveLength(96);
    const more = [...document.querySelectorAll<HTMLElement>('[data-slot="icon-picker"] button')].find((b) => /Show \d+ more/.test(b.textContent ?? ""))!;
    more.click();
    await tick();
    expect(visible()).toHaveLength(Math.min(192, tiles().length));
  });

  it("filters by search in English and Arabic and shows the empty message", async () => {
    await mount("icon-picker");
    trigger().click();
    await tick();
    await type("home");
    expect(visible().map((t) => t.dataset.name)).toContain("house");
    await type("بيت");
    expect(visible().map((t) => t.dataset.name)).toContain("house");
    await type("zzzzqq");
    expect(visible()).toHaveLength(0);
    expect(document.querySelector('[data-slot="icon-picker"]')!.textContent).toContain("No icons match “zzzzqq”.");
  });

  it("filters by category tab", async () => {
    await mount("icon-picker");
    trigger().click();
    await tick();
    const tab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent === "Files")!;
    tab.click();
    await tick();
    expect(visible().length).toBeGreaterThan(0);
    expect(visible().every((t) => t.dataset.category === "files")).toBe(true);
    expect(tab.getAttribute("aria-selected")).toBe("true");
  });

  it("choosing sets the value, closes the popover, shows the glyph and keeps a recent", async () => {
    await mount("icon-picker");
    trigger().click();
    await tick();
    const house = tiles().find((t) => t.dataset.name === "house")!;
    house.click();
    await tick();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().getAttribute("aria-label")).toBe("Icon: house");
    expect(document.body.textContent).toContain("house");
    expect(trigger().querySelector("svg")).not.toBeNull();
    expect(JSON.parse(localStorage.getItem("nasaq:icon-picker:recent")!)).toEqual(["house"]);
    expect(house.getAttribute("aria-selected")).toBe("true");
  });

  it("moves between tiles with the arrow keys from the search field", async () => {
    await mount("icon-picker");
    trigger().click();
    await tick();
    search().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    const first = visible()[0]!;
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect((document.activeElement as HTMLElement).dataset.index).toBe("1");
  });
});

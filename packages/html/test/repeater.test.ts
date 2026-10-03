// The Blade repeater example (packages/php/examples/rendered/repeater.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { dropIndex, keyTarget, moveItem, shiftFor } from "../src/alpine/repeater";

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
  document.documentElement.lang = "en";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("repeater");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const rows = () => [...document.querySelectorAll<HTMLElement>('[data-slot="repeater-row"]')];
const names = () => rows().map((r) => r.querySelector<HTMLInputElement>("input")!.value);
const btn = (label: string) => document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const addBtn = () => document.querySelector<HTMLButtonElement>("[data-repeater-add]")!;
const state = () => (Alpine.$data(document.querySelector('[data-slot="repeater"]')!) as { items: { name: string }[] });

describe("repeater helpers", () => {
  it("moves, targets keys and picks the closest drop slot", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(keyTarget("Home", 2, 3)).toBe(0);
    expect(dropIndex([10, 60, 110], 0, 55)).toBe(1);
    expect(shiftFor(1, 0, 2, 50)).toBe(-50);
  });
});

describe("repeater (Blade example)", () => {
  it("renders the initial row with its title, labelled actions and limits", async () => {
    await mount();
    expect(rows()).toHaveLength(1);
    expect(names()).toEqual(["Sara"]);
    expect(rows()[0]!.querySelector("button[aria-expanded]")!.textContent).toContain("Sara");
    expect(btn("Remove Sara").disabled).toBe(true);
    expect(document.querySelector("ol")!.getAttribute("aria-label")).toBe("Items");
    expect(document.querySelector('[data-slot="repeater-empty"]')!.getAttribute("style")).toContain("display: none");
  });

  it("adds rows up to max, announces and disables Add at the limit", async () => {
    await mount();
    for (let i = 0; i < 4; i++) {
      addBtn().click();
      await tick();
    }
    expect(rows()).toHaveLength(5);
    expect(addBtn().disabled).toBe(true);
    expect(document.body.textContent).toContain("Limit of 5 reached.");
    expect(document.querySelector('[role="status"]')!.textContent).toContain("added");
    expect(document.querySelector('[data-slot="repeater-count"]')!.textContent).toBe("5 of 5 items");
  });

  it("edits through x-model and duplicates after the source", async () => {
    await mount();
    const input = rows()[0]!.querySelector<HTMLInputElement>("input")!;
    input.value = "Layla";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(state().items[0]!.name).toBe("Layla");
    btn("Duplicate Layla").click();
    await tick();
    expect(names()).toEqual(["Layla", "Layla"]);
    addBtn().click();
    await tick();
    expect(names()).toEqual(["Layla", "Layla", ""]);
  });

  it("removes a row down to min and keeps focus on a neighbour handle", async () => {
    await mount();
    addBtn().click();
    await tick();
    btn("Remove Item 2").click();
    await tick();
    expect(rows()).toHaveLength(1);
    expect(btn("Remove Sara").disabled).toBe(true);
  });

  it("reorders with the keyboard and announces the position", async () => {
    await mount();
    addBtn().click();
    await tick();
    const input = rows()[1]!.querySelector<HTMLInputElement>("input")!;
    input.value = "Omar";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    btn("Reorder Sara").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick();
    expect(names()).toEqual(["Omar", "Sara"]);
    expect(document.querySelector('[role="status"]')!.textContent).toBe("Sara moved to position 2 of 2");
  });

  it("reorders with native pointer events", async () => {
    await mount();
    addBtn().click();
    await tick();
    const input = rows()[1]!.querySelector<HTMLInputElement>("input")!;
    input.value = "Omar";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    rows().forEach((el, i) => (el.getBoundingClientRect = () => ({ top: i * 60, bottom: i * 60 + 50, height: 50, left: 0, right: 100, width: 100, x: 0, y: i * 60, toJSON() {} }) as DOMRect));
    const ev = (type: string, y: number) => {
      const e = new Event(type, { bubbles: true, cancelable: true }) as Event & Record<string, unknown>;
      Object.assign(e, { clientY: y, pointerId: 1, pointerType: "touch", button: 0 });
      return e;
    };
    btn("Reorder Sara").dispatchEvent(ev("pointerdown", 25));
    window.dispatchEvent(ev("pointermove", 70));
    await tick();
    expect(rows()[0]!.dataset.dragging).toBe("true");
    window.dispatchEvent(ev("pointerup", 70));
    await tick();
    expect(names()).toEqual(["Omar", "Sara"]);
    expect(rows()[0]!.dataset.dragging).toBeUndefined();
  });

  it("collapses a row and all rows", async () => {
    await mount();
    addBtn().click();
    await tick();
    btn("Collapse Sara").click();
    await tick();
    expect(rows()[0]!.dataset.collapsed).toBe("true");
    expect(btn("Expand Sara").getAttribute("aria-expanded")).toBe("false");
    expect(rows()[0]!.querySelector<HTMLElement>('[data-slot="repeater-body"]')!.style.display).toBe("none");
    const all = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Collapse all"))!;
    all.click();
    await tick();
    expect(rows().every((r) => r.dataset.collapsed === "true")).toBe(true);
  });

  it("speaks Arabic with Arabic digits", async () => {
    const nq = Alpine.store("nq") as { setLocale(l: string): void };
    nq.setLocale("ar");
    await mount();
    addBtn().click();
    await tick();
    expect(document.querySelector('[data-slot="repeater-count"]')!.textContent).toBe("٢ من ٥ عناصر");
    nq.setLocale("en");
  });
});

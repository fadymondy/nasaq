import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  document.documentElement.dir = "ltr";
});

async function mount() {
  document.body.innerHTML = rendered("line-item-editor");
  await tick();
  return document.querySelector<HTMLElement>('[data-slot="line-item-editor"]')!;
}
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim();
const total = () => text(document.querySelector('[data-slot="line-item-grand-total"]'));
const byLabel = <T extends Element>(sel: string, label: string) => document.querySelector<T>(`${sel}[aria-label="${label}"]`)!;

describe("line-item-editor (Alpine)", () => {
  it("renders a line with its total and the grand total", async () => {
    const root = await mount();
    expect(root.dataset.taxMode).toBe("exclusive");
    const row = root.querySelector('[data-slot="line-item"]')!;
    expect(row.hasAttribute("data-free")).toBe(false);
    expect(text(row.querySelector('[data-slot="line-item-total"]'))).toContain("149.50");
    expect(total()).toContain("149.50");
    expect(byLabel<HTMLInputElement>("input", "Qty, Coffee beans").value).toBe("2");
  });

  it("steps the quantity, updates the totals and emits nq-change", async () => {
    const root = await mount();
    const events: { lines: { quantity: number }[]; totals: { total: number } }[] = [];
    root.addEventListener("nq-change", (e) => events.push((e as CustomEvent).detail));
    byLabel<HTMLButtonElement>("button", "Increase quantity, Coffee beans").click();
    await tick();
    expect(total()).toContain("224.25");
    expect(events.at(-1)?.lines[0]?.quantity).toBe(3);
    expect(events.at(-1)?.totals.total).toBe(22425);
    byLabel<HTMLButtonElement>("button", "Decrease quantity, Coffee beans").click();
    await tick();
    expect(total()).toContain("149.50");
  });

  it("edits the unit price in minor units", async () => {
    await mount();
    const input = byLabel<HTMLInputElement>("input", "Unit price, Coffee beans");
    input.dispatchEvent(new Event("focus"));
    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(total()).toContain("23.00");
  });

  it("applies a line discount typed as a percent", async () => {
    await mount();
    const input = byLabel<HTMLInputElement>("input", "Disc. %, Coffee beans");
    input.dispatchEvent(new Event("focus"));
    input.value = "10";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(total()).toContain("134.55");
  });

  it("adds a free line and removes it from the actions menu", async () => {
    const root = await mount();
    const add = [...root.querySelectorAll("button")].find((b) => text(b) === "Add free line")!;
    add.click();
    await tick();
    const rows = root.querySelectorAll('[data-slot="line-item"]');
    expect(rows).toHaveLength(2);
    expect(rows[1]!.hasAttribute("data-free")).toBe(true);
    const trigger = byLabel<HTMLButtonElement>("button", "Line actions, Line 2");
    trigger.click();
    await tick();
    const remove = [...document.querySelectorAll('[role="menuitem"]')].find((i) => text(i) === "Remove line") as HTMLElement | undefined;
    expect(remove).toBeTruthy();
    remove!.click();
    await tick();
    expect(root.querySelectorAll('[data-slot="line-item"]')).toHaveLength(1);
  });

  it("computes with SAR by default in the example and offers its tax rates", async () => {
    const root = await mount();
    expect(total()).not.toMatch(/ILS|EGP|₪/);
    expect(root.querySelectorAll('[data-slot="select-item"]').length + document.querySelectorAll('[data-slot="select-item"]').length).toBeGreaterThanOrEqual(3);
  });
});

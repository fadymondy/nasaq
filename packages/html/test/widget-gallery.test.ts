// glance-surfaces: the tray, rows and tiles are static; the widget gallery has the Alpine behaviour (size picker,
// add and remove). This runs the rendered Blade example under real Alpine.
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
  host.innerHTML = rendered("glance-surfaces");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("glance-surfaces (Blade example)", () => {
  it("renders the tray popover with a row", async () => {
    const host = await mount();
    const tray = host.querySelector('[data-slot="tray-popover"]')!;
    expect(tray.getAttribute("aria-label")).toBe("Today");
    expect(tray.querySelector('[data-slot="glance-row"]')?.textContent).toContain("Timer running");
  });

  it("switches the preview with the size picker", async () => {
    const host = await mount();
    const item = host.querySelector<HTMLElement>('[data-widget-id="steps"]')!;
    const tiles = item.querySelectorAll<HTMLElement>('[data-slot="widget-tile"]');
    expect(visible(tiles[0]!)).toBe(true);
    expect(visible(tiles[1]!)).toBe(false);
    const radios = item.querySelectorAll<HTMLElement>('[role="radio"]');
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
    radios[1]!.click();
    await tick();
    expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
    expect(radios[0]!.getAttribute("aria-checked")).toBe("false");
    expect(visible(tiles[0]!)).toBe(false);
    expect(visible(tiles[1]!)).toBe(true);
  });

  it("adds with the chosen size and removes, dispatching events", async () => {
    const host = await mount();
    const events: { type: string; detail: unknown }[] = [];
    host.addEventListener("nq-add", (e) => events.push({ type: "add", detail: (e as CustomEvent).detail }));
    host.addEventListener("nq-remove", (e) => events.push({ type: "remove", detail: (e as CustomEvent).detail }));
    const item = host.querySelector<HTMLElement>('[data-widget-id="steps"]')!;
    const [removeBtn, addBtn] = item.querySelectorAll<HTMLElement>('[data-slot="button"]');
    expect(visible(addBtn!)).toBe(true);
    expect(visible(removeBtn!)).toBe(false);
    item.querySelectorAll<HTMLElement>('[role="radio"]')[1]!.click();
    addBtn!.click();
    await tick();
    expect(events).toEqual([{ type: "add", detail: { id: "steps", size: "medium" } }]);
    expect(visible(removeBtn!)).toBe(true);
    expect(visible(addBtn!)).toBe(false);
    removeBtn!.click();
    await tick();
    expect(events[1]).toEqual({ type: "remove", detail: { id: "steps" } });
    expect(visible(addBtn!)).toBe(true);
  });

  it("starts with the widgets already added showing Remove", async () => {
    const host = await mount();
    const [removeBtn, addBtn] = host.querySelector<HTMLElement>('[data-widget-id="timer"]')!.querySelectorAll<HTMLElement>('[data-slot="button"]');
    expect(visible(removeBtn!)).toBe(true);
    expect(removeBtn!.textContent).toContain("Remove");
    expect(visible(addBtn!)).toBe(false);
  });
});

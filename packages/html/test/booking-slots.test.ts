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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const tiles = () => [...document.querySelectorAll<HTMLButtonElement>('[data-slot="booking-slot"]')];

describe("booking-slots (Blade example)", () => {
  it("lists the first free day's times with their states", async () => {
    await mount(rendered("booking-slots"));
    expect(tiles()).toHaveLength(5);
    expect(tiles().map((t) => t.disabled)).toEqual([false, true, false, true, false]);
    expect(tiles()[1]!.getAttribute("data-status")).toBe("full");
  });

  it("chooses a time, fires change and moves with the arrow keys", async () => {
    const host = await mount(rendered("booking-slots"));
    const root = host.querySelector<HTMLElement>('[data-slot="booking-slots"]')!;
    const seen: string[] = [];
    root.addEventListener("change", (e) => seen.push((e as CustomEvent).detail.start));
    tiles()[0]!.click();
    await tick();
    expect(tiles()[0]!.getAttribute("aria-checked")).toBe("true");
    expect(tiles()[0]!.getAttribute("data-state")).toBe("checked");
    tiles()[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick();
    expect(tiles()[2]!.getAttribute("aria-checked")).toBe("true");
    expect(seen).toHaveLength(2);
    expect(seen[1]).toMatch(/T11:00$/);
  });
});

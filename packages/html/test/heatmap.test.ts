// The Blade example (php/examples/heatmap.blade.php) mounted under real Alpine: roving tabindex, arrow keys and the shared tooltip.
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
  host.innerHTML = rendered("heatmap");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const cell = (host: HTMLElement, key: string) => host.querySelector<HTMLElement>(`[data-date="${key}"]`)!;
const press = (el: HTMLElement, key: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

describe("heatmap (Blade example)", () => {
  it("renders the grid with levels, names and one tab stop", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="heatmap"]')!.getAttribute("dir")).toBe("ltr");
    expect(host.querySelector('[role="grid"]')!.getAttribute("aria-label")).toBe("Commits by day");
    expect(cell(host, "2026-09-29").getAttribute("aria-label")).toBe("Sep 29, 2026: 1 contribution");
    expect(cell(host, "2026-09-28").getAttribute("data-level")).toBe("4");
    expect(host.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-slot="heatmap-legend"] [data-level]')).toHaveLength(5);
  });

  it("moves focus by day and week with the arrow keys and keeps one tab stop", async () => {
    const host = await mount();
    const last = cell(host, "2026-09-29");
    last.focus();
    press(last, "ArrowUp");
    expect(document.activeElement).toBe(cell(host, "2026-09-28"));
    press(cell(host, "2026-09-28"), "ArrowLeft");
    expect(document.activeElement).toBe(cell(host, "2026-09-21"));
    expect(cell(host, "2026-09-21").getAttribute("tabindex")).toBe("0");
    expect(host.querySelectorAll('[role="gridcell"][tabindex="0"]')).toHaveLength(1);
    // clamped at the end of the range
    const end = cell(host, "2026-09-29");
    end.focus();
    press(end, "ArrowDown");
    expect(document.activeElement).toBe(end);
  });

  it("shows one shared tooltip with the count and date on hover and hides it after", async () => {
    const host = await mount();
    const tip = host.querySelector<HTMLElement>('[data-slot="tooltip-content"]')!;
    expect(tip.style.display).toBe("none");
    const c = cell(host, "2026-09-28");
    c.dispatchEvent(new Event("pointerover", { bubbles: true }));
    await tick();
    expect(tip.style.display).not.toBe("none");
    expect(tip.textContent).toContain("8 contributions");
    expect(tip.textContent).toContain("Sep 28, 2026");
    c.dispatchEvent(new Event("pointerout", { bubbles: true }));
    await tick();
    expect(tip.style.display).toBe("none");
  });
});

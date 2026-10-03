// The Blade example (php/examples/search-performance-table.blade.php) mounted under real Alpine: sorted by clicks, searchable, with deltas.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const labels = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-cell-col="label"]')].map((c) => c.textContent?.trim());

describe("search-performance-table (Blade example)", () => {
  it("sorts by clicks descending and shows the deltas", async () => {
    const host = await mountHtml(rendered("search-performance-table"));
    expect(host.querySelector('[data-slot="search-performance-table"]')).not.toBeNull();
    expect(labels(host)).toEqual(["arabic design system", "rtl react components"]);
    expect(host.textContent).toContain("+11%");
    expect(host.textContent).toContain("-0.9");
  });

  it("filters with the search box and flips the sort", async () => {
    const host = await mountHtml(rendered("search-performance-table"));
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "rtl";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(labels(host)).toEqual(["rtl react components"]);
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    host.querySelector<HTMLElement>('[data-col="clicks"] button')!.click();
    await tick();
    expect(labels(host)[0]).toBe("rtl react components");
  });
});

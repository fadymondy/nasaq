// The Blade example (php/examples/metric-tiles.blade.php) mounted under real Alpine, plus the selectable markup <x-nq::metric-tiles selectable> emits.
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

describe("metric-tiles (Blade example)", () => {
  it("renders the tiles with deltas, tones and the previous value", async () => {
    const host = await mountHtml(rendered("metric-tiles"));
    const root = host.querySelector<HTMLElement>('[data-slot="metric-tiles"]')!;
    expect(root.getAttribute("role")).toBe("group");
    const cards = root.querySelectorAll<HTMLElement>('[data-slot="stat-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0]!.dataset.tone).toBe("positive");
    expect(cards[0]!.textContent).toContain("+12.2%");
    expect(cards[0]!.textContent).toContain("vs previous period · was 42,980");
    expect(cards[1]!.dataset.tone).toBe("positive");
    expect(cards[1]!.textContent).toContain("38.8%");
  });

  it("selectable tiles keep one pressed and dispatch nq-select", async () => {
    const host = await mountHtml(`
      <div data-slot="metric-tiles" x-data="nqMetricTiles('a')">
        <button type="button" x-bind:aria-pressed="String(selected === 'a')" x-on:click="select('a')">A</button>
        <button type="button" x-bind:aria-pressed="String(selected === 'b')" x-on:click="select('b')">B</button>
      </div>`);
    const root = host.querySelector<HTMLElement>('[data-slot="metric-tiles"]')!;
    const ids: string[] = [];
    root.addEventListener("nq-select", (e) => ids.push((e as CustomEvent).detail.id));
    const [a, b] = root.querySelectorAll<HTMLElement>("button");
    b!.click();
    await tick();
    expect(ids).toEqual(["b"]);
    expect(b!.getAttribute("aria-pressed")).toBe("true");
    expect(a!.getAttribute("aria-pressed")).toBe("false");
  });
});

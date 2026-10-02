// The Blade example (php/examples/time-series-panel.blade.php) mounted under real Alpine: the metric switcher, the compare switch and the hover.
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

const shown = (el: Element) => (el as HTMLElement).style.display !== "none";

describe("time-series-panel (Blade example)", () => {
  it("renders the card, the total with its change and the labelled chart of the first metric", async () => {
    const host = await mountHtml(rendered("time-series-panel"));
    const root = host.querySelector<HTMLElement>('[data-slot="time-series-panel"]')!;
    expect(root.querySelector('[data-slot="card-title"]')!.tagName).toBe("H3");
    const blocks = root.querySelectorAll<HTMLElement>("[data-metric]");
    expect(blocks).toHaveLength(2);
    expect(shown(blocks[0]!)).toBe(true);
    expect(shown(blocks[1]!)).toBe(false);
    const total = blocks[0]!.querySelector('[data-slot="time-series-total"]')!;
    expect(total.textContent).toContain("4,340");
    expect(total.textContent).toContain("+11%");
    const chart = blocks[0]!.querySelector('[data-slot="chart"]')!;
    expect(chart.getAttribute("role")).toBe("img");
    expect(chart.getAttribute("aria-label")).toBe("Users, Sep 27 to Sep 28");
    expect(blocks[0]!.querySelector('[data-slot="time-series-current"]')!.getAttribute("d")).toMatch(/^M/);
  });

  it("switches the metric, never leaves it empty and dispatches nq-metric", async () => {
    const host = await mountHtml(rendered("time-series-panel"));
    const root = host.querySelector<HTMLElement>('[data-slot="time-series-panel"]')!;
    const ids: string[] = [];
    root.addEventListener("nq-metric", (e) => ids.push((e as CustomEvent).detail.id));
    const toggles = root.querySelectorAll<HTMLElement>('[data-slot="toggle"]');
    toggles[1]!.click();
    await tick();
    const blocks = root.querySelectorAll<HTMLElement>("[data-metric]");
    expect(ids).toEqual(["sessions"]);
    expect(shown(blocks[0]!)).toBe(false);
    expect(shown(blocks[1]!)).toBe(true);
    expect(toggles[1]!.getAttribute("aria-pressed")).toBe("true");
    toggles[1]!.click();
    await tick();
    expect(toggles[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(shown(blocks[1]!)).toBe(true);
  });

  it("hides the comparison line and the change when compare is switched off", async () => {
    const host = await mountHtml(rendered("time-series-panel"));
    const root = host.querySelector<HTMLElement>('[data-slot="time-series-panel"]')!;
    const on: boolean[] = [];
    root.addEventListener("nq-compare", (e) => on.push((e as CustomEvent).detail.on));
    const previous = root.querySelector('[data-slot="time-series-previous"]')!;
    const change = root.querySelector('[data-slot="time-series-total"] span.text-label')!;
    expect(shown(previous)).toBe(true);
    expect(shown(change)).toBe(true);
    root.querySelector<HTMLElement>('[data-slot="switch"]')!.click();
    await tick();
    expect(on).toEqual([false]);
    expect(shown(previous)).toBe(false);
    expect(shown(change)).toBe(false);
  });

  it("shows a tooltip with the hovered day and hides it on leave", async () => {
    const host = await mountHtml(rendered("time-series-panel"));
    const plot = host.querySelector<HTMLElement>('[data-metric="users"] [data-slot="time-series-plot"]')!;
    plot.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const tooltip = plot.querySelector<HTMLElement>('[data-slot="chart-tooltip"]')!;
    expect(shown(tooltip.closest(".contents")!)).toBe(false);
    plot.dispatchEvent(new MouseEvent("pointermove", { clientX: 100, bubbles: true }));
    await tick();
    expect(shown(tooltip.closest(".contents")!)).toBe(true);
    expect(tooltip.textContent).toContain("Sep 28");
    expect(tooltip.textContent).toContain("2,240");
    expect(tooltip.textContent).toContain("Previous period");
    expect(plot.querySelector<HTMLElement>('[data-slot="chart-dot"]')!.getAttribute("style")).toContain("top: 25.33%");
    plot.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }));
    await tick();
    expect(shown(tooltip.closest(".contents")!)).toBe(false);
  });
});

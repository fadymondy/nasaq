// The Blade example (php/examples/search-console-page.blade.php) mounted under real Alpine.
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

const tile = (host: HTMLElement, id: string) => host.querySelector(`[data-metric="${id}"]`)!.closest("button")!;

describe("search-console-page (Blade example)", () => {
  it("renders the heading, four tiles, the chart and four tabs", async () => {
    const host = await mountHtml(rendered("search-console-page"));
    expect(host.querySelector("h1")!.textContent).toBe("Search Console");
    expect(host.textContent).toContain("How nasaq.dev performs in Google Search");
    expect([...host.querySelectorAll("[data-slot=metric-tiles] [data-metric]")].map((e) => e.getAttribute("data-metric"))).toEqual(["clicks", "impressions", "ctr", "position"]);
    expect(host.querySelector('[data-slot="time-series-panel"]')).not.toBeNull();
    expect([...host.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim())).toEqual(["Queries", "Pages", "Countries", "Devices"]);
    expect([...host.querySelectorAll('[data-slot="period-toggle"] [data-slot="toggle"]')].map((t) => t.textContent!.trim())).toEqual(["7 days", "28 days", "90 days"]);
  });

  it("lets a tile choose the chart metric, and the chart switch mark the tile", async () => {
    const host = await mountHtml(rendered("search-console-page"));
    const panel = host.querySelector<HTMLElement>('[data-slot="time-series-panel"]')!;
    expect(tile(host, "clicks").getAttribute("aria-pressed")).toBe("true");
    tile(host, "position").click();
    await tick();
    expect(tile(host, "position").getAttribute("aria-pressed")).toBe("true");
    expect(tile(host, "clicks").getAttribute("aria-pressed")).toBe("false");
    const toggles = [...panel.querySelectorAll<HTMLElement>("[data-slot=toggle]")];
    expect(toggles.find((t) => t.getAttribute("aria-pressed") === "true")!.textContent).toContain("Average position");
    toggles.find((t) => t.textContent!.includes("Total impressions"))!.click();
    await tick();
    expect(tile(host, "impressions").getAttribute("aria-pressed")).toBe("true");
    expect(tile(host, "position").getAttribute("aria-pressed")).toBe("false");
  });

  it("switches between the tabs", async () => {
    const host = await mountHtml(rendered("search-console-page"));
    const tabs = [...host.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    tabs[3]!.click();
    await tick();
    expect(tabs[3]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("false");
  });
});

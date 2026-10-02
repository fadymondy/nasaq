// The Blade example (php/examples/google-analytics-page.blade.php) mounted under real Alpine.
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

describe("google-analytics-page (Blade example)", () => {
  it("renders five tiles, the live counter, the chart and the period toggle", async () => {
    const host = await mountHtml(rendered("google-analytics-page"));
    expect(host.querySelector("h1")!.textContent).toBe("Google Analytics");
    expect(host.textContent).toContain("Traffic and engagement for nasaq.dev");
    expect([...host.querySelectorAll("[data-slot=metric-tiles] [data-metric]")].map((e) => e.getAttribute("data-metric"))).toEqual(["users", "sessions", "engagementRate", "engagementSeconds", "conversions"]);
    expect(host.querySelector('[data-metric="engagementSeconds"]')!.textContent).toContain("2m 14s");
    expect(host.querySelector('[data-slot="realtime-counter"]')).not.toBeNull();
    const toggles = [...host.querySelectorAll('[data-slot="period-toggle"] [data-slot="toggle"]')];
    expect(toggles.map((t) => t.textContent!.trim())).toEqual(["7 days", "28 days", "90 days"]);
    expect(toggles[1]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("switches between the sources, pages and audience tabs", async () => {
    const host = await mountHtml(rendered("google-analytics-page"));
    const tabs = [...host.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map((t) => t.textContent!.trim())).toEqual(["Sources", "Pages", "Audience"]);
    tabs[2]!.click();
    await tick();
    expect(tabs[2]!.getAttribute("aria-selected")).toBe("true");
    expect(host.querySelector('[data-slot="heatmap"]')).not.toBeNull();
  });
});

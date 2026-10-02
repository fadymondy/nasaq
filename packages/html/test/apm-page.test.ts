// The Blade example (php/examples/apm-page.blade.php) mounted under real Alpine.
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

describe("apm-page (Blade example)", () => {
  it("renders the report with four tiles, the panels and the period toggle", async () => {
    const host = await mountHtml(rendered("apm-page"));
    const root = host.querySelector<HTMLElement>('[data-slot="analytics-page"]')!;
    expect(root.querySelector("h1")!.textContent).toBe("Application performance");
    expect(root.textContent).toContain("Latency, errors and traces for api.nasaq.dev");
    expect([...root.querySelectorAll("[data-slot=metric-tiles] [data-metric]")].map((e) => e.getAttribute("data-metric"))).toEqual(["requests", "throughput", "p95", "errorRate"]);
    expect(root.querySelector('[data-metric="p95"]')!.textContent).toContain("486 ms");
    for (const slot of ["latency-percentiles", "error-rate-panel", "time-series-panel", "endpoint-table", "trace-list"]) expect(root.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    const toggles = [...root.querySelectorAll('[data-slot="period-toggle"] [data-slot="toggle"]')];
    expect(toggles.map((t) => t.textContent!.trim())).toEqual(["1 hour", "6 hours", "24 hours"]);
    expect(toggles[1]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("switches between the endpoints and traces tabs", async () => {
    const host = await mountHtml(rendered("apm-page"));
    const tabs = [...host.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map((t) => t.textContent!.trim())).toEqual(["Slow endpoints", "Traces"]);
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    tabs[1]!.click();
    await tick();
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]!.getAttribute("aria-selected")).toBe("false");
  });
});

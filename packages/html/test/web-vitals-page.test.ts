// The Blade example (php/examples/web-vitals-page.blade.php) mounted under real Alpine.
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

describe("web-vitals-page (Blade example)", () => {
  it("shows the verdict, five gauges and the pages table", async () => {
    const host = await mountHtml(rendered("web-vitals-page"));
    expect(host.querySelector("h1")!.textContent).toBe("Web vitals");
    const verdict = host.querySelector('[data-slot="web-vitals-verdict"]')!;
    expect(verdict.textContent).toContain("Passes Core Web Vitals");
    expect(verdict.getAttribute("data-pass")).toBe("true");
    expect([...host.querySelectorAll("[data-slot=web-vital-gauge-grid] [data-metric]")].map((g) => g.getAttribute("data-metric"))).toEqual(["LCP", "INP", "CLS", "FCP", "TTFB"]);
    expect(host.querySelector('[data-slot="web-vitals-pages"]')!.textContent).toContain("/pricing");
  });

  it("choosing a gauge shows the matching trend panel", async () => {
    const host = await mountHtml(rendered("web-vitals-page"));
    const panel = (id: string) => host.querySelector<HTMLElement>(`[data-metric-panel="${id}"]`)!;
    expect(panel("LCP").style.display).not.toBe("none");
    expect(panel("INP").style.display).toBe("none");
    const gauge = host.querySelector<HTMLElement>('button[aria-pressed] [data-metric="INP"]')!.closest("button")!;
    gauge.click();
    await tick();
    expect(panel("INP").style.display).not.toBe("none");
    expect(panel("LCP").style.display).toBe("none");
    expect(gauge.getAttribute("aria-pressed")).toBe("true");
  });
});

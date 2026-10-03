// The Blade example (php/examples/web-vital-gauge.blade.php) mounted under real Alpine.
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

describe("web-vital-gauge (Blade example)", () => {
  it("a selectable gauge marks the chosen one and emits nq-select", async () => {
    const host = await mountHtml(rendered("web-vital-gauge"));
    const grid = host.querySelectorAll<HTMLElement>("[data-slot=web-vital-gauge-grid]")[1]!;
    const gauge = (id: string) => grid.querySelector<HTMLElement>(`[data-slot=web-vital-gauge][data-metric="${id}"]`)!;
    const seen: CustomEvent[] = [];
    grid.addEventListener("nq-select", (e) => seen.push(e as CustomEvent));
    expect(gauge("LCP").classList.contains("border-primary")).toBe(true);
    expect(gauge("LCP").classList.contains("ring-primary")).toBe(true);
    expect(gauge("INP").classList.contains("border-primary")).toBe(false);
    gauge("INP").closest("button")!.click();
    await tick();
    expect(seen.map((e) => e.detail)).toEqual([{ id: "INP" }]);
    expect(gauge("INP").classList.contains("border-primary")).toBe(true);
    expect(gauge("LCP").classList.contains("border-primary")).toBe(false);
    expect(gauge("INP").closest("button")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("renders the static grid without the selection binding", async () => {
    const host = await mountHtml(rendered("web-vital-gauge"));
    const first = host.querySelectorAll<HTMLElement>("[data-slot=web-vital-gauge-grid]")[0]!;
    expect(first.querySelectorAll("button").length).toBe(0);
    expect(first.querySelectorAll("[data-slot=web-vital-gauge]").length).toBe(3);
  });
});

// The Blade example (php/examples/health-reports.blade.php) mounted under real Alpine: period switch, figure switch, export.
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

const button = (root: HTMLElement, text: string) => [...root.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === text)!;

describe("health-reports (Blade example)", () => {
  it("renders averages that skip nothing here, the engine table and the 30 day period pressed", async () => {
    const host = await mountHtml(rendered("health-reports"));
    const root = host.querySelector<HTMLElement>('[data-slot="health-report"]')!;
    expect(root.querySelector("h1")!.textContent).toBe("Reports");
    expect(root.textContent).toContain("2,450 mL");
    expect(root.querySelectorAll('tbody tr[data-engine="hydration"]')).toHaveLength(1);
    expect(button(root, "30 days").getAttribute("aria-pressed")).toBe("true");
  });

  it("dispatches nq-period-change and keeps one period applied", async () => {
    const host = await mountHtml(rendered("health-reports"));
    const root = host.querySelector<HTMLElement>('[data-slot="health-report"]')!;
    const days: number[] = [];
    root.addEventListener("nq-period-change", (e) => days.push((e as CustomEvent).detail.days));
    button(root, "7 days").click();
    await tick();
    expect(days).toEqual([7]);
    button(root, "7 days").click();
    await tick();
    expect(days).toEqual([7]);
    expect(button(root, "7 days").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows one figure's chart at a time", async () => {
    const host = await mountHtml(rendered("health-reports"));
    const root = host.querySelector<HTMLElement>('[data-slot="health-report"]')!;
    const panel = (m: string) => root.querySelector<HTMLElement>(`[data-metric="${m}"]`)!;
    expect(panel("waterMl").style.display).not.toBe("none");
    expect(panel("weightKg").style.display).toBe("none");
    button(root, "Weight").click();
    await tick();
    expect(panel("weightKg").style.display).not.toBe("none");
    expect(panel("waterMl").style.display).toBe("none");
    expect(panel("weightKg").querySelector("polyline")).not.toBeNull();
  });

  it("dispatches nq-export from the export button", async () => {
    const host = await mountHtml(rendered("health-reports"));
    const root = host.querySelector<HTMLElement>('[data-slot="health-report"]')!;
    let fired = 0;
    root.addEventListener("nq-export", () => fired++);
    button(root, "Export CSV").click();
    expect(fired).toBe(1);
  });
});

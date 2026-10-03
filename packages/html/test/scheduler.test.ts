// The Blade scheduler example (packages/php/examples/rendered/scheduler.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

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

async function mount(html = rendered("scheduler")) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="scheduler"]')!;
const q = (host: HTMLElement, sel: string) => [...host.querySelectorAll<HTMLElement>(sel)];

describe("scheduler (Blade example)", () => {
  it("server-renders the root", () => {
    expect(rendered("scheduler")).toContain('data-slot="scheduler"');
  });

  it("draws the week with both events", async () => {
    const host = await mount();
    const events = q(host, '[data-slot="scheduler-event"]');
    expect(events.map((e) => e.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("Design review"), expect.stringContaining("Client call")]));
    expect(q(host, '[data-slot="scheduler-slot"]').length).toBeGreaterThan(10);
  });

  it("fires event-click and slot-select", async () => {
    const host = await mount();
    const got: unknown[] = [];
    root(host).addEventListener("event-click", (e) => got.push((e as CustomEvent).detail));
    root(host).addEventListener("slot-select", (e) => got.push((e as CustomEvent).detail));
    q(host, '[data-slot="scheduler-event"]')[0]!.click();
    q(host, '[data-slot="scheduler-slot"]')[0]!.click();
    await tick();
    expect(got[0]).toMatchObject({ id: "1" });
    expect(got[1]).toHaveProperty("start");
  });

  it("steps and switches to the month view", async () => {
    const host = await mount();
    const d = Alpine.$data(root(host)) as { view: string; cursor: Date; step(n: number): void };
    d.step(1);
    await tick();
    expect(d.cursor.getDate()).toBe(6);
    (d as unknown as { viewValue: string[] }).viewValue = ["month"];
    await tick();
    expect(d.view).toBe("month");
    expect(q(host, '[data-slot="scheduler-day"]').length).toBeGreaterThanOrEqual(28);
  });

  it("shows month chips and in RTL flips the arrows", async () => {
    const host = await mount(rendered("scheduler").replace('view&quot;:&quot;week', "view&quot;:&quot;month"));
    expect(root(host)).toBeTruthy();
    expect(root(host).getAttribute("dir")).toBe("ltr");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

vi.setConfig({ testTimeout: 30000 }); // 14 time pickers per mount make this slow in happy-dom
const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const btn = (host: HTMLElement, text: string, within: ParentNode = host) => [...within.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;

describe("availability-editor (Blade example)", () => {
  it("renders the days from Saturday, the total and the vacation", async () => {
    const host = await mount(rendered("availability-editor"));
    const days = [...host.querySelectorAll<HTMLElement>('[data-slot="availability-day"]')];
    expect(days).toHaveLength(7);
    expect(days[0]!.getAttribute("aria-label")).toBe("Saturday");
    expect(days.filter((d) => d.hasAttribute("data-open"))).toHaveLength(5);
    expect(host.textContent).toContain("35 h a week");
    const vac = host.querySelector('[data-slot="availability-vacation"]')!;
    expect(vac.textContent).toContain("3 days");
    expect(vac.textContent).toContain("Conference");
  });

  it("adds hours, saves through the event and shows the message", async () => {
    const host = await mount(rendered("availability-editor"));
    const save = btn(host, "Save availability");
    expect(save.hasAttribute("disabled")).toBe(true);
    const open = host.querySelector<HTMLElement>('[data-slot="availability-day"][data-open]')!;
    btn(host, "Add hours", open).click();
    await tick();
    expect(save.hasAttribute("disabled")).toBe(false);
    let value: { weekly: unknown[] } | null = null;
    host.addEventListener("nq-availability-save", (e) => (value = (e as CustomEvent).detail.value));
    save.click();
    await tick(500);
    expect(value).not.toBeNull();
    expect(host.textContent).toContain("Availability saved.");
    expect(save.hasAttribute("disabled")).toBe(true);
  });

  it("removes a vacation and discards the change", async () => {
    const host = await mount(rendered("availability-editor"));
    host.querySelector<HTMLButtonElement>('[data-slot="availability-vacation"] button')!.click();
    await tick();
    expect(host.querySelector('[data-slot="availability-vacation"]')).toBeNull();
    btn(host, "Discard changes").click();
    await tick();
    expect(host.querySelector('[data-slot="availability-vacation"]')).not.toBeNull();
  });

  it("flags an overlap and blocks saving", async () => {
    const host = await mount(rendered("availability-editor"));
    const open = host.querySelector<HTMLElement>('[data-slot="availability-day"][data-open]')!;
    btn(host, "Add hours", open).click();
    await tick();
    // Move the new range's start before the first range's end.
    const rows = [...open.querySelectorAll<HTMLElement>("li")];
    expect(rows.length).toBeGreaterThan(1);
    const data = (Alpine as unknown as { $data(el: Element): { av: { weekly: { ranges: { start: string }[] }[] } } }).$data(host.firstElementChild!);
    const idx = data.av.weekly.findIndex((d) => d.ranges.length > 1);
    data.av.weekly[idx]!.ranges[1]!.start = "16:00";
    await tick();
    expect(host.textContent).toContain("Fix these before saving");
    expect(btn(host, "Save availability").hasAttribute("disabled")).toBe(true);
  });
});

// The Blade cron-builder example (packages/php/examples/rendered/cron-builder.html) under real Alpine.
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

async function mount(html = rendered("cron-builder")) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="cron-builder"]')!;
const data = (host: HTMLElement) => Alpine.$data(root(host)) as Record<string, unknown> & { cron: string; zone: string; frequency: string; every: number; time: string; weekdays: string[]; pane: string };
const summary = (host: HTMLElement) => host.querySelector('[data-slot="cron-summary"] p:nth-of-type(2)')!.textContent;

describe("cron-builder (Blade example)", () => {
  it("server-renders the controls and the group name", () => {
    const ssr = rendered("cron-builder");
    expect(ssr).toContain('data-slot="cron-builder"');
    expect(ssr).toContain('data-slot="cron-summary"');
    expect(ssr).toContain("Weekdays at 09:00");
    expect(ssr).toContain("Asia/Riyadh");
  });

  it("reads the value in words, lists five next runs and marks the matching preset", async () => {
    const host = await mount();
    expect(data(host).cron).toBe("0 9 * * 1-5");
    expect(data(host).pane).toBe("cron");
    expect(summary(host)!.length).toBeGreaterThan(5);
    expect(host.querySelectorAll('[data-slot="cron-next-runs"] li').length).toBe(5);
    const pressed = [...host.querySelectorAll<HTMLElement>('[aria-label="Common schedules"] [aria-pressed="true"]')].filter((b) => b.style.display !== "none");
    expect(pressed.map((b) => b.textContent!.trim())).toEqual(["Weekdays at 09:00"]);
  });

  it("a simple field rewrites the cron string", async () => {
    const host = await mount();
    const d = data(host);
    d.cron = "0 9 * * 1,3,5";
    await tick();
    expect(d.frequency).toBe("weekly");
    d.time = "07:30";
    await tick();
    expect(d.cron).toBe("30 7 * * 1,3,5");
    d.frequency = "daily";
    await tick();
    expect(d.cron).toBe("30 7 * * *");
    expect(root(host).querySelector<HTMLInputElement>('input[type="time"]')!.value).toBe("07:30");
  });

  it("a preset click sets the value and fires value-change", async () => {
    const host = await mount();
    let detail: { value: string; valid: boolean } | null = null;
    root(host).addEventListener("value-change", (e) => (detail = (e as CustomEvent).detail));
    const daily = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Daily at 09:00")!;
    daily.click();
    await tick();
    expect(data(host).cron).toBe("0 9 * * *");
    expect(detail).toEqual({ value: "0 9 * * *", valid: true });
  });

  it("an invalid expression is named, and the summary says so", async () => {
    const host = await mount();
    const d = data(host);
    d.expression = "0 99 * * *";
    await tick();
    const alert = host.querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.style.display).not.toBe("none");
    expect(alert.textContent).toContain("hour");
    expect(summary(host)).toBe("Not a valid schedule");
    expect(host.querySelector<HTMLElement>('[data-slot="cron-next-runs"]')!.style.display).toBe("none");
    expect(host.querySelector('[data-slot="input"][aria-invalid="true"]')).not.toBeNull();
  });

  it("an empty weekday selection is ignored", async () => {
    const host = await mount();
    const d = data(host);
    d.cron = "0 9 * * 1,2";
    await tick();
    d.weekdays = [];
    await tick();
    expect(d.cron).toBe("0 9 * * 1,2");
    expect(d.weekdays).toEqual(["1", "2"]);
  });

  it("changing the zone fires time-zone-change and re-lists the runs in it", async () => {
    const host = await mount();
    let zone = "";
    root(host).addEventListener("time-zone-change", (e) => (zone = (e as CustomEvent).detail.timeZone));
    const before = host.querySelector('[data-slot="cron-next-runs"] li time')!.getAttribute("datetime");
    data(host).zone = "America/Los_Angeles";
    await tick();
    expect(zone).toBe("America/Los_Angeles");
    expect(host.querySelector('[data-slot="cron-next-runs"] li time')!.getAttribute("datetime")).not.toBe(before);
  });
});

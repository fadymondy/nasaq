// The Blade calendar example (packages/php/examples/rendered/calendar.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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

async function mount(html = rendered("calendar")) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const cals = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="calendar"]')];
const day = (root: HTMLElement, key: string) => root.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)!;
const title = (root: HTMLElement) => root.querySelector('[data-slot="calendar-title"]')!.textContent;
const key = (e: Element | null) => e?.getAttribute("data-date");

describe("calendar (Blade example)", () => {
  it("server-renders the month, then Alpine replaces it with the same grid", async () => {
    const ssr = rendered("calendar");
    expect(ssr).toContain('data-date="2026-09-15"');
    expect(ssr).toContain("September 2026");
    const host = await mount();
    const single = cals(host)[0]!;
    expect(single.querySelectorAll("[data-ssr]").length).toBe(0);
    expect(single.getAttribute("data-mode")).toBe("single");
    expect(title(single)).toBe("September 2026");
    expect(single.querySelector("table")!.getAttribute("role")).toBe("grid");
    const sel = day(single, "2026-09-15");
    expect(sel.hasAttribute("data-selected")).toBe(true);
    expect(sel.hasAttribute("data-today")).toBe(true);
    expect(sel.getAttribute("aria-current")).toBe("date");
    expect(sel.getAttribute("tabindex")).toBe("0");
    expect(day(single, "2026-09-16").getAttribute("tabindex")).toBe("-1");
    expect(sel.getAttribute("aria-label")).toBe("Tuesday, September 15, 2026");
    expect(sel.closest("td")!.getAttribute("aria-selected")).toBe("true");
    expect(single.querySelectorAll('[data-slot="calendar-grid"] tbody tr:not([style*="none"]) td button[data-date]').length).toBe(35);
  });

  it("picks a day, then toggles it off", async () => {
    const host = await mount();
    const single = cals(host)[0]!;
    day(single, "2026-09-10").click();
    await tick();
    expect(day(single, "2026-09-10").hasAttribute("data-selected")).toBe(true);
    expect(day(single, "2026-09-15").hasAttribute("data-selected")).toBe(false);
    day(single, "2026-09-10").click();
    await tick();
    expect(single.querySelectorAll("[data-selected]").length).toBe(0);
  });

  it("selects a range and orders the ends, with a band between", async () => {
    const host = await mount();
    const range = cals(host)[1]!;
    expect(range.getAttribute("data-mode")).toBe("range");
    expect(range.querySelectorAll("[data-in-range]").length).toBeGreaterThan(0);
    day(range, "2026-09-20").click();
    await tick();
    expect(range.querySelectorAll("[data-selected]").length).toBe(1);
    day(range, "2026-09-12").click();
    await tick();
    const selected = [...range.querySelectorAll("[data-selected]")].map(key);
    expect(selected).toEqual(["2026-09-12", "2026-09-20"]);
    expect(range.querySelectorAll("[data-in-range]").length).toBe(9);
  });

  it("navigates months with the buttons and fires month-change", async () => {
    const host = await mount();
    const single = cals(host)[0]!;
    const months: string[] = [];
    single.addEventListener("month-change", (e) => months.push((e as CustomEvent).detail));
    const next = single.querySelector<HTMLButtonElement>('button[aria-label="Next month"]')!;
    next.click();
    await tick();
    expect(title(single)).toBe("October 2026");
    expect(months).toEqual(["2026-10-01"]);
    single.querySelector<HTMLButtonElement>('button[aria-label="Previous month"]')!.click();
    await tick();
    expect(title(single)).toBe("September 2026");
  });

  it("moves focus with the arrow keys and pages months", async () => {
    const host = await mount();
    const single = cals(host)[0]!;
    day(single, "2026-09-15").focus();
    day(single, "2026-09-15").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await tick(400);
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-09-16");
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    await tick(400);
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-09-23");
    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true, cancelable: true }));
    await tick(400);
    expect(title(single)).toBe("October 2026");
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-23");
  });

  it("blocks days and months outside min and max, and listed days", async () => {
    const host = await mount();
    const limited = cals(host)[3]!;
    expect(day(limited, "2026-09-03").hasAttribute("data-disabled")).toBe(true);
    expect(day(limited, "2026-09-13").hasAttribute("data-disabled")).toBe(true);
    expect(day(limited, "2026-09-09").hasAttribute("data-disabled")).toBe(true);
    expect(day(limited, "2026-09-10").hasAttribute("data-disabled")).toBe(false);
    day(limited, "2026-09-03").click();
    await tick();
    expect(day(limited, "2026-09-03").hasAttribute("data-selected")).toBe(false);
    expect(day(limited, "2026-09-12").hasAttribute("data-selected")).toBe(true);
    expect(limited.querySelector<HTMLButtonElement>('button[aria-label="Previous month"]')!.disabled).toBe(true);
    expect(limited.querySelector<HTMLButtonElement>('button[aria-label="Next month"]')!.disabled).toBe(true);
  });

  it("flips the arrow keys in RTL and titles the month in Arabic", async () => {
    const host = await mount();
    const single = cals(host)[2]!;
    expect(single.getAttribute("dir")).toBe("rtl");
    expect(title(single)).toContain("سبتمبر");
    expect(single.querySelector('button[aria-label="Previous month"]')).not.toBeNull();
    day(single, "2026-09-15").focus();
    day(single, "2026-09-15").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    await tick(400);
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-09-16");
  });
});

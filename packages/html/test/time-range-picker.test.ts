// The Blade time-range-picker example under real Alpine (frozen clock 2026-09-29 09:00 UTC, zone Asia/Riyadh).
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
vi.setConfig({ testTimeout: 20000 });
const popups = () => [...document.querySelectorAll<HTMLElement>('[data-slot="popover-content"]')];
const until = async (cond: () => boolean, ms = 3000) => {
  for (let waited = 0; waited < ms && !cond(); waited += 50) await tick(50);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => (window as any).Alpine.$data(el);
const roots = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="time-range-picker"]')];
const clean = (s: string | null) => (s ?? "").replace(/\s+/g, " ");
const toggles = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];

describe("time range picker (Blade example)", () => {
  it("renders the presets and Week with 24h pressed, and a summary with the zone offset", async () => {
    const host = await mount("time-range-picker");
    const root = roots(host)[0]!;
    const items = toggles(root);
    expect(items.map((t) => t.textContent!.trim())).toEqual(["1h", "6h", "24h", "7d", "30d", "Week"]);
    expect(items[2]!.getAttribute("aria-pressed")).toBe("true");
    expect(items[2]!.getAttribute("aria-label")).toBe("Last 24 hours");
    expect(root.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("Time range");
    const summary = root.querySelector('[data-slot="time-range-summary"]')!;
    expect(summary.textContent).toContain("UTC+03:00");
    expect(summary.textContent).toContain("Sep 28, 2026");
    expect(summary.textContent).toContain("Compared with");
    expect(root.textContent).toContain("Custom");
  });

  it("switches the preset and fires change with the resolved range", async () => {
    const host = await mount("time-range-picker");
    const root = roots(host)[0]!;
    const seen: { value: unknown; from: Date; to: Date }[] = [];
    root.addEventListener("change", (e) => seen.push((e as CustomEvent).detail));
    toggles(root)[3]!.click();
    await tick(50);
    expect(data(root).value).toEqual({ kind: "relative", preset: "7d" });
    expect(toggles(root)[3]!.getAttribute("aria-pressed")).toBe("true");
    expect(toggles(root)[2]!.getAttribute("aria-pressed")).toBe("false");
    expect(seen).toHaveLength(1);
    expect(seen[0]!.to.toISOString()).toBe("2026-09-29T09:00:00.000Z");
    expect(seen[0]!.from.toISOString()).toBe("2026-09-22T09:00:00.000Z");
  });

  it("shows the week navigator for Week and steps back, not past this week", async () => {
    const host = await mount("time-range-picker");
    const root = roots(host)[0]!;
    const week = root.querySelector<HTMLElement>('[data-slot="time-range-week"]')!;
    expect(week.style.display).toBe("none");
    toggles(root)[5]!.click();
    await tick(50);
    expect(data(root).value.kind).toBe("week");
    expect(week.style.display).not.toBe("none");
    const [prev, next, thisWeek] = [...week.querySelectorAll<HTMLButtonElement>("button")];
    expect(next!.disabled).toBe(true);
    expect(thisWeek!.disabled).toBe(true);
    const before = data(root).value.start;
    prev!.click();
    await tick(50);
    expect(data(root).value.start < before).toBe(true);
    expect(next!.disabled).toBe(false);
    expect(thisWeek!.disabled).toBe(false);
    thisWeek!.click();
    await tick(50);
    expect(data(root).value.start).toBe(before);
  });

  it("starts the second picker on its week", async () => {
    const host = await mount("time-range-picker");
    const second = roots(host)[1]!;
    expect(data(second).value).toEqual({ kind: "week", start: "2026-09-27" });
    expect(toggles(second)[5]!.getAttribute("aria-pressed")).toBe("true");
    expect(clean(second.textContent)).toContain("Sep 27 – Oct 3, 2026");
  });

  it("applies a custom range from the popover calendar", async () => {
    const host = await mount("time-range-picker");
    const root = roots(host)[0]!;
    const trigger = root.querySelector<HTMLElement>('[data-slot="popover-trigger"]')!;
    trigger.click();
    await tick(100);
    const popup = popups()[0]!;
    expect(popup.getAttribute("aria-label")).toBe("Custom range");
    const buttons = [...popup.querySelectorAll<HTMLButtonElement>("button")];
    const apply = buttons.find((b) => b.textContent!.trim() === "Apply")!;
    expect(apply.disabled).toBe(true);
    popup.querySelector<HTMLElement>('[data-date="2026-09-08"]')!.click();
    await tick(100);
    popup.querySelector<HTMLElement>('[data-date="2026-09-12"]')!.click();
    await until(() => !apply.disabled);
    expect(apply.disabled).toBe(false);
    apply.click();
    await until(() => data(root).value.kind === "custom");
    expect(data(root).value).toEqual({ kind: "custom", from: "2026-09-08", to: "2026-09-12" });
    await tick(80);
    expect(clean(trigger.textContent)).toContain("Sep 8 – 12, 2026");
    expect(trigger.hasAttribute("data-active")).toBe(true);
  });

  it("changes the comparison period from the select", async () => {
    const host = await mount("time-range-picker");
    const root = roots(host)[0]!;
    const seen: unknown[] = [];
    root.addEventListener("comparison-change", (e) => seen.push((e as CustomEvent).detail.mode));
    data(root).compare = "year";
    await tick(50);
    expect(seen).toEqual(["year"]);
    expect(root.querySelector('[data-slot="time-range-summary"]')!.textContent).toContain("Sep 28, 2025");
  });
});

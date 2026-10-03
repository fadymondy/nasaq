// The Blade date-picker example (date, range and time pickers) under real Alpine.
import { describe, expect, it, vi } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
vi.setConfig({ testTimeout: 20000 }); // the calendar renders slowly in jsdom, more so with other suites running
const popups = () => [...document.querySelectorAll<HTMLElement>('[data-slot="popover-content"]')];
const day = (popup: HTMLElement, key: string) => popup.querySelector<HTMLElement>(`[data-date="${key}"]`)!;
/** Polls until the condition holds (jsdom renders a calendar slowly). */
const until = async (cond: () => boolean, ms = 3000) => {
  for (let waited = 0; waited < ms && !cond(); waited += 50) await tick(50);
};
const clean = (s: string | null) => (s ?? "").replace(/\s+/g, " ");

async function open(index: number) {
  const host = await mount("date-picker");
  const triggers = [...host.querySelectorAll<HTMLElement>('[data-slot="date-picker-trigger"]')];
  const trigger = triggers[index]!;
  trigger.click();
  await tick(80);
  return { host, trigger, popup: popups()[index]! };
}

describe("date picker (Blade example)", () => {
  it("shows the placeholder, opens a labelled calendar dialog and picks a day", async () => {
    const host = await mount("date-picker");
    const trigger = host.querySelector<HTMLElement>('[data-slot="date-picker-trigger"]')!;
    expect(trigger.querySelector("span")!.textContent).toBe("Select a date");
    expect(trigger.querySelector("span")!.hasAttribute("data-placeholder")).toBe(true);
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.click();
    await tick(80);
    const popup = popups()[0]!;
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(popup.getAttribute("aria-label")).toBe("Choose date");
    expect(popup.querySelector('[data-slot="calendar"]')).not.toBeNull();

    day(popup, "2026-09-18").click();
    await until(() => trigger.getAttribute("aria-expanded") === "false");
    expect(trigger.querySelector("span")!.textContent).toBe("Sep 18, 2026");
    expect(trigger.querySelector("span")!.hasAttribute("data-placeholder")).toBe(false);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(popup.style.display).toBe("none");
  });

  it("keeps the picked day in a hidden-input-ready model", async () => {
    const { host, trigger, popup } = await open(0);
    day(popup, "2026-09-03").click();
    await tick(300);
    const root = host.querySelector<HTMLElement>('[data-slot="date-picker"]')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((window as any).Alpine.$data(root).date).toBe("2026-09-03");
    expect(trigger.textContent).toContain("Sep 3, 2026");
  });

  it("disables days before the minimum", async () => {
    const { popup } = await open(0);
    // The calendar opens on today (2026-09-15); the minimum is 2026-01-01, so September is fully pickable.
    expect(day(popup, "2026-09-01").hasAttribute("data-disabled")).toBe(false);
  });
});

describe("date range picker (Blade example)", () => {
  it("keeps the popup open for the first click and closes on the second", async () => {
    const { trigger, popup } = await open(1);
    expect(trigger.querySelector("span")!.textContent).toBe("Select dates");
    expect(popup.querySelectorAll('[data-slot="calendar-month"]:not([data-ssr])')).toHaveLength(2);

    day(popup, "2026-09-08").click();
    await tick(80);
    expect(trigger.querySelector("span")!.textContent).toBe("Sep 8, 2026 –");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    day(popup, "2026-09-12").click();
    await until(() => trigger.getAttribute("aria-expanded") === "false");
    expect(clean(trigger.querySelector("span")!.textContent)).toMatch(/^Sep 8 . 12, 2026$/);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("time picker (Blade example)", () => {
  const selects = (host: HTMLElement) => ({
    hour: host.querySelector<HTMLSelectElement>('[data-slot="time-picker-hour"]')!,
    minute: host.querySelector<HTMLSelectElement>('[data-slot="time-picker-minute"]')!,
    period: host.querySelector<HTMLSelectElement>('[data-slot="time-picker-period"]')!,
  });
  const change = (el: HTMLSelectElement, value: string) => {
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  it("reads 14:30 as 2 : 30 PM in 15 minute steps", async () => {
    const host = await mount("date-picker");
    const { hour, minute, period } = selects(host);
    expect(hour.value).toBe("2");
    expect(minute.value).toBe("30");
    expect(period.value).toBe("pm");
    expect([...minute.options].filter((o) => !o.disabled).map((o) => o.value)).toEqual(["0", "15", "30", "45"]);
    expect(hour.getAttribute("aria-label")).toBe("Hour");
    expect(host.querySelector('[data-slot="time-picker"]')!.getAttribute("role")).toBe("group");
  });

  it("writes a 24-hour value as the segments change", async () => {
    const host = await mount("date-picker");
    const { hour, minute, period } = selects(host);
    const root = host.querySelector<HTMLElement>('[data-slot="time-picker"]')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = () => (window as any).Alpine.$data(root);
    change(hour, "9");
    await tick();
    expect(data().time).toBe("21:30");
    change(period, "am");
    await tick();
    expect(data().time).toBe("09:30");
    change(minute, "45");
    await tick();
    expect(data().time).toBe("09:45");
    change(hour, "12");
    await tick();
    expect(data().time).toBe("00:45");
  });
});

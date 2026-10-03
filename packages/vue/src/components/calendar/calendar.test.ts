import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqCalendar, addMonths, getWeekStartsOn, monthMatrix, weekOrder } from ".";
import { dayKey } from "./calendar-math";

const today = new Date(2026, 8, 15);
const mk = (props: Record<string, unknown> = {}, attrs = {}) => mount(NqCalendar, { props: { today, locale: "en-US", ...props }, attrs, attachTo: document.body });
const day = (w: ReturnType<typeof mk>, key: string) => w.find(`[data-date="${key}"]`);

describe("calendar math", () => {
  it("builds month matrices and clamps months", () => {
    const rows = monthMatrix(new Date(2026, 8, 1), 0);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.length === 7)).toBe(true);
    expect(dayKey(rows[0]![0]!)).toBe("2026-08-30");
    expect(monthMatrix(new Date(2026, 8, 1), 0, true)).toHaveLength(6);
    expect(dayKey(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    expect(weekOrder(6)).toEqual([6, 0, 1, 2, 3, 4, 5]);
    expect(getWeekStartsOn("en-US")).toBe(0);
  });
});

describe("NqCalendar", () => {
  it("renders a labelled month grid with today marked", () => {
    const w = mk();
    expect(w.attributes("data-slot")).toBe("calendar");
    expect(w.attributes("data-mode")).toBe("single");
    expect(w.find('[data-slot="calendar-title"]').text()).toBe("September 2026");
    expect(w.find("table").attributes("role")).toBe("grid");
    expect(day(w, "2026-09-15").attributes("aria-current")).toBe("date");
    expect(day(w, "2026-09-15").attributes("data-today")).toBeDefined();
    expect(day(w, "2026-09-15").attributes("tabindex")).toBe("0");
    expect(day(w, "2026-09-16").attributes("tabindex")).toBe("-1");
    expect(day(w, "2026-09-15").attributes("aria-label")).toBe("Tuesday, September 15, 2026");
    w.unmount();
  });

  it("picks a day, emits, and toggles it off", async () => {
    const w = mk();
    await day(w, "2026-09-10").trigger("click");
    expect(day(w, "2026-09-10").attributes("data-selected")).toBeDefined();
    expect(day(w, "2026-09-10").element.closest("td")!.getAttribute("aria-selected")).toBe("true");
    const emitted = w.emitted("update:modelValue")!;
    expect(dayKey(emitted[0]![0] as Date)).toBe("2026-09-10");
    await day(w, "2026-09-10").trigger("click");
    expect(w.emitted("update:modelValue")![1]).toEqual([null]);
    w.unmount();
  });

  it("selects a range and orders the ends", async () => {
    const w = mk({ mode: "range" });
    await day(w, "2026-09-20").trigger("click");
    await day(w, "2026-09-12").trigger("click");
    const last = w.emitted("update:modelValue")!.at(-1)![0] as { from: Date; to: Date };
    expect([dayKey(last.from), dayKey(last.to)]).toEqual(["2026-09-12", "2026-09-20"]);
    expect(w.findAll("[data-in-range]").length).toBeGreaterThan(0);
    expect(w.attributes("data-mode")).toBe("range");
    w.unmount();
  });

  it("does not pick disabled days and blocks months outside min and max", async () => {
    const w = mk({ min: new Date(2026, 8, 5), max: new Date(2026, 8, 25), disabled: (d: Date) => d.getDay() === 0 });
    expect(day(w, "2026-09-03").attributes("data-disabled")).toBeDefined();
    expect(day(w, "2026-09-13").attributes("aria-disabled")).toBe("true");
    await day(w, "2026-09-03").trigger("click");
    expect(w.emitted("update:modelValue")).toBeUndefined();
    const [prev, next] = w.findAll('[data-slot="button"]');
    expect(prev!.attributes("disabled")).toBeDefined();
    expect(next!.attributes("disabled")).toBeDefined();
    w.unmount();
  });

  it("navigates months with the buttons and keeps focus keys in the grid", async () => {
    const w = mk();
    const [, next] = w.findAll("button").filter((b) => b.attributes("aria-label")?.includes("month"));
    await next!.trigger("click");
    expect(w.find('[data-slot="calendar-title"]').text()).toBe("October 2026");
    expect(w.emitted("update:month")).toBeTruthy();
    await day(w, "2026-10-01").trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-02");
    await day(w, "2026-10-02").trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-10-09");
    await day(w, "2026-10-09").trigger("keydown", { key: "PageUp" });
    expect(w.find('[data-slot="calendar-title"]').text()).toBe("September 2026");
    w.unmount();
  });

  it("flips arrow keys and chevrons in RTL, in Arabic", async () => {
    const w = mk({ locale: "ar", dir: "rtl" });
    expect(w.attributes("dir")).toBe("rtl");
    expect(w.attributes("lang")).toBe("ar");
    expect(w.find('[data-slot="calendar-title"]').text()).toContain("سبتمبر");
    expect(w.findAll("button")[0]!.attributes("aria-label")).toBe("الشهر السابق");
    await day(w, "2026-09-15").trigger("keydown", { key: "ArrowLeft" });
    expect(document.activeElement?.getAttribute("data-date")).toBe("2026-09-16");
    w.unmount();
  });

  it("two months hide the outside days", () => {
    const w = mk({ numberOfMonths: 2 });
    expect(w.findAll('[data-slot="calendar-month"]')).toHaveLength(2);
    expect(w.findAll("[data-outside]")).toHaveLength(0);
    w.unmount();
  });

  it("follows the provider locale", () => {
    const w = mount({ components: { NasaqProvider, NqCalendar }, template: '<NasaqProvider locale="ar"><NqCalendar :today="new Date(2026, 8, 15)" /></NasaqProvider>' });
    expect(w.find('[dir="rtl"]').exists()).toBe(true);
  });
});

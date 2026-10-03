import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqTimeRangePicker, comparisonRange, parseTimeRange, resolveTimeRange, serializeTimeRange, type TimeRangeValue } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const NOW = new Date("2026-09-29T09:00:00Z");
const toggles = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="toggle"]');

describe("time range maths", () => {
  it("resolves, compares and serialises", () => {
    expect(serializeTimeRange({ kind: "week", start: "2026-09-27" })).toBe("week:2026-09-27");
    expect(parseTimeRange("2026-09-15..2026-09-01")).toEqual({ kind: "custom", from: "2026-09-01", to: "2026-09-15" });
    expect(parseTimeRange("nonsense")).toBeNull();
    const r = resolveTimeRange({ kind: "custom", from: "2026-09-01", to: "2026-09-02" }, { timeZone: "Asia/Riyadh" });
    expect(r.from.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-09-02T21:00:00.000Z");
    const prev = comparisonRange({ kind: "relative", preset: "24h" }, "previous", { now: NOW });
    expect(prev!.to.toISOString()).toBe("2026-09-28T09:00:00.000Z");
    expect(comparisonRange({ kind: "relative", preset: "24h" }, "none", { now: NOW })).toBeNull();
  });
});

describe("NqTimeRangePicker", () => {
  it("renders the presets, Week and Custom with the 24h preset pressed and a summary", () => {
    const w = mount(NqTimeRangePicker, { props: { now: NOW, timeZone: "Asia/Riyadh" } });
    expect(w.attributes("data-slot")).toBe("time-range-picker");
    const group = w.find('[data-slot="toggle-group"]');
    expect(group.attributes("aria-label")).toBe("Time range");
    const items = toggles(w);
    expect(items.map((t) => t.text())).toEqual(["1h", "6h", "24h", "7d", "30d", "Week"]);
    expect(items[2]!.attributes("aria-pressed")).toBe("true");
    expect(items[2]!.attributes("aria-label")).toBe("Last 24 hours");
    expect(w.text()).toContain("Custom");
    const summary = w.find('[data-slot="time-range-summary"]');
    expect(summary.text()).toContain("UTC+03:00");
    expect(w.find('[data-slot="time-range-week"]').exists()).toBe(false);
  });

  it("emits the picked preset with its resolved range", async () => {
    const onValueChange = vi.fn();
    const w = mount(NqTimeRangePicker, { props: { now: NOW, timeZone: "UTC", onValueChange }, attachTo: document.body });
    await toggles(w)[3]!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual([{ kind: "relative", preset: "7d" }]);
    const [value, range] = onValueChange.mock.calls[0]!;
    expect(value).toEqual({ kind: "relative", preset: "7d" });
    expect(range.to.toISOString()).toBe(NOW.toISOString());
    expect(toggles(w)[3]!.attributes("aria-pressed")).toBe("true");
    w.unmount();
  });

  it("the Week toggle shows the navigator and steps weeks, never past this week", async () => {
    const w = mount(NqTimeRangePicker, { props: { now: NOW, timeZone: "UTC", weekStartsOn: 0 }, attachTo: document.body });
    await toggles(w)[5]!.trigger("click");
    await flushPromises();
    const week = w.find('[data-slot="time-range-week"]');
    expect(week.exists()).toBe(true);
    const value = w.emitted("update:modelValue")![0]![0] as TimeRangeValue;
    expect(value).toEqual({ kind: "week", start: "2026-09-27" });
    const [prev, next, thisWeek] = week.findAll("button");
    expect(prev!.attributes("aria-label")).toBe("Previous week");
    expect(next!.attributes("disabled")).toBeDefined();
    expect(thisWeek!.attributes("disabled")).toBeDefined();
    await prev!.trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")![1]![0]).toEqual({ kind: "week", start: "2026-09-20" });
    w.unmount();
  });

  it("is controlled by v-model and hides Week / Custom on request", async () => {
    const w = mount(NqTimeRangePicker, { props: { now: NOW, modelValue: { kind: "relative", preset: "6h" }, presets: ["1h", "6h"], allowWeek: false, allowCustom: false } });
    expect(toggles(w).map((t) => t.text())).toEqual(["1h", "6h"]);
    expect(toggles(w)[1]!.attributes("aria-pressed")).toBe("true");
    expect(w.text()).not.toContain("Custom");
    await w.setProps({ modelValue: { kind: "relative", preset: "1h" } });
    expect(toggles(w)[0]!.attributes("aria-pressed")).toBe("true");
  });

  it("shows the comparison select and the compared dates", async () => {
    const onComparisonChange = vi.fn();
    const w = mount(NqTimeRangePicker, { props: { now: NOW, timeZone: "UTC", comparison: "previous", onComparisonChange } });
    expect(w.find('[data-slot="select-trigger"]').attributes("aria-label")).toBe("Compare with");
    expect(w.find('[data-slot="time-range-summary"]').text()).toContain("Compared with");
    const none = mount(NqTimeRangePicker, { props: { now: NOW, timeZone: "UTC" } });
    expect(none.find('[data-slot="select-trigger"]').exists()).toBe(false);
  });

  it("opens the custom calendar and applies a day range", async () => {
    const w = mount(NqTimeRangePicker, { props: { now: NOW, timeZone: "UTC" }, attachTo: document.body });
    const custom = w.findAll("button").find((b) => b.text() === "Custom")!;
    await custom.trigger("click");
    await flushPromises();
    const pop = document.querySelector('[data-slot="popover-content"]')!;
    expect(pop.getAttribute("aria-label")).toBe("Custom range");
    expect(pop.textContent).toContain("Pick the first and last day");
    const day = (k: string) => document.querySelector<HTMLButtonElement>(`[data-date="${k}"]`)!;
    day("2026-09-10").click();
    await flushPromises();
    day("2026-09-14").click();
    await flushPromises();
    const apply = [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "Apply")!;
    expect(apply.disabled).toBe(false);
    apply.click();
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual([{ kind: "custom", from: "2026-09-10", to: "2026-09-14" }]);
    expect(custom.attributes("data-active")).toBe("");
    w.unmount();
  });

  it("speaks Arabic in an Arabic provider", async () => {
    const w = mount(
      defineComponent({ render: () => h(NasaqProvider, { target: "scope", defaultLocale: "ar" }, () => h(NqTimeRangePicker, { now: NOW, timeZone: "Asia/Riyadh" })) }),
      { attachTo: document.body },
    );
    await flushPromises();
    expect(w.find('[data-slot="toggle-group"]').attributes("aria-label")).toBe("النطاق الزمني");
    expect(toggles(w)[2]!.attributes("aria-label")).toBe("آخر 24 ساعة");
    expect(w.text()).toContain("مخصص");
    w.unmount();
  });
});

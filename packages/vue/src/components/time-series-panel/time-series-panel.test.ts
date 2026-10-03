import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqPeriodToggle, NqTimeSeriesPanel, type TimeSeriesMetric } from ".";
import { timeSeriesDomain, timeSeriesLabelIndices, timeSeriesPaths, timeSeriesY } from "./geometry";

const metrics: TimeSeriesMetric[] = [
  { id: "users", label: "Users" },
  { id: "position", label: "Position", aggregate: "avg", lowerIsBetter: true },
];
const data = [
  { date: "2026-09-27", users: 2100, position: 4.2 },
  { date: "2026-09-28", users: 2240, position: 3.8 },
  { date: "2026-09-29", users: 2400, position: 3.5 },
];
const previousData = [
  { date: "2026-08-30", users: 1900, position: 4.6 },
  { date: "2026-08-31", users: 2010, position: 4.4 },
  { date: "2026-09-01", users: 2000, position: 4.0 },
];

// The Arabic provider writes lang and dir to <html>; put them back so later tests read English.
afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("NqTimeSeriesPanel", () => {
  it("renders the card, the total with its change and a labelled chart", () => {
    const w = mount(NqTimeSeriesPanel, { props: { title: "Traffic", metrics, data, previousData, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("time-series-panel");
    expect(w.classes()).toContain("extra");
    expect(w.find('[data-slot="card-title"]').element.tagName).toBe("H3");
    const total = w.find('[data-slot="time-series-total"]');
    expect(total.text()).toContain("Total");
    expect(total.text()).toContain("6,740");
    expect(total.text()).toContain("+14%");
    expect(total.find(".text-nq-success-text").exists()).toBe(true);
    const chart = w.find('[data-slot="chart"]');
    expect(chart.attributes("role")).toBe("img");
    expect(chart.attributes("aria-label")).toBe("Users, Sep 27 to Sep 29");
    expect(w.find('[data-slot="time-series-previous"]').exists()).toBe(true);
    expect(w.find('[data-slot="time-series-current"]').attributes("d")).toMatch(/^M/);
  });

  it("switches metric, uses the mean for rates and reads a fall as an improvement", async () => {
    const w = mount(NqTimeSeriesPanel, { props: { metrics, data, previousData } });
    const toggles = w.findAll('[data-slot="toggle"]');
    expect(toggles).toHaveLength(2);
    await toggles[1]!.trigger("click");
    const total = w.find('[data-slot="time-series-total"]');
    expect(total.text()).toContain("Average");
    expect(total.text()).toContain("3.8");
    expect(total.find(".text-nq-success-text").exists()).toBe(true);
  });

  it("emits update:metric and update:compare and hides the comparison", async () => {
    const w = mount(NqTimeSeriesPanel, { props: { metrics, data, previousData } });
    await w.findAll('[data-slot="toggle"]')[1]!.trigger("click");
    expect(w.emitted("update:metric")![0]).toEqual(["position"]);
    await w.find('[data-slot="switch"]').trigger("click");
    expect(w.emitted("update:compare")![0]).toEqual([false]);
    expect(w.find('[data-slot="time-series-previous"]').exists()).toBe(false);
  });

  it("is controlled by metric and compare", () => {
    const w = mount(NqTimeSeriesPanel, { props: { metrics, data, previousData, metric: "position", compare: false } });
    expect(w.find('[data-slot="time-series-total"]').text()).toContain("Average");
    expect(w.find('[data-slot="time-series-previous"]').exists()).toBe(false);
    expect(w.find('[data-slot="toggle"][aria-pressed="true"]').text()).toBe("Position");
  });

  it("shows loading, empty and error states", async () => {
    const loading = mount(NqTimeSeriesPanel, { props: { metrics, data, loading: true } });
    expect(loading.attributes("aria-busy")).toBe("true");
    expect(loading.find('[data-slot="skeleton"]').exists()).toBe(true);
    expect(loading.find('[data-slot="time-series-total"]').exists()).toBe(false);
    expect(mount(NqTimeSeriesPanel, { props: { metrics, data: [] } }).text()).toContain("No data for this period");
    const onRetry = vi.fn();
    const err = mount(NqTimeSeriesPanel, { props: { metrics, data, error: true, onRetry } });
    expect(err.find('[data-slot="error-state"]').text()).toContain("The chart could not be loaded.");
    await err.find('[data-slot="error-state"] button').trigger("click");
    expect(onRetry).toHaveBeenCalled();
  });

  it("draws reference lines and a hover tooltip", async () => {
    const w = mount(NqTimeSeriesPanel, { props: { metrics, data, referenceLines: [{ value: 2000, label: "Goal", tone: "success" }] }, attachTo: document.body });
    expect(w.text()).toContain("Goal");
    const plot = w.find('[data-slot="time-series-plot"]');
    vi.spyOn(plot.element, "getBoundingClientRect").mockReturnValue({ left: 0, width: 100, top: 0, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    await plot.trigger("pointermove", { clientX: 100 });
    expect(w.find('[data-slot="chart-tooltip"]').text()).toContain("Sep 29");
    expect(w.find('[data-slot="chart-tooltip"]').text()).toContain("2,400");
    await plot.trigger("pointerleave");
    expect(w.find('[data-slot="chart-tooltip"]').exists()).toBe(false);
    w.unmount();
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqTimeSeriesPanel },
      setup: () => ({ metrics, data, previousData }),
      template: '<NasaqProvider locale="ar"><NqTimeSeriesPanel :metrics="metrics" :data="data" :previous-data="previousData" /></NasaqProvider>',
    });
    expect(w.text()).toContain("مقارنة بالفترة السابقة");
    expect(w.text()).toContain("الإجمالي");
    w.unmount();
  });
});

describe("NqPeriodToggle", () => {
  it("is a labelled group of day options and emits the chosen one", async () => {
    const w = mount(NqPeriodToggle, { props: { modelValue: 28 } });
    expect(w.attributes("aria-label")).toBe("Period");
    const items = w.findAll('[data-slot="toggle"]');
    expect(items.map((i) => i.text())).toEqual(["7 days", "28 days", "90 days"]);
    expect(items[1]!.attributes("aria-pressed")).toBe("true");
    await items[2]!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual([90]);
  });
});

describe("time series geometry", () => {
  it("builds nice ticks and a reversed axis", () => {
    const d = timeSeriesDomain([2100, 2400], false);
    expect(d.lo).toBe(0);
    expect(d.ticks[0]).toBe(0);
    expect(d.ticks[d.ticks.length - 1]).toBe(d.hi);
    expect(d.hi).toBeGreaterThanOrEqual(2400);
    const r = timeSeriesDomain([3.5, 4.2], true);
    expect(r.lo).toBeCloseTo(2.5);
    expect(timeSeriesY(r.lo, r, true)).toBe(0);
    expect(timeSeriesY(0, d, false)).toBe(100);
  });

  it("skips missing values and picks the end labels", () => {
    const d = timeSeriesDomain([1, 2, 3], false);
    expect(timeSeriesPaths([undefined, undefined], d, false).line).toBe("");
    expect(timeSeriesPaths([1, 2, 3], d, false).area.endsWith("Z")).toBe(true);
    expect(timeSeriesLabelIndices(30)).toHaveLength(6);
    expect(timeSeriesLabelIndices(30)[5]).toBe(29);
    expect(timeSeriesLabelIndices(3)).toEqual([0, 1, 2]);
  });
});

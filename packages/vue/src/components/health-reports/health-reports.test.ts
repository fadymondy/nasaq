import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqHealthReport, reportToCsv, summariseReport } from ".";

const days = [
  { date: "2026-09-27", waterMl: 2000, steps: 5000, weightKg: 84.2, meals: { total: 3, safe: 3, unsafe: 0 } },
  { date: "2026-09-28", waterMl: undefined, steps: 7000, weightKg: 84.0, meals: { total: 3, safe: 2, unsafe: 1 } },
  { date: "2026-09-29", waterMl: 3000, sleepMinutes: 450, weightKg: 83.8 },
];
const engines = [{ engine: "hydration", days: [{ date: "2026-09-28", verdict: "on_protocol", entries: 6 }, { date: "2026-09-29", verdict: "off_protocol", entries: 2 }] }] as const;

describe("NqHealthReport", () => {
  it("averages skip missing days and the table counts days", () => {
    const w = mount(NqHealthReport, { props: { days, engines, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("health-report");
    expect(w.classes()).toContain("extra");
    expect(w.find("h1").text()).toBe("Reports");
    // water: (2000 + 3000) / 2, not / 3
    expect(w.text()).toContain("2,500 mL");
    expect(w.text()).toContain("-0.4 kg");
    expect(w.findAll("tbody tr")).toHaveLength(1);
    expect(w.find('tbody tr[data-engine="hydration"]').text()).toContain("1 day");
    expect(w.findAll('[data-slot="chart"]').length).toBeGreaterThanOrEqual(2);
  });

  it("switches the charted figure to a line for weight", async () => {
    const w = mount(NqHealthReport, { props: { days } });
    expect(w.find("polyline").exists()).toBe(false);
    const weight = w.findAll('[data-slot="toggle"]').find((b) => b.text() === "Weight")!;
    await weight.trigger("click");
    expect(w.find("polyline").exists()).toBe(true);
  });

  it("reports the chosen period and runs the export", async () => {
    const onPeriodChange = vi.fn();
    const onExport = vi.fn().mockResolvedValue({ error: "Disk full" });
    const w = mount(NqHealthReport, { props: { days, onPeriodChange, onExport } });
    await w.findAll('[data-slot="toggle"]').find((b) => b.text() === "30 days")!.trigger("click");
    expect(onPeriodChange).toHaveBeenCalledWith(30);
    await w.find("button[data-slot='button']").trigger("click");
    await flushPromises();
    expect(onExport).toHaveBeenCalled();
    expect(w.find("[role='alert']").text()).toBe("Disk full");
  });

  it("shows loading, error with retry and empty states", async () => {
    expect(mount(NqHealthReport, { props: { days, loading: true } }).find("[aria-busy='true']").exists()).toBe(true);
    const onRetry = vi.fn();
    const err = mount(NqHealthReport, { props: { days, error: "Offline", onRetry } });
    expect(err.text()).toContain("Offline");
    await err.findAll("button").find((b) => b.text() === "Try again")!.trigger("click");
    expect(onRetry).toHaveBeenCalled();
    expect(mount(NqHealthReport, { props: { days: [] } }).text()).toContain("No days in this period");
  });

  it("exports CSV and summarises", () => {
    expect(reportToCsv(days).split("\n")[0]).toContain("water_ml");
    expect(summariseReport(days).weight?.change).toBe(-0.4);
  });
});

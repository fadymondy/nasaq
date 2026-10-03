import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqHeatmap, heatmapLevel, parseHeatmapDay } from ".";

const data = [
  { date: "2026-09-27", count: 3 },
  { date: "2026-09-28", count: 8 },
  { date: "2026-09-29", count: 1 },
  { date: "2026-09-29", count: 1 },
];
const mountIt = (props: Record<string, unknown> = {}) => mount(NqHeatmap, { props: { data, from: "2026-09-13", to: "2026-09-29", label: "Commits by day", weekStartsOn: 0, ...props }, attachTo: document.body });

describe("heatmap helpers", () => {
  it("computes levels by quarters of the max or by thresholds", () => {
    expect(heatmapLevel(0, 8)).toBe(0);
    expect(heatmapLevel(1, 8)).toBe(1);
    expect(heatmapLevel(8, 8)).toBe(4);
    expect(heatmapLevel(5, 8, [1, 4, 8, 12])).toBe(2);
  });
  it("reads a day string as a local day", () => {
    const d = parseHeatmapDay("2026-09-29");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 8, 29]);
  });
});

describe("NqHeatmap", () => {
  it("draws a grid of day cells with levels, sums a day and names each cell", () => {
    const w = mountIt({ class: "extra" });
    expect(w.attributes("data-slot")).toBe("heatmap");
    expect(w.classes()).toContain("extra");
    expect(w.find('[role="grid"]').attributes("aria-label")).toBe("Commits by day");
    const cells = w.findAll('[role="gridcell"]');
    expect(cells).toHaveLength(17);
    const sep29 = w.find('[data-date="2026-09-29"]');
    expect(sep29.attributes("aria-label")).toBe("Sep 29, 2026: 2 contributions");
    expect(sep29.attributes("data-level")).toBe("1");
    expect(w.find('[data-date="2026-09-28"]').attributes("data-level")).toBe("4");
    expect(w.find('[data-date="2026-09-20"]').attributes("aria-label")).toContain("No contributions");
    expect(w.find('[data-date="2026-09-20"]').attributes("data-level")).toBe("0");
    w.unmount();
  });

  it("is one tab stop on the last day and moves with the arrow keys", async () => {
    const w = mountIt();
    const stops = w.findAll('[role="gridcell"]').filter((c) => c.attributes("tabindex") === "0");
    expect(stops).toHaveLength(1);
    expect(stops[0]!.attributes("data-date")).toBe("2026-09-29");
    await stops[0]!.trigger("keydown", { key: "ArrowUp" });
    expect(w.find('[data-date="2026-09-28"]').attributes("tabindex")).toBe("0");
    await w.find('[data-date="2026-09-28"]').trigger("keydown", { key: "ArrowLeft" });
    expect(w.find('[data-date="2026-09-21"]').attributes("tabindex")).toBe("0");
    w.unmount();
  });

  it("swaps the week arrows in RTL and uses Arabic text", async () => {
    const w = mountIt({ locale: "ar", dir: "rtl" });
    expect(w.attributes("dir")).toBe("rtl");
    expect(w.find('[role="grid"]').attributes("aria-label")).toBe("Commits by day");
    await w.find('[data-date="2026-09-29"]').trigger("keydown", { key: "ArrowLeft" });
    // Left is "forward in time" in RTL, but the last day is already the end, so it stays.
    expect(w.find('[data-date="2026-09-29"]').attributes("tabindex")).toBe("0");
    await w.find('[data-date="2026-09-29"]').trigger("keydown", { key: "ArrowRight" });
    expect(w.find('[data-date="2026-09-22"]').attributes("tabindex")).toBe("0");
    expect(w.text()).toContain("أقل");
    w.unmount();
  });

  it("shows the legend with five levels and can hide it", () => {
    const w = mountIt();
    expect(w.findAll('[data-slot="heatmap-legend"] [data-level]')).toHaveLength(5);
    expect(w.text()).toContain("Less");
    w.unmount();
    const hidden = mountIt({ legend: false });
    expect(hidden.find('[data-slot="heatmap-legend"]').exists()).toBe(false);
    hidden.unmount();
  });
});

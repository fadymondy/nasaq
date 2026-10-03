import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { funnelBarWidth, funnelBiggestDropIndex, funnelMoveStep, funnelOverallConversion, funnelRows, funnelWindowKey, NqFunnelChart, NqFunnelList, type FunnelSummary } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
  document.body.innerHTML = "";
});

const steps = [
  { id: "visit", label: "Visit", count: 1000, detail: "/" },
  { id: "signup", label: "Sign up", count: 400 },
  { id: "paid", label: "Paid", count: 380 },
];
const funnels: FunnelSummary[] = [
  { id: "f1", name: "Signup to paid", steps: 3, entered: 1000, conversion: 0.38, previousConversion: 0.3, window: "7 days", updatedAt: "2026-09-28" },
  { id: "f2", name: "Checkout", steps: 1, entered: 500, conversion: 0.2, previousConversion: 0.25, window: "1 day", updatedAt: "2026-09-20" },
];

describe("funnel maths", () => {
  it("computes rows, drops and the biggest drop", () => {
    const rows = funnelRows(steps);
    expect(rows[1]!.fromPrevious).toBeCloseTo(0.4);
    expect(rows[1]!.dropped).toBe(600);
    expect(funnelBiggestDropIndex(steps)).toBe(1);
    expect(funnelOverallConversion(steps)).toBeCloseTo(0.38);
    expect(funnelBarWidth(10, 1000)).toBe(0.03);
    expect(funnelMoveStep([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(funnelWindowKey({ amount: 7, unit: "day" })).toBe("7d");
  });
});

describe("NqFunnelChart", () => {
  it("renders a step per row with bars sized against the first and flags the biggest drop", () => {
    const w = mount(NqFunnelChart, { props: { steps, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("funnel-chart");
    expect(w.classes()).toContain("extra");
    expect(w.findAll('[data-slot="funnel-step"]')).toHaveLength(3);
    expect(w.findAll('[data-slot="funnel-gap"]')).toHaveLength(2);
    expect(w.find('[data-slot="funnel-overall"]').text()).toBe("38%");
    const bars = w.findAll('[role="img"] > div');
    expect(bars[0]!.attributes("style")).toContain("100%");
    expect(bars[1]!.attributes("style")).toContain("40%");
    expect(w.text()).toContain("Biggest drop");
    expect(w.text()).toContain("40% continued");
    expect(w.find('[role="img"]').attributes("aria-label")).toBe("Visit: 1,000 (100%)");
  });

  it("shows the segment breakdown, the skeleton and the empty state", () => {
    const withSegments = mount(NqFunnelChart, { props: { steps, segmentLabel: "Source", segments: [{ id: "a", label: "Organic", entered: 200, converted: 50 }] } });
    expect(withSegments.find('[data-slot="breakdown-table"]').exists()).toBe(true);
    expect(withSegments.text()).toContain("Source");
    expect(withSegments.text()).toContain("25%");
    const loading = mount(NqFunnelChart, { props: { steps, loading: true } });
    expect(loading.find('[aria-busy="true"]').exists()).toBe(true);
    expect(loading.findAll('[data-slot="skeleton"]')).toHaveLength(4);
    expect(mount(NqFunnelChart, { props: { steps: [] } }).text()).toContain("No funnel data for this period");
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqFunnelChart }, setup: () => ({ steps }), template: '<NasaqProvider locale="ar"><NqFunnelChart :steps="steps" /></NasaqProvider>' });
    expect(w.text()).toContain("قمع التحويل");
    expect(w.text()).toContain("أكبر تسرّب");
    w.unmount();
  });
});

describe("NqFunnelList", () => {
  it("lists the funnels, newest first, with the conversion trend", () => {
    const w = mount(NqFunnelList, { props: { funnels } });
    expect(w.attributes("data-slot")).toBe("funnel-list");
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("Signup to paid");
    expect(rows[0]!.text()).toContain("3 steps");
    expect(rows[0]!.text()).toContain("+8.0");
    expect(rows[1]!.text()).toContain("1 step");
    expect(rows[1]!.text()).toContain("-5.0");
    expect(w.text()).not.toContain("New funnel");
  });

  it("opens a row, creates, and shows an error from an action", async () => {
    const onOpen = vi.fn();
    const onCreate = vi.fn();
    const w = mount(NqFunnelList, { props: { funnels, onOpen, onCreate, onDelete: async () => ({ error: "Nope" }) }, attachTo: document.body });
    await w.findAll("tbody tr")[0]!.trigger("click");
    expect(onOpen).toHaveBeenCalledWith("f1");
    await w.findAll("button").find((b) => b.text().includes("New funnel"))!.trigger("click");
    expect(onCreate).toHaveBeenCalled();
    await flushPromises();
    w.unmount();
  });

  it("shows the empty state", () => {
    expect(mount(NqFunnelList, { props: { funnels: [] } }).text()).toContain("No funnels yet");
  });
});

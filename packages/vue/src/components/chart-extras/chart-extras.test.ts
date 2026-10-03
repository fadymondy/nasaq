import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { chartExtrasFunnelBarShare, chartExtrasRingFraction, chartExtrasRingTone, chartExtrasSegmentShares, NqFunnelSteps, NqProgressRing, NqSegmentBar, NqTrendCell } from ".";

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const segments = [
  { id: "a", label: "Organic", value: 600 },
  { id: "b", label: "Paid", value: 300 },
  { id: "c", label: "Zero", value: 0 },
];
const steps = [
  { id: "visit", label: "Visit", count: 1000, detail: "/" },
  { id: "cart", label: "Cart", count: 400 },
  { id: "paid", label: "Paid", count: 380 },
];

describe("chart-extras maths", () => {
  it("shares, ring and tone", () => {
    const { shares, rest } = chartExtrasSegmentShares(segments, 1200);
    expect(shares[0]!.share).toBeCloseTo(0.5);
    expect(rest).toBe(300);
    expect(chartExtrasRingFraction(150)).toBe(1);
    expect(chartExtrasRingTone(0.9)).toBe("warning");
    expect(chartExtrasRingTone(0.97)).toBe("danger");
    expect(chartExtrasFunnelBarShare(1, 1000)).toBe(0.06);
  });
});

describe("NqSegmentBar", () => {
  it("renders segments, a summary and a legend", () => {
    const w = mount(NqSegmentBar, { props: { segments, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("segment-bar");
    expect(w.classes()).toContain("extra");
    expect(w.findAll('[data-slot="segment-bar-segment"]')).toHaveLength(2);
    expect(w.get('[role="img"]').attributes("aria-label")).toBe("Breakdown: Organic 67%, Paid 33%, Zero 0%");
    const rows = w.findAll('[data-slot="segment-bar-legend"] li');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.text()).toContain("Organic");
    expect(rows[0]!.text()).toContain("67%");
  });

  it("keeps the rest as an empty track with a legend row", () => {
    const w = mount(NqSegmentBar, { props: { segments: segments.slice(0, 2), total: 1200, restLabel: "Free" } });
    expect(w.findAll('[data-slot="segment-bar-legend"] li').at(-1)!.text()).toContain("Free");
  });

  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqSegmentBar, { segments })) });
    expect(w.get('[role="img"]').attributes("aria-label")).toContain("التوزيع");
  });
});

describe("NqProgressRing", () => {
  it("is a progressbar with its value and percentage", () => {
    const w = mount(NqProgressRing, { props: { value: 72, label: "Onboarding", caption: "of 25 steps" } });
    expect(w.attributes("role")).toBe("progressbar");
    expect(w.attributes("aria-valuenow")).toBe("72");
    expect(w.attributes("aria-valuetext")).toBe("72% complete");
    expect(w.attributes("data-tone")).toBe("default");
    expect(w.text()).toContain("72%");
    expect(w.text()).toContain("of 25 steps");
  });

  it("goes to danger with an icon on tone auto", () => {
    const w = mount(NqProgressRing, { props: { value: 96, tone: "auto", label: "Storage" } });
    expect(w.attributes("data-tone")).toBe("danger");
    expect(w.find("svg.lucide-triangle-alert, svg[class*='triangle-alert']").exists()).toBe(true);
  });
});

describe("NqFunnelSteps", () => {
  it("writes the conversion between steps and flags the biggest drop", () => {
    const w = mount(NqFunnelSteps, { props: { steps } });
    expect(w.attributes("role")).toBe("group");
    expect(w.findAll('[data-slot="funnel-steps-step"]')).toHaveLength(3);
    const links = w.findAll('[data-slot="funnel-steps-link"]');
    expect(links[0]!.text()).toContain("40% continued");
    expect(links[0]!.text()).toContain("600 left");
    expect(links[0]!.text()).toContain("Biggest drop");
    expect(links[1]!.text()).not.toContain("Biggest drop");
    expect(w.get('[data-slot="funnel-steps-summary"]').text()).toContain("38%");
  });
});

describe("NqTrendCell", () => {
  it("shows the figure, the change and a sparkline", () => {
    const w = mount(NqTrendCell, { props: { value: 48210, delta: 0.124, data: [1, 2, 3], chartLabel: "Revenue" } });
    expect(w.attributes("data-trend")).toBe("up");
    expect(w.text()).toContain("48,210");
    expect(w.text()).toContain("+12.4%");
    expect(w.text()).toContain("up");
    expect(w.find('[data-slot="sparkline"]').exists()).toBe(true);
  });

  it("uses a mini bar and inverts the tone", () => {
    const w = mount(NqTrendCell, { props: { value: 5, delta: -0.1, invert: true, variant: "bar", data: [1, 2, 3] } });
    expect(w.attributes("data-trend")).toBe("down");
    expect(w.find('[data-slot="mini-bar"]').exists()).toBe(true);
    expect(w.html()).toContain("text-nq-success-text");
  });
});

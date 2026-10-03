import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqWebVitalGauge, NqWebVitalGaugeGrid, formatVital } from ".";

describe("NqWebVitalGauge", () => {
  it("rates the value and shows thresholds, delta and distribution", () => {
    const w = mount(NqWebVitalGauge, {
      props: { metric: "LCP", value: 2900, previous: 3100, distribution: { good: 0.58, needsImprovement: 0.28, poor: 0.14 }, class: "extra" },
    });
    const root = w.get('[data-slot="web-vital-gauge"]');
    expect(root.attributes("data-metric")).toBe("LCP");
    expect(root.attributes("data-rating")).toBe("needs-improvement");
    expect(root.classes()).toContain("extra");
    expect(w.get('[data-slot="web-vital-value"]').text()).toBe("2.9 s");
    expect(w.text()).toContain("Largest Contentful Paint");
    expect(w.text()).toContain("-6.5%");
    expect(w.get('[data-slot="web-vital-distribution"]').text()).toContain("58%");
    expect(w.find("button").exists()).toBe(false);
  });

  it("shows no data without a value", () => {
    const w = mount(NqWebVitalGauge, { props: { metric: "CLS" } });
    expect(w.get('[data-slot="web-vital-value"]').text()).toBe("–");
    expect(w.get("svg").attributes("aria-label")).toBe("Cumulative Layout Shift: No data");
  });

  it("becomes a toggle button with onSelect", async () => {
    const onSelect = vi.fn();
    const w = mount(NqWebVitalGauge, { props: { metric: "INP", value: 182, onSelect, selected: true } });
    const b = w.get("button");
    expect(b.attributes("aria-pressed")).toBe("true");
    await b.trigger("click");
    expect(onSelect).toHaveBeenCalledWith("INP");
  });

  it("lays gauges out in a grid and formats vitals", () => {
    const w = mount(NqWebVitalGaugeGrid, { slots: { default: "<i>x</i>" } });
    expect(w.attributes("data-slot")).toBe("web-vital-gauge-grid");
    expect(formatVital("INP", 180, "en")).toBe("180 ms");
    expect(formatVital("CLS", 0.08, "en")).toBe("0.08");
  });
});

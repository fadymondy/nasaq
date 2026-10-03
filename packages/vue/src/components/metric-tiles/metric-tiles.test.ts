import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqMetricTiles, changeRatio, type MetricTileData } from ".";

const metrics: MetricTileData[] = [
  { id: "users", label: "Users", value: 48210, previous: 42980, sparkline: [4, 6, 5, 9, 8, 12] },
  { id: "bounce", label: "Bounce rate", value: 0.388, previous: 0.412, format: { style: "percent", maximumFractionDigits: 1 }, invert: true },
  { id: "time", label: "Time", value: 98, previous: 104, display: "1m 38s", previousDisplay: "1m 44s" },
];

describe("NqMetricTiles", () => {
  it("renders a labelled group of tiles with deltas, tones and the previous value", () => {
    const w = mount(NqMetricTiles, { props: { metrics, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("metric-tiles");
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("Key metrics");
    expect(w.classes()).toContain("extra");
    const cards = w.findAll('[data-slot="stat-card"]');
    expect(cards).toHaveLength(3);
    expect(cards[0]!.attributes("data-tone")).toBe("positive");
    expect(cards[0]!.text()).toContain("+12.2%");
    expect(cards[0]!.text()).toContain("vs previous period · was 42,980");
    // lower is better: a falling bounce rate is good
    expect(cards[1]!.attributes("data-tone")).toBe("positive");
    expect(cards[1]!.text()).toContain("38.8%");
    expect(cards[2]!.text()).toContain("1m 38s");
    expect(cards[2]!.text()).toContain("was 1m 44s");
  });

  it("becomes a single-choice group when onSelect is set", async () => {
    const onSelect = vi.fn();
    const w = mount(NqMetricTiles, { props: { metrics, selected: "bounce", onSelect } });
    const buttons = w.findAll("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[1]!.attributes("aria-pressed")).toBe("true");
    expect(buttons[0]!.attributes("aria-pressed")).toBe("false");
    await buttons[0]!.trigger("click");
    expect(onSelect).toHaveBeenCalledWith("users");
  });

  it("shows skeleton tiles while loading with no metrics", () => {
    const w = mount(NqMetricTiles, { props: { metrics: [], loading: true, skeletons: 3 } });
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.findAll('[data-slot="stat-card-skeleton"]')).toHaveLength(3);
  });

  it("works out the change ratio", () => {
    expect(changeRatio(110, 100)).toBeCloseTo(0.1);
    expect(changeRatio(5, 0)).toBeUndefined();
    expect(changeRatio(0, 0)).toBe(0);
    expect(changeRatio(5, undefined)).toBeUndefined();
  });
});

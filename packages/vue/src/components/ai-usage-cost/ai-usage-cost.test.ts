import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { costPerMillion, costTotals, NqAiUsageCost, NqTokenCostMeter, sumTokens, tokenSplit, withMarkup } from ".";

const days = [
  { date: "2026-09-28", billed: 12.4, unbilled: 0 },
  { date: "2026-09-29", billed: 0, unbilled: 9.1 },
];
const byModel = [
  { id: "opus", label: "Opus 5.5", tokensIn: 2_400_000, tokensOut: 310_000, cost: 21.5, previous: 18 },
  { id: "haiku", label: "Haiku 4.5", tokensIn: 100_000, tokensOut: 10_000, cost: 0.2 },
];

afterEach(() => {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("math", () => {
  it("totals, marks up and splits tokens", () => {
    expect(costTotals(days).total).toBeCloseTo(21.5);
    expect(withMarkup(100, 0.2)).toBe(120);
    expect(withMarkup(100, -1)).toBe(100);
    expect(sumTokens(byModel).total).toBe(2_820_000);
    expect(costPerMillion({ tokensIn: 500_000, tokensOut: 500_000, cost: 2 })).toBe(2);
    expect(tokenSplit(100, 100, 50)).toEqual({ input: 0.25, output: 0.5, cached: 0.25 });
  });
});

describe("NqAiUsageCost", () => {
  it("shows the tiles in USD, a stacked chart and the model table with token columns", () => {
    const w = mount(NqAiUsageCost, { props: { days, byModel, markup: 0.2, previousTotal: 20 } });
    expect(w.attributes("data-slot")).toBe("ai-usage-cost");
    const tiles = w.findAll('[data-slot="stat-card"]');
    expect(tiles).toHaveLength(5);
    expect(tiles[0]!.text()).toContain("$22");
    expect(tiles[0]!.attributes("data-tone")).toBe("negative");
    expect(tiles[2]!.text()).toContain("$12.40");
    expect(tiles[3]!.text()).toContain("$9.10");
    expect(tiles[4]!.text()).toContain("Client price (+20%)");
    expect(tiles[4]!.text()).toContain("$25.80");
    expect(w.findAll('[data-slot="chart-bar"]')).toHaveLength(2);
    expect(w.find('[data-slot="chart"]').attributes("role")).toBe("img");
    expect(w.find('[data-slot="chart-legend"]').text()).toContain("Unbilled");
    expect(w.find('[data-slot="tabs-list"]').attributes("aria-label")).toBe("Cost breakdown");
    const rows = w.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("2.4M");
    expect(rows[0]!.text()).toContain("310K");
  });

  it("only offers tabs for the breakdowns given and drops the client tile without markup", () => {
    const w = mount(NqAiUsageCost, { props: { days, byRun: byModel } });
    expect(w.findAll('[data-slot="stat-card"]')).toHaveLength(4);
    expect(w.findAll('[data-slot="tabs-tab"]').map((t) => t.text())).toEqual(["By run"]);
    const none = mount(NqAiUsageCost, { props: { days } });
    expect(none.find('[data-slot="tabs"]').exists()).toBe(false);
  });

  it("defaults to SAR with Arabic words in Arabic", () => {
    const w = mount({ components: { NqAiUsageCost, NasaqProvider }, setup: () => ({ days, byModel }), template: `<NasaqProvider locale="ar"><NqAiUsageCost :days="days" :by-model="byModel" /></NasaqProvider>` });
    expect(w.text()).toContain("إجمالي التكلفة");
    expect(w.text()).toContain("ر.س.");
    expect(w.text()).not.toContain("$");
  });

  it("merges class and shows skeletons while loading", () => {
    const w = mount(NqAiUsageCost, { props: { days, loading: true, class: "max-w-3xl" } });
    expect(w.classes()).toContain("max-w-3xl");
    expect(w.findAll('[data-slot="stat-card-skeleton"]').length).toBeGreaterThan(0);
  });
});

describe("NqTokenCostMeter", () => {
  it("splits tokens into input, cached and output with a spoken summary", () => {
    const w = mount(NqTokenCostMeter, { props: { tokensIn: 182_000, tokensOut: 24_000, cached: 120_000 } });
    expect(w.attributes("data-slot")).toBe("token-cost-meter");
    expect(w.find('[role="img"]').attributes("aria-label")).toBe("Input 62K, Cached 120K, Output 24K");
    expect(w.text()).toContain("206K tokens");
    expect(w.find('[data-slot="usage-meter"]').exists()).toBe(false);
  });

  it("adds a money meter when there is a cost and a budget", () => {
    const w = mount(NqTokenCostMeter, { props: { tokensIn: 1000, tokensOut: 100, cost: 1.42, budget: 2 } });
    const meter = w.find('[data-slot="usage-meter"]');
    expect(meter.exists()).toBe(true);
    expect(meter.text()).toContain("$1.42");
  });
});

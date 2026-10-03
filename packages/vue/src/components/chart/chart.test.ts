import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { CHART_COLORS, monotonePath, NqChartContainer, NqChartLegendContent, NqChartTooltipContent, NqMiniBar, NqSparkline, seriesVars, sparklinePaths } from ".";

const config = { revenue: { label: "Revenue" }, cost: { label: "Cost", color: "var(--nq-tag-amber)" } };

describe("NqChartContainer", () => {
  it("defines a colour variable per series and names the chart", () => {
    const w = mount(NqChartContainer, { props: { config, label: "Revenue and cost", class: "h-64" }, slots: { default: "<i>plot</i>" } });
    expect(w.attributes("data-slot")).toBe("chart");
    expect(w.attributes("role")).toBe("img");
    expect(w.attributes("aria-label")).toBe("Revenue and cost");
    expect(w.attributes("style")).toContain("--color-revenue: var(--primary)");
    expect(w.attributes("style")).toContain("--color-cost: var(--nq-tag-amber)");
    expect(w.classes()).toEqual(expect.arrayContaining(["aspect-video", "h-64"]));
    expect(w.html()).toContain("<i>plot</i>");
    expect(seriesVars({ a: {}, b: {} })["--color-b"]).toBe(CHART_COLORS[1]);
  });
});

describe("NqChartTooltipContent", () => {
  it("shows the heading and one row per series with a formatted figure", () => {
    const w = mount(NqChartTooltipContent, {
      props: {
        config,
        label: "Feb",
        payload: [
          { dataKey: "revenue", value: 30500 },
          { dataKey: "cost", value: 18400 },
        ],
        valueFormat: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
      },
    });
    expect(w.attributes("data-slot")).toBe("chart-tooltip");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.find(".text-label").text()).toBe("Feb");
    const rows = w.findAll(".grid.gap-1 > div");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("Revenue");
    expect(rows[0]!.text()).toContain("$30,500");
    expect(rows[0]!.find("span").attributes("style")).toContain("var(--color-revenue)");
  });

  it("renders nothing when inactive or empty and can hide the heading", () => {
    expect(mount(NqChartTooltipContent, { props: { active: false, payload: [{ dataKey: "a", value: 1 }] } }).find('[data-slot="chart-tooltip"]').exists()).toBe(false);
    expect(mount(NqChartTooltipContent, { props: { payload: [] } }).find('[data-slot="chart-tooltip"]').exists()).toBe(false);
    const w = mount(NqChartTooltipContent, { props: { label: "Feb", hideLabel: true, payload: [{ dataKey: "a", value: 1 }] } });
    expect(w.text()).not.toContain("Feb");
    expect(w.text()).toContain("1");
  });
});

describe("NqChartLegendContent", () => {
  it("lists the series labels with their colour keys", () => {
    const w = mount(NqChartLegendContent, {
      props: {
        config,
        payload: [
          { dataKey: "revenue", color: "red" },
          { dataKey: "cost", color: "blue" },
        ],
      },
    });
    expect(w.attributes("data-slot")).toBe("chart-legend");
    expect(w.findAll("li").map((li) => li.text())).toEqual(["Revenue", "Cost"]);
    expect(w.find("li span").attributes("style")).toContain("background-color: red");
  });
});

describe("NqSparkline and NqMiniBar", () => {
  it("draws a line and area, hidden from assistive tech without a label", () => {
    const w = mount(NqSparkline, { props: { data: [1, 3, 2, { value: 5 }] } });
    expect(w.attributes("data-slot")).toBe("sparkline");
    expect(w.attributes("aria-hidden")).toBe("true");
    expect(w.attributes("role")).toBeUndefined();
    expect(w.classes()).toEqual(expect.arrayContaining(["h-8", "w-32"]));
    expect(w.findAll("path")).toHaveLength(2);
    expect(w.find("svg").classes()).toContain("rtl:-scale-x-100");
    const labelled = mount(NqSparkline, { props: { data: [1, 2], label: "Up 12%", fill: false } });
    expect(labelled.attributes("role")).toBe("img");
    expect(labelled.attributes("aria-label")).toBe("Up 12%");
    expect(labelled.findAll("path")).toHaveLength(1);
  });

  it("scales bars to the max and dims all but the highlighted one", () => {
    const w = mount(NqMiniBar, { props: { data: [2, 4, 1], highlight: 1, class: "w-40" } });
    expect(w.attributes("data-slot")).toBe("mini-bar");
    expect(w.classes()).toContain("w-40");
    const bars = w.findAll("span");
    expect(bars.map((b) => b.attributes("style"))).toEqual([expect.stringContaining("height: 50%"), expect.stringContaining("height: 100%"), expect.stringContaining("height: 25%")]);
    expect(bars[1]!.attributes("style")).toContain("opacity: 1");
    expect(bars[0]!.attributes("style")).toContain("opacity: 0.35");
  });

  it("builds monotone paths from the first point", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([[0, 1]])).toBe("M0,1");
    expect(monotonePath([[0, 10], [10, 0], [20, 10]]).startsWith("M0,10C")).toBe(true);
    expect(sparklinePaths([1, 2, 3]).area.endsWith("Z")).toBe(true);
  });
});

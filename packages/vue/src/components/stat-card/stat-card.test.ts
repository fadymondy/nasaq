import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqStatCard, NqStatGrid } from ".";

describe("NqStatCard", () => {
  it("shows the figure, a signed delta with a good tone and a sparkline", () => {
    const w = mount(NqStatCard, { props: { label: "Revenue", value: 1200, delta: 0.124, deltaLabel: "vs last month", sparkline: [1, 2, 3], class: "w-64" } });
    expect(w.attributes("data-slot")).toBe("stat-card");
    expect(w.attributes("data-trend")).toBe("up");
    expect(w.attributes("data-tone")).toBe("positive");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "w-64"]));
    expect(w.find('[data-slot="stat-card-label"]').text()).toBe("Revenue");
    expect(w.find('[data-slot="stat-card-value"]').text()).toBe("1,200");
    expect(w.find('[data-slot="stat-card-delta"]').text()).toContain("+12.4%");
    expect(w.find('[data-slot="stat-card-delta"]').text()).toContain("vs last month");
    expect(w.find('[data-slot="sparkline"]').exists()).toBe(true);
  });

  it("inverts the tone for cost metrics and is neutral without a change", () => {
    const cost = mount(NqStatCard, { props: { label: "Cost", value: 5, delta: -0.03, invert: true } });
    expect(cost.attributes("data-trend")).toBe("down");
    expect(cost.attributes("data-tone")).toBe("positive");
    expect(cost.find('[data-slot="stat-card-delta"]').text()).toContain("-3%");
    const none = mount(NqStatCard, { props: { label: "Plain", value: 5 } });
    expect(none.attributes("data-trend")).toBeUndefined();
    expect(none.find('[data-slot="stat-card-delta"]').exists()).toBe(false);
  });

  it("renders a skeleton while loading and the icon slot otherwise", () => {
    const loading = mount(NqStatCard, { props: { label: "x", loading: true } });
    expect(loading.attributes("aria-busy")).toBe("true");
    expect(loading.find('[data-slot="stat-card-skeleton"]').exists()).toBe(true);
    expect(loading.find('[data-slot="stat-card-label"]').exists()).toBe(false);
    const icon = mount(NqStatCard, { props: { label: "x", value: 1 }, slots: { icon: "<i data-i />" } });
    expect(icon.find('[data-slot="stat-card-icon"] [data-i]').exists()).toBe(true);
  });

  it("lays StatCards out in a responsive grid", () => {
    const w = mount(NqStatGrid, { slots: { default: "<p>a</p>" } });
    expect(w.attributes("data-slot")).toBe("stat-grid");
    expect(w.classes()).toContain("grid");
  });
});

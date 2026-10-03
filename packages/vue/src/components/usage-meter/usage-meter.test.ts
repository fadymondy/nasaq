import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqBudgetBurn, NqUsageMeter, NqUsageSummary, usageTone } from ".";

describe("NqUsageMeter", () => {
  it("shows used of limit, the remaining amount and a tone", () => {
    const w = mount(NqUsageMeter, { props: { label: "Seats", used: 20, limit: 50, unit: "seats", class: "extra" } });
    expect(w.attributes("data-slot")).toBe("usage-meter");
    expect(w.attributes("data-tone")).toBe("ok");
    expect(w.classes()).toContain("extra");
    expect(w.find('[data-slot="usage-meter-value"]').text()).toBe("20 seats of 50 seats");
    expect(w.text()).toContain("30 seats left");
    expect(w.find('[data-slot="meter"]').attributes("aria-label")).toBe("Seats");
  });

  it("turns warning, danger and over with spelled-out text", () => {
    const warn = mount(NqUsageMeter, { props: { label: "S", used: 38, limit: 50 } });
    expect(warn.attributes("data-tone")).toBe("warning");
    expect(warn.find('[data-slot="usage-meter-status"]').text()).toBe("Approaching the limit");
    const danger = mount(NqUsageMeter, { props: { label: "S", used: 46, limit: 50 } });
    expect(danger.attributes("data-tone")).toBe("danger");
    expect(danger.find('[data-slot="usage-meter-status"]').text()).toBe("Almost at the limit");
    const over = mount(NqUsageMeter, { props: { label: "S", used: 52, limit: 50 } });
    expect(over.attributes("data-tone")).toBe("over");
    const status = over.find('[data-slot="usage-meter-status"]');
    expect(status.attributes("role")).toBe("alert");
    expect(status.text()).toBe("Over the limit by 2");
    expect(usageTone(46, 50)).toBe("danger");
  });

  it("shows an Unlimited badge and no bar when the limit is null", () => {
    const w = mount(NqUsageMeter, { props: { label: "Storage", used: 12, limit: null, unit: "GB" } });
    expect(w.attributes("data-unlimited")).toBe("true");
    expect(w.find('[data-slot="usage-meter-unlimited"]').text()).toBe("Unlimited");
    expect(w.find('[data-slot="meter"]').exists()).toBe(false);
  });

  it("formats money in USD by default and draws the period marker", () => {
    const w = mount(NqUsageMeter, { props: { label: "AI spend", kind: "money", used: 182, limit: 200, marker: 0.4 } });
    expect(w.find('[data-slot="usage-meter-value"]').text()).toBe("$182 of $200");
    expect((w.find('[data-slot="usage-meter-marker"]').element as HTMLElement).style.insetInlineStart).toBe("40%");
  });

  it("accepts a hint slot that replaces the remaining amount", () => {
    const w = mount(NqUsageMeter, { props: { label: "S", used: 10, limit: 50, hint: "Resets on 1 Oct" } });
    expect(w.text()).toContain("Resets on 1 Oct");
    expect(w.text()).not.toContain("left");
  });
});

describe("NqBudgetBurn", () => {
  it("projects the end-of-period figure from the elapsed fraction", () => {
    const w = mount(NqBudgetBurn, { props: { hours: { used: 96, budget: 160 }, money: { used: 7200, budget: 12000 }, elapsed: 0.5 } });
    expect(w.attributes("data-slot")).toBe("budget-burn");
    expect(w.findAll('[data-slot="usage-meter"]')).toHaveLength(2);
    expect(w.text()).toContain("On pace for 192 h, 32 h over budget");
    expect(w.text()).toContain("On pace for $14,400, $2,400 over budget");
    expect(w.text()).toContain("50% of the period has passed");
  });
});

describe("NqUsageSummary", () => {
  const items = [
    { id: "seats", label: "Seats", used: 46, limit: 50, unit: "seats" },
    { id: "calls", label: "API calls", used: 1_200_000, limit: 1_000_000, overageRate: 0.00001 },
  ];

  it("lists the meters, the overage estimate and the upgrade action", async () => {
    const w = mount(NqUsageSummary, { props: { planName: "Team", items, upgradable: true } });
    expect(w.attributes("data-slot")).toBe("usage-summary");
    expect(w.text()).toContain("Team plan");
    expect(w.findAll('[data-slot="usage-meter"]')).toHaveLength(2);
    expect(w.find('[data-slot="usage-overage-total"]').text()).toBe("$2");
    expect(w.find('[data-slot="usage-overage-strip"]').attributes("data-tone")).toBe("warning");
    await w.find("button").trigger("click");
    expect(w.emitted("upgrade")).toHaveLength(1);
  });

  it("says there is no overage and shows skeletons while loading", () => {
    const calm = mount(NqUsageSummary, { props: { planName: "Team", items: [{ id: "s", label: "Seats", used: 1, limit: 50 }], upgradable: true } });
    expect(calm.find('[data-slot="usage-overage-strip"]').attributes("data-tone")).toBe("success");
    expect(calm.text()).toContain("No overage so far");
    expect(calm.find("button").exists()).toBe(false);
    const busy = mount(NqUsageSummary, { props: { planName: "Team", items, loading: true } });
    expect(busy.attributes("aria-busy")).toBe("true");
    expect(busy.find('[role="status"]').attributes("aria-label")).toBe("Loading usage");
  });
});

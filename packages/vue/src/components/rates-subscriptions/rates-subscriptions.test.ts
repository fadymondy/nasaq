import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqBillingOverview, NqRateSchedule, NqRecurringSubscriptions, checkRate, prorate, rateAt, subscriptionMonthly, type Rate, type Subscription } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const rates: Rate[] = [
  { id: "r1", amount: 7500, from: "2026-01-01" },
  { id: "r2", amount: 9000, from: "2026-07-01" },
];
const subs: Subscription[] = [
  { id: "s1", name: "Hosting", amount: 2500, quantity: 2, schedule: { kind: "cycle", every: 1, unit: "month" }, anchor: "2026-09-01", status: "active" },
  { id: "s2", name: "Support", amount: 12000, schedule: { kind: "cycle", every: 1, unit: "year" }, anchor: "2026-03-15", status: "paused" },
];

describe("rate helpers", () => {
  it("holds a rate until the next starts", () => {
    expect(rateAt(rates, "2026-06-30")?.amount).toBe(7500);
    expect(rateAt(rates, "2026-09-29")?.amount).toBe(9000);
    expect(checkRate({ amount: 100, from: "2026-07-01" }, rates)).toBe("duplicate");
    expect(prorate(3000, "2026-09-01", "2026-10-01", "2026-09-16")).toBe(1500);
    expect(subscriptionMonthly(subs[0]!, "2026-09-29")).toBe(5000);
  });
});

describe("rates and subscriptions", () => {
  it("renders the rate history and the current rate", () => {
    const c = mount({ components: { NqRateSchedule, NasaqProvider }, template: `<NasaqProvider default-locale="en"><NqRateSchedule :rates="rates" currency="USD" today="2026-09-29" :on-add="async () => {}" /></NasaqProvider>`, setup: () => ({ rates }) }, { attachTo: document.body });
    expect(c.find("[data-slot=rate-schedule]").exists()).toBe(true);
    expect(c.text()).toContain("$90.00");
    expect(c.findAll("ol > li")).toHaveLength(2);
    expect(c.find("ol > li[data-current]").text()).toContain("$90.00");
    c.unmount();
  });

  it("lists subscriptions and the overview totals", () => {
    const c = mount({ components: { NqRecurringSubscriptions, NqBillingOverview, NasaqProvider }, template: `<NasaqProvider default-locale="en"><NqRecurringSubscriptions :subscriptions="subs" currency="USD" today="2026-09-29" /><NqBillingOverview :subscriptions="subs" currency="USD" today="2026-09-29" /></NasaqProvider>`, setup: () => ({ subs }) }, { attachTo: document.body });
    expect(c.findAll("[data-slot=recurring-subscriptions] ul > li")).toHaveLength(2);
    expect(c.find("[data-slot=billing-overview]").text()).toContain("$50.00");
    c.unmount();
  });

  it("renders Arabic with SAR", () => {
    const c = mount({ components: { NqBillingOverview, NasaqProvider }, template: `<NasaqProvider default-locale="ar"><NqBillingOverview :subscriptions="subs" today="2026-09-29" /></NasaqProvider>`, setup: () => ({ subs }) }, { attachTo: document.body });
    expect(c.text()).toMatch(/ر\.س|SAR/);
    c.unmount();
  });
});

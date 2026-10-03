import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqPlanComparison, NqPlanPicker, NqPricingTable, planAction, planPrice, yearlySavings, type PricingPlan } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

const plans: PricingPlan[] = [
  { id: "free", name: "Free", monthly: 0, features: ["3 projects"] },
  { id: "pro", name: "Pro", monthly: 15, yearly: 12, highlighted: true, badge: "Most popular", trialDays: 14, features: ["Unlimited"] },
  { id: "ent", name: "Enterprise", custom: "Custom" },
];

describe("helpers", () => {
  it("prices, savings and actions", () => {
    expect(planPrice(plans[1]!, "year")).toEqual({ amount: 12, compareAt: 15 });
    expect(yearlySavings(plans)).toBe(20);
  });
  it("labels the button by account state", () => {
    const t = { current: "Current plan", upgrade: "Upgrade", downgrade: "Downgrade", contactSales: "Contact sales", getStarted: "Get started", choose: (n: string) => `Choose ${n}`, trial: (d: number) => `Start ${d}-day free trial` } as never;
    expect(planAction(plans[1]!, plans, t).label).toBe("Start 14-day free trial");
    expect(planAction(plans[1]!, plans, t, "pro")).toMatchObject({ label: "Current plan", disabled: true });
    expect(planAction(plans[2]!, plans, t).label).toBe("Contact sales");
  });
});

describe("NqPricingTable", () => {
  it("renders a card per plan with USD monthly prices", () => {
    const w = mount(NqPricingTable, { props: { plans } });
    expect(w.attributes("data-slot")).toBe("pricing-table");
    expect(w.findAll("button").some((b) => b.text() === "Get started")).toBe(true);
    expect(w.text()).toContain("$15");
    expect(w.text()).toContain("Billed monthly");
    expect(w.text()).toContain("Custom");
  });

  it("switches to yearly and emits the period", async () => {
    const w = mount(NqPricingTable, { props: { plans } });
    expect(w.text()).toContain("Save 20%");
    const yearly = w.findAll("button").find((b) => b.text().startsWith("Yearly"))!;
    await yearly.trigger("click");
    await nextTick();
    expect(w.emitted("update:period")?.[0]).toEqual(["year"]);
    expect(w.text()).toContain("$12");
    expect(w.text()).toContain("Billed $144 yearly");
  });

  it("calls onSelect and keeps the button busy until the promise settles", async () => {
    let done!: () => void;
    const onSelect = vi.fn(() => new Promise<void>((r) => (done = r)));
    const w = mount(NqPricingTable, { props: { plans, onSelect } });
    const pro = w.findAll("button").find((b) => b.text().includes("14-day"))!;
    await pro.trigger("click");
    expect(onSelect).toHaveBeenCalledWith(plans[1], "month");
    await nextTick();
    expect(pro.attributes("aria-busy")).toBe("true");
    done();
    await new Promise((r) => setTimeout(r));
    expect(pro.attributes("aria-busy")).toBeUndefined();
  });

  it("marks the current plan and disables its button", () => {
    const w = mount(NqPricingTable, { props: { plans, currentPlanId: "pro" } });
    const cur = w.findAll("button").find((b) => b.text() === "Current plan")!;
    expect(cur.attributes("disabled")).toBeDefined();
  });

  it("uses SAR under an Arabic provider", () => {
    const w = mount({ components: { NasaqProvider, NqPricingTable }, props: ["plans"], template: `<NasaqProvider locale="ar"><NqPricingTable :plans="plans" /></NasaqProvider>` }, { props: { plans } });
    expect(w.text()).toContain("ابدأ الآن");
    expect(w.text()).toMatch(/SAR|ر\.س/);
  });
});

describe("NqPlanComparison", () => {
  it("renders checks, dashes and text", () => {
    const w = mount(NqPlanComparison, { props: { plans, caption: "Compare", sections: [{ title: "Core", rows: [{ label: "Projects", values: { free: "3", pro: true } }] }] } });
    expect(w.attributes("data-slot")).toBe("plan-comparison");
    expect(w.find("caption").text()).toBe("Compare");
    expect(w.text()).toContain("Included");
    expect(w.text()).toContain("Not included");
    expect(w.text()).toContain("3");
  });
});

describe("NqPlanPicker", () => {
  it("renders radios and disables the current plan", () => {
    const w = mount(NqPlanPicker, { props: { plans, currentPlanId: "free", defaultValue: "pro" } });
    expect(w.attributes("role")).toBe("radiogroup");
    const radios = w.findAll('[role="radio"]');
    expect(radios).toHaveLength(3);
    expect(radios[0]!.attributes("disabled")).toBeDefined();
    expect(radios[1]!.attributes("aria-checked")).toBe("true");
    expect(w.text()).toContain("Current plan");
  });
});

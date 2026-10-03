import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import type { PricingPlan } from "../pricing-table";
import { NqFeatureGate, NqPlanBadge, NqUpgradeBanner, NqUpgradeCard, NqUpgradeDialog } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

const plans: PricingPlan[] = [{ id: "pro", name: "Pro", monthly: 15, yearly: 12, highlighted: true }];

describe("NqUpgradeDialog", () => {
  it("opens with benefits, a USD price, and calls onUpgrade with the plan and period", async () => {
    const onUpgrade = vi.fn();
    mount(NqUpgradeDialog, {
      props: { title: "Unlock unlimited projects", benefits: ["Unlimited projects", "Priority support"], plans, onUpgrade, defaultOpen: true },
      attachTo: document.body,
    });
    await flushPromises();
    const content = document.querySelector<HTMLElement>('[data-slot="upgrade-dialog"]')!;
    expect(content).not.toBeNull();
    expect(content.textContent).toContain("Unlimited projects");
    expect(content.textContent).toContain("$12");
    expect(content.textContent).toContain("Cancel anytime. Your data stays yours.");
    const cta = [...content.querySelectorAll("button")].find((b) => b.textContent?.includes("Upgrade to Pro"))!;
    cta.click();
    expect(onUpgrade).toHaveBeenCalledWith("pro", "year");
  });

  it("keeps the button busy while the promise is pending", async () => {
    let done!: () => void;
    const onUpgrade = vi.fn(() => new Promise<void>((r) => (done = r)));
    mount(NqUpgradeDialog, { props: { title: "Go Pro", onUpgrade, defaultOpen: true }, attachTo: document.body });
    await flushPromises();
    const cta = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Upgrade now"))!;
    cta.click();
    await flushPromises();
    expect(cta.getAttribute("aria-busy")).toBe("true");
    expect(cta.hasAttribute("disabled")).toBe(true);
    done();
    await flushPromises();
    expect(cta.hasAttribute("disabled")).toBe(false);
  });

  it("reads in Arabic with SAR", async () => {
    const w = mount(
      { components: { NasaqProvider, NqUpgradeDialog }, setup: () => ({ plans }), template: `<NasaqProvider locale="ar"><NqUpgradeDialog title="ت" :plans="plans" :on-upgrade="() => {}" default-open /></NasaqProvider>` },
      { attachTo: document.body },
    );
    await flushPromises();
    const text = document.querySelector('[data-slot="upgrade-dialog"]')!.textContent ?? "";
    expect(text).toContain("ربما لاحقًا");
    expect(text).toMatch(/SAR|ر\.س/);
    w.unmount();
  });
});

describe("NqUpgradeBanner", () => {
  it("renders the tone and a dismiss button only when asked", async () => {
    const onDismiss = vi.fn();
    const w = mount(NqUpgradeBanner, { props: { tone: "warning", title: "Trial ends soon", onDismiss } });
    expect(w.attributes("data-slot")).toBe("upgrade-banner");
    expect(w.attributes("data-tone")).toBe("warning");
    expect(w.attributes("aria-label")).toBe("Trial ends soon");
    await w.find("button[aria-label='Dismiss']").trigger("click");
    expect(onDismiss).toHaveBeenCalled();
    expect(mount(NqUpgradeBanner, { props: { title: "x" } }).find("button").exists()).toBe(false);
  });
});

describe("NqUpgradeCard", () => {
  it("shows the usage meter and calls onUpgrade", async () => {
    const onUpgrade = vi.fn();
    const w = mount(NqUpgradeCard, { props: { title: "Running low", usage: { value: 8, max: 10, label: "8 of 10 projects" }, onUpgrade } });
    expect(w.find('[data-slot="meter"]').exists()).toBe(true);
    await w.find("button").trigger("click");
    expect(onUpgrade).toHaveBeenCalled();
  });
});

describe("NqFeatureGate", () => {
  it("renders the content untouched when unlocked", () => {
    const w = mount(NqFeatureGate, { props: { locked: false, title: "t", onUpgrade: () => {} }, slots: { default: "<p>Report</p>" } });
    expect(w.find('[data-slot="feature-gate"]').exists()).toBe(false);
    expect(w.text()).toBe("Report");
  });
  it("blurs and inerts the preview when locked", async () => {
    const onUpgrade = vi.fn();
    const w = mount(NqFeatureGate, { props: { locked: true, title: "Reports are on Pro", onUpgrade }, slots: { default: "<p>Report</p>" } });
    expect(w.attributes("data-locked")).toBe("");
    const preview = w.find("[aria-hidden='true'][inert]");
    expect(preview.exists()).toBe(true);
    expect(w.find('[data-slot="plan-badge"]').text()).toBe("Pro");
    await w.findAll("button").find((b) => b.text() === "See plans")!.trigger("click");
    expect(onUpgrade).toHaveBeenCalled();
  });
});

describe("NqPlanBadge", () => {
  it("defaults to Pro and takes a custom name", () => {
    expect(mount(NqPlanBadge).text()).toBe("Pro");
    expect(mount(NqPlanBadge, { slots: { default: "Team" } }).text()).toBe("Team");
  });
});

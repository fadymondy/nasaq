import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { cashBreakdown, NqCashCollect } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const base = { orderTotalMinor: 8500, deliveryFeeMinor: 1500 };
const field = (w: ReturnType<typeof mount>) => w.find<HTMLInputElement>('[data-slot="input-group-input"]');
async function type(w: ReturnType<typeof mount>, value: string) {
  await field(w).trigger("focus");
  field(w).element.value = value;
  await field(w).trigger("input");
  await nextTick();
}
const confirmButton = (w: ReturnType<typeof mount>) => w.findAll("button").at(-1)!;

describe("cashBreakdown", () => {
  it("computes due, shortfall and change in minor units", () => {
    expect(cashBreakdown({ orderTotal: 8500, deliveryFee: 1500, prepaid: 2000, collected: 7000 })).toEqual({ due: 8000, collected: 7000, shortBy: 1000, change: 0, state: "short" });
    expect(cashBreakdown({ orderTotal: 8500, deliveryFee: 1500, collected: 12000 })).toMatchObject({ change: 2000, state: "over" });
    expect(cashBreakdown({ orderTotal: 8500, deliveryFee: 1500 }).state).toBe("unpaid");
  });
});

describe("NqCashCollect", () => {
  it("renders the breakdown in USD, an empty state line and a disabled confirm", () => {
    const w = mount(NqCashCollect, { props: base });
    expect(w.attributes("data-slot")).toBe("cash-collect");
    expect(w.attributes("data-state")).toBe("unpaid");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "border", "bg-card"]));
    expect(w.attributes("aria-labelledby")).toBe(w.find("h2").attributes("id"));
    const rows = w.find('[data-slot="cash-breakdown"]').text();
    expect(rows).toContain("$85.00");
    expect(rows).toContain("$15.00");
    expect(rows).toContain("$100.00");
    expect(w.find('[data-slot="cash-status"]').text()).toBe("Nothing received yet");
    expect(w.find('[data-slot="cash-status"]').attributes("role")).toBe("status");
    expect(confirmButton(w).attributes("disabled")).toBeDefined();
    // exact amount first among the quick picks
    expect(w.find('[role="group"] button').text()).toBe("$100.00");
  });

  it("shows the shortfall, blocks confirm, and allowShort allows it", async () => {
    const w = mount(NqCashCollect, { props: { ...base, defaultCollectedMinor: 9000 } });
    expect(w.attributes("data-state")).toBe("short");
    expect(w.find('[data-slot="cash-status"]').text()).toContain("Still owed: $10.00");
    expect(w.find('[data-slot="cash-status"]').classes()).toContain("bg-nq-warning-soft");
    expect(confirmButton(w).attributes("disabled")).toBeDefined();
    await w.setProps({ allowShort: true });
    expect(confirmButton(w).attributes("disabled")).toBeUndefined();
  });

  it("types an amount, shows the change due and confirms in minor units", async () => {
    const w = mount(NqCashCollect, { props: base, attachTo: document.body });
    await type(w, "120");
    expect(w.emitted("update:collectedMinor")?.at(-1)).toEqual([12000]);
    expect(w.attributes("data-state")).toBe("over");
    expect(w.find('[data-slot="cash-status"]').text()).toContain("Change to return: $20.00");
    await confirmButton(w).trigger("click");
    expect(w.emitted("confirm")).toEqual([[12000]]);
  });

  it("quick amounts set the received amount and are pressed", async () => {
    const w = mount(NqCashCollect, { props: base });
    const first = w.find('[role="group"] button');
    await first.trigger("click");
    expect(w.attributes("data-state")).toBe("exact");
    expect(w.find('[role="group"] button').attributes("aria-pressed")).toBe("true");
    expect(w.find('[data-slot="cash-status"]').text()).toBe("Exact amount");
  });

  it("is controlled with collectedMinor", async () => {
    const w = mount(NqCashCollect, { props: { ...base, collectedMinor: 10000 } });
    expect(w.attributes("data-state")).toBe("exact");
    await w.setProps({ collectedMinor: 5000 });
    expect(w.attributes("data-state")).toBe("short");
  });

  it("fully prepaid orders collect nothing and confirm with 0", async () => {
    const w = mount(NqCashCollect, { props: { orderTotalMinor: 8500, deliveryFeeMinor: 1500, prepaidMinor: 10000 } });
    expect(w.find('[data-slot="cash-status"]').exists()).toBe(false);
    expect(w.text()).toContain("Paid in full online. Collect nothing.");
    expect(w.text()).toContain("−$100.00");
    await confirmButton(w).trigger("click");
    expect(w.emitted("confirm")).toEqual([[0]]);
  });

  it("uses Arabic copy and SAR under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqCashCollect }, props: ["p"], template: `<NasaqProvider locale="ar" target="scope"><NqCashCollect v-bind="p" /></NasaqProvider>` },
      { props: { p: base } },
    );
    expect(w.text()).toContain("الدفع عند الاستلام");
    expect(w.text()).toContain("تأكيد تحصيل النقد");
    expect(w.text()).toMatch(/SAR|ر.س/);
    expect(w.text()).not.toMatch(/\$/);
  });
});

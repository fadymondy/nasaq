import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqCheckoutSteps, NqPaymentMethodForm, emptyPaymentForm, formatCardNumber, planTotal, validatePaymentForm, type CheckoutPlan } from ".";

const plans: CheckoutPlan[] = [
  { id: "starter", name: "Starter", monthlyPrice: 19, yearlyPrice: 190, features: ["3 projects"] },
  { id: "team", name: "Team", monthlyPrice: 49, yearlyPrice: 490, badge: "Most popular", highlighted: true },
];

const onComplete = () => vi.fn(async (_order: unknown) => ({ reference: "SUB-1042" }));
const stepOf = (w: ReturnType<typeof mount>) => w.find('[data-slot="checkout-steps"]').attributes("data-step");
const button = (w: ReturnType<typeof mount>, text: string) => {
  const b = w.findAll("button").find((x) => x.text().trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  return b;
};

describe("helpers", () => {
  it("planTotal and validatePaymentForm", () => {
    expect(planTotal(plans[0]!, "month")).toBe(19);
    expect(planTotal(plans[0]!, "year")).toBe(190);
    expect(planTotal({ id: "x", name: "X", monthlyPrice: 10 }, "year")).toBe(120);
    const t = { required: "r", invalidCard: "c", invalidExpiry: "e", invalidCvc: "v" };
    expect(validatePaymentForm({ ...emptyPaymentForm, method: "bank" }, t)).toEqual({});
    expect(Object.keys(validatePaymentForm(emptyPaymentForm, t)).sort()).toEqual(["cvc", "expiry", "holder", "number"]);
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
  });
});

describe("NqCheckoutSteps", () => {
  it("starts on the plan step with the highlighted plan, USD amounts and a VAT line", () => {
    const w = mount(NqCheckoutSteps, { props: { plans, currency: "USD", taxRate: 0.15, taxLabel: "VAT", onComplete: onComplete() } });
    expect(stepOf(w)).toBe("plan");
    expect(w.classes()).toEqual(expect.arrayContaining(["@container", "flex-col", "gap-6"]));
    const summary = w.find('[data-slot="checkout-summary"]');
    expect(summary.exists()).toBe(true);
    expect(summary.text()).toContain("Team");
    expect(summary.text()).toContain("VAT");
    expect(summary.text()).toContain("$56.35");
    expect(w.findAll('[data-slot="plan-card"]')).toHaveLength(2);
    expect(button(w, "Selected").attributes("aria-pressed")).toBe("true");
  });

  it("switching to yearly shows the saving and the yearly total", async () => {
    const w = mount(NqCheckoutSteps, { props: { plans, taxRate: 0.15, onComplete: onComplete() } });
    const yearly = w.findAll("button").find((b) => b.text().startsWith("Yearly"));
    expect(yearly?.text()).toContain("Save 17%");
    await yearly?.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Billed $490.00 yearly");
    expect(w.find('[data-slot="checkout-summary"]').text()).toContain("$563.50");
  });

  it("validates billing, then payment, then requires the terms, then completes", async () => {
    const complete = onComplete();
    const w = mount(NqCheckoutSteps, { props: { plans, taxRate: 0.15, onComplete: complete }, attachTo: document.body });

    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("billing");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("billing");
    expect(w.findAll('[data-slot="field-error"]').length).toBeGreaterThanOrEqual(4);
    expect(w.text()).toContain("This field is required.");

    const set = async (name: string, value: string) => {
      await w.find(`input[name="${name}"]`).setValue(value);
    };
    await set("name", "Sara Ahmed");
    await set("email", "not-an-email");
    await set("address", "1 Main St");
    await set("city", "Riyadh");
    await button(w, "Continue").trigger("click");
    expect(w.text()).toContain("Enter a valid email address.");
    await set("email", "sara@example.com");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("payment");

    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("payment");
    expect(w.text()).toContain("This field is required.");

    await w.find('input[name="cc-number"]').setValue("4111111111111111");
    expect(w.find('[data-slot="payment-brand"]').text()).toBe("Visa");
    expect((w.find('input[name="cc-number"]').element as HTMLInputElement).value).toBe("4111 1111 1111 1111");
    await w.find('input[name="cc-name"]').setValue("Sara Ahmed");
    await w.find('input[name="cc-exp"]').setValue("1230");
    expect((w.find('input[name="cc-exp"]').element as HTMLInputElement).value).toBe("12/30");
    await w.find('input[name="cc-csc"]').setValue("123");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("review");
    expect(w.text()).toContain("Visa ending in");
    expect(w.text()).toContain("1111");

    await button(w, "Pay $56.35").trigger("click");
    expect(complete).not.toHaveBeenCalled();
    expect(w.text()).toContain("Accept the terms to continue.");

    await w.find('[role="checkbox"]').trigger("click");
    await button(w, "Pay $56.35").trigger("click");
    await flushPromises();
    expect(complete).toHaveBeenCalledTimes(1);
    const order = complete.mock.calls[0]![0] as { payment: Record<string, string> };
    expect(order).toMatchObject({ planId: "team", interval: "month", currency: "USD", subtotal: 49, tax: 7.35, total: 56.35 });
    expect(order.payment).toMatchObject({ method: "card", brand: "visa", last4: "1111", holder: "Sara Ahmed" });
    expect(JSON.stringify(order)).not.toContain("4111 1111");
    expect(stepOf(w)).toBe("success");
    expect(w.text()).toContain("SUB-1042");
    expect(w.text()).toContain("You are all set");
    w.unmount();
  });

  it("stays on review and shows the message when onComplete reports an error", async () => {
    const w = mount(NqCheckoutSteps, { props: { plans, defaultStep: "review", onComplete: vi.fn(async () => ({ error: "Card declined" })) } });
    await w.find('[role="checkbox"]').trigger("click");
    await button(w, "Pay $49.00").trigger("click");
    await flushPromises();
    expect(stepOf(w)).toBe("review");
    expect(w.find('[role="alert"]').text()).toContain("Card declined");
  });

  it("falls back to the generic message when onComplete rejects", async () => {
    const w = mount(NqCheckoutSteps, { props: { plans, defaultStep: "review", onComplete: vi.fn(async () => Promise.reject(new Error(""))) } });
    await w.find('[role="checkbox"]').trigger("click");
    await button(w, "Pay $49.00").trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toContain("The payment could not be completed");
  });

  it("emits step-change and shows the done button only with a @done listener", async () => {
    const w = mount(NqCheckoutSteps, { props: { plans, onComplete: onComplete(), onDone: vi.fn() } });
    await button(w, "Continue").trigger("click");
    expect(w.emitted("step-change")?.[0]).toEqual(["billing"]);
    const plain = mount(NqCheckoutSteps, { props: { plans, defaultStep: "review", onComplete: onComplete() } });
    expect(plain.text()).not.toContain("Go to dashboard");
  });

  it("uses Arabic words and SAR under an Arabic provider", () => {
    const w = mount(
      {
        components: { NasaqProvider, NqCheckoutSteps },
        props: ["p", "c"],
        template: `<NasaqProvider locale="ar" target="scope"><NqCheckoutSteps :plans="p" :on-complete="c" /></NasaqProvider>`,
      },
      { props: { p: plans, c: onComplete() } },
    );
    expect(w.text()).toContain("اختر خطتك");
    expect(w.text()).toContain("متابعة");
    expect(w.text()).toMatch(/SAR|ر\.س/);
  });
});

describe("NqPaymentMethodForm", () => {
  it("offers card and bank, formats input and shows bank details in the slot", async () => {
    const w = mount(NqPaymentMethodForm, { props: { modelValue: emptyPaymentForm } });
    expect(w.attributes("data-slot")).toBe("payment-method-form");
    expect(w.text()).toContain("Credit or debit card");
    await w.find('input[name="cc-number"]').setValue("5555555555554444");
    expect(w.emitted("update:modelValue")?.[0]?.[0]).toMatchObject({ number: "5555 5555 5555 4444" });
    const bank = mount(NqPaymentMethodForm, { props: { modelValue: { ...emptyPaymentForm, method: "bank" } }, slots: { bankDetails: "<i data-x>IBAN</i>" } });
    expect(bank.find("[data-x]").exists()).toBe(true);
    expect(bank.find('input[name="cc-number"]').exists()).toBe(false);
  });
});

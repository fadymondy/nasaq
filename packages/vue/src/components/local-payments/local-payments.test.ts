import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqLocalPayments, NqPaymentVerificationQueue, NqPaymentVerificationStatus, normalizeReference, paymentFee, paymentTotal, type LocalPaymentMethod, type PaymentSubmission } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const methods: LocalPaymentMethod[] = [
  { id: "instapay", name: "InstaPay", kind: "instant-transfer", details: [{ label: "Payment address", value: "shop@instapay" }], steps: ["Open the app"], fee: { percentBps: 100 } },
  { id: "bank", name: "Bank", kind: "bank-transfer", details: [{ label: "IBAN", value: "EG123" }], min: 5_000_000 },
];

describe("payment logic", () => {
  it("computes fee and total in minor units", () => {
    expect(paymentFee(100_000, { percentBps: 100, fixed: 50 })).toBe(1_050);
    expect(paymentTotal(100_000, { percentBps: 100 })).toBe(101_000);
    expect(normalizeReference(" ab-12 ")).toBe("AB-12");
  });
});

describe("NqLocalPayments", () => {
  it("shows the method, its details and the total", async () => {
    const w = mount(NqLocalPayments, { props: { amount: 100_000, currency: "USD", methods, onSubmit: vi.fn() }, attachTo: document.body });
    await nextTick();
    expect(w.attributes("data-slot")).toBe("local-payments");
    expect(w.attributes("data-status")).toBe("unpaid");
    expect(w.text()).toContain("shop@instapay");
    expect(w.text()).toContain("$1,010.00");
    w.unmount();
  });

  it("does not submit without a reference and receipt", async () => {
    const onSubmit = vi.fn();
    const w = mount(NqLocalPayments, { props: { amount: 100_000, currency: "USD", methods, onSubmit }, attachTo: document.body });
    await nextTick();
    await w.find("form").trigger("submit");
    await nextTick();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(w.text()).toContain("Enter the transfer reference.");
    w.unmount();
  });

  it("shows the verification status once submitted", async () => {
    const w = mount(NqLocalPayments, {
      props: { amount: 100_000, currency: "USD", methods, onSubmit: vi.fn(), submission: { methodId: "instapay", reference: "AB12CD34", status: "verifying" } },
      attachTo: document.body,
    });
    await nextTick();
    expect(w.find("form").exists()).toBe(false);
    expect(w.find('[data-slot="payment-verification-status"]').attributes("data-status")).toBe("verifying");
    w.unmount();
  });

  it("shows the empty state", async () => {
    const e = mount(NqLocalPayments, { props: { amount: 1, currency: "USD", methods: [], onSubmit: vi.fn() }, attachTo: document.body });
    await nextTick();
    expect(e.text()).toContain("No payment methods");
    e.unmount();
  });

});

describe("NqPaymentVerificationStatus", () => {
  it("marks the stages and the rejection", async () => {
    const w = mount(NqPaymentVerificationStatus, { props: { status: "rejected", rejectionReason: "Amount differs", onResubmit: vi.fn() }, attachTo: document.body });
    await nextTick();
    expect(w.find('[role="alert"]').text()).toContain("Amount differs");
    expect(w.findAll("li").map((li) => li.attributes("data-state"))).toEqual(["done", "rejected", "todo"]);
    w.unmount();
  });
});

describe("NqPaymentVerificationQueue", () => {
  const rows: PaymentSubmission[] = [
    { id: "1", customer: "Mona", methodName: "InstaPay", amount: 100_000, currency: "USD", reference: "AB12CD34", submittedAt: "2026-09-01T10:00:00Z", status: "submitted" },
    { id: "2", customer: "Omar", methodName: "Bank", amount: 50_000, currency: "USD", reference: "ZZ99YY88", submittedAt: "2026-09-02T10:00:00Z", status: "verified" },
  ];

  it("lists rows and verifies from the row button", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqPaymentVerificationQueue, { props: { submissions: rows, onVerify, onReject: vi.fn() }, attachTo: document.body });
    await nextTick();
    expect(w.findAll("tbody tr[data-row]")).toHaveLength(2);
    await w.find('button[aria-label="Verify: Mona"]').trigger("click");
    expect(onVerify).toHaveBeenCalledWith(rows[0]);
    expect(w.find('button[aria-label="Verify: Omar"]').exists()).toBe(false);
    w.unmount();
  });

  it("shows the error when verify fails", async () => {
    const onVerify = vi.fn().mockRejectedValue(new Error("Bank offline"));
    const w = mount(NqPaymentVerificationQueue, { props: { submissions: rows, onVerify, onReject: vi.fn() }, attachTo: document.body });
    await nextTick();
    await w.find('button[aria-label="Verify: Mona"]').trigger("click");
    await vi.waitFor(() => expect(w.find('[role="alert"]').text()).toContain("Bank offline"));
    w.unmount();
  });
});

describe("locale", () => {
  it("speaks Arabic", async () => {
    const host = mount(
      { components: { NasaqProvider, NqLocalPayments }, template: '<NasaqProvider default-locale="ar"><NqLocalPayments :amount="1" :methods="methods" :on-submit="() => {}" /></NasaqProvider>', data: () => ({ methods }) },
      { attachTo: document.body },
    );
    await nextTick();
    expect(host.text()).toContain("الدفع بالتحويل");
    host.unmount();
  });
});

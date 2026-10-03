import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqInvoiceStatusBadge, NqInvoiceView, computeInvoice, type InvoiceData } from ".";

const invoice: InvoiceData = {
  number: "INV-1",
  status: "open",
  issueDate: "2026-09-01",
  dueDate: "2026-09-30",
  currency: "USD",
  taxRate: 0.15,
  discount: 20,
  from: { name: "Nasaq Ltd", taxId: "300" },
  to: { name: "Acme Co", email: "a@b.test" },
  lines: [{ id: "1", description: "Team plan", quantity: 5, unitPrice: 49 }],
  payments: [{ id: "p", date: "2026-09-02", method: "Visa", amount: 50 }],
};

describe("computeInvoice", () => {
  it("spreads the discount, charges tax on the rest and nets payments", () => {
    expect(computeInvoice(invoice)).toEqual({ subtotal: 245, discount: 20, tax: 33.75, total: 258.75, paid: 50, due: 208.75 });
  });
  it("owes nothing when void", () => {
    expect(computeInvoice({ ...invoice, status: "void" }).due).toBe(0);
  });
});

describe("NqInvoiceView", () => {
  it("renders the sheet, status and USD totals", () => {
    const w = mount(NqInvoiceView, { props: { invoice } });
    expect(w.attributes("data-slot")).toBe("invoice-view");
    expect(w.attributes("data-status")).toBe("open");
    expect(w.find('[data-slot="invoice-sheet"]').exists()).toBe(true);
    expect(w.find('[data-slot="invoice-status"]').text()).toBe("Open");
    expect(w.text()).toContain("$258.75");
    expect(w.text()).toContain("$208.75");
    expect(w.html()).toContain("@media print");
  });
  it("hides Download without onDownload and Pay without onPay; Print stays", () => {
    const w = mount(NqInvoiceView, { props: { invoice } });
    expect(w.text()).not.toContain("Download PDF");
    expect(w.text()).not.toContain("Pay now");
    expect(w.text()).toContain("Print");
  });
  it("shows Pay now for open invoices only and calls onPay", async () => {
    const onPay = vi.fn();
    const w = mount(NqInvoiceView, { props: { invoice, onPay } });
    await w.findAll("button").find((b) => b.text() === "Pay now")!.trigger("click");
    expect(onPay).toHaveBeenCalled();
    const paid = mount(NqInvoiceView, { props: { invoice: { ...invoice, status: "paid" }, onPay } });
    expect(paid.text()).not.toContain("Pay now");
  });
  it("shows the error when the download fails", async () => {
    const onDownload = vi.fn().mockRejectedValue(new Error("Nope"));
    const w = mount(NqInvoiceView, { props: { invoice, onDownload } });
    await w.findAll("button").find((b) => b.text().includes("Download"))!.trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(w.find('[role="alert"]').text()).toBe("Nope");
  });
  it("calls onPrint instead of window.print", async () => {
    const onPrint = vi.fn();
    const w = mount(NqInvoiceView, { props: { invoice, onPrint } });
    await w.findAll("button").find((b) => b.text() === "Print")!.trigger("click");
    expect(onPrint).toHaveBeenCalled();
  });
  it("falls back to SAR in Arabic when no currency is given", () => {
    const { currency: _c, ...rest } = invoice;
    const w = mount(
      { components: { NasaqProvider, NqInvoiceView }, props: ["i"], template: `<NasaqProvider locale="ar" target="scope"><NqInvoiceView :invoice="i" /></NasaqProvider>` },
      { props: { i: rest } },
    );
    expect(w.text()).toContain("فاتورة");
    expect(w.text()).toContain("SAR");
  });
});

describe("NqInvoiceStatusBadge", () => {
  it("has an icon and a label", () => {
    const w = mount(NqInvoiceStatusBadge, { props: { status: "overdue" } });
    expect(w.attributes("data-status")).toBe("overdue");
    expect(w.find("svg").exists()).toBe(true);
    expect(w.text()).toBe("Overdue");
  });
});

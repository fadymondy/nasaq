import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqInvoiceList, summarizeInvoices, type InvoiceSummary, type PaymentRecord } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const invoices: InvoiceSummary[] = [
  { id: "1", number: "INV-2026-0042", issueDate: "2026-09-01", dueDate: "2026-09-30", amount: 281.75, status: "open" },
  { id: "2", number: "INV-2026-0037", issueDate: "2026-08-01", amount: 100, status: "paid" },
  { id: "3", number: "INV-2026-0030", issueDate: "2026-07-01", dueDate: "2026-07-31", amount: 50, status: "overdue" },
];
const payments: PaymentRecord[] = [{ id: "p1", date: "2026-08-03", amount: 100, status: "succeeded", method: "Visa ending 4242", invoiceNumber: "INV-2026-0037" }];

describe("summarizeInvoices", () => {
  it("counts open and overdue as outstanding", () => {
    expect(summarizeInvoices(invoices)).toEqual({ outstanding: 331.75, overdue: 50, paid: 100 });
  });
});

describe("NqInvoiceList", () => {
  it("renders the tiles, rows and USD amounts", async () => {
    const w = mount(NqInvoiceList, { props: { invoices, currency: "USD" }, attachTo: document.body });
    await nextTick();
    expect(w.attributes("data-slot")).toBe("invoice-list");
    expect(w.findAll('[data-slot="stat-card"]')).toHaveLength(3);
    expect(w.text()).toContain("$331.75");
    expect(w.findAll("tbody tr[data-row]")).toHaveLength(3);
    // newest first
    expect(w.find("tbody tr[data-row]").text()).toContain("INV-2026-0042");
    expect(w.find('[data-slot="invoice-status"]').attributes("data-status")).toBe("open");
    w.unmount();
  });

  it("hides the tiles and adds a Payments tab on request", async () => {
    const w = mount(NqInvoiceList, { props: { invoices, payments, currency: "USD", showSummary: false }, attachTo: document.body });
    await nextTick();
    expect(w.find('[data-slot="stat-grid"]').exists()).toBe(false);
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Invoices", "Payments"]);
    w.unmount();
  });

  it("downloads from the row button and shows the error when it rejects", async () => {
    const onDownload = vi.fn().mockRejectedValue(new Error("Disk full"));
    const w = mount(NqInvoiceList, { props: { invoices, currency: "USD", onDownload }, attachTo: document.body });
    await nextTick();
    await w.find('button[aria-label="Download invoice INV-2026-0042"]').trigger("click");
    await vi.waitFor(() => expect(w.find('[role="alert"]').text()).toContain("Disk full"));
    expect(onDownload).toHaveBeenCalledWith(invoices[0]);
    w.unmount();
  });

  it("opens an invoice from a row click", async () => {
    const onOpen = vi.fn();
    const w = mount(NqInvoiceList, { props: { invoices, currency: "USD", onOpen }, attachTo: document.body });
    await nextTick();
    await w.find("tbody tr[data-row]").trigger("click");
    expect(onOpen).toHaveBeenCalledWith(invoices[0]);
    w.unmount();
  });

  it("speaks Arabic and uses SAR amounts when given SAR", async () => {
    const host = mount({ components: { NasaqProvider, NqInvoiceList }, template: '<NasaqProvider default-locale="ar"><NqInvoiceList :invoices="invoices" currency="SAR" /></NasaqProvider>', data: () => ({ invoices }) }, { attachTo: document.body });
    await nextTick();
    expect(host.text()).toContain("المستحق");
    expect(host.text()).toContain("ر.س");
    host.unmount();
  });
});

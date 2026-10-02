// nqInvoiceList: turns the row menu of the invoice tables into invoice events. The tables themselves are <x-nq::data-table>s.
//
//   <div data-slot="invoice-list" x-data="nqInvoiceList({ downloadFailed: 'The invoice could not be downloaded.' })" x-on:nq-data-table-action="onAction($event)">
//     <p role="alert" x-show="failed" x-text="failed"></p> … data-tables …
//   </div>
//
// Nothing is opened, saved or charged here. Bubbling events carry the work to you:
//   "nq-invoice-open"     { invoice }                                         the View invoice menu item, or a row click
//   "nq-invoice-pay"      { invoice }                                         Pay now (only open and overdue invoices)
//   "nq-invoice-download" { invoice, resolve(), reject(message), waitUntil(promise) }   cancelable; busy until it settles, a rejection shows in the alert
// Nobody claimed the download (no waitUntil / resolve / reject call): it finishes at once.

import type { Magics, Register } from "./types";

interface Invoice {
  id: string;
  number?: string;
  status?: string;
  [key: string]: unknown;
}

interface InvoiceListState extends Magics {
  downloading: string | null;
  failed: string;
  failedText: string;
  root: HTMLElement;
  emit(name: string, detail: Record<string, unknown>): void;
  download(invoice: Invoice): Promise<void>;
}

export const invoiceList: Register = (Alpine) => {
  Alpine.data("nqInvoiceList", (config: { downloadFailed?: string } = {}) => ({
    downloading: null as string | null,
    failed: "",
    failedText: config?.downloadFailed ?? "The invoice could not be downloaded.",
    root: null as unknown as HTMLElement,
    init(this: InvoiceListState) {
      this.root = this.$el;
      // A click on a row of the invoices table opens the invoice.
      this.root.addEventListener("nq-data-table-row-click", (event) => {
        const row = (event as CustomEvent).detail?.row as Invoice | undefined;
        if (row?.number !== undefined && row.status !== undefined && "issueDate" in row) this.emit("nq-invoice-open", { invoice: row });
      });
    },
    emit(this: InvoiceListState, name: string, detail: Record<string, unknown>) {
      this.root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    },
    onAction(this: InvoiceListState, event: Event) {
      const { action, row } = (event as CustomEvent).detail as { action: string; row: Invoice };
      if (action === "view") this.emit("nq-invoice-open", { invoice: row });
      else if (action === "pay") {
        if (row.status === "open" || row.status === "overdue") this.emit("nq-invoice-pay", { invoice: row });
      } else if (action === "download") void this.download(row);
    },
    async download(this: InvoiceListState, invoice: Invoice) {
      if (this.downloading) return;
      this.downloading = invoice.id;
      this.failed = "";
      let claimed = false;
      let settle!: (outcome: { error?: string } | void) => void;
      const outcome = new Promise<{ error?: string } | void>((resolve) => (settle = resolve));
      const detail = {
        invoice,
        resolve() {
          claimed = true;
          settle();
        },
        reject(message?: string) {
          claimed = true;
          settle({ error: message || undefined });
        },
        waitUntil(promise: Promise<unknown>) {
          claimed = true;
          Promise.resolve(promise).then(
            () => settle(),
            (e) => settle({ error: e instanceof Error && e.message ? e.message : typeof e === "string" ? e : undefined }),
          );
        },
      };
      this.root.dispatchEvent(new CustomEvent("nq-invoice-download", { detail, bubbles: true, cancelable: true }));
      if (!claimed) {
        this.downloading = null;
        return;
      }
      const result = await outcome;
      this.downloading = null;
      if (result && "error" in result) this.failed = result.error || this.failedText;
    },
  }));
};

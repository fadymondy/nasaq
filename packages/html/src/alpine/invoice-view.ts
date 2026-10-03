// nqInvoiceView: the state behind the Blade invoice-view component (the document itself is server-rendered).
//
//   <section data-slot="invoice-view" x-data="nqInvoiceView({ failed: 'The file could not be prepared.' })">
//     <p x-show="error" x-text="error" role="alert"></p>
//     <button x-bind:disabled="busy" x-bind:aria-busy="busy" x-on:click="download()">Download PDF</button>
//     <button x-on:click="print()">Print</button>   <button x-on:click="pay()">Pay now</button>
//   </section>
//
// Nothing is built or charged here. Bubbling events carry the work to you:
//   "nq-invoice-download"  { resolve(result?), reject(message), waitUntil(promise) }  cancelable; busy until it settles, an error shows in the bar
//   "nq-invoice-print"     {}                                                          cancelable; window.print() runs unless preventDefault()
//   "nq-invoice-pay"       {}
// Nobody claimed the download (no waitUntil / resolve / reject call): it finishes at once.

import type { Magics, Register } from "./types";

interface InvoiceState extends Magics {
  busy: boolean;
  error: string;
  failed: string;
  root: HTMLElement;
}

export const invoiceView: Register = (Alpine) => {
  Alpine.data("nqInvoiceView", (config: { failed?: string } = {}) => ({
    busy: false,
    error: "",
    failed: config?.failed ?? "The file could not be prepared. Try again.",
    root: null as unknown as HTMLElement,
    init(this: InvoiceState) {
      this.root = this.$el;
    },
    async download(this: InvoiceState) {
      if (this.busy) return;
      this.error = "";
      let claimed = false;
      let settle!: (outcome: { error?: string } | void) => void;
      const outcome = new Promise<{ error?: string } | void>((resolve) => (settle = resolve));
      const detail = {
        resolve(result?: { error?: string }) {
          claimed = true;
          settle(result);
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
      const event = new CustomEvent("nq-invoice-download", { detail, bubbles: true, cancelable: true });
      this.root.dispatchEvent(event);
      if (!claimed && !event.defaultPrevented) return;
      this.busy = true;
      const result = await outcome;
      this.busy = false;
      if (result && "error" in result) this.error = result.error || this.failed;
    },
    print(this: InvoiceState) {
      const event = new CustomEvent("nq-invoice-print", { detail: {}, bubbles: true, cancelable: true });
      this.root.dispatchEvent(event);
      if (!event.defaultPrevented) window.print();
    },
    pay(this: InvoiceState) {
      this.root.dispatchEvent(new CustomEvent("nq-invoice-pay", { detail: {}, bubbles: true }));
    },
  }));
};

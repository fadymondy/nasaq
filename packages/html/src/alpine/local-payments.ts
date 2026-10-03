// nqLocalPayments / nqPaymentQueue: the state behind the Blade local-payments components. Nothing is sent or verified here: bubbling events carry the work to you.
//
//   <div data-slot="local-payments" x-data="nqLocalPayments({ amount: 1250000, currency: 'USD', methodId: 'instapay', methods: { instapay: { fee: 0, total: 1250000, limit: null, limitMessage: '' } } })"> … </div>
//   <section data-slot="payment-verification-queue" x-data="nqPaymentQueue()" x-on:nq-data-table-action="onAction($event)"> … a data-table, a reject dialog … </section>
//
// Events (bubbling, cancelable, claimable like nq-invoice-download: call resolve(), reject(message) or waitUntil(promise); nobody claims it = done at once):
//   "nq-local-payment-submit"  { input: { methodId, reference, receipt, amount, fee, total }, resolve, reject, waitUntil }
//   "nq-payment-verify"        { submission, resolve, reject, waitUntil }
//   "nq-payment-reject"        { submission, reason, resolve, reject, waitUntil }
// Plain events: "nq-local-payment-cancel", "nq-payment-resubmit" (from the status component's button).
// Fields: `files` is x-modelable on the file-upload; `markDone` marks the picked receipt done (the file stays on the device until you submit).

import { normalizeReference, referenceProblem } from "./local-payments-logic";
import { fillPayment, localPaymentsStrings } from "./local-payments-strings";
import type { Magics, Register } from "./types";

interface MethodConfig {
  fee?: number;
  total?: number;
  limit?: "min" | "max" | null;
  limitMessage?: string;
}

interface Config {
  amount?: number;
  currency?: string;
  receiptRequired?: boolean;
  methodId?: string;
  reference?: string;
  methods?: Record<string, MethodConfig>;
  failed?: string;
  problems?: Record<string, string>;
}

interface UploadItem {
  id: string;
  file: File;
}

type Outcome = { error?: string } | void;

/** Fires a claimable event. Resolves to null when nobody claimed it. */
async function claimable(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<Outcome | null> {
  let claimed = false;
  let settle!: (outcome: Outcome) => void;
  const outcome = new Promise<Outcome>((resolve) => (settle = resolve));
  const full = {
    ...detail,
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
  root.dispatchEvent(new CustomEvent(name, { detail: full, bubbles: true, cancelable: true }));
  return claimed ? outcome : null;
}

interface PaymentsState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  config: Config;
  methodId: string;
  reference: string;
  files: UploadItem[];
  busy: boolean;
  done: boolean;
  touched: boolean;
  error: string;
  refInvalid: boolean;
  refMessage: string;
  receiptInvalid: boolean;
  root: HTMLElement;
  words(): ReturnType<typeof localPaymentsStrings>;
  method(): MethodConfig | undefined;
  checkReference(): void;
  receipt(): File | null;
}

interface QueueRow {
  id: string;
  customer?: string;
  status?: string;
  receiptUrl?: string;
  receiptName?: string;
  [key: string]: unknown;
}

interface QueueState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  config: { failed?: string; rejectDescription?: string };
  busy: string | null;
  error: string;
  rejecting: QueueRow | null;
  reason: string;
  root: HTMLElement;
  words(): ReturnType<typeof localPaymentsStrings>;
  isOpen(row: QueueRow): boolean;
  run(id: string, name: string, detail: Record<string, unknown>): Promise<boolean>;
}

export const localPayments: Register = (Alpine) => {
  Alpine.data("nqLocalPayments", (config: Config = {}) => ({
    config,
    methodId: config.methodId ?? "",
    reference: config.reference ?? "",
    files: [] as UploadItem[],
    busy: false,
    done: false,
    touched: false,
    error: "",
    refInvalid: false,
    refMessage: "",
    receiptInvalid: false,
    root: null as unknown as HTMLElement,
    init(this: PaymentsState) {
      this.root = this.$el;
      this.$watch("reference", () => {
        this.error = "";
        if (this.touched) this.checkReference();
      });
      this.$watch("files", () => {
        if (this.touched) this.receiptInvalid = Boolean(this.config.receiptRequired ?? true) && !this.receipt();
      });
    },
    words(this: PaymentsState) {
      return localPaymentsStrings(this.$nq.locale, { failed: this.config.failed, problems: this.config.problems });
    },
    method(this: PaymentsState) {
      return this.config.methods?.[this.methodId];
    },
    receipt(this: PaymentsState) {
      return this.files[0]?.file ?? null;
    },
    /** The report line below the reference field. */
    checkReference(this: PaymentsState) {
      const problem = referenceProblem(this.reference);
      this.refInvalid = problem !== null;
      this.refMessage = problem ? this.words().problems[problem] : "";
    },
    /** The file stays on the device until you press submit, so it is "done" as soon as it is picked. */
    markDone(this: PaymentsState, event: Event) {
      const { added, controls } = (event as CustomEvent).detail as { added: UploadItem[]; controls: { update(id: string, patch: Record<string, unknown>): void } };
      added.forEach((f) => controls.update(f.id, { status: "done", progress: 100 }));
    },
    async submit(this: PaymentsState) {
      if (this.busy) return;
      this.touched = true;
      const t = this.words();
      const method = this.method();
      this.error = "";
      this.checkReference();
      this.receiptInvalid = Boolean(this.config.receiptRequired ?? true) && !this.receipt();
      if (!method) {
        this.error = t.problems.method;
        return;
      }
      if (method.limit) {
        this.error = method.limitMessage || t.problems[method.limit];
        return;
      }
      if (this.refInvalid || this.receiptInvalid) return;
      this.busy = true;
      try {
        const result = await claimable(this.root, "nq-local-payment-submit", {
          input: {
            methodId: this.methodId,
            reference: normalizeReference(this.reference),
            receipt: this.receipt(),
            amount: this.config.amount ?? 0,
            fee: method.fee ?? 0,
            total: method.total ?? this.config.amount ?? 0,
          },
        });
        if (result && "error" in result) this.error = result.error || t.failed;
        else this.done = true;
      } finally {
        this.busy = false;
      }
    },
    cancel(this: PaymentsState) {
      this.root.dispatchEvent(new CustomEvent("nq-local-payment-cancel", { bubbles: true }));
    },
  }));

  Alpine.data("nqPaymentQueue", (config: { failed?: string; rejectDescription?: string } = {}) => ({
    config,
    busy: null as string | null,
    error: "",
    rejecting: null as QueueRow | null,
    reason: "",
    root: null as unknown as HTMLElement,
    init(this: QueueState) {
      this.root = this.$el;
    },
    words(this: QueueState) {
      return localPaymentsStrings(this.$nq.locale, { failed: this.config.failed, rejectDescription: this.config.rejectDescription });
    },
    isOpen(row: QueueRow) {
      return row.status === "submitted" || row.status === "verifying";
    },
    rejectText(this: QueueState) {
      return fillPayment(this.words().rejectDescription, { who: this.rejecting?.customer ?? "" });
    },
    /** Runs a claimable job for a row; true when it went through. */
    async run(this: QueueState, id: string, name: string, detail: Record<string, unknown>) {
      this.busy = id;
      this.error = "";
      try {
        const result = await claimable(this.root, name, detail);
        if (result && "error" in result) {
          this.error = result.error || this.words().failed;
          return false;
        }
        return true;
      } finally {
        this.busy = null;
      }
    },
    onAction(this: QueueState, event: Event) {
      const { action, row } = (event as CustomEvent).detail as { action: string; row: QueueRow };
      if (action === "receipt") {
        if (row.receiptUrl) window.open(row.receiptUrl, "_blank", "noopener,noreferrer");
      } else if (action === "verify") {
        if (this.isOpen(row)) void this.run(row.id, "nq-payment-verify", { submission: row });
      } else if (action === "reject") {
        if (this.isOpen(row)) {
          this.reason = "";
          this.rejecting = row;
        }
      }
    },
    cancelReject(this: QueueState) {
      if (this.busy === null) this.rejecting = null;
    },
    async confirmReject(this: QueueState) {
      const target = this.rejecting;
      const reason = this.reason.trim();
      if (!target || !reason) return;
      if (await this.run(target.id, "nq-payment-reject", { submission: target, reason })) this.rejecting = null;
    },
  }));
};

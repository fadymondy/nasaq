// nqWallet and friends: the state behind the Blade wallet components.
//
//   <div data-slot="wallet" x-data="nqWallet()" x-on:nq-wallet-open="open($event.detail.dialog)">
//     <div data-slot="wallet-balance" x-data="nqWalletBalance()">… hidden, toggle() …</div>
//     <section data-slot="wallet-transactions" x-data="nqWalletTransactions({ '2026-03-05': ['in'] })">… x-model="dir" on the filter …</section>
//     <div data-slot="wallet-dialog" x-data="nqWalletDialog({ kind, open, currency, min, max, accountId, idle, strings })" x-modelable="isOpen">…</div>
//   </div>
//
// Nothing here moves money. A dialog that passes validation dispatches a bubbling, cancelable event from its root:
//   "nq-wallet-topup"   { amount, sourceId,      resolve(result?), reject(message), waitUntil(promise) }
//   "nq-wallet-payout"  { amount, destinationId, resolve(result?), reject(message), waitUntil(promise) }
// Nobody claimed it (no waitUntil / resolve / reject call, no preventDefault): the dialog closes at once. Otherwise it stays
// busy until the outcome: resolve() closes it; resolve({ error }) / reject(message) / a rejected promise shows the error.
// A window event "nq-wallet-error" ({ message }) also shows an error while a dialog is open.

// The wrapper keeps its open flag in `isOpen` and its error flag in `hasProblem`: x-model expressions are read in the scope of the element that carries them,
// so the inner dialog and field (which have their own `open` / `invalid`) must not see the same names.
import type { Magics, Register } from "./types";

type Money = { $nq: { money(amount: number, currency?: string): string; t(en: string, ar: string): string } };

interface Strings {
  confirm: string;
  invalid: string;
  min: string;
  max: string;
  failed: string;
}

interface DialogConfig {
  kind: "topup" | "payout";
  open?: boolean;
  currency?: string;
  min?: number;
  max?: number | null;
  accountId?: string | null;
  idle: string;
  strings: Strings;
}

export interface WalletOutcome {
  error?: string;
}

const DIGITS: Record<string, string> = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9" };

/** Reads what people type into an amount field ("1,250.50", "١٢٥٠٫٥", "1250,5"). Null when it is not a positive number. */
function parseAmount(input: string): number | null {
  let text = input
    .replace(/[٠-٩۰-۹]/g, (d) => DIGITS[d] ?? d)
    .replace("٫", ".")
    .replace("٬", ",")
    .replace(/[\s ]/g, "");
  if (!text) return null;
  text = /^\d+,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Math.round(Number(text) * 100) / 100;
  return value > 0 ? value : null;
}

function checkAmount(value: number | null, min: number, max: number): "invalid" | "min" | "max" | null {
  if (value === null) return "invalid";
  if (value < min) return "min";
  if (value > max) return "max";
  return null;
}

interface BalanceState {
  hidden: boolean;
}

interface TransactionsState {
  dir: string[];
  prev: string;
  map: Record<string, string[]>;
  rowShown(dir: string): boolean;
  shown(key: string): boolean;
}

interface DialogState extends Magics, Money {
  isOpen: boolean;
  text: string;
  accountId: string;
  problem: string;
  hasProblem: boolean;
  busy: boolean;
  config: DialogConfig;
  root: HTMLElement;
  amount: number | null;
  setProblem(message: string): void;
  clearProblem(): void;
  fail(message?: string): void;
}

export const wallet: Register = (Alpine) => {
  // The root: which dialog is open. The balance buttons dispatch "nq-wallet-open" with { dialog: "topup" | "payout" }.
  Alpine.data("nqWallet", () => ({
    topupOpen: false,
    payoutOpen: false,
    open(dialog?: string) {
      if (dialog === "topup") this.topupOpen = true;
      else if (dialog === "payout") this.payoutOpen = true;
    },
  }));

  // The balance card: the eye button hides the figure.
  Alpine.data("nqWalletBalance", () => ({
    hidden: false,
    toggle(this: BalanceState) {
      this.hidden = !this.hidden;
    },
  }));

  // The money in / out filter. `dir` is the toggle-group value (always one of all | in | out); `map` is day key -> row directions.
  Alpine.data("nqWalletTransactions", (dirs: Record<string, string[]> | string[] = {}) => ({
    dir: ["all"] as string[],
    prev: "all",
    map: (Array.isArray(dirs) ? {} : dirs) as Record<string, string[]>,
    init(this: TransactionsState & Magics) {
      this.$watch<string[]>("dir", (value) => {
        if (value && value.length) this.prev = String(value[0]);
        else this.dir = [this.prev];
      });
    },
    rowShown(this: TransactionsState, dir: string) {
      const v = this.dir?.[0] ?? "all";
      return v === "all" || v === dir;
    },
    shown(this: TransactionsState, key: string) {
      return (this.map[key] ?? []).some((d) => this.rowShown(d));
    },
    get empty(): boolean {
      const self = this as unknown as TransactionsState;
      const keys = Object.keys(self.map);
      return keys.length === 0 || !keys.some((k) => self.shown(k));
    },
  }));

  // The top-up / payout dialog (state behind wallet.amount-dialog).
  Alpine.data("nqWalletDialog", (config: DialogConfig) => ({
    isOpen: Boolean(config.open),
    text: "",
    accountId: config.accountId ?? "",
    problem: "",
    hasProblem: false,
    busy: false,
    config,
    root: null as unknown as HTMLElement,
    init(this: DialogState) {
      this.root = this.$el;
      this.$watch<boolean>("isOpen", (value) => {
        if (value) return;
        if (this.busy) {
          // A running request keeps the dialog open.
          this.isOpen = true;
          return;
        }
        this.text = "";
        this.setProblem("");
        this.accountId = this.config.accountId ?? "";
      });
    },
    get amount(): number | null {
      return parseAmount((this as unknown as DialogState).text);
    },
    get label(): string {
      const self = this as unknown as DialogState;
      const amount = self.amount;
      if (amount === null) return self.config.idle;
      return self.config.strings.confirm.replace("{amount}", self.$nq.money(amount, self.config.currency));
    },
    setProblem(this: DialogState, message: string) {
      this.problem = message;
      this.hasProblem = message !== "";
    },
    clearProblem(this: DialogState) {
      if (this.problem) this.setProblem("");
    },
    preset(this: DialogState, n: number) {
      this.text = String(n);
      this.clearProblem();
    },
    close(this: DialogState) {
      if (!this.busy) this.isOpen = false;
    },
    fail(this: DialogState, message?: string) {
      if (!this.isOpen) return;
      this.busy = false;
      this.setProblem(message || this.config.strings.failed);
    },
    async submit(this: DialogState) {
      if (this.busy) return;
      const { strings, currency, min = 0.01, max } = this.config;
      const amount = this.amount;
      const found = checkAmount(amount, min, max ?? Number.POSITIVE_INFINITY);
      if (found || amount === null) {
        this.setProblem(
          found === "min" ? strings.min.replace("{amount}", this.$nq.money(min, currency)) : found === "max" ? strings.max.replace("{amount}", this.$nq.money(max ?? 0, currency)) : strings.invalid,
        );
        return;
      }
      this.setProblem("");

      let claimed = false;
      let settle!: (outcome: WalletOutcome | void) => void;
      const outcome = new Promise<WalletOutcome | void>((resolve) => (settle = resolve));
      const detail: Record<string, unknown> = {
        amount,
        [this.config.kind === "topup" ? "sourceId" : "destinationId"]: this.accountId,
        resolve(result?: WalletOutcome) {
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
            (result) => settle(result && typeof result === "object" ? (result as WalletOutcome) : undefined),
            (e) => settle({ error: e instanceof Error && e.message ? e.message : typeof e === "string" ? e : undefined }),
          );
        },
      };
      const event = new CustomEvent(this.config.kind === "topup" ? "nq-wallet-topup" : "nq-wallet-payout", { detail, bubbles: true, cancelable: true });
      this.root.dispatchEvent(event);
      if (!claimed && !event.defaultPrevented) {
        this.isOpen = false;
        return;
      }

      this.busy = true;
      const result = await outcome;
      this.busy = false;
      if (result && "error" in result) this.setProblem(result.error || strings.failed);
      else this.isOpen = false;
    },
  }));
};

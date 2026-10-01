// nqCashCollect: the courier's cash-on-delivery sheet. The markup is the React CashCollect's (see the Blade component):
// the breakdown and the quick-amount buttons are rendered by the server, the received amount, the status line and the
// confirm button live here.
//
//   <section data-slot="cash-collect" x-data="nqCashCollect({ due: 10000, currency: 'USD', locale: 'en', labels: {…} })"
//            x-modelable="collected" :data-state="state">
//     <x-nq::currency-input x-model="collected" :min="0" />
//     <button :aria-pressed="collected === 10000" @click="pick(10000)">…</button>
//     <p role="status" data-slot="cash-status" :data-tone="tone">… <span x-text="statusText"></span> <bdi x-text="statusAmount"></bdi></p>
//     <button :disabled="!canConfirm" @click="confirm()">Confirm cash collected</button>
//   </section>
//
// Amounts are integer minor units (cents, halalas). `collected` is x-modelable (x-model="received", wire:model) and null
// while the field is empty. `state` is unpaid | short | exact | over; `tone` is idle | short | over | exact (what the status
// line is styled by). Confirm dispatches the bubbling `nq-cash-collect-confirm` with { collectedMinor }; every change of
// the amount dispatches `nq-cash-collect-change` with { collectedMinor }.
//
// Options: due (minor units, order total plus fee minus prepaid), currency, locale, collected (initial), allowShort,
// labels ({ change, shortBy, exact, unpaid }).
//
// The money formatting is the same as the React package's delivery helpers, inlined because an Alpine module cannot
// import a sibling helper (every file in this folder is a registered component).

import type { Magics, Register } from "./types";

interface CashOptions {
  due?: number;
  currency?: string;
  locale?: string;
  collected?: number | null;
  allowShort?: boolean;
  labels?: Partial<Record<"change" | "shortBy" | "exact" | "unpaid", string>>;
}

type CashState = "unpaid" | "short" | "exact" | "over";

interface CashCollectState extends Magics {
  due: number;
  currency: string;
  locale: string;
  allowShort: boolean;
  collected: number | null;
  labels: Record<string, string>;
  got: number;
  state: CashState;
  tone: "idle" | "short" | "over" | "exact";
  statusText: string;
  statusAmount: string;
  canConfirm: boolean;
  money(minor: number): string;
}

const LATIN = /[A-Za-z]/;

function minorFactor(currency: string): number {
  try {
    return 10 ** (new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2);
  } catch {
    return 100;
  }
}

function formatMoney(minor: number, currency: string, locale: string): string {
  const code = currency.toUpperCase();
  const factor = minorFactor(code);
  const lang = locale.startsWith("ar") ? "ar-u-nu-latn" : `${locale}-u-nu-latn`;
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(lang, { style: "currency", currency: code });
  } catch {
    format = new Intl.NumberFormat("en", { style: "currency", currency: "USD" });
  }
  return format
    .formatToParts(minor / factor)
    .map((part) => (part.type === "currency" && LATIN.test(part.value) ? `⁦${part.value}⁩` : part.value))
    .join("");
}

export const cashCollect: Register = (Alpine) => {
  Alpine.data("nqCashCollect", (options: CashOptions = {}) => ({
    due: Math.max(0, Math.round(options.due ?? 0)),
    currency: (options.currency ?? "USD").toUpperCase(),
    locale: options.locale ?? "en",
    allowShort: options.allowShort === true,
    collected: (options.collected ?? null) as number | null,
    labels: { change: "Change to return", shortBy: "Still owed", exact: "Exact amount", unpaid: "Nothing received yet", ...options.labels },
    init(this: CashCollectState) {
      this.$watch("collected", (value: number | null) => {
        this.$dispatch("nq-cash-collect-change", { collectedMinor: value });
      });
    },
    get got(): number {
      return Math.max(0, Math.round((this as unknown as CashCollectState).collected ?? 0));
    },
    get state(): CashState {
      const s = this as unknown as CashCollectState;
      if (s.collected == null || s.got === 0) return s.due === 0 ? "exact" : "unpaid";
      return s.got < s.due ? "short" : s.got === s.due ? "exact" : "over";
    },
    get tone(): "idle" | "short" | "over" | "exact" {
      const s = this as unknown as CashCollectState;
      if (s.state === "short") return "short";
      if (s.state === "over") return "over";
      return s.state === "exact" && s.got > 0 ? "exact" : "idle";
    },
    get statusText(): string {
      const s = this as unknown as CashCollectState;
      if (s.tone === "over") return `${s.labels.change}: `;
      if (s.tone === "short") return `${s.labels.shortBy}: `;
      return s.tone === "exact" ? (s.labels.exact as string) : (s.labels.unpaid as string);
    },
    get statusAmount(): string {
      const s = this as unknown as CashCollectState;
      if (s.tone === "over") return s.money(s.got - s.due);
      if (s.tone === "short") return s.money(s.due - s.got);
      return "";
    },
    get canConfirm(): boolean {
      const s = this as unknown as CashCollectState;
      return s.due === 0 || (s.got > 0 && (s.allowShort || s.got >= s.due));
    },
    money(this: CashCollectState, minor: number): string {
      return formatMoney(minor, this.currency, this.locale);
    },
    pick(this: CashCollectState, minor: number) {
      this.collected = minor;
    },
    confirm(this: CashCollectState) {
      if (!this.canConfirm) return;
      this.$dispatch("nq-cash-collect-confirm", { collectedMinor: this.due === 0 ? 0 : this.got });
    },
  }));
};

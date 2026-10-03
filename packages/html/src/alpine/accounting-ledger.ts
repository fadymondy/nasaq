// The accounting ledger: four Alpine components over the same double-entry maths (accounting-ledger-logic.ts), all in integer minor units.
//
//   nqAccountingChart({ accounts, entries, currency, locale, selectedId, canSelect, canAddChild, canArchive, t })
//     events: "nq-select-account" { account }, "nq-add-child" { account }, "nq-archive-change" { account, archived } (cancelable: a
//     handler that calls preventDefault() keeps the row as it is, otherwise the archive flag flips locally)
//   nqAccountingEntry({ accounts, currency, locale, number, date, memo, lines, readOnly, canSaveDraft, t })
//     events: "nq-change" { value }, "nq-accounting-post" and "nq-accounting-draft" { value, waitUntil, resolve, reject }
//     Nobody claiming a post event: the entry resets at once. A claimed one keeps the editor busy; a rejection keeps the entry.
//   nqAccountingTrial({ accounts, entries, currency, locale, asOf, includeZero, canSelect, t })    event: "nq-select-account" { account }
//   nqAccountingStatement({ account, entries, currency, locale, opening, t })

import {
  accountingBalances,
  accountingEntryProblems,
  accountingEntryTotals,
  accountingNormalSide,
  accountingStatement,
  accountingTree,
  accountingTrialBalance,
  type AccountingAccount,
  type AccountingEntry,
  type AccountingEntryProblem,
} from "./accounting-ledger-logic";
import { currencyDecimals } from "./line-item-logic";
import type { Magics, Register } from "./types";

interface Common {
  currency: string;
  locale?: string;
  t: Record<string, string>;
}

const latin = (locale?: string) => new Intl.Locale(locale ?? "en", { numberingSystem: "latn" }).toString();
const figure = (c: Common, minor: number, blank = false): string => {
  if (blank && minor === 0) return "–";
  const d = currencyDecimals(c.currency);
  return new Intl.NumberFormat(latin(c.locale), { minimumFractionDigits: d, maximumFractionDigits: d }).format(minor / 10 ** d);
};
const dateText = (c: Common, iso: string): string => new Intl.DateTimeFormat(latin(c.locale), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const fire = (el: HTMLElement, name: string, detail: Record<string, unknown>, cancelable = false) => el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable, detail }));
const TYPE_VARIANT: Record<string, string> = { asset: "info", liability: "warning", equity: "neutral", revenue: "success", expense: "danger" };

interface EntryLine {
  id: string;
  accountId: string;
  memo: string;
  /** Minor units, null while empty. */
  debit: number | null;
  credit: number | null;
}
interface EntryConfig extends Common {
  accounts: AccountingAccount[];
  number?: string | null;
  date?: string;
  memo?: string;
  lines?: { id?: string; accountId?: string; memo?: string; debit?: number; credit?: number }[];
  readOnly?: boolean;
  canSaveDraft?: boolean;
  today?: string;
}

const PROBLEM_KEY: Record<AccountingEntryProblem, string> = {
  "few-lines": "problemFewLines",
  "no-account": "problemNoAccount",
  "both-sides": "problemBothSides",
  negative: "problemNegative",
  unbalanced: "problemUnbalanced",
  zero: "problemZero",
};
let counter = 0;
const lineId = () => `jl-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const accountingLedger: Register = (Alpine) => {
  Alpine.data("nqAccountingChart", (config: Common & { accounts: AccountingAccount[]; entries?: AccountingEntry[]; selectedId?: string | null }) => ({
    accounts: config.accounts.map((a) => ({ ...a })),
    entries: config.entries ?? [],
    selectedId: config.selectedId ?? null,
    t: config.t,
    collapsed: [] as string[],
    get tree() {
      return accountingTree(this.accounts);
    },
    get balances() {
      return accountingBalances(this.accounts, this.entries, { rollup: true });
    },
    balanceOf(id: string): string {
      return figure(config, this.balances.get(id)?.balance ?? 0);
    },
    isHidden(a: AccountingAccount): boolean {
      const byId = new Map<string, AccountingAccount>(this.accounts.map((x: AccountingAccount) => [x.id, x]));
      let p = a.parentId ? byId.get(a.parentId) : undefined;
      const seen = new Set<string>();
      while (p && !seen.has(p.id)) {
        if (this.collapsed.includes(p.id)) return true;
        seen.add(p.id);
        p = p.parentId ? byId.get(p.parentId) : undefined;
      }
      return false;
    },
    isCollapsed(id: string): boolean {
      return this.collapsed.includes(id);
    },
    toggle(id: string) {
      this.collapsed = this.collapsed.includes(id) ? this.collapsed.filter((x: string) => x !== id) : [...this.collapsed, id];
    },
    typeVariant: (type: string) => TYPE_VARIANT[type] ?? "neutral",
    typeLabel(type: string): string {
      return this.t[type] ?? type;
    },
    select(this: Magics & { selectedId: string | null }, a: AccountingAccount) {
      fire(this.$root, "nq-select-account", { account: a });
    },
    addChild(this: Magics, a: AccountingAccount) {
      fire(this.$root, "nq-add-child", { account: a });
    },
    archiveLabel(a: AccountingAccount): string {
      return a.archived ? this.t.restore : this.t.archive;
    },
    toggleArchive(this: Magics & { accounts: AccountingAccount[] }, a: AccountingAccount) {
      const archived = !a.archived;
      const event = new CustomEvent("nq-archive-change", { bubbles: true, cancelable: true, detail: { account: a, archived } });
      this.$root.dispatchEvent(event);
      if (!event.defaultPrevented) this.accounts = this.accounts.map((x) => (x.id === a.id ? { ...x, archived } : x));
    },
    fig: (minor: number, blank = false) => figure(config, minor, blank),
  }));

  Alpine.data("nqAccountingTrial", (config: Common & { accounts: AccountingAccount[]; entries?: AccountingEntry[]; asOf?: string | null; includeZero?: boolean }) => ({
    t: config.t,
    get tb() {
      return accountingTrialBalance(config.accounts, config.entries ?? [], { asOf: config.asOf ?? undefined, includeZero: config.includeZero });
    },
    get difference(): number {
      return Math.abs(this.tb.debit - this.tb.credit);
    },
    asOfText: config.asOf ? dateText(config, config.asOf) : "",
    select(this: Magics, a: AccountingAccount) {
      fire(this.$root, "nq-select-account", { account: a });
    },
    fig: (minor: number, blank = false) => figure(config, minor, blank),
  }));

  Alpine.data("nqAccountingStatement", (config: Common & { account: AccountingAccount; entries?: AccountingEntry[]; opening?: number }) => ({
    t: config.t,
    opening: config.opening ?? 0,
    get rows() {
      return accountingStatement(config.account, config.entries ?? [], { opening: this.opening });
    },
    sideLabel: config.t[accountingNormalSide(config.account.type)] ?? "",
    fig: (minor: number, blank = false) => figure(config, minor, blank),
    date: (iso: string) => dateText(config, iso),
  }));

  Alpine.data("nqAccountingEntry", (config: EntryConfig) => {
    const blank = (): EntryLine => ({ id: lineId(), accountId: "", memo: "", debit: null, credit: null });
    const fromConfig = (): EntryLine[] =>
      config.lines?.length
        ? config.lines.map((l, i) => ({ id: l.id ?? `jl-${i + 1}`, accountId: l.accountId ?? "", memo: l.memo ?? "", debit: l.debit || null, credit: l.credit || null }))
        : [blank(), blank()];
    const today = config.today ?? new Date().toISOString().slice(0, 10);
    return {
      accounts: config.accounts,
      t: config.t,
      number: config.number ?? "",
      readOnly: Boolean(config.readOnly),
      canSaveDraft: Boolean(config.canSaveDraft),
      date: config.date ?? today,
      memo: config.memo ?? "",
      lines: fromConfig(),
      tried: false,
      busy: "" as "" | "post" | "draft",
      prev: {} as Record<string, [number, number]>,
      init(this: Magics & { lines: EntryLine[]; prev: Record<string, [number, number]>; value: unknown }) {
        this.lines.forEach((l) => (this.prev[l.id] = [l.debit ?? 0, l.credit ?? 0]));
        // Typing on one side of a line clears the other.
        this.$watch("lines", () => {
          for (const l of this.lines) {
            const [pd, pc] = this.prev[l.id] ?? [0, 0];
            if ((l.debit ?? 0) > 0 && (l.credit ?? 0) > 0) {
              if ((l.debit ?? 0) !== pd) l.credit = null;
              else if ((l.credit ?? 0) !== pc) l.debit = null;
            }
            this.prev[l.id] = [l.debit ?? 0, l.credit ?? 0];
          }
        });
        const emit = () => fire(this.$root, "nq-change", { value: this.value });
        this.$watch("lines", emit);
        this.$watch("date", emit);
        this.$watch("memo", emit);
      },
      get plain() {
        return this.lines.map((l: EntryLine) => ({ accountId: l.accountId, memo: l.memo || undefined, debit: l.debit ?? 0, credit: l.credit ?? 0 }));
      },
      get value() {
        return { date: this.date, memo: this.memo, lines: this.lines.map((l: EntryLine) => ({ id: l.id, accountId: l.accountId, memo: l.memo, debit: l.debit ?? 0, credit: l.credit ?? 0 })) };
      },
      get totals() {
        return accountingEntryTotals(this.plain);
      },
      get problems(): string[] {
        return accountingEntryProblems(this.plain).map((p) => this.t[PROBLEM_KEY[p]] ?? p);
      },
      get canPost(): boolean {
        return this.totals.balanced && this.problems.length === 0 && this.busy !== "draft";
      },
      get status(): string {
        return this.totals.balanced ? this.t.balanced : this.t.outOfBalance;
      },
      get statusVariant(): string {
        return this.totals.balanced ? "success" : this.totals.debit + this.totals.credit === 0 ? "neutral" : "danger";
      },
      get difference(): number {
        return Math.abs(this.totals.difference);
      },
      get isBlank(): boolean {
        return !this.totals.balanced && this.totals.debit + this.totals.credit === 0;
      },
      get isOff(): boolean {
        return !this.totals.balanced && this.totals.debit + this.totals.credit !== 0;
      },
      canRemove(): boolean {
        return this.lines.length > 2;
      },
      noAccount(l: EntryLine): boolean {
        return this.tried && !l.accountId && ((l.debit ?? 0) !== 0 || (l.credit ?? 0) !== 0);
      },
      add() {
        this.lines = [...this.lines, blank()];
      },
      remove(id: string) {
        if (this.lines.length > 2) this.lines = this.lines.filter((l: EntryLine) => l.id !== id);
      },
      duplicate(index: number) {
        const src = this.lines[index] as EntryLine;
        this.lines = [...this.lines.slice(0, index + 1), { ...src, id: lineId() }, ...this.lines.slice(index + 1)];
      },
      canBalance(l: EntryLine): boolean {
        return !(this.totals.difference === 0 && (l.debit ?? 0) + (l.credit ?? 0) > 0);
      },
      balanceLine(id: string) {
        const others = accountingEntryTotals(this.plain.filter((_: unknown, i: number) => this.lines[i].id !== id));
        const diff = others.debit - others.credit;
        const l = this.lines.find((x: EntryLine) => x.id === id) as EntryLine;
        l.debit = diff > 0 ? null : diff === 0 ? null : -diff;
        l.credit = diff > 0 ? diff : null;
      },
      async submit(this: Magics & Record<string, any>, kind: "post" | "draft") { // eslint-disable-line @typescript-eslint/no-explicit-any
        this.tried = true;
        if (kind === "post" && !(this.totals.balanced && this.problems.length === 0)) return;
        const clean = { ...this.value, lines: this.value.lines.filter((l: { accountId: string; debit: number; credit: number }) => l.accountId || l.debit || l.credit) };
        let claimed: Promise<unknown> | null = null;
        const claim = (p: Promise<unknown>) => (claimed = claimed ?? p);
        const name = kind === "post" ? "nq-accounting-post" : "nq-accounting-draft";
        this.$root.dispatchEvent(
          new CustomEvent(name, {
            bubbles: true,
            cancelable: true,
            detail: {
              value: clean,
              waitUntil: (p: Promise<unknown>) => void claim(Promise.resolve(p)),
              resolve: () => void claim(Promise.resolve()),
              reject: (message?: string) => void claim(Promise.reject(new Error(message ?? ""))),
            },
          }),
        );
        this.busy = kind;
        try {
          if (claimed) await claimed;
          if (kind === "post") {
            this.memo = "";
            this.lines = [blank(), blank()];
            this.prev = {};
            this.tried = false;
          }
        } catch {
          // The host refused: keep the entry as it is.
        } finally {
          this.busy = "";
        }
      },
      fig: (minor: number, blank = false) => figure(config, minor, blank),
    };
  });
};

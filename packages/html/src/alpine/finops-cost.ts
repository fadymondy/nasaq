// nqFinopsCost: the server and item tables, the add-item dialog and the remove confirm of the FinOps cost page (<x-nq::finops-cost>).
// The tiles, the budget meter and the category table are derived from the two row lists, so they recompute after every add, remove or plan change. The history chart is static markup (a prop in React too).
//
//   <div x-data="nqFinopsCost({ servers, items, currency, labels })"
//        @add-item="$event.detail.wait(…)" @remove-item="$event.detail.wait(…)" @change-plan="$event.detail.wait(…)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   add-item     { name, category, amount, period, wait }  resolve, or resolve { id } for the row id, or { error } (shown in the dialog)
//   remove-item  { id, wait }                              runs after the confirm; resolve, or resolve { error } (shown above the tables)
//   change-plan  { id, plan: { name, monthlyPrice }, wait }  resolve, or resolve { error }; the row then shows the new plan and no hint
// A rejected promise, or nobody listening, shows the generic error.

import { monthlyEquivalent, roundMoney, validateLineItem, type LineItemPeriod } from "./finops-cost-logic";
import type { Magics, Register } from "./types";

interface ServerRow {
  id: string;
  name: string;
  plan: string;
  region: string;
  planText: string;
  price: number;
  cpu: number;
  memory: number;
  disk: number;
  hint: string;
  hintDetail: string;
  /** What a downsize saves a month (0 for any other hint). */
  hintAmount: number;
  changeTo: string | null;
  changeToPrice: number | null;
}

interface ItemRow {
  id: string;
  name: string;
  category: string;
  period: LineItemPeriod;
  amount: number;
  monthly: number | null;
}

interface FinopsConfig {
  servers: ServerRow[];
  items: ItemRow[];
  currency: string;
  budget: number | null;
  previousTotal: number | null;
  labels: {
    genericError: string;
    nameRequired: string;
    amountInvalid: string;
    /** "Remove {name}?" */
    removeTitle: string;
    vsPrevious: string;
    was: string;
    /** "{used} of {budget}" */
    budgetOf: string;
    serversCategory: string;
    uncategorised: string;
  };
}

type Outcome = ({ id?: string; error?: string } | void) | undefined;

interface FinopsState extends Magics {
  config: FinopsConfig;
  serverRows: ServerRow[];
  itemRows: ItemRow[];
  notice: string | null;
  addOpen: boolean;
  name: string;
  category: string;
  amount: string;
  period: LineItemPeriod;
  nameInvalid: boolean;
  amountInvalid: boolean;
  addError: string | null;
  adding: boolean;
  removeOpen: boolean;
  removing: ItemRow | null;
  alive: boolean;
  root: HTMLElement | null;
  catAll: boolean;
  $nq: { money(value: number, currency?: string): string; locale: string };
  fmt(value: number): string;
  pct(value: number, plus?: boolean): string;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(name: string, detail: Record<string, unknown>, onOk: () => void): Promise<void>;
}

let seq = 0;

export const finopsCost: Register = (Alpine) => {
  Alpine.data("nqFinopsCost", (config: FinopsConfig) => ({
    config,
    serverRows: config.servers.map((r) => ({ ...r })),
    itemRows: config.items.map((r) => ({ ...r })),
    notice: null as string | null,
    addOpen: false,
    name: "",
    category: "",
    amount: "",
    period: "monthly" as LineItemPeriod,
    nameInvalid: false,
    amountInvalid: false,
    addError: null as string | null,
    adding: false,
    removeOpen: false,
    removing: null as ItemRow | null,
    alive: true,
    root: null as HTMLElement | null,
    catAll: false,
    init(this: FinopsState) {
      this.root = this.$el;
      // The server-rendered category rows give way to the reactive ones.
      this.root.querySelectorAll("[data-nq-ssr]").forEach((n) => n.remove());
      this.$watch("removeOpen", (open: boolean) => {
        if (!open) this.removing = null;
      });
    },
    destroy(this: FinopsState) {
      this.alive = false;
    },
    fmt(this: FinopsState, value: number): string {
      return this.$nq.money(value, this.config.currency);
    },
    pct(this: FinopsState, value: number, plus = false): string {
      const locale = this.$nq.locale;
      const text = new Intl.NumberFormat(`${locale}-u-nu-latn`, { style: "percent", maximumFractionDigits: 1 }).format(value);
      return plus && value > 0 && !text.startsWith("+") ? `+${text}` : text;
    },
    get serverTotal(): number {
      const s = this as unknown as FinopsState;
      return roundMoney(s.serverRows.reduce((sum, r) => sum + r.price, 0));
    },
    get itemTotal(): number {
      const s = this as unknown as FinopsState;
      return roundMoney(s.itemRows.reduce((sum, r) => sum + monthlyEquivalent(r), 0));
    },
    get total(): number {
      const s = this as unknown as FinopsState & { serverTotal: number; itemTotal: number };
      return roundMoney(s.serverTotal + s.itemTotal);
    },
    get savings(): number {
      const s = this as unknown as FinopsState;
      return roundMoney(s.serverRows.reduce((sum, r) => (r.hint === "downsize" ? sum + r.hintAmount : sum), 0));
    },
    /** Change of the total against last month, as a fraction; null with nothing to compare. */
    get delta(): number | null {
      const s = this as unknown as FinopsState & { total: number };
      const prev = s.config.previousTotal;
      if (prev === null || prev === undefined) return null;
      if (prev === 0) return s.total === 0 ? 0 : null;
      return (s.total - prev) / Math.abs(prev);
    },
    get trend(): "up" | "down" | "flat" {
      const d = (this as unknown as { delta: number | null }).delta;
      return d === null || d === 0 ? "flat" : d > 0 ? "up" : "down";
    },
    /** A cost: up is bad. */
    get tone(): string {
      const t = (this as unknown as { trend: string }).trend;
      return t === "flat" ? "neutral" : t === "up" ? "negative" : "positive";
    },
    get toneText(): string {
      const t = (this as unknown as { tone: string }).tone;
      return t === "positive" ? "text-nq-success-text" : t === "negative" ? "text-nq-danger-text" : "text-muted-foreground";
    },
    get deltaText(): string {
      const s = this as unknown as FinopsState & { delta: number | null };
      return s.delta === null ? "" : s.pct(s.delta, true);
    },
    get wasText(): string {
      const s = this as unknown as FinopsState;
      const prev = s.config.previousTotal;
      return prev === null || prev === undefined ? "" : `${s.config.labels.vsPrevious} · ${s.config.labels.was} ${s.fmt(prev)}`;
    },
    get budgetFraction(): number {
      const s = this as unknown as FinopsState & { total: number };
      return s.config.budget ? s.total / s.config.budget : 0;
    },
    get budgetWidth(): number {
      const f = (this as unknown as { budgetFraction: number }).budgetFraction;
      return Math.round(Math.max(0, Math.min(1, f)) * 100 * 10000) / 10000;
    },
    get budgetTone(): string {
      const f = (this as unknown as { budgetFraction: number }).budgetFraction;
      return f >= 1 ? "danger" : f >= 0.9 ? "warning" : "default";
    },
    get budgetState(): "under" | "near" | "over" {
      const s = this as unknown as FinopsState & { total: number };
      const b = s.config.budget;
      if (!b) return "under";
      return s.total > b ? "over" : s.total >= b * 0.9 ? "near" : "under";
    },
    get budgetText(): string {
      const s = this as unknown as FinopsState & { total: number };
      return s.config.labels.budgetOf.replace("{used}", s.fmt(s.total)).replace("{budget}", s.fmt(s.config.budget ?? 0));
    },
    /** Monthly cost per category, largest first, with the bar width and share. */
    get categories(): { id: string; label: string; value: number; text: string; share: string; width: number }[] {
      const s = this as unknown as FinopsState & { serverTotal: number };
      const map = new Map<string, number>();
      if (s.serverTotal > 0) map.set(s.config.labels.serversCategory, s.serverTotal);
      for (const i of s.itemRows) {
        const m = monthlyEquivalent(i);
        if (m <= 0) continue;
        const key = i.category?.trim() || s.config.labels.uncategorised;
        map.set(key, roundMoney((map.get(key) ?? 0) + m));
      }
      const rows = [...map].map(([label, value]) => ({ id: label, label, value })).sort((a, b) => b.value - a.value);
      const sum = rows.reduce((t, r) => t + r.value, 0);
      const max = rows[0]?.value ?? 0;
      return rows.map((r) => ({ ...r, text: s.fmt(r.value), share: s.pct(sum > 0 ? r.value / sum : 0), width: Math.round((max > 0 ? Math.max(2, (r.value / max) * 100) : 0) * 10000) / 10000 }));
    },
    get removeTitle(): string {
      const s = this as unknown as FinopsState;
      return s.removing ? s.config.labels.removeTitle.replace("{name}", s.removing.name) : "";
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: FinopsState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    openAdd(this: FinopsState) {
      this.name = "";
      this.category = "";
      this.amount = "";
      this.period = "monthly";
      this.nameInvalid = false;
      this.amountInvalid = false;
      this.addError = null;
      this.addOpen = true;
    },
    async submitAdd(this: FinopsState) {
      if (this.adding) return;
      const check = validateLineItem({ name: this.name, amount: this.amount });
      if (!check.ok) {
        this.nameInvalid = check.problems.includes("name");
        this.amountInvalid = check.problems.includes("amount");
        return;
      }
      const input = { name: this.name.trim(), category: this.category.trim(), amount: check.amount, period: this.period };
      this.adding = true;
      this.addError = null;
      try {
        const result = await this.ask("add-item", input);
        if (!this.alive) return;
        if (result && result.error !== undefined) {
          this.addError = result.error;
          return;
        }
        const monthly = input.period === "once" ? null : roundMoney(monthlyEquivalent(input));
        this.itemRows = [...this.itemRows, { id: (result && result.id) || `new-${++seq}`, ...input, monthly }];
        this.addOpen = false;
      } catch {
        if (this.alive) this.addError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.adding = false;
      }
    },
    /** A page-level action: ask the host, show an error as the notice, or apply the success. */
    async run(this: FinopsState, name: string, detail: Record<string, unknown>, onOk: () => void) {
      this.notice = null;
      try {
        const result = await this.ask(name, detail);
        if (!this.alive) return;
        if (result && result.error !== undefined) this.notice = result.error;
        else onOk();
      } catch {
        if (this.alive) this.notice = this.config.labels.genericError;
      }
    },
    /** Row actions from the tables' menus. */
    onAction(this: FinopsState, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      if (action === "remove") {
        const item = this.itemRows.find((r) => r.id === row.id);
        if (!item) return;
        this.removing = item;
        this.removeOpen = true;
      } else if (action === "change-plan" || action.startsWith("change-plan-")) {
        const server = this.serverRows.find((r) => r.id === row.id);
        if (!server || !server.changeTo) return;
        const plan = { name: server.changeTo, monthlyPrice: server.changeToPrice ?? server.price };
        void this.run("change-plan", { id: server.id, plan }, () => {
          this.serverRows = this.serverRows.map((r) =>
            r.id === server.id
              ? { ...r, plan: plan.name, planText: plan.name + (r.region ? ` · ${r.region}` : ""), price: plan.monthlyPrice, hint: "ok", hintDetail: "", hintAmount: 0, changeTo: null, changeToPrice: null }
              : r,
          );
        });
      }
    },
    confirmRemove(this: FinopsState) {
      const item = this.removing;
      if (!item) return;
      void this.run("remove-item", { id: item.id }, () => {
        this.itemRows = this.itemRows.filter((r) => r.id !== item.id);
      });
    },
  }));
};


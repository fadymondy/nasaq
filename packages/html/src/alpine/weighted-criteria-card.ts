// nqWeightedCriteriaCard: a human-in-the-loop step for an assistant. The agent suggests criteria, the person switches each on
// or off, sets Low / Medium / High, adds their own and confirms. The markup is the React WeightedCriteriaCard's (see the
// Blade component); the rows are rendered here from `criteria`.
//
//   <div data-slot="weighted-criteria-card" x-data="nqWeightedCriteriaCard([{ id: 'price', label: 'Price', weight: 'high', enabled: true }], { allowCustom: true })"
//        x-modelable="criteria" :data-sent="sent ? '' : undefined">
//     <template x-for="c in criteria" :key="c.id"> <li data-slot="weighted-criterion" :data-enabled="c.enabled ? '' : undefined"> … </li> </template>
//   </div>
//
// `criteria` is x-modelable. Confirm dispatches the bubbling `nq-weighted-criteria-accept` with { criteria, promise? }: a listener may
// set `event.detail.promise` (a Promise, or one resolving to { error }) to keep the card busy; a rejection or { error } shows an alert,
// otherwise the card locks and shows Sent. Every change dispatches `nq-weighted-criteria-change` with { criteria }.
// Options: allowCustom, showShares, disabled, labels ({ include, weight, remove, count, failed } with {label} / {on} / {all} placeholders).

import type { Magics, Register } from "./types";

type Weight = "low" | "medium" | "high";
const WEIGHTS: Weight[] = ["low", "medium", "high"];
const POINTS: Record<Weight, number> = { low: 1, medium: 2, high: 3 };

interface Criterion {
  id: string;
  label: string;
  description?: string;
  weight: Weight;
  enabled: boolean;
  custom?: boolean;
}

interface Options {
  allowCustom?: boolean;
  showShares?: boolean;
  disabled?: boolean;
  labels?: Partial<Record<"include" | "weight" | "remove" | "count" | "failed" | "low" | "medium" | "high", string>>;
}

interface State extends Magics {
  criteria: Criterion[];
  draft: string;
  busy: boolean;
  sent: boolean;
  error: string | null;
  disabled: boolean;
  showShares: boolean;
  allowCustom: boolean;
  labels: Record<string, string>;
  root: HTMLElement | null;
  weights: Weight[];
  locked: boolean;
  onCount: number;
  share(c: Criterion): number;
  fill(key: string, vars: Record<string, string | number>): string;
}

export const weightedCriteriaCard: Register = (Alpine) => {
  Alpine.data("nqWeightedCriteriaCard", (initial: Criterion[] = [], options: Options = {}) => ({
    criteria: (initial ?? []).map((c) => ({ ...c })),
    draft: "",
    busy: false,
    sent: false,
    error: null as string | null,
    disabled: options.disabled === true,
    showShares: options.showShares !== false,
    allowCustom: options.allowCustom !== false,
    labels: {
      include: "Include {label}",
      weight: "Weight of {label}",
      remove: "Remove {label}",
      count: "{on} of {all} included",
      failed: "That did not work. Try again.",
      low: "Low",
      medium: "Medium",
      high: "High",
      ...options.labels,
    },
    root: null as HTMLElement | null,
    weights: WEIGHTS,
    init(this: State) {
      this.root = this.$el;
      this.$watch("criteria", (value: Criterion[]) => {
        this.root?.dispatchEvent(new CustomEvent("nq-weighted-criteria-change", { bubbles: true, detail: { criteria: value } }));
      });
    },
    get locked(): boolean {
      const s = this as unknown as State;
      return s.disabled || s.busy || s.sent;
    },
    get onCount(): number {
      return (this as unknown as State).criteria.filter((c) => c.enabled).length;
    },
    get countText(): string {
      const s = this as unknown as State;
      return s.fill("count", { on: s.onCount, all: s.criteria.length });
    },
    fill(this: State, key: string, vars: Record<string, string | number>): string {
      return (this.labels[key] ?? "").replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
    },
    share(this: State, c: Criterion): number {
      if (!c.enabled) return 0;
      const total = this.criteria.reduce((sum, x) => sum + (x.enabled ? POINTS[x.weight] : 0), 0);
      return total === 0 ? 0 : POINTS[c.weight] / total;
    },
    sharePct(this: State, c: Criterion): string {
      return `${Math.round(this.share(c) * 100)}%`;
    },
    includeLabel(this: State, c: Criterion): string {
      return this.fill("include", { label: c.label });
    },
    weightLabel(this: State, c: Criterion): string {
      return this.fill("weight", { label: c.label });
    },
    removeLabel(this: State, c: Criterion): string {
      return this.fill("remove", { label: c.label });
    },
    toggle(this: State, c: Criterion) {
      if (this.locked) return;
      c.enabled = !c.enabled;
    },
    setWeight(this: State, c: Criterion, weight: Weight) {
      if (this.locked || !c.enabled) return;
      c.weight = weight;
    },
    /** Arrow keys on a weight group follow the reading direction; Home and End jump. */
    weightKey(this: State, event: KeyboardEvent) {
      const group = event.currentTarget as HTMLElement;
      const items = [...group.querySelectorAll<HTMLElement>('[data-slot="toggle"]')];
      const at = items.indexOf((event.target as HTMLElement).closest<HTMLElement>('[data-slot="toggle"]')!);
      if (at < 0) return;
      const rtl = getComputedStyle(group).direction === "rtl";
      let to = -1;
      if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) to = (at + 1) % items.length;
      else if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) to = (at - 1 + items.length) % items.length;
      else if (event.key === "Home") to = 0;
      else if (event.key === "End") to = items.length - 1;
      if (to < 0) return;
      event.preventDefault();
      items[to]!.focus();
    },
    add(this: State) {
      const clean = this.draft.trim().replace(/\s+/g, " ").slice(0, 120);
      this.draft = "";
      if (!clean) return;
      const key = clean.toLocaleLowerCase();
      if (this.criteria.some((c) => c.label.toLocaleLowerCase() === key)) return;
      this.criteria = [...this.criteria, { id: `custom-${Date.now().toString(36)}`, label: clean, weight: "medium", enabled: true, custom: true }];
    },
    remove(this: State, c: Criterion) {
      if (this.locked) return;
      this.criteria = this.criteria.filter((x) => x.id !== c.id);
    },
    async accept(this: State) {
      if (this.disabled || this.sent || this.busy || this.onCount === 0) return;
      this.busy = true;
      this.error = null;
      const detail: { criteria: Criterion[]; promise?: Promise<unknown> | unknown } = { criteria: this.criteria.map((c) => ({ ...c })) };
      this.root?.dispatchEvent(new CustomEvent("nq-weighted-criteria-accept", { bubbles: true, detail }));
      try {
        const r = (await detail.promise) as { error?: string } | undefined | void;
        if (r && typeof r === "object" && r.error) this.error = r.error;
        else this.sent = true;
      } catch (e) {
        this.error = e instanceof Error && e.message ? e.message : this.labels.failed ?? "";
      }
      this.busy = false;
    },
  }));
};

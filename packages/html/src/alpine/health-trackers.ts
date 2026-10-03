// The health trackers of <x-nq::health-trackers.*>: the cup row, the quick-log strip, the food catalogue (delete
// confirm and pin), the item builder and the flagged-entries disclosure. The markup is the React components'; the state lives here.
//
//   <div x-data="nqCupTracker({ filled: 7, total: 12, waitLabel: null, disabled: false, locale: 'en', labels: { cupsLabel, cupNext, cupWait, cupsFailed } })" @log="$event.detail.wait(…)"> … </div>
//   <div x-data="nqQuickLogStrip({ items: [{ id, name, nameAr }], ar: false, labels: { pinnedLogged, pinnedFlagged, pinnedFailed } })" @log="…" @unpin="…"> … </div>
//   <div x-data="nqFoodCatalogue({ rows, labels: { deleteTitle, actionFailed } })" x-on:nq-entity-list-action="onAction($event.detail)" @pin="…" @delete="…" @edit="…" @add="…"> … </div>
//   <div x-data="nqFoodItemBuilder({ draft, families: [{ id, name }], labels: { … } })" @save="…"> … </div>
//   <div x-data="nqFlaggedEntries({ entries: [...] | null, count, open, locale, labels: { genericError } })" @load="…"> … </div>
//
// They are presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   log (cup)        { wait }                          resolve, or resolve { error }; on success the filled count goes up by one (or resolve { filled })
//   log (strip)      { item, override, wait }          resolve, or { flagged, message } / { error, canOverride } shown below the strip
//   unpin            { item, wait }                    resolve, or { error }; on success the button leaves the strip
//   pin / unpin      { id, pinned, wait }              (catalogue) resolve, or { error } shown above the list; on success the row updates
//   delete           { id, wait }                      resolve, or { error } shown in the confirm dialog; on success the row leaves the list
//   edit / add       { id } / {}                       no answer needed
//   save (builder)   { draft, wait }                   resolve, or { error } shown above the buttons
//   load (flagged)   { wait }                          resolve the array of entries { id, at, label, reason, area? }
// A rejected promise, or nobody listening, shows the generic error.

import { cupCounts, cupState, foodDraftCompleteness, foodDraftValid, type CupState, type FoodDraft, type FoodKind, type FoodVerdict } from "./health-trackers-logic";
import type { Magics, Register } from "./types";

type Outcome = { error?: string } | void | undefined;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const nf = (locale: string) => new Intl.NumberFormat(`${locale}-u-nu-latn`);

/** Fire an event on the root and wait for the promise the host hands to `wait`. */
async function ask(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<unknown> {
  let pending: Promise<unknown> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<unknown>) => (pending = Promise.resolve(p)) } }));
  if (!pending) throw new Error("no listener");
  return pending;
}

interface Root extends Magics {
  host: HTMLElement | null;
  alive: boolean;
}

// ---- cups ----------------------------------------------------------------------------------------------------------

interface CupConfig {
  filled: number;
  total: number;
  disabled?: boolean;
  waitLabel?: string | null;
  locale?: string;
  labels: { cupsLabel: string; cupNext: string; cupWait: string; cupsFailed: string };
}

interface CupState_ extends Root {
  config: CupConfig;
  filled: number;
  total: number;
  pending: boolean;
  error: string | null;
}

// ---- strip ---------------------------------------------------------------------------------------------------------

interface StripItem {
  id: string;
  name: string;
  nameAr?: string;
  icon?: string;
}
interface StripConfig {
  items: StripItem[];
  ar?: boolean;
  labels: { pinnedLogged: string; pinnedFlagged: string; pinnedFailed: string };
}
interface StripOutcome {
  tone: "success" | "warning" | "danger";
  text: string;
  retry: StripItem | null;
}
interface StripResult {
  flagged?: boolean;
  message?: string;
  error?: string;
  canOverride?: boolean;
}
interface StripState extends Root {
  config: StripConfig;
  items: StripItem[];
  busyId: string | null;
  outcome: StripOutcome | null;
  nameOf(item: StripItem): string;
  run(item: StripItem, override?: boolean): Promise<void>;
}

// ---- catalogue -----------------------------------------------------------------------------------------------------

type Row = Record<string, unknown>;
interface CatalogueConfig {
  rows: Row[];
  labels: { deleteTitle: string; actionFailed: string; genericError: string };
}
interface CatalogueState extends Root {
  config: CatalogueConfig;
  items: Row[];
  confirmOpen: boolean;
  held: Row | null;
  busy: boolean;
  failure: string | null;
  notice: string | null;
  find(id: string): Row | undefined;
  pin(row: Row, pinned: boolean): Promise<void>;
}

// ---- builder -------------------------------------------------------------------------------------------------------

interface BuilderConfig {
  draft?: Partial<FoodDraft>;
  families: { id: string }[];
  locale?: string;
  ar?: boolean;
  labels: { missingIntro: string; complete: string; completeness: string; steps: string; stepName: string; stepNameAr: string; stepVerdict: string; stepFamilies: string; stepNote: string; actionFailed: string; saving: string; save: string; famRequired: string; famHint: string };
}
interface BuilderState extends Root {
  config: BuilderConfig;
  kind: FoodKind;
  name: string;
  nameAr: string;
  verdict: FoodVerdict;
  famOn: boolean[];
  note: string;
  touched: boolean;
  nameInvalid: boolean;
  saving: boolean;
  error: string | null;
  draft: FoodDraft;
  progress: ReturnType<typeof foodDraftCompleteness>;
  familiesMissing: boolean;
}

const KINDS: FoodKind[] = ["food", "drink"];
const VERDICTS: FoodVerdict[] = ["unreviewed", "safe", "trigger"];
const RING = 2 * Math.PI * ((72 - 7) / 2);

// ---- flagged -------------------------------------------------------------------------------------------------------

interface Flagged {
  id: string;
  at: string | number;
  label: string;
  reason: string;
  area?: string;
}
interface FlaggedConfig {
  entries: Flagged[] | null;
  count?: number;
  open?: boolean;
  hasLoader?: boolean;
  locale?: string;
  labels: { genericError: string; flaggedCount: string };
}
interface FlaggedState extends Root {
  config: FlaggedConfig;
  isOpen: boolean;
  loaded: Flagged[] | null;
  phase: "idle" | "loading" | "error";
  started: boolean;
  load(): Promise<void>;
  total: number;
}

export const healthTrackers: Register = (Alpine) => {
  Alpine.data("nqCupTracker", (config: CupConfig) => {
    const start = cupCounts(config.filled, config.total);
    return {
      config,
      filled: start.filled,
      total: start.total,
      pending: false,
      error: null as string | null,
      alive: true,
      host: null as HTMLElement | null,
      init(this: CupState_) {
        this.host = this.$el;
      },
      destroy(this: CupState_) {
        this.alive = false;
      },
      get cups(): { i: number; state: CupState }[] {
        const s = this as unknown as CupState_;
        return Array.from({ length: s.total }, (_, i) => ({ i, state: cupState(i, s.filled, s.total) }));
      },
      get done(): boolean {
        const s = this as unknown as CupState_;
        return s.total > 0 && s.filled >= s.total;
      },
      get groupLabel(): string {
        const s = this as unknown as CupState_;
        const f = nf(s.config.locale ?? "en");
        return fill(s.config.labels.cupsLabel, { filled: f.format(s.filled), total: f.format(s.total) });
      },
      get count(): string {
        const s = this as unknown as CupState_;
        const f = nf(s.config.locale ?? "en");
        return `${f.format(s.filled)} / ${f.format(s.total)}`;
      },
      get blocked(): boolean {
        const s = this as unknown as CupState_;
        return Boolean(s.config.disabled) || s.pending;
      },
      nextLabel(this: CupState_): string {
        return this.config.waitLabel ? fill(this.config.labels.cupWait, { time: this.config.waitLabel }) : this.config.labels.cupNext;
      },
      cupClass(state: CupState): string {
        if (state === "filled") return "fill-nq-success stroke-nq-success";
        return `fill-transparent ${state === "next" ? "stroke-primary" : "stroke-nq-line-strong"}`;
      },
      async log(this: CupState_) {
        if (this.pending) return;
        this.pending = true;
        this.error = null;
        try {
          const r = (await ask(this.host ?? this.$el, "log", {})) as (Outcome & { filled?: number }) | undefined;
          if (!this.alive) return;
          if (r && typeof r === "object" && r.error) this.error = r.error;
          else if (r && typeof r === "object" && typeof r.filled === "number") this.filled = cupCounts(r.filled, this.total).filled;
          else this.filled = Math.min(this.total, this.filled + 1);
        } catch {
          if (this.alive) this.error = this.config.labels.cupsFailed;
        } finally {
          if (this.alive) this.pending = false;
        }
      },
    };
  });

  Alpine.data("nqQuickLogStrip", (config: StripConfig) => ({
    config,
    items: config.items.map((i) => ({ ...i })),
    busyId: null as string | null,
    outcome: null as StripOutcome | null,
    alive: true,
    host: null as HTMLElement | null,
    init(this: StripState) {
      this.host = this.$el;
    },
    destroy(this: StripState) {
      this.alive = false;
    },
    nameOf(this: StripState, item: StripItem): string {
      return this.config.ar && item.nameAr ? item.nameAr : item.name;
    },
    isBusy(this: StripState, item: StripItem): boolean {
      return this.busyId === item.id;
    },
    isLocked(this: StripState, item: StripItem): boolean {
      return this.busyId !== null && this.busyId !== item.id;
    },
    isBlocked(this: StripState, item: StripItem): boolean {
      return this.busyId !== null;
    },
    get canRetry(): boolean {
      return Boolean((this as unknown as StripState).outcome?.retry);
    },
    get toneClass(): string {
      const s = this as unknown as StripState;
      const tone = s.outcome?.tone;
      return tone === "success" ? "text-nq-success-text" : tone === "warning" ? "text-nq-warning-text" : tone === "danger" ? "text-nq-danger-text" : "";
    },
    async run(this: StripState, item: StripItem, override = false) {
      this.busyId = item.id;
      this.outcome = null;
      const name = this.nameOf(item);
      try {
        const r = (await ask(this.host ?? this.$el, "log", { item: { ...item }, override })) as StripResult | undefined;
        if (!this.alive) return;
        if (r && r.error) this.outcome = { tone: "danger", text: r.error, retry: r.canOverride ? item : null };
        else if (r && r.flagged) this.outcome = { tone: "warning", text: r.message ?? fill(this.config.labels.pinnedFlagged, { name }), retry: null };
        else this.outcome = { tone: "success", text: (r && r.message) ?? fill(this.config.labels.pinnedLogged, { name }), retry: null };
      } catch {
        if (this.alive) this.outcome = { tone: "danger", text: fill(this.config.labels.pinnedFailed, { name }), retry: null };
      } finally {
        if (this.alive) this.busyId = null;
      }
    },
    retry(this: StripState) {
      const item = this.outcome?.retry;
      if (item) void this.run(item, true);
    },
    async unpin(this: StripState, item: StripItem) {
      try {
        const r = (await ask(this.host ?? this.$el, "unpin", { item: { ...item } })) as Outcome;
        if (!this.alive) return;
        if (r && r.error) this.outcome = { tone: "danger", text: r.error, retry: null };
        else this.items = this.items.filter((i) => i.id !== item.id);
      } catch {
        // Nobody answered: leave the strip as it was.
      }
    },
  }));

  Alpine.data("nqFoodCatalogue", (config: CatalogueConfig) => ({
    config,
    items: config.rows.map((r) => ({ ...r })),
    confirmOpen: false,
    held: null as Row | null,
    busy: false,
    failure: null as string | null,
    notice: null as string | null,
    alive: true,
    host: null as HTMLElement | null,
    init(this: CatalogueState) {
      this.host = this.$el;
    },
    destroy(this: CatalogueState) {
      this.alive = false;
    },
    find(this: CatalogueState, id: string) {
      return this.items.find((r) => String(r.id) === String(id));
    },
    get deleteTitle(): string {
      const s = this as unknown as CatalogueState;
      return s.held ? fill(s.config.labels.deleteTitle, { name: String(s.held.name ?? "") }) : "";
    },
    /** The `nq-entity-list-action` of the row menu and the context menu. */
    onAction(this: CatalogueState, detail: { action: string; row: Row }) {
      const row = this.find(String(detail.row.id));
      if (!row) return;
      if (detail.action === "pin" || detail.action === "unpin") void this.pin(row, detail.action === "pin");
      else if (detail.action === "edit") this.host?.dispatchEvent(new CustomEvent("edit", { bubbles: true, detail: { id: row.id } }));
      else if (detail.action === "delete") {
        this.failure = null;
        this.held = row;
        this.confirmOpen = true;
      }
    },
    addItem(this: CatalogueState) {
      this.host?.dispatchEvent(new CustomEvent("add", { bubbles: true, detail: {} }));
    },
    async pin(this: CatalogueState, row: Row, pinned: boolean) {
      this.notice = null;
      try {
        const r = (await ask(this.host ?? this.$el, "pin", { id: row.id, pinned })) as Outcome;
        if (!this.alive) return;
        if (r && r.error) this.notice = r.error;
        else this.items = this.items.map((x) => (x.id === row.id ? { ...x, pinned, pinnedText: pinned ? x.pinnedLabel : null } : x));
      } catch {
        if (this.alive) this.notice = this.config.labels.genericError;
      }
    },
    async removeItem(this: CatalogueState) {
      const row = this.held;
      if (!row || this.busy) return;
      this.busy = true;
      this.failure = null;
      try {
        const r = (await ask(this.host ?? this.$el, "delete", { id: row.id })) as Outcome;
        if (!this.alive) return;
        if (r && r.error) this.failure = r.error;
        else {
          this.items = this.items.filter((x) => x.id !== row.id);
          this.confirmOpen = false;
        }
      } catch {
        if (this.alive) this.failure = this.config.labels.actionFailed;
      } finally {
        if (this.alive) this.busy = false;
      }
    },
  }));

  Alpine.data("nqFoodItemBuilder", (config: BuilderConfig) => {
    const d = config.draft ?? {};
    return {
      config,
      kind: (d.kind ?? "food") as FoodKind,
      name: d.name ?? "",
      nameAr: d.nameAr ?? "",
      verdict: (d.verdict ?? "unreviewed") as FoodVerdict,
      famOn: config.families.map((f) => (d.triggerFamilies ?? []).includes(f.id)),
      note: d.note ?? "",
      touched: false,
      nameInvalid: false,
      saving: false,
      error: null as string | null,
      alive: true,
      host: null as HTMLElement | null,
      init(this: BuilderState) {
        this.host = this.$el;
        this.$watch("name", () => {
          if (this.touched) this.nameInvalid = !this.name.trim();
        });
      },
      destroy(this: BuilderState) {
        this.alive = false;
      },
      get draft(): FoodDraft {
        const s = this as unknown as BuilderState;
        return { kind: s.kind, name: s.name, nameAr: s.nameAr, verdict: s.verdict, triggerFamilies: s.config.families.filter((_, i) => s.famOn[i]).map((f) => f.id), note: s.note };
      },
      get progress() {
        return foodDraftCompleteness((this as unknown as BuilderState).draft);
      },
      get tone(): string {
        const score = (this as unknown as BuilderState).progress.score;
        return score >= 1 ? "stroke-nq-success" : score >= 0.5 ? "stroke-nq-info" : "stroke-muted-foreground";
      },
      get ringOffset(): number {
        return RING * (1 - (this as unknown as BuilderState).progress.score);
      },
      get percent(): string {
        const s = this as unknown as BuilderState;
        return new Intl.NumberFormat(`${s.config.locale ?? "en"}-u-nu-latn`, { style: "percent" }).format(s.progress.score);
      },
      get ringLabel(): string {
        const s = this as unknown as BuilderState;
        const f = nf(s.config.locale ?? "en");
        return `${s.config.labels.completeness}: ${fill(s.config.labels.steps, { done: f.format(s.progress.done), total: f.format(s.progress.total) })}`;
      },
      get missingText(): string {
        const s = this as unknown as BuilderState;
        const l = s.config.labels;
        const names: Record<string, string> = { name: l.stepName, nameAr: l.stepNameAr, verdict: l.stepVerdict, families: l.stepFamilies, note: l.stepNote };
        return s.progress.missing.length ? `${l.missingIntro}: ${s.progress.missing.map((m) => names[m]).join(s.config.ar ? "، " : ", ")}` : l.complete;
      },
      get famText(): string {
        const s = this as unknown as BuilderState;
        return s.familiesMissing ? s.config.labels.famRequired : s.config.labels.famHint;
      },
      get saveText(): string {
        const s = this as unknown as BuilderState;
        return s.saving ? s.config.labels.saving : s.config.labels.save;
      },
      get nameMissing(): boolean {
        const s = this as unknown as BuilderState;
        return s.touched && !s.name.trim();
      },
      get familiesMissing(): boolean {
        const s = this as unknown as BuilderState;
        return s.touched && s.verdict === "trigger" && s.draft.triggerFamilies.length === 0;
      },
      setKind(this: BuilderState, index: number) {
        this.kind = KINDS[index] ?? "food";
      },
      setVerdict(this: BuilderState, index: number) {
        this.verdict = VERDICTS[index] ?? "unreviewed";
      },
      cancel(this: BuilderState) {
        (this.host ?? this.$el).dispatchEvent(new CustomEvent("cancel", { bubbles: true, detail: {} }));
      },
      async submit(this: BuilderState) {
        this.touched = true;
        this.nameInvalid = !this.name.trim();
        if (!foodDraftValid(this.draft)) return;
        this.saving = true;
        this.error = null;
        try {
          const r = (await ask(this.host ?? this.$el, "save", { draft: { ...this.draft, name: this.name.trim() } })) as Outcome;
          if (!this.alive) return;
          if (r && r.error) this.error = r.error;
        } catch {
          if (this.alive) this.error = this.config.labels.actionFailed;
        } finally {
          if (this.alive) this.saving = false;
        }
      },
    };
  });

  Alpine.data("nqFlaggedEntries", (config: FlaggedConfig) => ({
    config,
    isOpen: Boolean(config.open),
    loaded: (config.entries ? config.entries.map((e) => ({ ...e })) : null) as Flagged[] | null,
    phase: "idle" as "idle" | "loading" | "error",
    started: false,
    alive: true,
    host: null as HTMLElement | null,
    init(this: FlaggedState) {
      this.host = this.$el;
      this.$watch("isOpen", (open: boolean) => {
        if (open && this.config.hasLoader && !this.started) {
          this.started = true;
          void this.load();
        }
      });
      if (this.isOpen && this.config.hasLoader) {
        this.started = true;
        void this.load();
      }
    },
    destroy(this: FlaggedState) {
      this.alive = false;
    },
    get total(): number {
      const s = this as unknown as FlaggedState;
      return s.loaded ? s.loaded.length : (s.config.count ?? 0);
    },
    get hasAny(): boolean {
      return (this as unknown as FlaggedState).total > 0;
    },
    get isEmpty(): boolean {
      const s = this as unknown as FlaggedState;
      return s.phase === "idle" && s.loaded !== null && s.loaded.length === 0;
    },
    get showList(): boolean {
      const s = this as unknown as FlaggedState;
      return s.phase === "idle" && !(s.loaded !== null && s.loaded.length === 0);
    },
    get countText(): string {
      const s = this as unknown as FlaggedState;
      return fill(s.config.labels.flaggedCount, { count: nf(s.config.locale ?? "en").format(s.total) });
    },
    timeOf(this: FlaggedState, at: string | number): string {
      return new Intl.DateTimeFormat(`${this.config.locale ?? "en"}-u-nu-latn`, { timeStyle: "short" }).format(new Date(at));
    },
    async load(this: FlaggedState) {
      this.phase = "loading";
      try {
        const r = (await ask(this.host ?? this.$el, "load", {})) as Flagged[] | undefined;
        if (!this.alive) return;
        this.loaded = Array.isArray(r) ? r.map((e) => ({ ...e })) : [];
        this.phase = "idle";
      } catch {
        if (this.alive) this.phase = "error";
      }
    },
  }));
};

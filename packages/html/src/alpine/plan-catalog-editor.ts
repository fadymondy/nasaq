// nqPlanCatalogEditor: the admin editor for a product catalog (plans, features, apps, pay-as-you-go prices, bundles) edited into a
// draft. Nothing is live until the sync preview (a dry run) is applied. The markup is the React PlanCatalogEditor's (see the Blade
// component); the state lives here.
//
//   <section data-slot="plan-catalog-editor" x-data="nqPlanCatalogEditor({ apps: [], features: [], plans: [], payg: [], bundles: [] }, { currency: 'USD', applicable: true, labels: {} })"
//            x-on:save-plan="onSavePlan($event)"> ... </section>
//
// Persistence is the host's. Events (bubbling, on the root), each with `wait(promise)` in the detail:
//   catalog-preview { draft, wait }   runs the dry run: resolve { changes?, warnings?, error? }. Nobody listening: the editor diffs itself.
//   catalog-apply   { draft, wait }   publishes the draft: resolve, or resolve { error }. A rejection or nobody listening shows the generic error.
//   catalog-change  { draft }         after every edit of the draft (no wait).
// `applicable: false` makes the preview read-only (no Apply button). The labels come from the Blade component (`{n}`-style placeholders).

import { formatMoney } from "../core/money";
import {
  catalogIssues,
  countChanges,
  diffCatalog,
  fromDraft,
  makeId,
  toDraft,
  type CatalogApp,
  type CatalogBundle,
  type CatalogChange,
  type CatalogEntity,
  type CatalogFeature,
  type CatalogIssue,
  type CatalogPlan,
  type PaygPrice,
  type PlanCatalog,
} from "./plan-catalog-editor-logic";
import type { Magics, Register } from "./types";

interface PreviewResult {
  changes?: CatalogChange[];
  warnings?: string[];
  error?: string;
}
type Outcome = { error?: string } | void | undefined;

interface Config {
  currency?: string;
  applicable?: boolean;
  labels?: Record<string, string>;
}

type Waiter = (p: Promise<unknown>) => void;

interface CatalogState extends Magics {
  $nq: { locale: string };
  cat: PlanCatalog;
  live: PlanCatalog;
  section: CatalogEntity;
  banner: string | null;
  reviewOpen: boolean;
  previewing: boolean;
  preview: PreviewResult | null;
  previewError: string | null;
  applying: boolean;
  applyError: string | null;
  currency: string;
  applicable: boolean;
  str: Record<string, string>;
  root: HTMLElement | null;
  changes(): CatalogChange[];
  shown(): CatalogChange[];
  issues(): CatalogIssue[];
  warnings(): string[];
  planMap(): Record<string, unknown>;
  fmtNum(n: number): string;
  snapshot(): PlanCatalog;
  ask(name: string, detail: Record<string, unknown>): Promise<unknown>;
}

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export const planCatalogEditor: Register = (Alpine) => {
  Alpine.data("nqPlanCatalogEditor", (initial: Partial<PlanCatalog> = {}, config: Config = {}) => ({
    cat: toDraft(initial),
    live: toDraft(initial),
    section: "plans" as CatalogEntity,
    banner: null as string | null,
    reviewOpen: false,
    previewing: false,
    preview: null as PreviewResult | null,
    previewError: null as string | null,
    applying: false,
    applyError: null as string | null,
    currency: config.currency ?? "USD",
    applicable: config.applicable ?? false,
    str: (config.labels ?? {}) as Record<string, string>,
    root: null as HTMLElement | null,

    init(this: CatalogState) {
      this.root = this.$el;
      this.$watch("sig", () => this.root?.dispatchEvent(new CustomEvent("catalog-change", { bubbles: true, detail: { draft: this.snapshot() } })));
      // The preview cannot be dismissed while it is being applied.
      this.$watch("reviewOpen", (open: boolean) => {
        if (!open && this.applying) this.reviewOpen = true;
      });
    },
    get sig() {
      return JSON.stringify((this as unknown as CatalogState).cat);
    },
    snapshot(this: CatalogState) {
      return fromDraft(this.cat);
    },
    fmtNum(this: CatalogState, n: number) {
      return new Intl.NumberFormat(`${this.$nq.locale}-u-nu-latn`).format(n);
    },

    /* -------- the diff */
    changes(this: CatalogState) {
      return diffCatalog(this.live, this.cat);
    },
    hasChanges(this: CatalogState) {
      return this.changes().length > 0;
    },
    noChanges(this: CatalogState) {
      return this.changes().length === 0;
    },
    unpublishedText(this: CatalogState) {
      const n = this.changes().length;
      return n === 1 ? this.str.unpublishedOne : fill(this.str.unpublished!, { n: this.fmtNum(n) });
    },
    entityCount(this: CatalogState, entity: CatalogEntity) {
      return this.fmtNum(this.changes().filter((c) => c.entity === entity).length);
    },
    entityHas(this: CatalogState, entity: CatalogEntity) {
      return this.changes().some((c) => c.entity === entity);
    },
    entityBadge(this: CatalogState, entity: CatalogEntity) {
      const n = this.changes().filter((c) => c.entity === entity).length;
      return n === 1 ? this.str.unpublishedOne : fill(this.str.unpublished!, { n: this.fmtNum(n) });
    },
    isLive(this: CatalogState, entity: CatalogEntity, id: string) {
      return (this.live[entity] as unknown as { id: string }[]).some((r) => r.id === id);
    },
    discardAll(this: CatalogState) {
      this.cat = toDraft(this.live);
    },

    /* -------- preview and apply */
    ask(this: CatalogState, name: string, detail: Record<string, unknown>): Promise<unknown> {
      let pending: Promise<unknown> | undefined;
      const wait: Waiter = (p) => (pending = Promise.resolve(p));
      (this.root ?? this.$el).dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait } }));
      if (!pending) return Promise.reject(new Error("no listener"));
      return pending;
    },
    async openReview(this: CatalogState) {
      this.reviewOpen = true;
      this.preview = null;
      this.previewError = null;
      this.applyError = null;
      let pending: Promise<unknown> | undefined;
      const wait: Waiter = (p) => (pending = Promise.resolve(p));
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("catalog-preview", { bubbles: true, detail: { draft: this.snapshot(), wait } }));
      if (!pending) {
        this.preview = {};
        return;
      }
      this.previewing = true;
      try {
        const result = (await pending) as PreviewResult | void;
        if (result && result.error) this.previewError = result.error;
        else this.preview = result ?? {};
      } catch (e) {
        this.previewError = e instanceof Error && e.message ? e.message : this.str.previewFailed!;
      }
      this.previewing = false;
    },
    closeReview(this: CatalogState) {
      if (!this.applying) this.reviewOpen = false;
    },
    shown(this: CatalogState) {
      return this.preview?.changes ?? this.changes();
    },
    issues(this: CatalogState) {
      return catalogIssues(this.cat);
    },
    nothingToShow(this: CatalogState) {
      return this.shown().length === 0;
    },
    somethingToShow(this: CatalogState) {
      return this.shown().length > 0;
    },
    countsText(this: CatalogState) {
      const c = countChanges(this.shown());
      return fill(this.str.counts!, { a: this.fmtNum(c.added), u: this.fmtNum(c.updated), r: this.fmtNum(c.removed) });
    },
    warnings(this: CatalogState) {
      return this.preview?.warnings ?? [];
    },
    hasWarnings(this: CatalogState) {
      return this.warnings().length > 0;
    },
    hasIssues(this: CatalogState) {
      return this.issues().length > 0;
    },
    hasPreviewError(this: CatalogState) {
      return this.previewError !== null;
    },
    hasApplyError(this: CatalogState) {
      return this.applyError !== null;
    },
    showList(this: CatalogState) {
      return !this.previewing && this.previewError === null;
    },
    issueText(this: CatalogState, i: CatalogIssue) {
      const key = i.code === "name" ? "issueName" : i.code === "duplicate" ? "issueDuplicate" : "issueMissingApp";
      return fill(this.str[key]!, { e: this.str[i.entity]!, id: i.id });
    },
    changeKey(c: CatalogChange) {
      return `${c.entity}:${c.id}:${c.kind}`;
    },
    changeFields(c: CatalogChange) {
      return (c.fields ?? []).join(", ");
    },
    changeHasFields(c: CatalogChange) {
      return (c.fields ?? []).length > 0;
    },
    isKind(c: CatalogChange, kind: string) {
      return c.kind === kind;
    },
    applyLabel(this: CatalogState) {
      const n = this.shown().length;
      return n === 1 ? this.str.applyOne : fill(this.str.apply!, { n: this.fmtNum(n) });
    },
    applyDisabled(this: CatalogState) {
      return this.previewing || this.previewError !== null || this.shown().length === 0 || this.issues().length > 0;
    },
    async applyAll(this: CatalogState) {
      if (!this.applicable || this.applying) return;
      this.applying = true;
      this.applyError = null;
      let failure: string | null = null;
      try {
        const result = (await this.ask("catalog-apply", { draft: this.snapshot() })) as Outcome;
        failure = result && typeof result === "object" && result.error ? result.error : null;
      } catch (e) {
        failure = e instanceof Error && e.message && e.message !== "no listener" ? e.message : "";
      }
      this.applying = false;
      if (failure !== null) {
        this.applyError = failure || this.str.applyFailed!;
        return;
      }
      this.live = toDraft(this.cat);
      this.reviewOpen = false;
      this.banner = this.str.applied!;
    },

    /* -------- plans: the AdminPlans dialog is a nested nqAdminTenants; the cards are drawn here */
    planMap(this: CatalogState) {
      const out: Record<string, unknown> = {};
      for (const p of this.cat.plans) {
        out[p.id] = {
          name: p.name,
          seats: p.seats,
          description: p.description ?? "",
          priceMonthly: p.priceMonthly,
          currency: p.currency,
          storageGb: p.storageGb,
          features: [...(p.features ?? [])],
          visible: p.visible,
          featured: p.featured ?? false,
        };
      }
      return out;
    },
    onSavePlan(this: CatalogState, event: CustomEvent<{ plan: Partial<CatalogPlan> & { name: string }; wait: Waiter }>) {
      event.stopPropagation();
      const plan = event.detail.plan;
      const plans: CatalogPlan[] = JSON.parse(JSON.stringify(this.cat.plans));
      const at = plan.id ? plans.findIndex((p) => p.id === plan.id) : -1;
      const old = at >= 0 ? plans[at] : undefined;
      // The catalog has one currency: a plan keeps its own only when it already had one.
      const values = { ...plan, currency: old?.currency };
      if (old) plans[at] = { ...old, ...values, id: old.id } as CatalogPlan;
      else plans.push({ ...values, id: makeId(plan.name, plans.map((p) => p.id), "plan"), subscribers: 0 } as CatalogPlan);
      this.cat = { ...this.cat, plans: JSON.parse(JSON.stringify(plans)) as CatalogPlan[] };
      event.detail.wait(Promise.resolve());
    },
    noPlans(this: CatalogState) {
      return this.cat.plans.length === 0;
    },
    planPrice(this: CatalogState, plan: CatalogPlan) {
      return formatMoney(plan.priceMonthly, { locale: this.$nq.locale, currency: plan.currency ?? this.currency, compact: true });
    },
    planPaid(plan: CatalogPlan) {
      return plan.priceMonthly > 0;
    },
    planFree(plan: CatalogPlan) {
      return !(plan.priceMonthly > 0);
    },
    planHidden(plan: CatalogPlan) {
      return !plan.visible;
    },
    planNote(this: CatalogState, plan: CatalogPlan) {
      const n = plan.subscribers ?? 0;
      return n === 1 ? this.str.subscribersOne : fill(this.str.subscribers!, { n: this.fmtNum(n) });
    },
    planFeatures(this: CatalogState, plan: CatalogPlan) {
      return [
        plan.seats == null ? this.str.seatsUnlimited! : fill(this.str.seatsLimit!, { n: this.fmtNum(plan.seats) }),
        plan.storageGb == null ? this.str.storageUnlimited! : fill(this.str.storage!, { n: this.fmtNum(plan.storageGb) }),
        ...(plan.features ?? []),
      ];
    },
    editPlan(this: CatalogState, id: string | null, host: { config: { plans: Record<string, unknown> }; openPlan(id: string | null): void }) {
      host.config.plans = this.planMap();
      host.openPlan(id);
    },

    /* -------- feature, app, pay-as-you-go and bundle rows */
    rowName(this: CatalogState, kind: string, item: { name?: string }, index: number) {
      return item.name || `${this.str[kind]} ${this.fmtNum(index + 1)}`;
    },
    createFeature(this: CatalogState): CatalogFeature {
      return { id: makeId("", this.cat.features.map((f) => f.id), "feature"), name: "", appId: "" };
    },
    createApp(this: CatalogState): CatalogApp {
      return { id: makeId("", this.cat.apps.map((a) => a.id), "app"), name: "", enabled: true };
    },
    createPayg(this: CatalogState): PaygPrice {
      return { id: makeId("", this.cat.payg.map((p) => p.id), "meter"), name: "", unit: "", unitPrice: 0 };
    },
    createBundle(this: CatalogState): CatalogBundle {
      return { id: makeId("", this.cat.bundles.map((b) => b.id), "bundle"), name: "", price: 0, appIds: [] };
    },
    setNum(item: Record<string, unknown>, key: string, raw: string) {
      item[key] = Number(raw) || 0;
    },
    setFree(item: PaygPrice, raw: string) {
      item.freeUnits = raw === "" ? undefined : Number(raw) || 0;
    },
    freeText(item: PaygPrice) {
      return item.freeUnits === undefined || item.freeUnits === null ? "" : String(item.freeUnits);
    },
    hasApp(item: CatalogBundle, id: string) {
      return item.appIds.includes(id);
    },
    toggleApp(item: CatalogBundle, id: string) {
      item.appIds = item.appIds.includes(id) ? item.appIds.filter((x) => x !== id) : [...item.appIds, id];
    },
    priceLabel(this: CatalogState, key: string) {
      return `${this.str[key]} (${this.currency})`;
    },

    /** x-bind for one app option of a feature's "Belongs to" select: nqSelect's `item` behaviour, which a row's `item` variable hides. */
    appOption(id: string) {
      return {
        role: "option",
        tabindex: "-1",
        "data-value": id,
        ":aria-selected"(this: { isSelected(v: string): boolean }) {
          return String(this.isSelected(id));
        },
        ":data-selected"(this: { isSelected(v: string): boolean }) {
          return this.isSelected(id) ? "" : undefined;
        },
        ":data-highlighted"(this: { highlighted: string | null }) {
          return this.highlighted === id ? "" : undefined;
        },
        "x-on:pointermove"(this: { highlighted: string | null; focusOption(el: HTMLElement): void }, event: PointerEvent) {
          if (this.highlighted !== id) this.focusOption(event.currentTarget as HTMLElement);
        },
        "x-on:click"(this: { choose(v: string): void }) {
          this.choose(id);
        },
      };
    },
  }));
};

// nqAdminTenants: the dialogs of the tenants console (change plan, suspend, reactivate) and of the plan catalogue (new / edit plan).
// The markup is the React AdminWorkspaces / AdminPlans'; the table and the cards are server-rendered, the state lives here.
//
//   <div x-data="nqAdminTenants({ locale: 'en', plans: { team: { name: 'Team', seats: 15 } }, labels: {…} })"
//        x-on:nq-data-table-action="onAction($event)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   change-plan    { workspace, planId, wait }    resolve, or resolve { error }
//   set-suspended  { workspace, suspended, wait } resolve, or resolve { error }
//   open           { workspace }                  (no wait)
//   save-plan      { plan, wait }                 plan: { id, name, description, priceMonthly, currency, seats, storageGb, features, visible, featured }; resolve, or { error }
// A rejected promise, or nobody listening, shows the generic error. After a success the host re-renders the page.

import type { Magics, Register } from "./types";

interface PlanInfo {
  name: string;
  seats: number | null;
  description?: string;
  priceMonthly?: number;
  currency?: string;
  storageGb?: number | null;
  features?: string[];
  visible?: boolean;
  featured?: boolean;
}

interface AdminTenantsConfig {
  locale?: string;
  currency?: string;
  plans: Record<string, PlanInfo>;
  labels: Record<string, string>;
}

type Outcome = { error?: string } | void | undefined;
type Row = { id: string; name: string; planId: string; status: string; seatsUsed: number };

interface Draft {
  name: string;
  description: string;
  price: string;
  seats: string;
  storage: string;
  features: { text: string }[];
  visible: boolean;
}

interface AdminTenantsState extends Magics {
  config: AdminTenantsConfig;
  root: HTMLElement | null;
  notice: { tone: "success" | "danger"; text: string } | null;
  noticeTimer: ReturnType<typeof setTimeout> | undefined;
  changing: Row | null;
  suspending: Row | null;
  nextPlan: string;
  changeOpen: boolean;
  suspendOpen: boolean;
  planOpen: boolean;
  busy: boolean;
  dialogError: string | null;
  editingId: string | null;
  draft: Draft;
  nameBad: boolean;
  priceBad: boolean;
  seatsBad: boolean;
  storageBad: boolean;
  formError: string | null;
  alive: boolean;
  say(tone: "success" | "danger", text: string): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  failure(run: () => Promise<Outcome>): Promise<string | null>;
  num(value: number): string;
  openChange(row: Row): void;
  openSuspend(row: Row): void;
  reactivate(row: Row): Promise<void>;
}

const blankDraft = (): Draft => ({ name: "", description: "", price: "0", seats: "", storage: "", features: [], visible: true });
const wholeOrEmpty = (v: string) => v.trim() === "" || (/^\d+$/.test(v.trim()) && Number(v) > 0);

export const adminTenants: Register = (Alpine) => {
  Alpine.data("nqAdminTenants", (config: AdminTenantsConfig) => ({
    config,
    root: null as HTMLElement | null,
    notice: null as { tone: "success" | "danger"; text: string } | null,
    noticeTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    changing: null as Row | null,
    suspending: null as Row | null,
    nextPlan: "",
    changeOpen: false,
    suspendOpen: false,
    planOpen: false,
    busy: false,
    dialogError: null as string | null,
    editingId: null as string | null,
    draft: blankDraft(),
    nameBad: false,
    priceBad: false,
    seatsBad: false,
    storageBad: false,
    formError: null as string | null,
    alive: true,
    init(this: AdminTenantsState) {
      this.root = this.$el;
    },
    destroy(this: AdminTenantsState) {
      this.alive = false;
      clearTimeout(this.noticeTimer);
    },
    num(this: AdminTenantsState, value: number) {
      return new Intl.NumberFormat(`${this.config.locale ?? "en"}-u-nu-latn`).format(value);
    },
    say(this: AdminTenantsState, tone: "success" | "danger", text: string) {
      this.notice = { tone, text };
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => (this.notice = null), 6000);
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: AdminTenantsState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** null on success, the error text ("" for a generic failure) otherwise. */
    async failure(this: AdminTenantsState, run: () => Promise<Outcome>) {
      try {
        const result = await run();
        return result && typeof result === "object" && result.error ? result.error : null;
      } catch {
        return "";
      }
    },

    /* ---------------------------------------------------------------- workspaces */
    onAction(this: AdminTenantsState, event: CustomEvent<{ action: string; row: Row }>) {
      const { action, row } = event.detail;
      if (action === "open") this.root?.dispatchEvent(new CustomEvent("open", { bubbles: true, detail: { workspace: row } }));
      else if (action === "plan") this.openChange(row);
      else if (action === "suspend") {
        if (row.status !== "suspended") this.openSuspend(row);
      } else if (action === "reactivate") {
        if (row.status === "suspended") void this.reactivate(row);
      }
    },
    openChange(this: AdminTenantsState, row: Row) {
      this.changing = row;
      this.nextPlan = row.planId;
      this.dialogError = null;
      this.changeOpen = true;
    },
    openSuspend(this: AdminTenantsState, row: Row) {
      this.suspending = row;
      this.dialogError = null;
      this.suspendOpen = true;
    },
    get changeTitle() {
      const self = this as unknown as AdminTenantsState;
      return self.changing ? self.config.labels.changeTitle!.replace("{name}", self.changing.name) : "";
    },
    get suspendTitle() {
      const self = this as unknown as AdminTenantsState;
      return self.suspending ? self.config.labels.suspendTitle!.replace("{name}", self.suspending.name) : "";
    },
    get overSeatsText() {
      const self = this as unknown as AdminTenantsState;
      const plan = self.config.plans[self.nextPlan];
      if (!plan || !self.changing || plan.seats === null || self.changing.seatsUsed <= plan.seats) return "";
      return self.config.labels.overSeats!.replace("{used}", self.num(self.changing.seatsUsed)).replace("{max}", self.num(plan.seats));
    },
    get canChange() {
      const self = this as unknown as AdminTenantsState;
      return Boolean(self.nextPlan) && self.nextPlan !== self.changing?.planId;
    },
    async doChange(this: AdminTenantsState) {
      const row = this.changing;
      const planId = this.nextPlan;
      if (!row || !planId || this.busy) return;
      this.busy = true;
      const failure = await this.failure(() => this.ask("change-plan", { workspace: row, planId }));
      if (!this.alive) return;
      this.busy = false;
      if (failure === null) {
        this.say("success", this.config.labels.planOk!.replace("{name}", row.name).replace("{plan}", this.config.plans[planId]?.name ?? planId));
        this.changeOpen = false;
      } else this.dialogError = failure || this.config.labels.failed!;
    },
    async doSuspend(this: AdminTenantsState) {
      const row = this.suspending;
      if (!row || this.busy) return;
      this.busy = true;
      const failure = await this.failure(() => this.ask("set-suspended", { workspace: row, suspended: true }));
      if (!this.alive) return;
      this.busy = false;
      if (failure === null) {
        this.say("success", this.config.labels.suspendOk!.replace("{name}", row.name));
        this.suspendOpen = false;
      } else this.dialogError = failure || this.config.labels.failed!;
    },
    async reactivate(this: AdminTenantsState, row: Row) {
      const failure = await this.failure(() => this.ask("set-suspended", { workspace: row, suspended: false }));
      if (!this.alive) return;
      if (failure === null) this.say("success", this.config.labels.reactivateOk!.replace("{name}", row.name));
      else this.say("danger", failure || this.config.labels.failed!);
    },

    /* ---------------------------------------------------------------- plans */
    openPlan(this: AdminTenantsState, id: string | null) {
      const plan = id ? this.config.plans[id] : undefined;
      this.editingId = id;
      this.draft = plan
        ? {
            name: plan.name,
            description: plan.description ?? "",
            price: String(plan.priceMonthly ?? 0),
            seats: plan.seats == null ? "" : String(plan.seats),
            storage: plan.storageGb == null ? "" : String(plan.storageGb),
            features: (plan.features ?? []).map((text) => ({ text })),
            visible: plan.visible ?? true,
          }
        : blankDraft();
      this.nameBad = this.priceBad = this.seatsBad = this.storageBad = false;
      this.formError = null;
      this.planOpen = true;
    },
    get planTitle() {
      const self = this as unknown as AdminTenantsState;
      const plan = self.editingId ? self.config.plans[self.editingId] : undefined;
      return plan ? self.config.labels.editPlanTitle!.replace("{name}", plan.name) : self.config.labels.createPlanTitle!;
    },
    get planSubmitLabel() {
      const self = this as unknown as AdminTenantsState;
      return self.editingId ? self.config.labels.savePlan! : self.config.labels.createPlan!;
    },
    async submitPlan(this: AdminTenantsState) {
      if (this.busy) return;
      const d = this.draft;
      this.nameBad = !d.name.trim();
      this.priceBad = d.price.trim() === "" || Number.isNaN(Number(d.price)) || Number(d.price) < 0;
      this.seatsBad = !wholeOrEmpty(d.seats);
      this.storageBad = !wholeOrEmpty(d.storage);
      this.formError = null;
      if (this.nameBad || this.priceBad || this.seatsBad || this.storageBad) return;
      const existing = this.editingId ? this.config.plans[this.editingId] : undefined;
      const plan = {
        id: this.editingId ?? undefined,
        name: d.name.trim(),
        description: d.description.trim() || undefined,
        priceMonthly: Number(d.price),
        currency: existing?.currency ?? this.config.currency,
        seats: d.seats.trim() ? Number(d.seats) : null,
        storageGb: d.storage.trim() ? Number(d.storage) : null,
        features: d.features.map((f) => f.text.trim()).filter(Boolean),
        visible: d.visible,
        featured: existing?.featured,
      };
      this.busy = true;
      const failure = await this.failure(() => this.ask("save-plan", { plan }));
      if (!this.alive) return;
      this.busy = false;
      if (failure === null) {
        this.say("success", (plan.id ? this.config.labels.planSavedOk! : this.config.labels.planCreatedOk!).replace("{name}", plan.name));
        this.planOpen = false;
      } else this.formError = failure || this.config.labels.failed!;
    },
  }));
};

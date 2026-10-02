// nqLeadsInbox: inquiries from your forms with where each came from (UTM, referrer, Google click id), a stage pipeline with counts, a detail
// panel with reply and canned replies, and conversion into a CRM contact. The list is an <x-nq::data-table> fed through x-model (its row
// actions also open as a context menu); the stage buttons, the detail sheet, the convert dialog and the canned picker live here.
//
//   <div x-data="nqLeadsInbox({ leads, canned, can, locale, labels })" @lead-status="$event.detail.wait(…)" @lead-convert="…" @lead-reply="…"> … </div>
//
// It is presentational: every action fires an event on the root with detail `{ …, wait(promise) }`; resolve, or resolve `{ error }` to show it.
// A rejected promise, or nobody listening, shows the generic error. After a success the lead is updated here.
//   lead-status   { id, lead, status }                                -> { error? }   (never "converted")
//   lead-convert  { id, lead, conversion: { contactName, company?, deal? } } -> { error? }   (the lead becomes converted, with its contact, company and deal)
//   lead-reply    { id, lead, message }                               -> { error? }
// Not ported here: the cards view (the list is the table), and the score explainer popover (the score is a number and its band in words).

import { applySnippet, filterSnippets, type CannedSnippet } from "./inbox-logic";
import {
  canConvertLead,
  canMoveLead,
  classifyLeadSource,
  LEAD_PIPELINE,
  LEAD_STATUSES,
  leadAttributionEntries,
  leadPipelineStates,
  leadStatusCounts,
  type LeadAttribution,
  type LeadStatus,
} from "./leads-inbox-logic";
import type { Magics, Register } from "./types";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  budget?: string;
  status: LeadStatus;
  receivedAt: string;
  form?: string;
  attribution?: LeadAttribution;
  score?: number;
  contact?: { id: string; name: string };
  companyRef?: { id: string; name: string };
  deal?: { id: string; name: string };
}
interface Labels {
  statuses: Record<LeadStatus, string>;
  sources: Record<string, string>;
  attrKeys: Record<string, string>;
  bands: { high: string; medium: string; low: string };
  moveTo: string;
  markSpam: string;
  notSpam: string;
  failed: string;
  sent: string;
}
interface Config {
  leads: Lead[];
  canned: CannedSnippet[];
  can: { status: boolean; convert: boolean; reply: boolean };
  locale: string;
  openId: string | null;
  labels: Labels;
}
type Row = Record<string, unknown>;
type Outcome = { error?: string } | void | undefined;

interface Detail {
  open: boolean;
  id: string;
  text: string;
  busy: boolean;
  note: string;
  noteTone: "success" | "danger" | "";
  moveError: string;
}
interface Convert {
  open: boolean;
  id: string;
  name: string;
  withCompany: boolean;
  company: string;
  withDeal: boolean;
  deal: string;
  pending: boolean;
  error: string;
}

interface State extends Magics {
  config: Config;
  leads: Lead[];
  stage: LeadStatus | "all";
  view: { rows: Row[] };
  failure: string;
  detail: Detail;
  convert: Convert;
  snipOpen: boolean;
  snipQuery: string;
  snipActive: number;
  alive: boolean;
  root: HTMLElement | null;
  refresh(): void;
  call(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  lead(id: string): Lead | undefined;
  patch(id: string, change: Partial<Lead>): void;
  openDetail(id: string): void;
  openConvert(id: string): void;
  pickSnippet(s: CannedSnippet): void;
  setStatus(id: string, status: LeadStatus, report: "row" | "detail"): Promise<void>;
  numberText(n: number): string;
  dateText(v: string): string;
}

const fill = (s: string, vars: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "");
const BLANK = {
  id: "", name: "", email: "", phone: "", company: "", message: "", budget: "", form: "", receivedText: "", status: "new" as LeadStatus, hasMessage: false, hasEmail: false, hasPhone: false,
  hasCompany: false, hasBudget: false, hasForm: false, hasScore: false, scoreText: "", sourceKind: "direct", sourceDetail: "", attrEntries: [] as unknown[], noAttr: true, steps: [] as unknown[],
  moves: [] as unknown[], showConvert: false, showSpam: false, spamLabel: "", showRefs: false, contactName: "", companyRefName: "", dealName: "", hasContact: false, hasCompanyRef: false, hasDeal: false,
};

export const leadsInbox: Register = (Alpine) => {
  Alpine.data("nqLeadsInbox", (config: Config) => ({
    config,
    leads: config.leads.map((l) => ({ ...l })),
    stage: "all" as LeadStatus | "all",
    view: { rows: [] as Row[] },
    failure: "",
    detail: { open: false, id: "", text: "", busy: false, note: "", noteTone: "", moveError: "" } as Detail,
    convert: { open: false, id: "", name: "", withCompany: false, company: "", withDeal: false, deal: "", pending: false, error: "" } as Convert,
    snipOpen: false,
    snipQuery: "",
    snipActive: 0,
    alive: true,
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
      this.refresh();
      if (this.config.openId && this.lead(this.config.openId)) this.openDetail(this.config.openId);
    },
    destroy(this: State) {
      this.alive = false;
    },

    /* ---- text helpers ---- */
    numberText(this: State, n: number): string {
      return new Intl.NumberFormat(`${this.config.locale}-u-nu-latn`).format(n);
    },
    dateText(this: State, v: string): string {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat(`${this.config.locale}-u-nu-latn`, { dateStyle: "medium", timeStyle: "short" }).format(d);
    },
    lead(this: State, id: string): Lead | undefined {
      return this.leads.find((l) => l.id === id);
    },
    scoreLabel(this: State, score: number | undefined): string {
      if (score === undefined || score === null) return "—";
      const band = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
      return `${this.numberText(Math.round(score))} · ${this.config.labels.bands[band]}`;
    },

    /* ---- the pipeline and the table rows ---- */
    get counts(): Record<string, number> {
      return leadStatusCounts((this as unknown as State).leads);
    },
    countText(this: State, key: string): string {
      return this.numberText((this as unknown as { counts: Record<string, number> }).counts[key] ?? 0);
    },
    setStage(this: State, stage: LeadStatus | "all") {
      this.stage = stage;
      this.refresh();
    },
    /** The row actions each lead allows (the table's actions-key). */
    actionIds(this: State, l: Lead): string[] {
      const ids = ["open"];
      if (this.config.can.convert && canConvertLead(l.status)) ids.push("convert");
      if (this.config.can.status) {
        for (const s of LEAD_PIPELINE) if (s !== "converted" && canMoveLead(l.status, s)) ids.push(`move-${s}`);
        if (l.status !== "converted") ids.push(l.status === "spam" ? "unspam" : "spam");
      }
      return ids;
    },
    refresh(this: State) {
      const self = this as unknown as { actionIds(l: Lead): string[]; scoreLabel(s: number | undefined): string };
      const shown = this.stage === "all" ? this.leads : this.leads.filter((l) => l.status === this.stage);
      this.view.rows = shown.map((l) => {
        const src = classifyLeadSource(l.attribution);
        return {
          id: l.id,
          name: l.name,
          secondary: l.company || l.email || "",
          searchText: `${l.name} ${l.email ?? ""} ${l.company ?? ""} ${l.message ?? ""} ${l.attribution?.utmCampaign ?? ""} ${l.attribution?.utmSource ?? ""}`,
          sourceKind: src.kind,
          sourceDetail: [src.name, src.campaign].filter(Boolean).join(" · "),
          stage: l.status,
          stageOrder: LEAD_STATUSES.indexOf(l.status),
          scoreText: self.scoreLabel(l.score),
          scoreN: l.score ?? -1,
          receivedAt: l.receivedAt,
          actions: self.actionIds(l),
        };
      });
    },

    /* ---- host calls ---- */
    async call(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (x: Promise<Outcome>) => (pending = Promise.resolve(x)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return await pending;
    },
    patch(this: State, id: string, change: Partial<Lead>) {
      this.leads = this.leads.map((l) => (l.id === id ? { ...l, ...change } : l));
      this.refresh();
    },

    /* ---- the row events ---- */
    onAction(this: State, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      if (action === "open") this.openDetail(row.id);
      else if (action === "convert") this.openConvert(row.id);
      else if (action === "spam") void this.setStatus(row.id, "spam", "row");
      else if (action === "unspam") void this.setStatus(row.id, "new", "row");
      else if (action.startsWith("move-")) void this.setStatus(row.id, action.slice(5) as LeadStatus, "row");
    },
    onRowClick(this: State, event: CustomEvent<{ row: { id: string } }>) {
      this.openDetail(event.detail.row.id);
    },

    async setStatus(this: State, id: string, status: LeadStatus, report: "row" | "detail") {
      const l = this.lead(id);
      if (!l || !this.config.can.status) return;
      if (report === "row") this.failure = "";
      else this.detail.moveError = "";
      let error = "";
      try {
        const out = await this.call("lead-status", { id, lead: { ...l }, status });
        if (out && out.error) error = out.error;
      } catch {
        error = this.config.labels.failed;
      }
      if (!this.alive) return;
      if (error) {
        if (report === "row") this.failure = error;
        else this.detail.moveError = error;
        return;
      }
      this.patch(id, { status });
    },

    /* ---- the detail sheet ---- */
    openDetail(this: State, id: string) {
      this.detail = { open: true, id, text: "", busy: false, note: "", noteTone: "", moveError: "" };
      this.snipOpen = false;
    },
    /** The open lead with everything the sheet shows, as plain fields (blank when none is open). */
    get cur(): Record<string, unknown> {
      const s = this as unknown as State;
      const l = s.lead(s.detail.id);
      if (!l) return BLANK;
      const t = s.config.labels;
      const src = classifyLeadSource(l.attribution);
      const entries = leadAttributionEntries(l.attribution).map((e) => ({ key: e.key, label: t.attrKeys[e.key] ?? e.key, value: e.value, copy: e.key === "gclid" || e.key === "landingPage" }));
      const steps = leadPipelineStates(l.status);
      const moves = s.config.can.status ? LEAD_PIPELINE.filter((x) => x !== "converted" && canMoveLead(l.status, x)).map((x) => ({ status: x, label: fill(t.moveTo, { stage: t.statuses[x] }) })) : [];
      return {
        id: l.id,
        name: l.name,
        email: l.email ?? "",
        phone: l.phone ?? "",
        company: l.company ?? "",
        message: l.message ?? "",
        budget: l.budget ?? "",
        form: l.form ?? "",
        receivedText: s.dateText(l.receivedAt),
        status: l.status,
        hasMessage: !!l.message,
        hasEmail: !!l.email,
        hasPhone: !!l.phone,
        hasCompany: !!l.company,
        hasBudget: !!l.budget,
        hasForm: !!l.form,
        hasScore: l.score !== undefined,
        scoreText: (this as unknown as { scoreLabel(n: number | undefined): string }).scoreLabel(l.score),
        sourceKind: src.kind,
        sourceDetail: [src.name, src.campaign].filter(Boolean).join(" · "),
        attrEntries: entries,
        noAttr: entries.length === 0,
        steps: steps.map((x, i) => ({ status: x.status, label: t.statuses[x.status], state: x.state, done: x.state === "done", current: x.state === "current", arrow: i < steps.length - 1 })),
        moves,
        showConvert: s.config.can.convert && canConvertLead(l.status),
        showSpam: s.config.can.status && l.status !== "converted",
        spamLabel: l.status === "spam" ? t.notSpam : t.markSpam,
        showRefs: l.status === "converted" && !!(l.contact || l.companyRef || l.deal),
        hasContact: !!l.contact,
        hasCompanyRef: !!l.companyRef,
        hasDeal: !!l.deal,
        contactName: l.contact?.name ?? "",
        companyRefName: l.companyRef?.name ?? "",
        dealName: l.deal?.name ?? "",
      };
    },
    closeDetail(this: State) {
      this.detail.open = false;
    },
    move(this: State, status: LeadStatus) {
      void this.setStatus(this.detail.id, status, "detail");
    },
    toggleSpam(this: State) {
      const l = this.lead(this.detail.id);
      if (l) void this.setStatus(l.id, l.status === "spam" ? "new" : "spam", "detail");
    },
    get canSend(): boolean {
      const s = this as unknown as State;
      return s.detail.text.trim() !== "" && !s.detail.busy;
    },
    async send(this: State) {
      const l = this.lead(this.detail.id);
      const message = this.detail.text.trim();
      if (!l || !message || this.detail.busy) return;
      this.detail.busy = true;
      this.detail.note = "";
      this.detail.noteTone = "";
      let error = "";
      try {
        const out = await this.call("lead-reply", { id: l.id, lead: { ...l }, message });
        if (out && out.error) error = out.error;
      } catch {
        error = this.config.labels.failed;
      }
      if (!this.alive) return;
      this.detail.busy = false;
      if (error) {
        this.detail.note = error;
        this.detail.noteTone = "danger";
      } else {
        this.detail.note = this.config.labels.sent;
        this.detail.noteTone = "success";
        this.detail.text = "";
      }
    },

    /* ---- the canned picker ---- */
    get snippetList(): CannedSnippet[] {
      const s = this as unknown as State;
      return filterSnippets(s.config.canned, s.snipQuery);
    },
    pickSnippet(this: State, s: CannedSnippet) {
      const l = this.lead(this.detail.id);
      const body = applySnippet(s.body, { name: l?.name.split(" ")[0] ?? "" });
      this.detail.text = this.detail.text ? `${this.detail.text}\n${body}` : body;
      this.snipOpen = false;
      this.snipQuery = "";
      this.snipActive = 0;
    },
    onSnipKey(this: State, e: KeyboardEvent) {
      const list = (this as unknown as { snippetList: CannedSnippet[] }).snippetList;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.snipActive = Math.min(list.length - 1, this.snipActive + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.snipActive = Math.max(0, this.snipActive - 1);
      } else if (e.key === "Enter" && list[this.snipActive]) {
        e.preventDefault();
        this.pickSnippet(list[this.snipActive]!);
      }
    },

    /* ---- the convert dialog ---- */
    openConvert(this: State, id: string) {
      const l = this.lead(id);
      if (!l || !this.config.can.convert) return;
      this.convert = {
        open: true,
        id,
        name: l.name,
        withCompany: !!l.company,
        company: l.company ?? "",
        withDeal: false,
        deal: l.company ? `${l.company} — ${l.form ?? ""}`.replace(/ — $/, "") : l.name,
        pending: false,
        error: "",
      };
    },
    startConvertFromDetail(this: State) {
      this.openConvert(this.detail.id);
    },
    get convertValid(): boolean {
      const c = (this as unknown as State).convert;
      return c.name.trim() !== "" && (!c.withCompany || c.company.trim() !== "") && (!c.withDeal || c.deal.trim() !== "");
    },
    async submitConvert(this: State) {
      const c = this.convert;
      const l = this.lead(c.id);
      if (!l || c.pending || !(this as unknown as { convertValid: boolean }).convertValid) return;
      c.pending = true;
      c.error = "";
      const conversion = { contactName: c.name.trim(), ...(c.withCompany ? { company: c.company.trim() } : {}), ...(c.withDeal ? { deal: c.deal.trim() } : {}) };
      try {
        const out = await this.call("lead-convert", { id: l.id, lead: { ...l }, conversion });
        if (!this.alive) return;
        if (out && out.error) {
          c.error = out.error;
          return;
        }
        this.patch(l.id, {
          status: "converted",
          contact: { id: `contact-${l.id}`, name: conversion.contactName },
          ...(conversion.company ? { companyRef: { id: `company-${l.id}`, name: conversion.company } } : {}),
          ...(conversion.deal ? { deal: { id: `deal-${l.id}`, name: conversion.deal } } : {}),
        });
        c.open = false;
      } catch {
        if (this.alive) c.error = this.config.labels.failed;
      } finally {
        if (this.alive) c.pending = false;
      }
    },
  }));
};

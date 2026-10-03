// nqWebhooksManager: the endpoints, delivery log and inbound sources of the webhooks manager, with the endpoint form, the secret reveal,
// the delivery detail and the delete / rotate confirmation. The markup is the React WebhooksManager's; each list feeds an <x-nq::data-table> through x-model.
//
//   <div x-data="nqWebhooksManager({ events, endpoints, deliveries, sources, push, can, labels, locale })"
//        @save-endpoint="$event.detail.wait(…)" @delete-endpoint="…" @toggle-endpoint="…"> … </div>
//
// It is presentational: every action fires an event on the root with detail `{ …, wait(promise) }`; resolve, or resolve `{ error }` to show it.
// A rejected promise, or nobody listening, shows the generic error. After a success the list is updated here (a created endpoint takes the
// `id` the handler returns, or a generated one; a new or rotated secret returned as `{ secret }` is shown once).
//   save-endpoint     { id?, name, url, channel, events }   -> { error?, secret?, id? }
//   delete-endpoint   { id }                                -> { error? }
//   toggle-endpoint   { id, enabled }                       -> { error? }   (also the in-cell switch; an error rolls it back)
//   rotate-secret     { id }                                -> { error?, secret? }
//   test-endpoint     { id }                                -> { ok, code?, durationMs?, error? }
//   replay-delivery   { id }                                -> { error? }
//   set-interval      { id, seconds }                       -> { error? }   (also the in-cell select)
//   poll-source       { id }                                -> { error?, lastStatus?: 'ok' | 'error', lastError? }
//   dismiss-push      {}

import { copyText } from "./copy-button";
import { isSourceStale, maskSecret, prettyJson, validateEndpoint, validateEndpointUrl, type DeliveryStatus } from "./webhooks-manager-logic";
import type { Magics, Register } from "./types";

type When = string | number | undefined;

interface Event_ {
  id: string;
  label: string;
  group?: string;
}
interface Endpoint {
  id: string;
  name: string;
  url: string;
  channel?: string;
  events: string[];
  enabled: boolean;
  secretLast4: string;
  lastDeliveryAt?: When;
  lastDeliveryStatus?: DeliveryStatus;
}
interface Delivery {
  id: string;
  endpointId: string;
  event: string;
  status: DeliveryStatus;
  code?: number;
  durationMs?: number;
  at: When;
  attempt: number;
  request?: string;
  response?: string;
  error?: string;
}
interface Source {
  id: string;
  name: string;
  target?: string;
  intervalSeconds: number;
  lastStatus?: "ok" | "error";
  lastAt?: When;
  lastError?: string;
}

interface Labels {
  genericError: string;
  allEvents: string;
  eventsOne: string;
  eventsOther: string;
  testOk: string;
  testFail: string;
  replayed: string;
  polled: string;
  rotateTitle: string;
  rotateBody: string;
  rotateConfirm: string;
  deleteTitle: string;
  deleteBody: string;
  deleteConfirm: string;
  revealTitle: string;
  createTitle: string;
  editTitle: string;
  save: string;
  create: string;
  nameRequired: string;
  eventsRequired: string;
  urlProblems: Record<"empty" | "invalid" | "insecure" | "credentials", string>;
  statuses: Record<DeliveryStatus, string>;
  ms: string;
}

interface Config {
  events: Event_[];
  endpoints: Endpoint[];
  deliveries: Delivery[];
  sources: Source[];
  push: { url: string; token: string } | null;
  can: { toggle: boolean; rotate: boolean; test: boolean; replay: boolean; interval: boolean; poll: boolean };
  locale: string;
  labels: Labels;
}

type Row = Record<string, unknown>;
type Outcome = { error?: string; secret?: string; id?: string; ok?: boolean; code?: number; durationMs?: number; lastStatus?: "ok" | "error"; lastError?: string } | void | undefined;

interface State extends Magics {
  config: Config;
  endpoints: Endpoint[];
  deliveries: Delivery[];
  sources: Source[];
  ep: { rows: Row[] };
  dl: { rows: Row[]; filter: string };
  src: { rows: Row[] };
  pushShown: boolean;
  failure: string | null;
  notice: { tone: "success" | "danger"; text: string } | null;
  busy: Record<string, boolean>;
  form: {
    open: boolean;
    editingId: string | null;
    name: string;
    url: string;
    channel: string;
    sel: boolean[];
    touched: boolean;
    pending: boolean;
    error: string | null;
    invalid: { name: boolean; url: boolean };
    urlMessage: string;
    eventsInvalid: boolean;
  };
  reveal: { open: boolean; title: string; secret: string; copied: boolean };
  confirm: { open: boolean; title: string; body: string; label: string; kind: "delete" | "rotate"; id: string };
  detail: { open: boolean; id: string; event: string; name: string; status: string; code: string; duration: string; attempt: string; at: string; error: string; request: string; response: string; canReplay: boolean };
  alive: boolean;
  root: HTMLElement | null;
}

type Self = State & Methods;
interface Methods {
  refresh(kind?: "ep" | "dl" | "src"): void;
  call(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run<R>(key: string, task: () => Promise<R>): Promise<R | undefined>;
  endpointName(id: string): string;
  toggle(id: string, enabled: boolean): Promise<{ error: string } | undefined>;
  setInterval(id: string, seconds: number): Promise<{ error: string } | undefined>;
  openForm(id: string | null): void;
  openDetail(id: string): void;
  askDelete(id: string): void;
  askRotate(id: string): void;
  sendTest(id: string): Promise<void>;
  replay(id: string): Promise<void>;
  poll(id: string): Promise<void>;
  fail(result: Outcome): boolean;
  onFormInput(): void;
  showSecret(secret: string): void;
}

const fill = (template: string, vars: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));
const time = (v: When): number => (v === undefined || v === "" ? 0 : new Date(v).getTime());
let seq = 0;
const newId = () => `new-${Date.now().toString(36)}${++seq}`;

/** The YYYY-MM-DD the data table's date column takes ("" for never). */
export function webhookDay(v: When): string {
  if (v === undefined || v === null || v === "") return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const webhooksManager: Register = (Alpine) => {
  Alpine.data("nqWebhooksManager", (config: Config) => ({
    config,
    endpoints: config.endpoints.map((e) => ({ ...e, events: [...e.events] })),
    deliveries: config.deliveries.map((d) => ({ ...d })),
    sources: config.sources.map((s) => ({ ...s })),
    ep: { rows: [] as Row[] },
    dl: { rows: [] as Row[], filter: "all" },
    src: { rows: [] as Row[] },
    pushShown: config.push !== null,
    failure: null as string | null,
    notice: null as State["notice"],
    busy: {} as Record<string, boolean>,
    form: { open: false, editingId: null, name: "", url: "", channel: "", sel: [], touched: false, pending: false, error: null, invalid: { name: false, url: false }, urlMessage: "", eventsInvalid: false } as State["form"],
    reveal: { open: false, title: "", secret: "", copied: false } as State["reveal"],
    confirm: { open: false, title: "", body: "", label: "", kind: "delete", id: "" } as State["confirm"],
    detail: { open: false, id: "", event: "", name: "", status: "pending", code: "", duration: "", attempt: "", at: "", error: "", request: "", response: "", canReplay: false } as State["detail"],
    alive: true,
    root: null as HTMLElement | null,

    init(this: Self) {
      this.root = this.$el;
      this.refresh();
      this.$watch("dl.filter", () => this.refresh("dl"));
    },
    destroy(this: Self) {
      this.alive = false;
    },

    /* ---- rows ---- */
    endpointRows(this: Self): Row[] {
      const l = this.config.labels;
      return [...this.endpoints]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({
          id: e.id,
          name: e.name,
          url: e.url,
          channel: e.channel ?? "",
          events: e.events.length > 0 && e.events.length === this.config.events.length ? l.allEvents : fill(e.events.length === 1 ? l.eventsOne : l.eventsOther, { n: e.events.length }),
          secret: maskSecret(e.secretLast4),
          lastStatus: e.lastDeliveryAt === undefined ? "never" : (e.lastDeliveryStatus ?? ""),
          last: webhookDay(e.lastDeliveryAt),
          enabled: e.enabled,
        }));
    },
    deliveryRows(this: Self): Row[] {
      const shown = this.dl.filter === "all" ? this.deliveries : this.deliveries.filter((d) => d.endpointId === this.dl.filter);
      return [...shown]
        .sort((a, b) => time(b.at) - time(a.at))
        .map((d) => ({
          id: d.id,
          status: d.status,
          event: d.event,
          endpoint: this.endpointName(d.endpointId),
          code: d.code === undefined ? "" : String(d.code),
          duration: d.durationMs ?? "",
          attempt: d.attempt,
          when: webhookDay(d.at),
        }));
    },
    sourceRows(this: Self): Row[] {
      return [...this.sources]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((s) => ({
          id: s.id,
          name: s.name,
          target: s.target ?? "",
          interval: String(s.intervalSeconds),
          status: !s.lastStatus ? "never" : s.lastStatus === "error" ? "error" : isSourceStale(s.lastAt, s.intervalSeconds) ? "stale" : "ok",
          error: s.lastStatus === "error" ? (s.lastError ?? "") : "",
          last: webhookDay(s.lastAt),
        }));
    },
    refresh(this: Self, kind?: "ep" | "dl" | "src") {
      const s = this as unknown as { endpointRows(): Row[]; deliveryRows(): Row[]; sourceRows(): Row[] };
      if (!kind || kind === "ep") this.ep.rows = s.endpointRows();
      if (!kind || kind === "dl") this.dl.rows = s.deliveryRows();
      if (!kind || kind === "src") this.src.rows = s.sourceRows();
    },
    endpointName(this: State, id: string): string {
      return this.endpoints.find((e) => e.id === id)?.name ?? id;
    },

    /* ---- host calls ---- */
    async call(this: Self, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (x: Promise<Outcome>) => (pending = Promise.resolve(x)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return await pending;
    },
    /** Runs one host action with a busy flag. A throw shows the generic error; returns undefined then. */
    async run<R>(this: Self, key: string, task: () => Promise<R>): Promise<R | undefined> {
      this.failure = null;
      this.busy = { ...this.busy, [key]: true };
      try {
        return await task();
      } catch {
        if (this.alive) this.failure = this.config.labels.genericError;
        return undefined;
      } finally {
        if (this.alive) {
          const { [key]: _gone, ...rest } = this.busy;
          this.busy = rest;
        }
      }
    },
    /** True (and shown) when the result carries an error. */
    fail(this: Self, result: Outcome): boolean {
      if (result && result.error) {
        this.failure = result.error;
        return true;
      }
      return false;
    },
    showSecret(this: Self, secret: string) {
      this.reveal = { open: true, title: this.config.labels.revealTitle, secret, copied: false };
    },
    async copySecret(this: Self) {
      if (await copyText(this.reveal.secret)) {
        this.reveal.copied = true;
        setTimeout(() => {
          if (this.alive) this.reveal.copied = false;
        }, 1500);
      }
    },

    /* ---- the in-cell edits and the row events ---- */
    /** A switch or an interval changed in a cell: the table waits for event.detail.promise and rolls back on an error. */
    onEdit(this: Self, event: CustomEvent<{ row: { id: string }; column: string; value: unknown; promise?: Promise<unknown> }>) {
      const { row, column, value } = event.detail;
      const m = this as unknown as Methods;
      if (column === "enabled") event.detail.promise = m.toggle(row.id, value === true);
      else if (column === "interval") event.detail.promise = m.setInterval(row.id, Number(value));
    },
    async toggle(this: Self, id: string, enabled: boolean) {
      try {
        const r = await this.call("toggle-endpoint", { id, enabled });
        if (r && r.error) return { error: r.error };
        const e = this.endpoints.find((x) => x.id === id);
        if (e) e.enabled = enabled;
        return undefined;
      } catch {
        return { error: this.config.labels.genericError };
      }
    },
    async setInterval(this: Self, id: string, seconds: number) {
      try {
        const r = await this.call("set-interval", { id, seconds });
        if (r && r.error) return { error: r.error };
        const s = this.sources.find((x) => x.id === id);
        if (s) s.intervalSeconds = seconds;
        return undefined;
      } catch {
        return { error: this.config.labels.genericError };
      }
    },
    onAction(this: Self, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const m = this as unknown as Methods;
      const locked = this.busy[row.id] || this.busy[`test:${row.id}`];
      switch (action) {
        case "ep-test":
          if (!locked) void m.sendTest(row.id);
          break;
        case "ep-edit":
          if (!locked) m.openForm(row.id);
          break;
        case "ep-rotate":
          if (!locked) m.askRotate(row.id);
          break;
        case "ep-delete":
          if (!locked) m.askDelete(row.id);
          break;
        case "dl-view":
          m.openDetail(row.id);
          break;
        case "dl-replay":
          void m.replay(row.id);
          break;
        case "src-poll":
          void m.poll(row.id);
          break;
      }
    },
    onRowClick(this: Self, event: CustomEvent<{ row: { id: string } }>) {
      (this as unknown as Methods).openDetail(event.detail.row.id);
    },

    /* ---- endpoint form ---- */
    get formTitle(): string {
      const s = this as unknown as State;
      return s.form.editingId ? s.config.labels.editTitle : s.config.labels.createTitle;
    },
    get formSubmit(): string {
      const s = this as unknown as State;
      return s.form.editingId ? s.config.labels.save : s.config.labels.create;
    },
    openForm(this: Self, id: string | null) {
      const e = id ? this.endpoints.find((x) => x.id === id) : undefined;
      this.form = {
        open: true,
        editingId: e ? e.id : null,
        name: e?.name ?? "",
        url: e?.url ?? "",
        channel: e?.channel ?? "",
        sel: this.config.events.map((ev) => (e ? e.events.includes(ev.id) : false)),
        touched: false,
        pending: false,
        error: null,
        invalid: { name: false, url: false },
        urlMessage: "",
        eventsInvalid: false,
      };
    },
    /** The ids ticked in the form. */
    selectedEvents(this: Self): string[] {
      return this.config.events.filter((_ev, i) => this.form.sel[i]).map((ev) => ev.id);
    },
    /** A group's All button: ticks every event of the group, or clears them when all are ticked. */
    toggleGroup(this: Self, indexes: number[]) {
      const all = indexes.every((i) => this.form.sel[i]);
      const next = [...this.form.sel];
      for (const i of indexes) next[i] = !all;
      this.form.sel = next;
      this.onFormInput();
    },
    groupCount(this: Self, indexes: number[]): string {
      return `${indexes.filter((i) => this.form.sel[i]).length}/${indexes.length}`;
    },
    onFormInput(this: Self) {
      if (this.form.touched) (this as unknown as { validateForm(): string[] }).validateForm();
    },
    validateForm(this: Self): string[] {
      const f = this.form;
      const draft = { name: f.name, url: f.url, events: (this as unknown as Methods & { selectedEvents(): string[] }).selectedEvents() };
      const problems = validateEndpoint(draft);
      const check = validateEndpointUrl(f.url);
      f.invalid = { name: problems.includes("name"), url: problems.includes("url") };
      f.urlMessage = check.ok ? "" : this.config.labels.urlProblems[check.problem];
      f.eventsInvalid = problems.includes("events");
      return problems;
    },
    async saveForm(this: Self) {
      const f = this.form;
      f.touched = true;
      const self = this as unknown as { validateForm(): string[]; selectedEvents(): string[] };
      if (self.validateForm().length || f.pending) return;
      f.pending = true;
      f.error = null;
      const input = { ...(f.editingId ? { id: f.editingId } : {}), name: f.name.trim(), url: f.url.trim(), channel: f.channel.trim(), events: self.selectedEvents() };
      try {
        const r = await this.call("save-endpoint", input);
        if (!this.alive) return;
        if (r && r.error) {
          f.error = r.error;
          return;
        }
        if (f.editingId) {
          const e = this.endpoints.find((x) => x.id === f.editingId);
          if (e) Object.assign(e, { name: input.name, url: input.url, channel: input.channel || undefined, events: input.events });
        } else {
          const secret = r && r.secret ? r.secret : "";
          this.endpoints = [...this.endpoints, { id: (r && r.id) || newId(), name: input.name, url: input.url, channel: input.channel || undefined, events: input.events, enabled: true, secretLast4: secret.slice(-4) }];
        }
        f.open = false;
        this.refresh();
        if (r && r.secret) this.showSecret(r.secret);
      } catch {
        if (this.alive) f.error = this.config.labels.genericError;
      } finally {
        if (this.alive) f.pending = false;
      }
    },

    /* ---- confirmations ---- */
    askDelete(this: Self, id: string) {
      const l = this.config.labels;
      this.confirm = { open: true, title: fill(l.deleteTitle, { name: this.endpointName(id) }), body: l.deleteBody, label: l.deleteConfirm, kind: "delete", id };
    },
    askRotate(this: Self, id: string) {
      const l = this.config.labels;
      this.confirm = { open: true, title: fill(l.rotateTitle, { name: this.endpointName(id) }), body: l.rotateBody, label: l.rotateConfirm, kind: "rotate", id };
    },
    /** Runs after the dialog's own action button has closed it. */
    async runConfirm(this: Self) {
      const { kind, id } = this.confirm;
      if (kind === "delete") {
        const r = await this.run(id, () => this.call("delete-endpoint", { id }));
        if (!this.alive || (r === undefined && this.failure)) return;
        if (this.fail(r)) return;
        this.endpoints = this.endpoints.filter((e) => e.id !== id);
        this.deliveries = this.deliveries.filter((d) => d.endpointId !== id);
        if (this.dl.filter === id) this.dl.filter = "all";
        this.refresh();
      } else {
        const r = await this.run(id, () => this.call("rotate-secret", { id }));
        if (!this.alive || (r === undefined && this.failure)) return;
        if (this.fail(r)) return;
        if (r && r.secret) {
          const e = this.endpoints.find((x) => x.id === id);
          if (e) e.secretLast4 = r.secret.slice(-4);
          this.refresh("ep");
          this.showSecret(r.secret);
        }
      }
    },

    /* ---- test, replay, poll ---- */
    async sendTest(this: Self, id: string) {
      this.notice = null;
      const name = this.endpointName(id);
      const r = (await this.run(`test:${id}`, () => this.call("test-endpoint", { id }))) as Outcome;
      if (!r || !this.alive) return;
      const l = this.config.labels;
      if (r.ok) this.notice = { tone: "success", text: fill(l.testOk, { name, code: r.code ?? 200, ms: r.durationMs ?? 0 }) };
      else this.notice = { tone: "danger", text: fill(l.testFail, { name, detail: r.error ?? (r.code ? `HTTP ${r.code}` : "") }).trim() };
    },
    async replay(this: Self, id: string) {
      const d = this.deliveries.find((x) => x.id === id);
      if (!d || d.status === "pending" || this.busy[id]) return;
      this.notice = null;
      const r = await this.run(id, () => this.call("replay-delivery", { id }));
      if (!this.alive || (r === undefined && this.failure)) return;
      if (this.fail(r)) return;
      this.notice = { tone: "success", text: fill(this.config.labels.replayed, { name: this.endpointName(d.endpointId) }) };
    },
    async replayFromDetail(this: Self) {
      await (this as unknown as Methods).replay(this.detail.id);
      this.detail.open = false;
    },
    async poll(this: Self, id: string) {
      const s = this.sources.find((x) => x.id === id);
      const key = `poll:${id}`;
      if (!s || this.busy[key]) return;
      this.notice = null;
      const r = await this.run(key, () => this.call("poll-source", { id }));
      if (!this.alive || (r === undefined && this.failure)) return;
      if (this.fail(r)) return;
      s.lastAt = Date.now();
      s.lastStatus = (r && r.lastStatus) || "ok";
      s.lastError = s.lastStatus === "error" ? (r && r.lastError) || "" : undefined;
      this.refresh("src");
      this.notice = { tone: "success", text: fill(this.config.labels.polled, { name: s.name }) };
    },

    /* ---- delivery detail ---- */
    openDetail(this: Self, id: string) {
      const d = this.deliveries.find((x) => x.id === id);
      if (!d) return;
      const l = this.config.labels;
      this.detail = {
        open: true,
        id: d.id,
        event: d.event,
        name: this.endpointName(d.endpointId),
        status: d.status,
        code: d.code === undefined ? "" : String(d.code),
        duration: d.durationMs === undefined ? "" : `${new Intl.NumberFormat(`${this.config.locale}-u-nu-latn`).format(d.durationMs)} ${l.ms}`,
        attempt: new Intl.NumberFormat(`${this.config.locale}-u-nu-latn`).format(d.attempt),
        at: new Intl.DateTimeFormat(`${this.config.locale}-u-nu-latn`, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(d.at as string | number)),
        error: d.error ?? "",
        request: prettyJson(d.request),
        response: prettyJson(d.response),
        canReplay: this.config.can.replay && d.status !== "pending",
      };
    },

    dismissPush(this: Self) {
      this.pushShown = false;
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("dismiss-push", { bubbles: true, detail: { wait: () => undefined } }));
    },
  }));
};

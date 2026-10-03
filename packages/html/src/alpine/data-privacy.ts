// nqDataPrivacy: export your data (request, follow, download) and delete the account with a grace period.
// nqCancelDeletion: the public "keep my account" page. The markup is server-rendered (<x-nq::data-privacy>,
// <x-nq::data-privacy.cancel-page>); the state lives here. Each action fires an event on the root with detail
// `{ …, wait(promise) }`; the host does the work:
//
//   request-export     { wait }            resolve { request } or { error }
//   poll-export        { id, wait }        resolve the current request; only fired when `poll` is set
//   download-export    { request, wait }   resolve when the download started
//   schedule-deletion  { wait }            resolve nothing, or { scheduledFor } to show the real date
//   cancel-deletion    { wait }            resolve nothing, or { error } to keep the notice
//
// A rejected promise, or nobody listening, shows the generic error. Polling backs off (3 s growing by half, to 30 s)
// and stops after three failed checks.

import type { Magics, Register } from "./types";

type Status = "queued" | "processing" | "ready" | "failed" | "expired";
type Req = { id: string; status: Status; requestedAt: string; completedAt?: string | null; expiresAt?: string | null; sizeBytes?: number; progress?: number };
type Labels = Record<string, string> & { status: Record<Status, string> };
type Config = {
  request?: Req | null;
  canRequest?: boolean;
  canDownload?: boolean;
  poll?: boolean;
  interval?: number;
  scheduledFor?: string | null;
  graceDays?: number;
  now?: string | null;
  locale?: string;
  labels: Labels;
};
type Outcome = { error?: string; request?: Req; scheduledFor?: string } | void | undefined;

const DAY = 86_400_000;

async function ask(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<Outcome> {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  if (!pending) throw new Error("no listener");
  return pending;
}

const active = (s: Status | "") => s === "queued" || s === "processing";
const delay = (attempt: number, base: number) => Math.min(30_000, Math.round(base * 1.5 ** Math.max(0, attempt)));

function size(bytes: number, locale: string) {
  const ar = locale.startsWith("ar");
  const units = ar ? ["ب", "ك.ب", "م.ب", "ج.ب", "ت.ب"] : ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: i === 0 ? 0 : 1, numberingSystem: "latn" }).format(v)} ${units[i]}`;
}

interface State extends Magics {
  config: Config;
  req: Req | null;
  busy: "" | "request" | "download";
  error: string | null;
  stalled: boolean;
  date: string | null;
  cancelBusy: boolean;
  notice: { tone: "success" | "danger"; text: string } | null;
  root: HTMLElement | null;
  timer: ReturnType<typeof setTimeout> | undefined;
  run: number;
  alive: boolean;
  status: Status | "";
  statusLabel: string;
  isActive: boolean;
  canAsk: boolean;
  canDownload: boolean;
  showReady: boolean;
  progressValue: number | null;
  sizeText: string;
  phase: "none" | "pending" | "due";
  left: number;
  leftText: string;
  elapsed: number;
  clock(): Date;
  fmt(value: string | null | undefined, kind: "dt" | "d" | "long"): string;
  startPolling(): void;
  recheck(): void;
  ask(): Promise<void>;
  download(): Promise<void>;
  schedule(): Promise<Outcome>;
  cancel(): Promise<void>;
}

export const dataPrivacy: Register = (Alpine) => {
  Alpine.data("nqDataPrivacy", (config: Config) => ({
    config,
    req: (config.request ?? null) as Req | null,
    busy: "" as "" | "request" | "download",
    error: null as string | null,
    stalled: false,
    date: (config.scheduledFor ?? null) as string | null,
    cancelBusy: false,
    notice: null as { tone: "success" | "danger"; text: string } | null,
    root: null as HTMLElement | null,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    run: 0,
    alive: true,

    init(this: State) {
      this.root = this.$el;
      this.startPolling();
    },
    destroy(this: State) {
      this.alive = false;
      clearTimeout(this.timer);
    },

    get status() {
      const s = this as unknown as State;
      return s.req?.status ?? "";
    },
    get statusLabel() {
      const s = this as unknown as State;
      return s.req ? s.config.labels.status[s.req.status] : "";
    },
    get isActive() {
      const s = this as unknown as State;
      return active(s.status);
    },
    get canAsk() {
      const s = this as unknown as State;
      return !!s.config.canRequest && (!s.req || s.req.status === "failed" || s.req.status === "expired");
    },
    get canDownload() {
      const s = this as unknown as State;
      return !!s.config.canDownload && s.status === "ready";
    },
    get showReady() {
      const s = this as unknown as State;
      return s.status === "ready";
    },
    get progressValue() {
      const s = this as unknown as State;
      return s.req?.progress === undefined ? null : Math.round(s.req.progress * 100);
    },
    get sizeText() {
      const s = this as unknown as State;
      return s.req?.sizeBytes ? size(s.req.sizeBytes, s.config.locale ?? "en") : "";
    },

    clock(this: State) {
      return this.config.now ? new Date(this.config.now) : new Date();
    },
    fmt(this: State, value: string | null | undefined, kind: "dt" | "d" | "long") {
      if (!value) return "";
      const opts: Intl.DateTimeFormatOptions = kind === "dt" ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: kind === "long" ? "long" : "medium" };
      return new Intl.DateTimeFormat(this.config.locale ?? "en", opts).format(new Date(value));
    },

    get phase() {
      const s = this as unknown as State;
      if (!s.date) return "none";
      return new Date(s.date).getTime() > s.clock().getTime() ? "pending" : "due";
    },
    get left() {
      const s = this as unknown as State;
      return s.date ? Math.max(0, Math.ceil((new Date(s.date).getTime() - s.clock().getTime()) / DAY)) : 0;
    },
    get leftText() {
      const s = this as unknown as State;
      const L = s.config.labels;
      if (s.left <= 1) return L.lessThanDay!;
      return L.daysLeft!.replace("{n}", String(s.left));
    },
    get elapsed() {
      const s = this as unknown as State;
      const total = (s.config.graceDays ?? 30) * DAY;
      if (!s.date || total <= 0) return 100;
      const left = new Date(s.date).getTime() - s.clock().getTime();
      return Math.round(Math.min(1, Math.max(0, 1 - left / total)) * 100);
    },

    startPolling(this: State) {
      clearTimeout(this.timer);
      this.run += 1;
      const run = this.run;
      const id = this.req && active(this.req.status) ? this.req.id : null;
      this.stalled = false;
      if (!id || !this.config.poll) return;
      let attempt = 0;
      let failures = 0;
      const tick = () => {
        this.timer = setTimeout(async () => {
          try {
            const next = (await ask(this.root!, "poll-export", { id })) as Req | undefined;
            if (!this.alive || run !== this.run || !next) return;
            failures = 0;
            this.req = next;
            if (active(next.status)) {
              attempt += 1;
              tick();
            }
          } catch {
            if (!this.alive || run !== this.run) return;
            failures += 1;
            if (failures >= 3) this.stalled = true;
            else {
              attempt += 1;
              tick();
            }
          }
        }, delay(attempt, this.config.interval ?? 3000));
      };
      tick();
    },
    recheck(this: State) {
      this.startPolling();
    },

    async ask(this: State) {
      this.busy = "request";
      this.error = null;
      try {
        const r = await ask(this.root!, "request-export", {});
        if (r && r.error !== undefined) this.error = r.error;
        else if (r && r.request) {
          this.req = r.request;
          this.startPolling();
        } else this.error = this.config.labels.requestFailed!;
      } catch {
        this.error = this.config.labels.requestFailed!;
      } finally {
        this.busy = "";
      }
    },
    async download(this: State) {
      if (!this.req) return;
      this.busy = "download";
      this.error = null;
      try {
        await ask(this.root!, "download-export", { request: this.req });
      } catch {
        this.error = this.config.labels.downloadFailed!;
      } finally {
        this.busy = "";
      }
    },

    /** Called from the danger zone's confirm. Resolve to close its dialog; reject or resolve { error } to keep it open. */
    async schedule(this: State) {
      const r = await ask(this.root!, "schedule-deletion", {});
      if (r && r.error) return r;
      this.date = (r && r.scheduledFor) || new Date(this.clock().getTime() + (this.config.graceDays ?? 30) * DAY).toISOString();
      this.notice = null;
      return undefined;
    },
    async cancel(this: State) {
      this.cancelBusy = true;
      this.notice = null;
      try {
        const r = await ask(this.root!, "cancel-deletion", {});
        if (r && r.error) this.notice = { tone: "danger", text: r.error };
        else {
          this.date = null;
          this.notice = { tone: "success", text: this.config.labels.cancelledOk! };
        }
      } catch {
        this.notice = { tone: "danger", text: this.config.labels.cancelFailed! };
      } finally {
        this.cancelBusy = false;
      }
    },
  }));

  Alpine.data("nqCancelDeletion", (config: { state: "ready" | "cancelled" | "expired" | "invalid"; dateText?: string; labels: Record<string, string> }) => ({
    config,
    get title(): string {
      const L = config.labels;
      const s = (this as unknown as { shown: string }).shown;
      return (s === "ready" ? L.pageReadyTitle : s === "cancelled" ? L.pageDoneTitle : s === "expired" ? L.pageExpiredTitle : L.pageInvalidTitle)!;
    },
    get description(): string {
      const L = config.labels;
      const s = (this as unknown as { shown: string }).shown;
      return (s === "ready" ? L.pageReadyBody!.replace("{date}", config.dateText ?? "") : s === "cancelled" ? L.pageDoneBody : s === "expired" ? L.pageExpiredBody : L.pageInvalidBody)!;
    },
    done: false,
    busy: false,
    error: null as string | null,
    root: null as HTMLElement | null,
    init(this: Magics & { root: HTMLElement | null }) {
      this.root = this.$el;
    },
    get shown(): string {
      return (this as unknown as { done: boolean }).done ? "cancelled" : config.state;
    },
    async keep(this: Magics & { root: HTMLElement | null; busy: boolean; error: string | null; done: boolean; config: { labels: Record<string, string> } }) {
      this.busy = true;
      this.error = null;
      try {
        const r = await ask(this.root!, "cancel-deletion", {});
        if (r && r.error) this.error = r.error;
        else this.done = true;
      } catch {
        this.error = this.config.labels.cancelFailed!;
      } finally {
        this.busy = false;
      }
    },
  }));
};

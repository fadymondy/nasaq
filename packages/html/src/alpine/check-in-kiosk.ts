// nqCheckInKiosk: the self-service check-in screen. The markup is the React CheckInKiosk's, rendered by <x-nq::check-in-kiosk>; this module is its
// state machine: input -> busy -> (choose | message | ticket). A person scans a booking code (a handheld scanner types it and presses Enter) or types a
// phone number on the number pad; a match becomes a queue ticket. The kiosk never fetches by itself: it dispatches a bubbling `nq-check-in` event with
// { booking?, phone? }, and a listener sets `event.detail.promise` to a Promise of { entry: { ticket }, position?, waitMinutes? } or { error }.
//
//   <div data-slot="check-in-kiosk" x-data="nqCheckInKiosk({ bookings, locale: 'en', t: { … } })"
//        x-on:nq-check-in="$event.detail.promise = fetch('/check-in', { method: 'POST', body: JSON.stringify($event.detail) }).then((r) => r.json())">
//
// Config: bookings, allowWalkIn (true), earlyMinutes (60), windowMinutes (240), resetSeconds (20), now (null: the real clock), defaultMode ("scan"),
// locale, t (the words; placeholders :n :time :opens :name :ahead are filled here).

import { findBookingForCheckIn, phoneDigits, type KioskBooking } from "./check-in-kiosk-logic";
import type { Magics, Register } from "./types";

export interface CheckInKioskConfig {
  bookings?: KioskBooking[];
  allowWalkIn?: boolean;
  earlyMinutes?: number;
  windowMinutes?: number;
  resetSeconds?: number;
  now?: number | null;
  defaultMode?: "scan" | "phone";
  locale?: string;
  t?: Record<string, string>;
}

interface Result {
  entry: { ticket: string };
  position?: number;
  waitMinutes?: number;
}

interface KioskState extends Magics {
  readonly phoneReady: boolean;
  cfg: Required<Omit<CheckInKioskConfig, "now">> & { now: number | null };
  mode: "scan" | "phone";
  code: string;
  phone: string;
  view: "input" | "busy" | "choose" | "message" | "ticket";
  busyText: "finding" | "checkingIn";
  choices: KioskBooking[];
  message: string;
  walkIn: boolean;
  result: Result | null;
  left: number;
  timer: ReturnType<typeof setInterval> | null;
  root: HTMLElement;
  qr: string;
  sentence(key: string, vars?: Record<string, string | number>): string;
  fmt(ms: number): string;
  setView(view: KioskState["view"]): void;
  reset(): void;
  checkIn(request: { booking?: KioskBooking; phone?: string }): Promise<void>;
  lookup(input: string): Promise<void>;
}

const word = (s: string, vars: Record<string, string | number> = {}) => s.replace(/:(\w+)/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

export const checkInKiosk: Register = (Alpine) => {
  Alpine.data("nqCheckInKiosk", (config: CheckInKioskConfig = {}) => ({
    cfg: {
      bookings: config.bookings ?? [],
      allowWalkIn: config.allowWalkIn ?? true,
      earlyMinutes: config.earlyMinutes ?? 60,
      windowMinutes: config.windowMinutes ?? 240,
      resetSeconds: config.resetSeconds ?? 20,
      now: config.now ?? null,
      defaultMode: config.defaultMode ?? "scan",
      locale: config.locale ?? "en",
      t: config.t ?? {},
    },
    mode: config.defaultMode ?? "scan",
    code: "",
    phone: "",
    view: "input",
    busyText: "checkingIn",
    choices: [] as KioskBooking[],
    message: "",
    walkIn: false,
    result: null as Result | null,
    left: 0,
    timer: null as ReturnType<typeof setInterval> | null,
    root: null as unknown as HTMLElement,
    qr: "",

    init(this: KioskState) {
      this.root = this.$el;
      this.$watch("view", (v: string) => {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        if (v === "ticket" && this.cfg.resetSeconds > 0) {
          let s = this.cfg.resetSeconds;
          this.left = s;
          this.timer = setInterval(() => {
            s -= 1;
            this.left = s;
            if (s <= 0) this.reset();
          }, 1000);
        }
        if (v === "input" && this.mode === "scan") this.$nextTick(() => this.$refs.code?.focus());
      });
    },
    destroy(this: KioskState) {
      if (this.timer) clearInterval(this.timer);
    },

    sentence(this: KioskState, key: string, vars: Record<string, string | number> = {}) {
      return word(this.cfg.t[key] ?? key, vars);
    },
    setView(this: KioskState, view: KioskState["view"]) {
      this.view = view;
    },
    get busy(): boolean {
      return (this as unknown as KioskState).view === "busy";
    },
    get phoneReady(): boolean {
      return phoneDigits((this as unknown as KioskState).phone).length >= 9;
    },
    get findLabel(): string {
      const s = this as unknown as KioskState;
      return s.view === "busy" ? s.sentence(s.busyText) : s.sentence("find");
    },
    get messageText(): string {
      const s = this as unknown as KioskState;
      return s.message + (s.walkIn ? ` ${s.sentence("noneWalkIn")}` : "");
    },
    get ahead(): string {
      const s = this as unknown as KioskState;
      const n = (s.result?.position ?? 1) - 1;
      return n <= 0 ? s.sentence("aheadNext") : n === 1 ? s.sentence("aheadOne") : n === 2 && s.cfg.t.aheadTwo ? s.sentence("aheadTwo") : s.sentence("aheadMany", { n });
    },
    get waitText(): string {
      const s = this as unknown as KioskState;
      const n = s.result?.waitMinutes ?? 0;
      return n <= 0 ? s.sentence("waitNow") : s.sentence("wait", { n });
    },
    get ticketText(): string {
      return (this as unknown as KioskState).result?.entry.ticket ?? "";
    },
    get autoReset(): string {
      const s = this as unknown as KioskState;
      return s.sentence("autoReset", { n: Math.max(0, s.left) });
    },
    fmt(this: KioskState, ms: number): string {
      return new Intl.DateTimeFormat(`${this.cfg.locale}-u-nu-latn`, { hour: "numeric", minute: "2-digit" }).format(new Date(ms));
    },
    bookingLine(this: KioskState, b: KioskBooking): string {
      return this.sentence("bookingLine", { name: b.name, time: this.fmt(b.startsAt) });
    },

    setMode(this: KioskState, mode: "scan" | "phone") {
      this.mode = mode;
      if (mode === "scan") this.$nextTick(() => this.$refs.code?.focus());
    },
    press(this: KioskState, key: string) {
      if (this.phone.length < 15) this.phone += key;
    },
    backspace(this: KioskState) {
      this.phone = this.phone.slice(0, -1);
    },
    clearPhone(this: KioskState) {
      this.phone = "";
    },
    reset(this: KioskState) {
      this.code = "";
      this.phone = "";
      this.view = "input";
    },
    submitScan(this: KioskState) {
      if (this.code.trim()) void this.lookup(this.code);
    },
    submitPhone(this: KioskState) {
      if (this.phoneReady) void this.lookup(this.phone);
    },
    pick(this: KioskState, id: string) {
      const booking = this.choices.find((b) => b.id === id);
      if (booking) void this.checkIn({ booking });
    },
    walkInCheckIn(this: KioskState) {
      void this.checkIn({ phone: this.phone });
    },

    async checkIn(this: KioskState, request: { booking?: KioskBooking; phone?: string }) {
      this.busyText = "checkingIn";
      this.view = "busy";
      const detail: { booking?: KioskBooking; phone?: string; promise?: Promise<unknown> } = { ...request };
      try {
        this.root.dispatchEvent(new CustomEvent("nq-check-in", { bubbles: true, detail }));
        const result = (await detail.promise) as (Result & { error?: string }) | undefined;
        if (!result) throw new Error("no result");
        if (result.error) {
          this.message = result.error;
          this.walkIn = false;
          this.view = "message";
        } else {
          this.result = result;
          this.qr = `queue:${result.entry.ticket}`;
          this.view = "ticket";
        }
      } catch {
        this.message = this.sentence("failed");
        this.walkIn = false;
        this.view = "message";
      }
    },

    async lookup(this: KioskState, input: string) {
      const now = this.cfg.now ?? Date.now();
      const match = findBookingForCheckIn(this.cfg.bookings, input, { now, earlyMinutes: this.cfg.earlyMinutes, windowMinutes: this.cfg.windowMinutes });
      if (match.kind === "found") return this.checkIn({ booking: match.booking });
      if (match.kind === "multiple") {
        this.choices = match.bookings;
        this.view = "choose";
        return;
      }
      if (match.kind === "too-early") {
        this.message = this.sentence("tooEarly", { time: this.fmt(match.booking.startsAt), opens: this.fmt(match.booking.startsAt - this.cfg.earlyMinutes * 60000) });
        this.walkIn = false;
        this.view = "message";
        return;
      }
      this.message = this.sentence("none");
      this.walkIn = this.mode === "phone" && this.cfg.allowWalkIn && phoneDigits(input).length >= 9;
      this.view = "message";
    },
  }));
};

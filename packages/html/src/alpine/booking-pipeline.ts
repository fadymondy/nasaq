// nqBookingPipeline: the staff view of one booking. The markup is the React BookingPipeline's (see the Blade component); the state lives here.
// There is no backend: a move dispatches a bubbling "advance" event and, unless `optimistic: false`, updates the local status and history so
// the change shows at once. The event detail carries `fail(message)`: call it to put the booking back and show the message.
//
//   <div data-slot="booking-pipeline" x-data="nqBookingPipeline('confirmed', [{ status: 'requested', at: '2030-01-01T09:00:00Z' }], { canAdvance: true })" x-modelable="status">…</div>
//
// `status` is x-modelable. Events: "advance" { to, fail }. Options: canAdvance (show the buttons), optimistic, by (name written on optimistic history rows).

import { STATUS_LABELS, BOOKING_STATUSES, nextStatuses, pipelineIndex, primaryNext, type BookingStatus, type BookingTransition } from "./booking-pipeline-logic";
import type { Magics, Register } from "./types";

export interface BookingPipelineOptions {
  canAdvance?: boolean;
  optimistic?: boolean;
  by?: string;
}

interface PipelineState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  status: BookingStatus;
  history: BookingTransition[];
  error: string | null;
  confirming: BookingStatus | null;
  root: HTMLElement;
  optimistic: boolean;
  by: string | undefined;
  name(s: BookingStatus): string;
  go(to: BookingStatus): void;
}

const ADVANCE = {
  en: { confirmed: "Confirm", checked_in: "Check in", in_visit: "Start visit", done: "Finish visit", no_show: "Mark no-show", cancelled: "Cancel booking", requested: "Reopen" },
  ar: { confirmed: "تأكيد", checked_in: "تسجيل الوصول", in_visit: "بدء الزيارة", done: "إنهاء الزيارة", no_show: "تسجيل عدم الحضور", cancelled: "إلغاء الحجز", requested: "إعادة الفتح" },
} as const;

export const bookingPipeline: Register = (Alpine) => {
  Alpine.data("nqBookingPipeline", (status: BookingStatus = "requested", history: BookingTransition[] = [], options: BookingPipelineOptions = {}) => ({
    status,
    history,
    error: null as string | null,
    confirming: null as BookingStatus | null,
    root: null as unknown as HTMLElement,
    optimistic: options.optimistic !== false,
    by: options.by,
    stages: [...BOOKING_STATUSES] as string[],
    init(this: PipelineState) {
      this.root = this.$el;
    },
    ar(this: PipelineState) {
      return this.$nq.locale.startsWith("ar");
    },
    name(this: PipelineState, s: BookingStatus) {
      return STATUS_LABELS[this.$nq.locale.startsWith("ar") ? "ar" : "en"][s];
    },
    stopped(this: PipelineState) {
      return this.status === "no_show" || this.status === "cancelled";
    },
    current(this: PipelineState) {
      if (!(this.status === "no_show" || this.status === "cancelled")) return pipelineIndex(this.status);
      for (let i = this.history.length - 1; i >= 0; i--) {
        const idx = pipelineIndex(this.history[i]!.status);
        if (idx >= 0) return idx;
      }
      return 0;
    },
    /** "complete" | "current" | "upcoming" | "error" for stage i. */
    stageStatus(this: PipelineState, i: number) {
      const cur = (this as unknown as { current(): number }).current();
      if (this.status === "no_show" || this.status === "cancelled") return i === cur ? "error" : i < cur ? "complete" : "upcoming";
      return i < cur ? "complete" : i === cur ? "current" : "upcoming";
    },
    stageSr(this: PipelineState, i: number) {
      const s = (this as unknown as { stageStatus(i: number): string }).stageStatus(i);
      const m = { complete: ["Completed", "مكتملة"], current: ["Current step", "الخطوة الحالية"], upcoming: ["Upcoming", "قادمة"], error: ["Error", "خطأ"] } as Record<string, [string, string]>;
      return this.$nq.t(m[s]![0], m[s]![1]);
    },
    next(this: PipelineState) {
      return [...nextStatuses(this.status)];
    },
    isPrimary(this: PipelineState, to: BookingStatus) {
      return primaryNext(this.status) === to;
    },
    needsConfirm(to: BookingStatus) {
      return to === "cancelled" || to === "no_show";
    },
    label(this: PipelineState, to: BookingStatus) {
      if (this.status === "no_show" && to === "confirmed") return this.$nq.t("Reopen as confirmed", "إعادة الفتح كمؤكد");
      return ADVANCE[this.$nq.locale.startsWith("ar") ? "ar" : "en"][to];
    },
    confirmTitle(this: PipelineState) {
      if (!this.confirming) return "";
      return this.$nq.t(`${this.name(this.confirming)}?`, `${this.name(this.confirming)}؟`);
    },
    confirmText(this: PipelineState) {
      if (this.confirming === "no_show") return this.$nq.t("The patient did not come. You can reopen it later if they arrive.", "المريض لم يحضر. يمكنك إعادة فتح الحجز إذا وصل لاحقًا.");
      if (this.confirming === "cancelled") return this.$nq.t("The slot is released. This cannot be undone.", "سيتم تحرير الموعد. لا يمكن التراجع.");
      return "";
    },
    ask(this: PipelineState, to: BookingStatus) {
      this.confirming = to;
    },
    confirm(this: PipelineState) {
      const to = this.confirming;
      this.confirming = null;
      if (to) this.go(to);
    },
    reversed(this: PipelineState) {
      return [...this.history].reverse().map((h, i) => ({ ...h, key: `${h.status}-${String(h.at)}-${i}` }));
    },
    describe(this: PipelineState, h: BookingTransition) {
      return [h.by ? this.$nq.t(`by ${h.by}`, `بواسطة ${h.by}`) : null, h.note ?? null].filter(Boolean).join(" · ");
    },
    when(this: PipelineState, at: string | number | Date) {
      const diff = (new Date(at).getTime() - Date.now()) / 1000;
      const rtf = new Intl.RelativeTimeFormat(`${this.$nq.locale}-u-nu-latn`, { numeric: "auto" });
      const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];
      for (const [unit, sec] of units) if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
      return rtf.format(0, "minute");
    },
    go(this: PipelineState, to: BookingStatus) {
      const before = { status: this.status, history: [...this.history] };
      this.error = null;
      const fail = (message?: string) => {
        this.status = before.status;
        this.history = before.history;
        this.error = message || this.$nq.t("That did not work. Try again.", "لم تنجح العملية. حاول مجددًا.");
      };
      if (this.optimistic) {
        this.status = to;
        this.history = [...this.history, { status: to, at: new Date().toISOString(), by: this.by }];
      }
      this.root.dispatchEvent(new CustomEvent("advance", { bubbles: true, detail: { to, fail } }));
    },
  }));
};

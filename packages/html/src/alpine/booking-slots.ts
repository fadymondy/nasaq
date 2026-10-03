// nqBookingSlots: the times of one day, chosen from a radio group. The markup is the React BookingSlots' (see the Blade component;
// the calendar beside it is <x-nq::calendar x-model="day">); the state lives here.
//
//   <div data-slot="booking-slots" x-data="nqBookingSlots([{ start: '2030-01-11T09:00', state: 'available' }], { now: '2030-01-10T08:00' })" x-modelable="value">…</div>
//
// `value` is the chosen slot's start (the same string that went in), x-modelable. `day` is the listed day ("YYYY-MM-DD").
// Fires a bubbling "change" ({ start, day }) when a time is chosen and "day-change" ({ day }). Arrow keys move and select inside the list.
// Options: now, grouped (default true), hour12, defaultDay.

import { countSlots, dayPart, firstAvailableDay, parseDay, toSlot, type Slot, type SlotInput } from "./booking-slots-logic";
import type { Magics, Register } from "./types";

export interface BookingSlotsOptions {
  now?: string | number | Date;
  grouped?: boolean;
  hour12?: boolean;
  defaultDay?: string;
}

interface SlotsState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  all: Slot[];
  value: string | null;
  day: string;
  grouped: boolean;
  hour12: boolean | undefined;
  root: HTMLElement;
  inDay(): Slot[];
  nextFree(): string | null;
  isChosen(s: Slot): boolean;
  pick(slot: Slot): void;
}

export const bookingSlots: Register = (Alpine) => {
  Alpine.data("nqBookingSlots", (slots: SlotInput[] = [], options: BookingSlotsOptions = {}) => {
    const all = slots.map(toSlot);
    const now = options.now !== undefined ? new Date(options.now) : new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    return {
      all,
      value: null as string | null,
      day: options.defaultDay ?? firstAvailableDay(all, today) ?? todayKey,
      grouped: options.grouped !== false,
      hour12: options.hour12,
      root: null as unknown as HTMLElement,
      init(this: SlotsState) {
        this.root = this.$el;
        this.$watch("day", (d: string) => this.root.dispatchEvent(new CustomEvent("day-change", { bubbles: true, detail: { day: d } })));
      },
      inDay(this: SlotsState) {
        return this.all.filter((s) => s.state !== "past" && s.day === this.day).sort((a, b) => a.start.getTime() - b.start.getTime());
      },
      counts(this: SlotsState) {
        return countSlots(this.inDay());
      },
      dayLabel(this: SlotsState) {
        return new Intl.DateTimeFormat(`${this.$nq.locale}-u-nu-latn`, { dateStyle: "full" }).format(parseDay(this.day));
      },
      fmtTime(this: SlotsState, d: Date) {
        return new Intl.DateTimeFormat(`${this.$nq.locale}-u-nu-latn`, { hour: "numeric", minute: "2-digit", ...(this.hour12 === undefined ? {} : { hour12: this.hour12 }) }).format(d);
      },
      stateLabel(this: SlotsState, s: Slot) {
        return s.state === "full" ? this.$nq.t("Full", "محجوز") : s.state === "held" ? this.$nq.t("Held", "محجوز مؤقتًا") : this.$nq.t("Available", "متاح");
      },
      slotLabel(this: SlotsState, s: Slot) {
        const sep = this.$nq.locale.startsWith("ar") ? "، " : ", ";
        return (this as unknown as { fmtTime(d: Date): string }).fmtTime(s.start) + sep + (this as unknown as { stateLabel(s: Slot): string }).stateLabel(s);
      },
      openText(this: SlotsState) {
        const n = countSlots(this.inDay()).available;
        if (n === 0) return this.$nq.t("This day is fully booked.", "هذا اليوم محجوز بالكامل.");
        if (this.$nq.locale.startsWith("ar")) return n === 1 ? "موعد واحد متاح" : n === 2 ? "موعدان متاحان" : `${n} مواعيد متاحة`;
        return `${n} ${n === 1 ? "time" : "times"} available`;
      },
      groups(this: SlotsState) {
        const list = this.inDay();
        if (!(this.grouped && list.length > 8)) return [{ key: "all", label: "", items: list }];
        const labels = { morning: this.$nq.t("Morning", "صباحًا"), afternoon: this.$nq.t("Afternoon", "بعد الظهر"), evening: this.$nq.t("Evening", "مساءً") };
        return (["morning", "afternoon", "evening"] as const).map((k) => ({ key: k, label: labels[k], items: list.filter((s) => dayPart(s.start) === k) })).filter((g) => g.items.length > 0);
      },
      nextFree(this: SlotsState) {
        const d = parseDay(this.day);
        return firstAvailableDay(this.all, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
      },
      goNext(this: SlotsState) {
        const next = this.nextFree();
        if (next) this.day = next;
      },
      isChosen(this: SlotsState, s: Slot) {
        return this.value !== null && String(new Date(this.value).getTime()) === s.startKey;
      },
      pick(this: SlotsState, s: Slot) {
        if (s.state !== "available") return;
        const raw = slots.find((r) => String(new Date(r.start).getTime()) === s.startKey);
        this.value = typeof raw?.start === "string" ? raw.start : s.start.toISOString();
        this.root.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { start: this.value, day: this.day } }));
      },
      /** Roving tabindex: the chosen tile, else the first available one. */
      tabIndex(this: SlotsState, s: Slot) {
        const list = this.inDay().filter((x) => x.state === "available");
        const chosen = list.find((x) => this.isChosen(x));
        return (chosen ?? list[0]) === s ? 0 : -1;
      },
      key(this: SlotsState, event: KeyboardEvent, s: Slot) {
        const rtl = this.$nq.locale.startsWith("ar") || getComputedStyle(this.root).direction === "rtl";
        const forward = ["ArrowDown", rtl ? "ArrowLeft" : "ArrowRight"];
        const back = ["ArrowUp", rtl ? "ArrowRight" : "ArrowLeft"];
        if (!forward.includes(event.key) && !back.includes(event.key)) return;
        event.preventDefault();
        const list = this.inDay().filter((x) => x.state === "available");
        const i = list.indexOf(s);
        const next = list[(i + (forward.includes(event.key) ? 1 : -1) + list.length) % list.length];
        if (!next) return;
        this.pick(next);
        this.$nextTick(() => this.root.querySelector<HTMLElement>(`[data-slot="booking-slot"][data-start="${next.startKey}"]`)?.focus());
      },
    };
  });
};

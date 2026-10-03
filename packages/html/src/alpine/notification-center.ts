// nqNotificationCenter: a bell with an unread badge that opens a popover (or a side sheet) of notifications, with All / Unread tabs
// and "Mark all read". The markup is the React NotificationCenter's (see the Blade component); the state lives here.
//
//   <div x-data="nqNotificationCenter([{ id: '1', title: 'Sara mentioned you', time: 1700000000000, unread: true }], { variant: 'popover' })" x-modelable="items">
//     <button x-ref="trigger" x-on:click="toggle()" x-bind:aria-label="triggerLabel()">…bell…</button>
//     <template x-teleport="body"><div x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" x-anchor.bottom-end.offset.6="$refs.trigger">
//       <template x-for="item in rows(false)" :key="item.id">…</template>
//     </div></template>
//   </div>
//
// It carries the same member names as nqPopover / nqDialog (open, popupEl, show, close, toggle, popup), so the popover.content and
// sheet.content parts work inside it. Items: { id, title, description?, actor?: { name, avatar? }, icon? (trusted HTML), time?
// (ms, ISO string), unread?, href? }. Pressing a row marks it read (unless `optimistic: false`) and "Mark all read" marks all; both
// dispatch bubbling events from the root: "nq-notification-click" { id, item } and "nq-mark-all-read". `open` is x-modelable (x-modelable="open").
// Options: variant (popover | sheet), cap (the badge max, 99), optimistic, unreadCount (a server total larger than the loaded items).
// Not ported: the per-row context menu (itemActions); use the "nq-notification-click" event to act on a row.

import type { Magics, Register } from "./types";

export interface NotificationRow {
  id: string;
  title: string;
  description?: string;
  actor?: { name: string; avatar?: string };
  icon?: string;
  time?: number | string;
  unread?: boolean;
  href?: string;
}

export interface NotificationCenterOptions {
  variant?: "popover" | "sheet";
  cap?: number;
  optimistic?: boolean;
  unreadCount?: number;
  open?: boolean;
}

interface CenterState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  items: NotificationRow[];
  open: boolean;
  popupEl: HTMLElement | null;
  variant: "popover" | "sheet";
  cap: number;
  optimistic: boolean;
  extra: number;
  root: HTMLElement;
  show(): void;
  close(): void;
  toggle(): void;
  rows(onlyUnread: boolean): NotificationRow[];
  count(): number;
}

const num = (locale: string, n: number) => new Intl.NumberFormat(locale).format(n);

export const notificationCenter: Register = (Alpine) => {
  Alpine.data("nqNotificationCenter", (initial: NotificationRow[] = [], options: NotificationCenterOptions = {}) => ({
    items: initial,
    open: Boolean(options.open),
    popupEl: null as HTMLElement | null,
    variant: options.variant ?? "popover",
    cap: options.cap ?? 99,
    optimistic: options.optimistic !== false,
    // Unread beyond the loaded items (a server total larger than the page).
    extra: Math.max((options.unreadCount ?? 0) - initial.filter((i) => i.unread).length, 0),
    root: null as unknown as HTMLElement,
    init(this: CenterState) {
      this.root = this.$el;
      this.$watch("open", (open: boolean) => {
        this.root.dispatchEvent(new CustomEvent("nq-open-change", { bubbles: true, detail: { open } }));
        if (open) this.$nextTick(() => this.popupEl?.focus({ preventScroll: true }));
        else if (this.popupEl?.contains(document.activeElement)) this.$refs.trigger?.focus();
      });
    },
    show(this: CenterState) {
      this.open = true;
    },
    close(this: CenterState) {
      this.open = false;
    },
    toggle(this: CenterState) {
      this.open = !this.open;
    },
    rows(this: CenterState, onlyUnread: boolean) {
      return this.items.filter((i) => !onlyUnread || i.unread);
    },
    /** Unread total: the loaded unread plus any the server counted beyond them. */
    count(this: CenterState) {
      return this.items.filter((i) => i.unread).length + this.extra;
    },
    countText(this: CenterState) {
      const n = this.count();
      return n > this.cap ? `${num(this.$nq.locale, this.cap)}+` : num(this.$nq.locale, n);
    },
    triggerLabel(this: CenterState) {
      const n = this.count();
      const t = this.$nq.t.bind(this.$nq);
      if (n === 0) return t("Notifications", "الإشعارات");
      return this.$nq.locale.startsWith("ar") ? `الإشعارات، ${num(this.$nq.locale, n)} غير مقروء` : `Notifications, ${n} unread`;
    },
    /** "2m" / "قبل ٢ د": a narrow relative time in the active locale (Latin digits, like the server render). */
    timeText(this: CenterState, value: number | string | undefined) {
      if (value === undefined) return "";
      const diff = new Date(value).getTime() - Date.now();
      const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31_536_000_000], ["month", 2_592_000_000], ["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000]];
      const rtf = new Intl.RelativeTimeFormat(`${this.$nq.locale}-u-nu-latn`, { numeric: "auto", style: "narrow" });
      for (const [unit, ms] of units) if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
      return rtf.format(Math.round(diff / 1000), "second");
    },
    isoTime(value: number | string | undefined) {
      return value === undefined ? undefined : new Date(value).toISOString();
    },
    initials(name: string) {
      const words = name.trim().split(/\s+/).filter(Boolean);
      const first = (w: string) => Array.from(w)[0] ?? "";
      return ((words[0] ? first(words[0]) : "") + (words.length > 1 ? first(words[words.length - 1]!) : "")).toUpperCase();
    },
    press(this: CenterState, item: NotificationRow) {
      if (this.optimistic) this.items = this.items.map((i) => (i.id === item.id ? { ...i, unread: false } : i));
      this.root.dispatchEvent(new CustomEvent("nq-notification-click", { bubbles: true, detail: { id: item.id, item } }));
    },
    markAllRead(this: CenterState) {
      if (this.count() === 0) return;
      if (this.optimistic) this.items = this.items.map((i) => (i.unread ? { ...i, unread: false } : i));
      this.root.dispatchEvent(new CustomEvent("nq-mark-all-read", { bubbles: true }));
    },
    /** Bind on the popup (popover or sheet content). */
    popup: {
      role: "dialog",
      tabindex: "-1",
      ":aria-modal"(this: CenterState) {
        return this.variant === "sheet" ? "true" : undefined;
      },
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-notification-center", "title");
      },
      "x-on:keydown.escape.prevent.stop"(this: CenterState) {
        this.close();
      },
      "x-on:click.outside"(this: CenterState, event: Event) {
        if (this.variant === "popover" && this.open && !this.$refs.trigger?.contains(event.target as Node)) this.close();
      },
    },
  }));
};

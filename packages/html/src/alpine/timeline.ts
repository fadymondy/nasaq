// nqTimeline: lets <x-nq::timeline items-expr="events"> take its items from an Alpine expression. The server-rendered slot items are the first paint;
// once the expression yields an array they are removed and a <template x-for> renders the same markup (avatar or dot marker, title, time, description).
//
//   <ol data-slot="timeline" x-data="nqTimeline({ locale: 'en' })" x-effect="sync(events)"> …server items… <template x-for="(it, i) in items">…</template></ol>

import type { Magics, Register } from "./types";

export interface TimelineEvent {
  title?: string;
  description?: string;
  time?: string | number;
  actor?: { name: string; avatar?: string };
}
interface TimelineState extends Magics {
  items: TimelineEvent[];
  locale: string;
  root: HTMLElement;
  sync(next: unknown): void;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31_536_000_000], ["month", 2_592_000_000], ["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000]];

export const timeline: Register = (Alpine) => {
  Alpine.data("nqTimeline", (cfg: { locale?: string } = {}) => ({
    items: [] as TimelineEvent[],
    locale: cfg.locale ?? "en",
    root: undefined as unknown as HTMLElement,
    init(this: TimelineState) {
      this.root = this.$el;
    },
    sync(this: TimelineState, next: unknown) {
      if (!Array.isArray(next)) return;
      this.items = next as TimelineEvent[];
      const root = this.root ?? this.$el;
      // Drop the server-rendered items once the dynamic ones are in (same microtask burst, so nothing flashes).
      this.$nextTick(() => {
        for (const child of Array.from(root.children)) {
          if (child.tagName === "LI" && !child.hasAttribute("data-nq-dynamic")) child.remove();
        }
      });
    },
    initials(name: string) {
      const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
      const first = (w: string) => Array.from(w)[0] ?? "";
      return ((words[0] ? first(words[0]) : "") + (words.length > 1 ? first(words[words.length - 1] ?? "") : "")).toUpperCase();
    },
    iso(value: string | number) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "" : d.toISOString();
    },
    ago(this: TimelineState, value: string | number) {
      const diff = new Date(value).getTime() - Date.now();
      if (Number.isNaN(diff)) return "";
      const rtf = new Intl.RelativeTimeFormat(`${this.locale.replace("_", "-")}-u-nu-latn`, { numeric: "auto" });
      for (const [unit, ms] of UNITS) if (Math.abs(diff) >= ms) return rtf.format(Math.trunc(diff / ms), unit);
      return rtf.format(Math.trunc(diff / 1000), "second");
    },
  }));
};

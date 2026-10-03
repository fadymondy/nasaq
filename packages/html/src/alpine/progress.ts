// nqProgress: makes <x-nq::progress> follow a live value. The server renders the first paint; this updates the same elements
// (indicator width, aria-valuenow / aria-valuetext, data-indeterminate | data-progressing | data-complete, the value text) like React's Progress.
//
//   <div data-slot="progress" x-data="nqProgress({ value: 40, min: 0, max: 100, locale: 'en' })" x-modelable="value" x-effect="sync(upload.percent)">
//
// Attributes the server rendered are updated here through the DOM (they are not Alpine bindings); null/undefined/NaN means indeterminate.

import type { Magics, Register } from "./types";

interface Config {
  value?: number | null;
  min?: number;
  max?: number;
  locale?: string;
  fixedText?: boolean;
}
interface ProgressState extends Magics {
  value: number | null;
  min: number;
  max: number;
  locale: string;
  fixedText: boolean;
  root: HTMLElement;
  sync(next: unknown): void;
}

const STATES = ["data-indeterminate", "data-progressing", "data-complete"];

export const progress: Register = (Alpine) => {
  Alpine.data("nqProgress", (cfg: Config = {}) => ({
    value: (cfg.value ?? null) as number | null,
    min: cfg.min ?? 0,
    max: cfg.max ?? 100,
    locale: cfg.locale ?? "en",
    fixedText: cfg.fixedText ?? false,
    root: undefined as unknown as HTMLElement,
    init(this: ProgressState) {
      this.root = this.$el;
    },
    sync(this: ProgressState, next: unknown) {
      const root = this.root ?? this.$el;
      const n = next === null || next === undefined || next === "" ? NaN : Number(next);
      const value = Number.isFinite(n) ? n : null;
      this.value = value;
      const indeterminate = value === null;
      const status = indeterminate ? "data-indeterminate" : value >= this.max ? "data-complete" : "data-progressing";
      const track = root.querySelector<HTMLElement>('[data-slot="progress-track"]');
      const indicator = root.querySelector<HTMLElement>('[data-slot="progress-indicator"]');
      for (const el of [root, track, indicator]) {
        if (!el) continue;
        for (const name of STATES) if (name !== status) el.removeAttribute(name);
        el.setAttribute(status, "");
      }
      let text = "";
      if (indeterminate) {
        root.removeAttribute("aria-valuenow");
        root.setAttribute("aria-valuetext", "indeterminate progress");
      } else {
        try {
          text = new Intl.NumberFormat(`${this.locale.replace("_", "-")}-u-nu-latn`, { style: "percent" }).format(value / 100);
        } catch {
          text = `${Math.round(value)}%`;
        }
        root.setAttribute("aria-valuenow", String(value));
        root.setAttribute("aria-valuetext", text);
      }
      if (indicator) {
        indicator.classList.toggle("w-full", indeterminate);
        indicator.classList.toggle("motion-safe:animate-pulse", indeterminate);
        if (indeterminate) indicator.style.removeProperty("width");
        else {
          const fraction = this.max === this.min ? 0 : (value - this.min) / (this.max - this.min);
          indicator.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 1e6) / 1e4}%`;
        }
      }
      const label = root.querySelector<HTMLElement>("[data-progress-value]");
      if (label) {
        label.hidden = indeterminate;
        if (!indeterminate && !this.fixedText) label.textContent = text;
      }
    },
  }));
};

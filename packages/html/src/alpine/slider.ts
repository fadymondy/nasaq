// nqSlider: a draggable value or range picker. The markup is the React Slider's, the value state lives here.
//
//   <div x-data="nqSlider({ value: [20, 80], min: 0, max: 100, step: 1, format: { style: 'percent' } })" data-slot="slider" …>
//     <output data-slot="slider-value" x-text="text"></output>
//     <div data-slot="slider-control" x-on:pointerdown="down($event)" …>
//       <div data-slot="slider-track" x-ref="track" …><div data-slot="slider-range" :style="rangeStyle()"></div>
//         <div data-slot="slider-thumb" role="slider" tabindex="0" :style="thumbStyle(0)" x-on:keydown="key($event, 0)" …></div>
//       </div>
//     </div>
//   </div>
//
// value is a number (one thumb) or an array (a range). Each thumb is a focusable role="slider": ArrowRight/Up raise it
// (ArrowLeft in RTL), Home/End jump to the ends, PageUp/PageDown move ten steps. Pointer and touch drag the nearest thumb.
// Digits stay Latin (Nasaq numbering rule). Put x-modelable="model" on the root to bind it: x-model="$wire.volume".

import type { Register } from "./types";

export interface SliderConfig {
  value?: number | number[];
  min?: number;
  max?: number;
  step?: number;
  /** `Intl.NumberFormat` options for the shown and spoken value. */
  format?: Intl.NumberFormatOptions;
  disabled?: boolean;
  /** Range only: the least number of steps between two thumbs. */
  minStepsBetweenThumbs?: number;
}

// Thumb is 16px (size-4); its centre never leaves the track by more than half of that.
const HALF = 8;

export const slider: Register = (Alpine) => {
  Alpine.data("nqSlider", (cfg: SliderConfig = {}) => {
    const min = cfg.min ?? 0;
    const max = cfg.max ?? 100;
    const step = cfg.step || 1;
    const range = Array.isArray(cfg.value);
    const start = cfg.value ?? min;
    const clamp = (v: number) => Math.min(max, Math.max(min, v));
    const snap = (v: number) => {
      const decimals = (String(step).split(".")[1] ?? "").length;
      return clamp(+(Math.round((v - min) / step) * step + min).toFixed(decimals));
    };
    return {
      values: (Array.isArray(start) ? start : [start]).map((v) => snap(Number(v))) as number[],
      min,
      max,
      step,
      disabled: Boolean(cfg.disabled),
      active: -1,
      dragging: false,
      get model(): number | number[] {
        return range ? [...this.values] : (this.values[0] as number);
      },
      set model(v: number | number[]) {
        this.values = (Array.isArray(v) ? v : [v]).map((n) => snap(Number(n)));
      },
      get text(): string {
        return (this.values as number[]).map((v) => this.fmt(v)).join(" – ");
      },
      fmt(v: number): string {
        const lang = (document.documentElement.lang || "en").split("-")[0] + "-u-nu-latn";
        try {
          return new Intl.NumberFormat(lang, cfg.format).format(v);
        } catch {
          return String(v);
        }
      },
      frac(v: number): number {
        return max === min ? 0 : (v - min) / (max - min);
      },
      /** Inset from the inline start of the track to the thumb centre, with the thumb kept inside the track. */
      offset(i: number): string {
        const p = +(this.frac(this.values[i]) * 100).toFixed(4);
        return `calc(${p}% + ${(HALF - (p / 100) * HALF * 2).toFixed(2)}px)`;
      },
      thumbStyle(i: number): string {
        return `inset-inline-start: ${this.offset(i)}; top: 50%; translate: ${this.isRtl() ? "50%" : "-50%"} -50%; position: absolute`;
      },
      rangeStyle(): string {
        const last = this.values.length - 1;
        const from = range ? this.offset(0) : "0px";
        return `position: absolute; top: 0; bottom: 0; inset-inline-start: ${from}; inset-inline-end: calc(100% - ${this.offset(last)})`;
      },
      isRtl(): boolean {
        const el = (this as unknown as { $el: HTMLElement }).$el;
        return getComputedStyle(el).direction === "rtl" || el.closest("[dir]")?.getAttribute("dir") === "rtl";
      },
      set(i: number, raw: number) {
        const gap = (cfg.minStepsBetweenThumbs ?? 0) * step;
        let v = snap(raw);
        const vals = this.values as number[];
        if (i > 0) v = Math.max(v, vals[i - 1]! + gap);
        if (i < vals.length - 1) v = Math.min(v, vals[i + 1]! - gap);
        v = clamp(v);
        if (v === vals[i]) return;
        const next = [...vals];
        next[i] = v;
        this.values = next;
        (this as unknown as { $dispatch: (n: string, d: unknown) => void }).$dispatch("nq-slider-change", this.model);
      },
      key(e: KeyboardEvent, i: number) {
        if (this.disabled) return;
        const rtl = this.isRtl();
        const up = e.key === "ArrowUp" || e.key === (rtl ? "ArrowLeft" : "ArrowRight");
        const down = e.key === "ArrowDown" || e.key === (rtl ? "ArrowRight" : "ArrowLeft");
        const v = this.values[i] as number;
        if (up) this.set(i, v + step);
        else if (down) this.set(i, v - step);
        else if (e.key === "PageUp") this.set(i, v + step * 10);
        else if (e.key === "PageDown") this.set(i, v - step * 10);
        else if (e.key === "Home") this.set(i, min);
        else if (e.key === "End") this.set(i, max);
        else return;
        e.preventDefault();
      },
      /** Pointer position on the track as a value. */
      at(x: number): number {
        const track = (this as unknown as { $refs: { track: HTMLElement } }).$refs.track;
        const r = track.getBoundingClientRect();
        const w = r.width - HALF * 2;
        const f = w <= 0 ? 0 : this.isRtl() ? (r.right - HALF - x) / w : (x - r.left - HALF) / w;
        return min + Math.min(1, Math.max(0, f)) * (max - min);
      },
      down(e: PointerEvent) {
        if (this.disabled || e.button > 0) return;
        const target = this.at(e.clientX);
        const vals = this.values as number[];
        let nearest = 0;
        vals.forEach((v, i) => {
          if (Math.abs(v - target) < Math.abs(vals[nearest]! - target) || (Math.abs(v - target) === Math.abs(vals[nearest]! - target) && target > v)) nearest = i;
        });
        this.active = nearest;
        this.dragging = true;
        this.set(nearest, target);
        const root = (this as unknown as { $el: HTMLElement }).$el;
        root.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]')[nearest]?.focus();
        const move = (ev: PointerEvent) => this.set(nearest, this.at(ev.clientX));
        const up = () => {
          this.dragging = false;
          this.active = -1;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        e.preventDefault();
      },
    };
  });
};

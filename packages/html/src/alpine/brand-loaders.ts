// nqBrailleLoader, nqDotMatrixFill, nqBootSplash: the motion of the brand loaders. The markup is the React ones' (see the
// Blade brand-loaders.* components); the server renders the first frame, this keeps it moving.
//
//   <span role="status" x-data="nqBrailleLoader(['⠋', '⠙', …], 80)"><span x-text="frame">⠋</span>…</span>
//   <div role="progressbar" x-data="nqDotMatrixFill(24, 5, null)" x-modelable="value"><span><span data-dot>…</span></span>…</div>
//   <div data-slot="boot-splash" x-data="nqBootSplash(8000)"> … <p x-show="slow">…</p> <button x-on:click="retry()">…</div>
//
// All timers stand still under prefers-reduced-motion. The dot matrix writes its dots directly (no per-dot bindings) and
// follows x-model; the splash fires `nq:retry` from its root.

import { clampPercent, dotMatrixLevels } from "./brand-loaders-logic";
import type { Magics, Register } from "./types";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface DotMatrixState extends Magics {
  cols: number;
  rows: number;
  value: number | null;
  tick: number;
  root: HTMLElement | null;
  timer: ReturnType<typeof setInterval> | undefined;
  paint(): void;
  restart(): void;
}

export const brandLoaders: Register = (Alpine) => {
  Alpine.data("nqBrailleLoader", (frames: string[] = [], interval = 80) => ({
    frames,
    tick: 0,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    get frame(): string {
      const list = (this as unknown as { frames: string[] }).frames;
      return list[(this as unknown as { tick: number }).tick % list.length] ?? "";
    },
    init(this: { tick: number; timer: ReturnType<typeof setInterval> | undefined }) {
      if (reduced()) return;
      this.timer = setInterval(() => this.tick++, interval);
    },
    destroy(this: { timer: ReturnType<typeof setInterval> | undefined }) {
      clearInterval(this.timer);
    },
  }));

  Alpine.data("nqDotMatrixFill", (cols = 24, rows = 5, value: number | null = null) => ({
    cols,
    rows,
    value,
    tick: 0,
    root: null as HTMLElement | null,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    init(this: DotMatrixState) {
      this.root = this.$el;
      this.$watch("value", () => {
        this.paint();
        this.restart();
      });
      this.restart();
    },
    restart(this: DotMatrixState & { restart(): void }) {
      clearInterval(this.timer);
      this.timer = undefined;
      if (this.value !== null || reduced()) return;
      this.timer = setInterval(() => {
        this.tick++;
        this.paint();
      }, 90);
    },
    destroy(this: DotMatrixState) {
      clearInterval(this.timer);
    },
    paint(this: DotMatrixState) {
      const root = this.root;
      if (!root) return;
      const levels = dotMatrixLevels(this.cols, this.rows, this.value, this.tick);
      const dots = root.querySelectorAll<HTMLElement>("[data-dot]");
      dots.forEach((dot, i) => {
        const level = levels[i] ?? 0;
        dot.style.transform = `scale(${(0.35 + 0.65 * level).toFixed(3)})`;
        dot.style.opacity = String(level > 0 ? 0.35 + 0.65 * level : 1);
        dot.classList.toggle("bg-primary", level > 0);
        dot.classList.toggle("bg-border", level <= 0);
      });
      if (this.value === null) {
        root.removeAttribute("aria-valuenow");
        root.removeAttribute("aria-valuemin");
        root.removeAttribute("aria-valuemax");
      } else {
        root.setAttribute("aria-valuemin", "0");
        root.setAttribute("aria-valuemax", "100");
        root.setAttribute("aria-valuenow", String(Math.round(clampPercent(this.value))));
      }
    },
  }));

  Alpine.data("nqBootSplash", (slowAfterMs = 8000) => ({
    slow: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    init(this: { slow: boolean; timer: ReturnType<typeof setTimeout> | undefined }) {
      if (slowAfterMs > 0) this.timer = setTimeout(() => (this.slow = true), slowAfterMs);
    },
    destroy(this: { timer: ReturnType<typeof setTimeout> | undefined }) {
      clearTimeout(this.timer);
    },
    retry(this: Magics) {
      this.$dispatch("nq:retry");
    },
  }));
};

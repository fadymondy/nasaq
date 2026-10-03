// nqHeatmap: keyboard navigation and the shared tooltip of the contribution grid. The markup is the React Heatmap's, rendered by <x-nq::heatmap>.
//
//   <div data-slot="heatmap" x-data="nqHeatmap({ from: '2026-01-01', to: '2026-09-29', rtl: false })">
//     <div role="grid" x-on:keydown="key($event)" x-on:focusin="focus($event)" x-on:focusout="blur()" x-on:pointerover="hover($event)" x-on:pointerout="blur()">
//       <div role="gridcell" tabindex="0" data-date="2026-09-29" data-tip-count="3 contributions" data-tip-date="Sep 29, 2026"></div> ...
//     </div>
//     <div data-slot="tooltip-content" x-ref="tip" x-show="tipOpen"><strong x-text="tipCount"></strong><span x-text="tipDate"></span></div>
//   </div>
//
// The grid is one tab stop (roving tabindex). Up/Down move a day, Left/Right a week (swapped in RTL, where time runs right to left), clamped to
// the range. One tooltip is shared by all cells: it follows hover (not touch) and keyboard focus.

import type { Magics, Register } from "./types";

export interface HeatmapConfig {
  from: string;
  to: string;
  rtl?: boolean;
}

interface HeatmapState extends Magics {
  root: HTMLElement;
  from: string;
  to: string;
  rtl: boolean;
  tipOpen: boolean;
  tipCount: string;
  tipDate: string;
  cellOf(e: Event): HTMLElement | null;
  showTip(cell: HTMLElement): void;
  move(key: string, days: number): void;
  blur(): void;
}

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const heatmap: Register = (Alpine) => {
  Alpine.data("nqHeatmap", (config: HeatmapConfig) => ({
    root: null as unknown as HTMLElement,
    from: config.from,
    to: config.to,
    rtl: Boolean(config.rtl),
    tipOpen: false,
    tipCount: "",
    tipDate: "",
    init(this: HeatmapState) {
      this.root = this.$el;
    },
    cellOf(this: HeatmapState, e: Event) {
      return (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-date]") ?? null;
    },
    showTip(this: HeatmapState, cell: HTMLElement) {
      this.tipCount = cell.dataset.tipCount ?? "";
      this.tipDate = cell.dataset.tipDate ?? "";
      this.tipOpen = true;
      this.$nextTick(() => {
        const tip = this.$refs.tip as HTMLElement | undefined;
        if (!tip) return;
        const c = cell.getBoundingClientRect();
        const t = tip.getBoundingClientRect();
        const left = Math.max(4, Math.min(window.innerWidth - t.width - 4, c.left + c.width / 2 - t.width / 2));
        const above = c.top - t.height - 6;
        tip.style.left = `${left}px`;
        tip.style.top = `${above >= 4 ? above : c.bottom + 6}px`;
      });
    },
    hover(this: HeatmapState, e: PointerEvent) {
      const cell = this.cellOf(e);
      if (!cell) return this.blur();
      if (e.pointerType === "touch") return;
      this.showTip(cell);
    },
    focus(this: HeatmapState, e: Event) {
      const cell = this.cellOf(e);
      if (!cell) return;
      this.root.querySelector<HTMLElement>('[data-date][tabindex="0"]')?.setAttribute("tabindex", "-1");
      cell.setAttribute("tabindex", "0");
      let visible = true;
      try {
        visible = cell.matches(":focus-visible");
      } catch {
        // old engines without :focus-visible: treat every focus as keyboard focus
      }
      if (visible) this.showTip(cell);
    },
    blur(this: HeatmapState) {
      this.tipOpen = false;
    },
    move(this: HeatmapState, key: string, days: number) {
      const [y, m, d] = key.split("-").map(Number) as [number, number, number];
      let next = keyOf(new Date(y, m - 1, d + days));
      if (next < this.from) next = this.from;
      if (next > this.to) next = this.to;
      this.root.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus();
    },
    key(this: HeatmapState, e: KeyboardEvent) {
      const key = (e.target as HTMLElement).getAttribute("data-date");
      if (!key) return;
      // Time runs against the inline-start edge in RTL, so "toward the end of time" is Left there.
      const forward = this.rtl ? "ArrowLeft" : "ArrowRight";
      const back = this.rtl ? "ArrowRight" : "ArrowLeft";
      const step: Record<string, number> = { [forward]: 7, [back]: -7, ArrowDown: 1, ArrowUp: -1 };
      const days = step[e.key];
      if (days === undefined) return;
      e.preventDefault();
      this.move(key, days);
    },
  }));
};

// nqProductGrid: arrow-key movement through the product switcher's tile grid. The markup is in the Blade component product-switcher.
//
//   <div role="group" x-data="nqProductGrid" x-on:keydown="onKey($event)"> <a data-slot="product-tile">…</a> </div>
//
// Arrow keys step through the tiles (the inline axis follows the reading direction), Up and Down jump a row of three, Home and End go to the ends.

import type { Magics, Register } from "./types";

const COLUMNS = 3;

interface GridState extends Magics {
  root: HTMLElement;
}

export const productSwitcher: Register = (Alpine) => {
  Alpine.data("nqProductGrid", () => ({
    root: null as unknown as HTMLElement,
    init(this: GridState) {
      this.root = this.$el;
    },
    onKey(this: GridState, event: KeyboardEvent) {
      const grid = this.root;
      const tiles = [...grid.querySelectorAll<HTMLElement>("[data-slot=product-tile]")];
      const i = tiles.indexOf(document.activeElement as HTMLElement);
      if (i < 0) return;
      const rtl = getComputedStyle(grid).direction === "rtl";
      const step: Record<string, number> = {
        ArrowRight: rtl ? -1 : 1,
        ArrowLeft: rtl ? 1 : -1,
        ArrowDown: COLUMNS,
        ArrowUp: -COLUMNS,
        Home: -i,
        End: tiles.length - 1 - i,
      };
      const d = step[event.key];
      if (d === undefined) return;
      event.preventDefault();
      tiles[Math.min(tiles.length - 1, Math.max(0, i + d))]?.focus();
    },
  }));
};

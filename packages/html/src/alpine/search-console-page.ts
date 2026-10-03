// nqSearchConsolePage: links the metric tiles of <x-nq::search-console-page> to its chart. Choosing a tile shows that metric in the time-series
// panel; switching the metric in the panel marks the matching tile. Everything else on the page (tabs, period toggle, tables) has its own module.
//
//   <div class="contents" x-data="nqSearchConsolePage"> <x-nq::metric-tiles selectable …/> <x-nq::time-series-panel …/> </div>

import type { Register } from "./types";

// The Alpine runtime has $data; the slim AlpineLike type does not list it.
type WithData = { $data(el: Element): Record<string, unknown> };

export const searchConsolePage: Register = (Alpine) => {
  Alpine.data("nqSearchConsolePage", () => ({
    init(this: { $el: HTMLElement }) {
      const root = this.$el;
      const data = (el: Element | null) => (el ? (Alpine as unknown as WithData).$data(el) : null);
      const tiles = () => root.querySelector('[data-slot="metric-tiles"]');
      const panel = () => root.querySelector('[data-slot="time-series-panel"]');
      root.addEventListener("nq-select", (e) => {
        const id = (e as CustomEvent<{ id: string }>).detail?.id;
        const p = data(panel());
        if (p && id && p.metric !== id) p.pressed = [id];
      });
      root.addEventListener("nq-metric", (e) => {
        const id = (e as CustomEvent<{ id: string }>).detail?.id;
        const t = data(tiles());
        if (t && id) t.selected = id;
      });
    },
  }));
};

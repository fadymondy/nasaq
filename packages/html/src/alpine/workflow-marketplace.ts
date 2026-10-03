// nqWorkflowMarketplace: the kind switch (All, Steps, Presets) of the workflow marketplace. It wraps a catalog store and
// narrows the store's items to the chosen kind, so the cards, chip counts, result text and empty state all follow.
//
//   <div x-data="nqWorkflowMarketplace({ 'send-email': 'step', welcome: 'preset' })">
//     <div x-data="nqCatalogStore(...)"> ... <x-nq::toggle-group x-model="kindSel"> ...
//
// The wrapper is `display: contents`; the catalog store inside does everything else (see catalog-store.ts).

import type { Register } from "./types";

interface Row {
  id: string;
}

interface MarketState {
  kindSel: string[];
  lastKind: string;
  kinds: Record<string, string>;
  store: { items: Row[] } | null;
  $el: HTMLElement;
  $watch<T>(key: string, fn: (value: T) => void): void;
  $nextTick(fn: () => void): void;
  apply(): void;
}

export const workflowMarketplace: Register = (Alpine) => {
  Alpine.data("nqWorkflowMarketplace", (kinds: Record<string, string> = {}) => {
    let all: Row[] = [];
    return {
      kindSel: ["all"] as string[],
      lastKind: "all",
      kinds,
      store: null as { items: Row[] } | null,

      init(this: MarketState) {
        this.$watch<string[]>("kindSel", (value) => {
          if (value[0]) {
            this.lastKind = value[0];
            this.apply();
          } else {
            this.kindSel = [this.lastKind];
          }
        });
        this.$nextTick(() => {
          const el = this.$el.querySelector<HTMLElement>('[data-slot="catalog-store"]');
          if (!el) return;
          this.store = (Alpine as unknown as { $data(el: Element): { items: Row[] } }).$data(el);
          all = [...this.store.items];
          this.apply();
        });
      },
      apply(this: MarketState) {
        if (!this.store) return;
        const kind = this.lastKind;
        this.store.items = kind === "all" ? all : all.filter((i) => this.kinds[i.id] === kind);
      },
    };
  });
};

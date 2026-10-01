// nqCatalogStore: search, category chips, sort and the detail sheet of a store of installable things. The markup is the
// React CatalogStore's (server-rendered, every card), the state lives here: Alpine filters (x-show), sorts (it reorders the
// cards) and counts. The detail sheet is driven by detailOpen (x-model on the <x-nq::sheet>).
//
//   <div x-data="nqCatalogStore({ items: [{ id, name, summary, category, installs, updatedAt, installed… }], sort: 'popular', results: ':n results' })">
//     <input x-model="query"> <li x-show="visible('a')">…</li> <button x-on:click="install('a')">
//
// Install / uninstall fire the bubbling `nq-install` / `nq-uninstall` ({ id, item, wait(promise) }) from the root; call
// detail.wait(promise) to keep the button busy until it settles (a promise resolving to { error } shows the failure).
// `nq-open` ({ id }) is the "Open" action; with select: true a card fires `nq-select` ({ id }) instead of opening the sheet.

import { categoryCounts, filterCatalog, sortCatalog, type CatalogRow, type CatalogSort } from "./catalog-store-logic";
import type { Register } from "./types";

interface Row extends CatalogRow {
  installed?: boolean;
}

interface StoreOptions {
  items?: Row[];
  sort?: CatalogSort;
  select?: boolean;
  results?: string;
}

interface Failure {
  id: string;
  message: string;
}

type Kind = "install" | "uninstall";

interface StoreState {
  items: Row[];
  query: string;
  category: string;
  sortSel: string[];
  lastSort: CatalogSort;
  detailId: string | null;
  override: Record<string, boolean>;
  busy: Record<string, Kind>;
  error: Failure | null;
  root: HTMLElement | null;
  select: boolean;
  resultsTemplate: string;
  sort: CatalogSort;
  listed: Row[];
  $el: HTMLElement;
  $refs: Record<string, HTMLElement>;
  $watch<T>(key: string, fn: (value: T) => void): void;
  installed(id: string): boolean;
  reorder(): void;
  run(id: string, kind: Kind): void;
}

export const catalogStore: Register = (Alpine) => {
  Alpine.data("nqCatalogStore", (options: StoreOptions = {}) => {
    const first: CatalogSort = options.sort ?? "popular";
    return {
      items: options.items ?? ([] as Row[]),
      query: "",
      category: "all",
      sortSel: [first] as string[],
      lastSort: first,
      detailId: null as string | null,
      override: {} as Record<string, boolean>,
      busy: {} as Record<string, Kind>,
      error: null as Failure | null,
      root: null as HTMLElement | null,
      select: Boolean(options.select),
      resultsTemplate: options.results ?? ":n results",

      init(this: StoreState) {
        this.root = this.$el;
        this.$watch<string[]>("sortSel", (value) => {
          if (value[0]) {
            this.lastSort = value[0] as CatalogSort;
            this.reorder();
          } else {
            this.sortSel = [this.lastSort];
          }
        });
        this.reorder();
      },

      get sort(): CatalogSort {
        return ((this as unknown as StoreState).sortSel[0] ?? (this as unknown as StoreState).lastSort) as CatalogSort;
      },
      get installedOnly(): boolean {
        return (this as unknown as StoreState).category === "installed";
      },
      get listed(): Row[] {
        const s = this as unknown as StoreState;
        const only = s.category === "installed";
        const filtered = filterCatalog(s.items, { query: s.query, category: only ? "all" : s.category, installedOnly: only }, (i) => s.installed(i.id));
        return sortCatalog(filtered, s.sort, document.documentElement.lang || "en");
      },
      get installedCount(): number {
        const s = this as unknown as StoreState;
        return s.items.filter((i) => s.installed(i.id)).length;
      },
      get resultsText(): string {
        const s = this as unknown as StoreState;
        return s.resultsTemplate.replace(":n", String(s.listed.length));
      },
      get detailOpen(): boolean {
        return (this as unknown as StoreState).detailId !== null;
      },
      set detailOpen(value: boolean) {
        if (!value) (this as unknown as StoreState).detailId = null;
      },

      count(id: string): number {
        const s = this as unknown as StoreState;
        return categoryCounts(s.items, s.query).get(id) ?? 0;
      },
      visible(id: string): boolean {
        return (this as unknown as StoreState).listed.some((i) => i.id === id);
      },
      installed(id: string): boolean {
        const s = this as unknown as StoreState;
        return s.override[id] ?? s.items.find((i) => i.id === id)?.installed ?? false;
      },
      busyOf(id: string): Kind | undefined {
        return (this as unknown as StoreState).busy[id];
      },
      stateOf(id: string): string {
        const s = this as unknown as StoreState;
        return s.busy[id] === "install" ? "installing" : s.installed(id) ? "installed" : "available";
      },
      clear(this: StoreState) {
        this.query = "";
        this.category = "all";
      },
      /** Put the cards in the order of the selected sort (hidden ones keep their place). */
      reorder(this: StoreState) {
        const grid = this.$refs.grid;
        if (!grid) return;
        const order = sortCatalog(this.items, this.sort, document.documentElement.lang || "en");
        const byId = new Map<string, Element>();
        for (const li of Array.from(grid.children)) byId.set((li as HTMLElement).dataset.id ?? "", li);
        for (const row of order) {
          const li = byId.get(row.id);
          if (li) grid.appendChild(li);
        }
      },
      openDetail(this: StoreState, id: string) {
        if (this.select) this.root?.dispatchEvent(new CustomEvent("nq-select", { detail: { id }, bubbles: true }));
        else this.detailId = id;
      },
      openApp(this: StoreState, id: string) {
        this.root?.dispatchEvent(new CustomEvent("nq-open", { detail: { id }, bubbles: true }));
      },
      install(this: StoreState, id: string) {
        this.run(id, "install");
      },
      uninstall(this: StoreState, id: string) {
        this.run(id, "uninstall");
      },
      run(this: StoreState, id: string, kind: Kind) {
        const waits: Promise<unknown>[] = [];
        const item = this.items.find((i) => i.id === id);
        const detail = {
          id,
          item,
          wait: (promise: Promise<unknown>) => {
            waits.push(promise);
          },
        };
        this.error = null;
        this.root?.dispatchEvent(new CustomEvent(`nq-${kind}`, { detail, bubbles: true }));
        const done = (res: unknown) => {
          const { [id]: _gone, ...rest } = this.busy;
          this.busy = rest;
          const failure = res && typeof res === "object" ? (res as { error?: string }).error : undefined;
          if (failure) this.error = { id, message: failure };
          else this.override = { ...this.override, [id]: kind === "install" };
        };
        if (waits.length === 0) {
          done(undefined);
          return;
        }
        this.busy = { ...this.busy, [id]: kind };
        Promise.all(waits).then(
          (results) => done(results.find((r) => r && typeof r === "object" && (r as { error?: string }).error)),
          (e: unknown) => done({ error: e instanceof Error ? e.message : String(e) }),
        );
      },
    };
  });
};

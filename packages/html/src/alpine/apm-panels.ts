// nqApmEndpoints and nqApmTraces: the browser side of the APM panels. The markup is the React EndpointTable's and TraceList's, rendered by
// <x-nq::apm-panels.endpoint-table> and <x-nq::apm-panels.trace-list>.
//
//   <div x-data="nqApmEndpoints({ pageSize: 8, sort: { id: 'p95', dir: 'desc' }, rows: [{ id: 'a', search: 'GET /orders', values: { route: '/orders', p95: 410 } }], of: 'of' })">
//     <input x-model="query">
//     <button x-on:click="sortBy('p95')">p95</button>  <div role="columnheader" x-bind:aria-sort="ariaSort('p95')">
//     <div role="row" x-bind:style="rowStyle('a')">…</div>                  order and visibility of a server-rendered row
//     <div x-show="shownCount === 0">…</div>   <span x-text="rangeText()"></span>   <button x-on:click="setPage(page - 1)">
//   </div>
//
//   <div x-data="nqApmTraces(null)">
//     <button x-on:click="toggle('t1')" x-bind:aria-pressed="String(selected === 't1')">…</button>   <section x-show="selected === 't1'">waterfall</section>
//   </div>
//
// Rows stay in the page: Alpine only reorders them (CSS order) and hides the ones outside the search or the page. nqApmTraces.toggle(id) selects a
// trace (or clears it when it is chosen again) and dispatches a bubbling "nq-select" ({ id: string | null }); nqApmEndpoints.pick(id) dispatches
// "nq-select" ({ id }) for a clicked row.

import type { Magics, Register } from "./types";

export interface ApmEndpointRow {
  id: string;
  /** The text the search box matches: "GET /api/orders". */
  search: string;
  /** The sortable value of each column. */
  values: Record<string, number | string>;
}
interface ApmEndpointsConfig {
  rows: ApmEndpointRow[];
  pageSize?: number;
  sort?: { id: string; dir: "asc" | "desc" };
  /** The word between the shown range and the total, "of". */
  of?: string;
}
interface EndpointsState extends Magics {
  root: HTMLElement;
  rows: ApmEndpointRow[];
  pageSize: number;
  sort: { id: string; dir: "asc" | "desc" };
  of: string;
  query: string;
  page: number;
  readonly ranked: ApmEndpointRow[];
  readonly pageCount: number;
  readonly shownCount: number;
}

/** The rows matching `query`, ordered by the sort, ties kept in the order given. */
export function rankEndpoints(rows: readonly ApmEndpointRow[], query: string, sort: { id: string; dir: "asc" | "desc" }): ApmEndpointRow[] {
  const q = query.trim().toLowerCase();
  const sign = sort.dir === "desc" ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => q === "" || row.search.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = a.row.values[sort.id];
      const y = b.row.values[sort.id];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
      return c * sign || a.index - b.index;
    })
    .map(({ row }) => row);
}

interface TracesState extends Magics {
  root: HTMLElement;
  selected: string | null;
}

export const apmPanels: Register = (Alpine) => {
  Alpine.data("nqApmEndpoints", (config: ApmEndpointsConfig) => ({
    root: null as unknown as HTMLElement,
    rows: config.rows ?? [],
    pageSize: config.pageSize ?? 0,
    sort: { id: config.sort?.id ?? "p95", dir: config.sort?.dir ?? "desc" },
    of: config.of ?? "of",
    query: "",
    page: 0,
    init(this: EndpointsState) {
      this.root = this.$el;
      // A new search or sort starts on the first page.
      this.$watch("query", () => {
        this.page = 0;
      });
    },
    get ranked(): ApmEndpointRow[] {
      const s = this as unknown as EndpointsState;
      return rankEndpoints(s.rows, s.query, s.sort);
    },
    get pageCount(): number {
      const s = this as unknown as EndpointsState;
      return s.pageSize > 0 ? Math.max(1, Math.ceil(s.ranked.length / s.pageSize)) : 1;
    },
    get shownCount(): number {
      const s = this as unknown as EndpointsState;
      return s.pageSize > 0 ? Math.min(s.pageSize, Math.max(0, s.ranked.length - s.page * s.pageSize)) : s.ranked.length;
    },
    /** Sorts by the column; choosing the sorted column again flips it. Text columns start ascending, numbers descending. */
    sortBy(this: EndpointsState, id: string) {
      const first = this.rows[0]?.values[id];
      this.sort = this.sort.id === id ? { id, dir: this.sort.dir === "asc" ? "desc" : "asc" } : { id, dir: typeof first === "string" ? "asc" : "desc" };
      this.page = 0;
    },
    ariaSort(this: EndpointsState, id: string): "ascending" | "descending" | "none" {
      return this.sort.id !== id ? "none" : this.sort.dir === "asc" ? "ascending" : "descending";
    },
    /** The style of a server-rendered row: where it goes in the order, and hidden when outside the search or the page. */
    rowStyle(this: EndpointsState, id: string): Record<string, string> {
      const at = this.ranked.findIndex((r) => r.id === id);
      const inPage = at >= 0 && (this.pageSize <= 0 || (at >= this.page * this.pageSize && at < (this.page + 1) * this.pageSize));
      return { order: String(at < 0 ? 0 : at), display: inPage ? "" : "none" };
    },
    setPage(this: EndpointsState, page: number) {
      this.page = Math.min(Math.max(0, page), this.pageCount - 1);
    },
    /** "1 to 8 of 12". */
    rangeText(this: EndpointsState): string {
      const total = this.ranked.length;
      if (total === 0) return "";
      const from = this.pageSize > 0 ? this.page * this.pageSize + 1 : 1;
      const to = this.pageSize > 0 ? Math.min(total, (this.page + 1) * this.pageSize) : total;
      return `${from}-${to} ${this.of} ${total}`;
    },
    pick(this: EndpointsState, id: string) {
      this.root.dispatchEvent(new CustomEvent("nq-select", { bubbles: true, detail: { id } }));
    },
  }));

  Alpine.data("nqApmTraces", (selected: string | null = null) => ({
    root: null as unknown as HTMLElement,
    selected,
    init(this: TracesState) {
      this.root = this.$el;
    },
    toggle(this: TracesState, id: string) {
      this.selected = this.selected === id ? null : id;
      this.root.dispatchEvent(new CustomEvent("nq-select", { bubbles: true, detail: { id: this.selected } }));
    },
  }));
};

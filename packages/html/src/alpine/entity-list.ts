// nqEntityList: a list of records shown as a table or a grid of cards, with search, multi-value filters, sorting,
// selection and a row menu. Rows and columns are plain data; the card body is the Blade `card` slot, which sees `row`.
//
//   <div x-data="nqEntityList([{ id: 'a', name: 'Mona', tags: ['vip'] }],
//        [{ id: 'name', header: 'Name', sortable: true, searchable: true }],
//        { facets: [{ id: 'tags', key: 'tags', title: 'Tags', options: [{ value: 'vip', label: 'VIP' }] }], view: 'table' })"> … </div>
//
// Facets match a row when ANY chosen value is among the row's values (a row's `key` field is a string or an array of strings).
// Bubbling events: `nq-entity-list-row-click` { row }, `nq-entity-list-action` { action, row }, `nq-entity-list-selection` { ids },
// `nq-entity-list-view` { view }. Not ported here: in-cell editing and the column picker of the DataTable.

import type { Magics, Register } from "./types";

type Row = Record<string, unknown>;
interface Option {
  value: string;
  label: string;
}
interface Column {
  id: string;
  key?: string;
  header?: string;
  sortable?: boolean;
  searchable?: boolean;
  align?: "start" | "center" | "end";
}
interface Facet {
  id: string;
  key?: string;
  title: string;
  options: Option[];
}
interface Options {
  key?: string;
  nameKey?: string;
  view?: "table" | "cards";
  views?: ("table" | "cards")[];
  pageSize?: number;
  selectable?: boolean;
  facets?: Facet[];
  locale?: string;
  labels?: Record<string, string>;
}

const fold = (s: unknown) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .toLowerCase();

export const entityList: Register = (Alpine) => {
  Alpine.data("nqEntityList", (rows: Row[] = [], columns: Column[] = [], options: Options = {}) => ({
    rows,
    columns,
    facets: options.facets ?? [],
    key: options.key ?? "id",
    nameKey: options.nameKey ?? options.key ?? "id",
    locale: options.locale ?? "en",
    labels: options.labels ?? {},
    selectable: options.selectable !== false,
    views: options.views ?? ["table", "cards"],
    view: options.view ?? "table",
    query: "",
    // `facet['tags|vip']` is true while that value is chosen. It is a flat map so a checkbox item can x-model it.
    facet: {} as Record<string, boolean>,
    sort: null as null | { id: string; dir: "asc" | "desc" },
    selection: {} as Record<string, boolean>,
    pageSize: options.pageSize ?? 0,
    page: 0,
    active: 0,
    root: null as HTMLElement | null,

    init(this: State & Magics) {
      this.root = this.$el;
      this.$watch("selection", () => this.root?.dispatchEvent(new CustomEvent("nq-entity-list-selection", { bubbles: true, detail: { ids: this.selectedIds() } })));
      this.$watch("query", () => (this.page = 0));
    },

    // ---- derived ----
    idOf(this: State, row: Row) {
      return String(row[this.key]);
    },
    nameOf(this: State, row: Row) {
      return String(row[this.nameKey] ?? row[this.key]);
    },
    say(this: State, key: string, row?: Row) {
      return (this.labels[key] ?? key).replace("{name}", row ? this.nameOf(row) : "");
    },
    facetValues(this: State, id: string) {
      const f = this.facets.find((x) => x.id === id);
      return (f?.options ?? []).map((o) => o.value).filter((v) => this.facet[`${id}|${v}`]);
    },
    facetCount(this: State, id: string) {
      return this.facetValues(id).length;
    },
    facetSummary(this: State, id: string) {
      const f = this.facets.find((x) => x.id === id);
      const chosen = this.facetValues(id);
      if (chosen.length > 2) return new Intl.NumberFormat(this.locale).format(chosen.length);
      return (f?.options ?? []).filter((o) => chosen.includes(o.value)).map((o) => o.label).join(", ");
    },
    resetFacet(this: State, id: string) {
      for (const v of this.facetValues(id)) this.facet[`${id}|${v}`] = false;
      this.page = 0;
    },
    isFiltered(this: State) {
      return this.query.trim() !== "" || this.facets.some((f) => this.facetCount(f.id) > 0);
    },
    clearAll(this: State) {
      this.query = "";
      for (const f of this.facets) this.resetFacet(f.id);
    },
    get matched(): Row[] {
      const self = this as unknown as State;
      const q = fold(self.query.trim());
      const searchable = self.columns.filter((c) => c.searchable);
      return self.rows.filter((row) => {
        if (q && !searchable.some((c) => fold(row[c.key ?? c.id]).includes(q))) return false;
        return self.facets.every((f) => {
          const chosen = self.facetValues(f.id);
          if (!chosen.length) return true;
          const raw = row[f.key ?? f.id];
          const values = (Array.isArray(raw) ? raw : [raw]).map(String);
          return chosen.some((v) => values.includes(v));
        });
      });
    },
    get sorted(): Row[] {
      const self = this as unknown as State;
      const list = [...self.matched];
      const s = self.sort;
      if (!s) return list;
      const col = self.columns.find((c) => c.id === s.id);
      const k = col?.key ?? s.id;
      const collator = new Intl.Collator(self.locale, { numeric: true, sensitivity: "base" });
      return list.sort((a, b) => {
        const av = a[k];
        const bv = b[k];
        if (av == null || av === "") return bv == null || bv === "" ? 0 : 1;
        if (bv == null || bv === "") return -1;
        const r = typeof av === "number" && typeof bv === "number" ? av - bv : collator.compare(String(av), String(bv));
        return s.dir === "asc" ? r : -r;
      });
    },
    get pageRows(): Row[] {
      const self = this as unknown as State;
      if (!self.pageSize) return self.sorted;
      return self.sorted.slice(self.page * self.pageSize, (self.page + 1) * self.pageSize);
    },
    pageCount(this: State) {
      return this.pageSize ? Math.max(1, Math.ceil(this.sorted.length / this.pageSize)) : 1;
    },
    count(this: State) {
      return this.matched.length;
    },
    status(this: State) {
      const n = this.matched.length;
      const tpl = n === 1 ? (this.labels.resultsOne ?? "1 result") : (this.labels.results ?? "{n} results");
      return tpl.replace("{n}", new Intl.NumberFormat(this.locale).format(n));
    },
    hasRows(this: State) {
      return this.pageRows.length > 0;
    },
    noMatches(this: State) {
      return this.rows.length > 0 && this.matched.length === 0;
    },

    // ---- view, sorting, paging ----
    setView(this: State, next: "table" | "cards") {
      if (!this.views.includes(next) || next === this.view) return;
      this.view = next;
      this.active = 0;
      this.root?.dispatchEvent(new CustomEvent("nq-entity-list-view", { bubbles: true, detail: { view: next } }));
    },
    toggleSort(this: State, id: string) {
      const s = this.sort;
      if (!s || s.id !== id) this.sort = { id, dir: "asc" };
      else this.sort = s.dir === "asc" ? { id, dir: "desc" } : null;
      this.page = 0;
    },
    setSort(this: State, id: string, dir: "asc" | "desc") {
      this.sort = { id, dir };
      this.page = 0;
    },
    sortState(this: State, id: string) {
      return this.sort?.id === id ? (this.sort.dir === "asc" ? "ascending" : "descending") : "none";
    },
    goto(this: State, page: number) {
      this.page = Math.max(0, Math.min(this.pageCount() - 1, page));
    },

    // ---- selection ----
    isSelected(this: State, row: Row) {
      return !!this.selection[this.idOf(row)];
    },
    toggleRow(this: State, row: Row) {
      const id = this.idOf(row);
      this.selection = { ...this.selection, [id]: !this.selection[id] };
    },
    selectedIds(this: State) {
      return Object.keys(this.selection).filter((id) => this.selection[id]);
    },
    selectedCount(this: State) {
      return this.selectedIds().length;
    },
    pageSelection(this: State): "all" | "some" | "none" {
      const rowsOnPage = this.pageRows;
      const n = rowsOnPage.filter((r) => this.isSelected(r)).length;
      return n === 0 ? "none" : n === rowsOnPage.length ? "all" : "some";
    },
    togglePage(this: State) {
      const all = this.pageSelection() === "all";
      const next = { ...this.selection };
      for (const r of this.pageRows) next[this.idOf(r)] = !all;
      this.selection = next;
    },
    clearSelection(this: State) {
      this.selection = {};
    },

    // ---- actions and keyboard ----
    act(this: State, action: string, row: Row) {
      this.root?.dispatchEvent(new CustomEvent("nq-entity-list-action", { bubbles: true, detail: { action, row: { ...row } } }));
    },
    open(this: State, row: Row, event?: Event) {
      const hit = (event?.target as HTMLElement | null)?.closest("a,button,input,select,textarea,[role=checkbox],[role=menuitem]");
      if (hit && hit !== event?.currentTarget) return;
      this.root?.dispatchEvent(new CustomEvent("nq-entity-list-row-click", { bubbles: true, detail: { row: { ...row } } }));
    },
    cards(this: State & Magics) {
      return Array.from(this.root?.querySelectorAll<HTMLElement>("[data-card]") ?? []);
    },
    focusCard(this: State & Magics, index: number) {
      const target = this.cards()[index];
      if (!target) return;
      this.active = index;
      target.focus();
    },
    cardKey(this: State & Magics, event: KeyboardEvent, row: Row, index: number) {
      const el = event.currentTarget as HTMLElement;
      if (event.target !== el) return;
      const last = this.pageRows.length - 1;
      const rtl = getComputedStyle(el).direction === "rtl";
      const step = (d: number) => Math.max(0, Math.min(last, index + d));
      const rects = this.cards().map((c) => c.getBoundingClientRect());
      const vertical = (dir: 1 | -1) => {
        const here = rects[index];
        if (!here) return index;
        let best = index;
        let bestDx = Infinity;
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i]!;
          if (dir === 1 ? r.top <= here.top + 1 : r.top >= here.top - 1) continue;
          const dy = Math.abs(r.top - here.top);
          const dx = Math.abs(r.left - here.left);
          const score = dy * 10000 + dx;
          if (best === index || score < bestDx) {
            best = i;
            bestDx = score;
          }
        }
        return best;
      };
      let move: number | undefined;
      if (event.key === "ArrowRight") move = step(rtl ? -1 : 1);
      else if (event.key === "ArrowLeft") move = step(rtl ? 1 : -1);
      else if (event.key === "ArrowDown") move = vertical(1);
      else if (event.key === "ArrowUp") move = vertical(-1);
      else if (event.key === "Home") move = 0;
      else if (event.key === "End") move = last;
      if (move !== undefined) {
        event.preventDefault();
        this.focusCard(move);
      } else if (event.key === "Enter") {
        event.preventDefault();
        this.open(row);
      } else if (event.key === " " && this.selectable) {
        event.preventDefault();
        this.toggleRow(row);
      }
    },
  }));
};

interface State {
  rows: Row[];
  columns: Column[];
  facets: Facet[];
  key: string;
  nameKey: string;
  locale: string;
  labels: Record<string, string>;
  selectable: boolean;
  views: ("table" | "cards")[];
  view: "table" | "cards";
  query: string;
  facet: Record<string, boolean>;
  sort: null | { id: string; dir: "asc" | "desc" };
  selection: Record<string, boolean>;
  pageSize: number;
  page: number;
  active: number;
  root: HTMLElement | null;
  matched: Row[];
  sorted: Row[];
  pageRows: Row[];
  idOf(row: Row): string;
  nameOf(row: Row): string;
  facetValues(id: string): string[];
  facetCount(id: string): number;
  resetFacet(id: string): void;
  pageCount(): number;
  isSelected(row: Row): boolean;
  pageSelection(): "all" | "some" | "none";
  toggleRow(row: Row): void;
  selectedIds(): string[];
  cards(): HTMLElement[];
  focusCard(index: number): void;
  open(row: Row, event?: Event): void;
}

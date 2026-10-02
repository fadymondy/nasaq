// nqMarkdownTable and nqCodeExtras: the behaviour of <x-nq::markdown-extras.table> and <x-nq::markdown-extras.code-block>.
//
//   <div data-slot="markdown-table" x-data="nqMarkdownTable({ headers, texts, sortable, showFilter, defaultSort, downloadName, labels })" x-effect="render()">
//     ... <tbody><tr data-row="0">...</tr> ... <tr data-empty style="display: none">...</tr></tbody>
//   </div>
//
// The server renders every row in source order. render() (re-run by x-effect when the query or sort changes) reorders the real rows and hides the
// ones the filter drops, so cell formatting is never rebuilt. nqCodeExtras sits inside a code block's copy slot and adds or removes the line-number
// gutters of the figure it lives in.

import { saveExportBlob, toCsv } from "./export-action-logic";
import { filterMarkdownRows, type MarkdownSortState, nextMarkdownSort, sortMarkdownRows } from "./markdown-extras-logic";
import type { Magics, Register } from "./types";

interface TableLabels {
  rowCount: string;
  noMatch: string;
  sorted: string;
  ascending: string;
  descending: string;
}
interface TableConfig {
  headers?: string[];
  texts?: string[][];
  sortable?: boolean;
  showFilter?: boolean;
  defaultSort?: MarkdownSortState | null;
  downloadName?: string;
  labels?: Partial<TableLabels>;
}
interface TableState extends Magics {
  headers: string[];
  texts: string[][];
  sortable: boolean;
  showFilter: boolean;
  sort: MarkdownSortState | null;
  query: string;
  shown: number[];
  downloadName: string;
  labels: TableLabels;
  root: HTMLElement | null;
  readonly hasQuery: boolean;
  readonly count: string;
  readonly status: string;
  readonly emptyText: string;
  readonly hasRows: boolean;
  rows(): { index: number; texts: string[] }[];
  render(): void;
  toggle(column: number): void;
  clear(): void;
  ariaSort(column: number): string | null;
  isSorted(column: number): boolean;
  isIdle(column: number): boolean;
  isUp(column: number): boolean;
  isDown(column: number): boolean;
  download(): void;
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

const DEFAULT_LABELS: TableLabels = {
  rowCount: "{shown} of {total} rows",
  noMatch: "No rows match “{query}”.",
  sorted: "Sorted by {column}, {direction}",
  ascending: "ascending",
  descending: "descending",
};

interface CodeConfig {
  code?: string;
  name?: string;
  numbers?: boolean;
}
interface CodeState extends Magics {
  code: string;
  name: string;
  numbers: boolean;
  figure: HTMLElement | null;
  toggle(): void;
  save(): void;
  apply(): void;
}

const GUTTER =
  "inline-block shrink-0 select-none pe-4 ps-3 text-end text-muted-foreground tabular-nums";

export const markdownExtras: Register = (Alpine) => {
  Alpine.data("nqMarkdownTable", (cfg: TableConfig = {}) => ({
    headers: cfg.headers ?? [],
    texts: cfg.texts ?? [],
    sortable: cfg.sortable ?? true,
    showFilter: cfg.showFilter ?? false,
    sort: cfg.defaultSort ?? null,
    query: "",
    shown: (cfg.texts ?? []).map((_, i) => i),
    downloadName: cfg.downloadName ?? "table.csv",
    labels: { ...DEFAULT_LABELS, ...(cfg.labels ?? {}) },
    root: null as HTMLElement | null,
    init(this: TableState) {
      this.root = this.$el;
    },
    get hasQuery() {
      return this.query !== "";
    },
    get count() {
      return fill(this.labels.rowCount, { shown: this.shown.length, total: this.texts.length });
    },
    get hasRows() {
      return this.shown.length > 0;
    },
    get emptyText() {
      return fill(this.labels.noMatch, { query: this.query });
    },
    get status() {
      const column = this.sort ? this.headers[this.sort.column] : undefined;
      const sorted = column ? fill(this.labels.sorted, { column, direction: this.sort?.direction === "asc" ? this.labels.ascending : this.labels.descending }) : "";
      return sorted + (this.showFilter ? ` ${this.count}` : "");
    },
    rows(this: TableState) {
      return this.texts.map((texts, index) => ({ index, texts }));
    },
    /** Reads query and sort (so x-effect re-runs on either), then reorders and hides the real rows. */
    render(this: TableState) {
      const view = sortMarkdownRows(filterMarkdownRows(this.rows(), this.query), this.sort);
      this.shown = view.map((r) => r.index);
      const root = this.root ?? this.$el;
      const body = root.querySelector<HTMLElement>("tbody");
      if (!body) return;
      const byIndex = new Map<number, HTMLElement>();
      body.querySelectorAll<HTMLElement>(":scope > tr[data-row]").forEach((tr) => byIndex.set(Number(tr.getAttribute("data-row")), tr));
      const empty = body.querySelector<HTMLElement>(":scope > tr[data-empty]");
      const visible = new Set(this.shown);
      for (const [i, tr] of byIndex) tr.style.display = visible.has(i) ? "" : "none";
      for (const i of this.shown) {
        const tr = byIndex.get(i);
        if (tr) body.insertBefore(tr, empty);
      }
      if (empty) empty.style.display = this.shown.length === 0 && this.texts.length > 0 ? "" : "none";
    },
    toggle(this: TableState, column: number) {
      this.sort = nextMarkdownSort(this.sort, column);
    },
    clear(this: TableState) {
      this.query = "";
    },
    ariaSort(this: TableState, column: number) {
      if (this.sort?.column === column) return this.sort.direction === "asc" ? "ascending" : "descending";
      return this.sortable ? "none" : null;
    },
    isSorted(this: TableState, column: number) {
      return this.sort?.column === column;
    },
    isIdle(this: TableState, column: number) {
      return this.sort?.column !== column;
    },
    isUp(this: TableState, column: number) {
      return this.sort?.column === column && this.sort.direction === "asc";
    },
    isDown(this: TableState, column: number) {
      return this.sort?.column === column && this.sort.direction === "desc";
    },
    download(this: TableState) {
      const rows = this.shown.map((i) => this.texts[i] ?? []);
      saveExportBlob(new Blob([toCsv([this.headers, ...rows], { bom: true })], { type: "text/csv;charset=utf-8" }), this.downloadName);
    },
  }));

  Alpine.data("nqCodeExtras", (cfg: CodeConfig = {}) => ({
    code: cfg.code ?? "",
    name: cfg.name ?? "code.txt",
    numbers: cfg.numbers ?? false,
    figure: null as HTMLElement | null,
    init(this: CodeState) {
      this.figure = this.$el.closest<HTMLElement>('[data-slot="code-block"]');
      this.apply();
    },
    toggle(this: CodeState) {
      this.numbers = !this.numbers;
      this.apply();
    },
    save(this: CodeState) {
      saveExportBlob(new Blob([this.code], { type: "text/plain;charset=utf-8" }), this.name);
    },
    /** Adds or removes the gutter of every line to match `numbers`. */
    apply(this: CodeState) {
      const lines = this.figure?.querySelectorAll<HTMLElement>("[data-line]");
      if (!lines) return;
      const width = `${String(lines.length).length + 3}ch`;
      lines.forEach((line) => {
        const gutter = line.querySelector<HTMLElement>(":scope > [aria-hidden]");
        if (this.numbers && !gutter) {
          const el = document.createElement("span");
          el.setAttribute("aria-hidden", "true");
          el.className = GUTTER;
          el.style.minWidth = width;
          el.textContent = line.getAttribute("data-line");
          line.insertBefore(el, line.firstChild);
          line.classList.remove("ps-3");
        } else if (!this.numbers && gutter) {
          gutter.remove();
          line.classList.add("ps-3");
        }
      });
    },
  }));
};


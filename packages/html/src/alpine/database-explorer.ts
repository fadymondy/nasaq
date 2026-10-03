// nqDatabaseExplorer: the state behind the Blade database-explorer: the table tree with a filter, the SQL editor, the results grid
// (sortable headers, CSV), each table's structure and the history of what you ran.
//
//   <section data-slot="database-explorer" x-data="nqDatabaseExplorer({ schemas, rowLimit, defaultQuery, defaultTable, confirmWrites, locale, strings })">
//     <input x-model="filter"> <div role="tree"> <template x-for="node in nodes"> ... x-on:click="onNode(node)"
//     <textarea x-model="sql" x-on:keydown="onKeyDown($event)"> <button x-on:click="request()">
//     <x-nq::tabs x-model="tab"> ... <x-nq::alert-dialog x-model="confirmOpen"> ... <button x-on:click="confirmRun()">
//   </section>
//
// Nothing here talks to a database. Running a statement dispatches a bubbling, cancelable "nq-database-query" event from the root:
//   detail { sql, resolve(outcome), reject(message), waitUntil(promise) }
// where an outcome is { columns, rows, durationMs?, affectedRows?, truncated? } or { error }. Nobody claimed it: an empty result.
// A rejected promise or reject() shows the error (reject(message) shows that message, the rest the generic one).
// The CSV button dispatches "nq-database-export" { result }; if nobody calls preventDefault the CSV is saved as query.csv.
import { copyText } from "./copy-button";
import {
  affectedText,
  buildSelectSql,
  cellKind,
  fill,
  formatCell,
  isReadOnlySql,
  pushHistory,
  resultToCsv,
  rowsText,
  sortRows,
  type CellKind,
  type DatabaseExplorerStrings,
} from "./database-explorer-logic";
import type { Magics, Register } from "./types";

interface Column {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  references?: string;
}
interface Table {
  name: string;
  kind?: "table" | "view";
  rowCount?: number;
  columns: Column[];
}
interface Schema {
  name: string;
  tables: Table[];
}
interface Config {
  schemas: Schema[];
  rowLimit: number;
  defaultQuery: string;
  defaultTable: { schema: string; table: string } | null;
  confirmWrites: boolean;
  locale: string;
  strings: DatabaseExplorerStrings;
}
type Outcome = { error: string } | { columns: string[]; rows: unknown[][]; durationMs?: number; affectedRows?: number; truncated?: boolean };
type Result = Extract<Outcome, { columns: string[] }>;

interface Node {
  id: string;
  kind: "schema" | "table";
  level: number;
  pos: number;
  size: number;
  name: string;
  rowCount: number | null;
  view: boolean;
  expandable: boolean;
  open: boolean;
  selected: boolean;
  parent: string | null;
}

interface State extends Magics {
  config: Config;
  root: HTMLElement;
  alive: boolean;
  filter: string;
  expanded: string[];
  focusId: string;
  active: { schema: string; table: string } | null;
  sql: string;
  running: boolean;
  outcome: Outcome | null;
  history: string[];
  tab: string;
  confirmOpen: boolean;
  confirmSql: string;
  sortIndex: number;
  sortDir: "asc" | "desc" | null;
  copied: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  nodes: Node[];
  result: Result | null;
  execute(text: string): Promise<void>;
  pickTable(schema: string, table: string): void;
  toggle(id: string): void;
  noSchemas: boolean;
  onNode(node: Node): void;
  request(text?: string): void;
  focusEditor(): void;
}

const PAGE = 25;
const CELL_CLASS: Record<CellKind, string> = { null: "", number: "tabular-nums", boolean: "", json: "text-muted-foreground", date: "tabular-nums", text: "" };

/** Dispatches the query event from `root` and waits for whoever claimed it. */
async function runQuery(root: HTMLElement, sql: string, failed: string): Promise<Outcome> {
  let claimed = false;
  let settle!: (outcome: Outcome) => void;
  const done = new Promise<Outcome>((resolve) => (settle = resolve));
  const detail = {
    sql,
    resolve(outcome?: Outcome) {
      claimed = true;
      settle(outcome ?? { columns: [], rows: [] });
    },
    reject(message?: string) {
      claimed = true;
      settle({ error: message || failed });
    },
    waitUntil(promise: Promise<Outcome | void>) {
      claimed = true;
      Promise.resolve(promise).then(
        (outcome) => settle(outcome ?? { columns: [], rows: [] }),
        () => settle({ error: failed }),
      );
    },
  };
  const event = new CustomEvent("nq-database-query", { detail, bubbles: true, cancelable: true });
  root.dispatchEvent(event);
  if (!claimed && !event.defaultPrevented) return { columns: [], rows: [] };
  return done;
}

export const databaseExplorer: Register = (Alpine) => {
  Alpine.data("nqDatabaseExplorer", (config: Config) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    filter: "",
    expanded: config.schemas.map((s) => s.name),
    focusId: "",
    active: config.defaultTable,
    sql: config.defaultQuery,
    running: false,
    outcome: null as Outcome | null,
    history: [] as string[],
    tab: "results",
    confirmOpen: false,
    confirmSql: "",
    sortIndex: -1,
    sortDir: null as "asc" | "desc" | null,
    copied: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    init(this: State) {
      this.root = this.$el;
    },
    destroy(this: State) {
      this.alive = false;
      clearTimeout(this.timer);
    },

    // ---- tree
    get nodes(): Node[] {
      const self = this as unknown as State;
      const q = self.filter.trim().toLowerCase();
      const schemas: Array<{ s: Schema; i: number; tables: Array<{ t: Table; j: number }> }> = [];
      self.config.schemas.forEach((s, i) => {
        const tables = s.tables.map((t, j) => ({ t, j })).filter(({ t }) => !q || t.name.toLowerCase().includes(q));
        if (q && tables.length === 0) return;
        schemas.push({ s, i, tables });
      });
      const out: Node[] = [];
      schemas.forEach(({ s, i, tables }, k) => {
        const open = q ? true : self.expanded.includes(s.name);
        out.push({ id: `s${i}`, kind: "schema", level: 1, pos: k + 1, size: schemas.length, name: s.name, rowCount: null, view: false, expandable: tables.length > 0, open, selected: false, parent: null });
        if (!open) return;
        tables.forEach(({ t, j }, m) =>
          out.push({
            id: `s${i}:t${j}`,
            kind: "table",
            level: 2,
            pos: m + 1,
            size: tables.length,
            name: t.name,
            rowCount: t.rowCount ?? null,
            view: t.kind === "view",
            expandable: false,
            open: false,
            selected: self.active?.schema === s.name && self.active.table === t.name,
            parent: `s${i}`,
          }),
        );
      });
      return out;
    },
    get tabId(): string {
      const self = this as unknown as State;
      const list = self.nodes;
      return (list.find((n) => n.id === self.focusId) ?? list.find((n) => n.selected) ?? list[0])?.id ?? "";
    },
    get noSchemas(): boolean {
      return (this as unknown as State).config.schemas.length === 0;
    },
    get noMatches(): boolean {
      const self = this as unknown as State;
      return !self.noSchemas && self.nodes.length === 0;
    },
    count(n: number): string {
      return new Intl.NumberFormat((this as unknown as State).config.locale).format(n);
    },
    toggle(this: State, id: string) {
      const node = this.nodes.find((n) => n.id === id);
      if (!node || node.kind !== "schema" || this.filter.trim()) return;
      this.expanded = this.expanded.includes(node.name) ? this.expanded.filter((x) => x !== node.name) : [...this.expanded, node.name];
    },
    onNode(this: State, node: Node) {
      this.focusId = node.id;
      if (node.kind === "schema") this.toggle(node.id);
      else this.pickTable(this.config.schemas[Number(node.id.slice(1, node.id.indexOf(":")))]!.name, node.name);
    },
    treeKey(this: State, event: KeyboardEvent) {
      const el = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
      if (!el) return;
      const list = this.nodes;
      const at = list.findIndex((n) => n.id === el.dataset.nodeId);
      const node = list[at];
      if (!node) return;
      const rtl = getComputedStyle(this.root).direction === "rtl";
      const open = rtl ? "ArrowLeft" : "ArrowRight";
      const close = rtl ? "ArrowRight" : "ArrowLeft";
      let to: Node | undefined;
      if (event.key === "ArrowDown") to = list[Math.min(at + 1, list.length - 1)];
      else if (event.key === "ArrowUp") to = list[Math.max(at - 1, 0)];
      else if (event.key === "Home") to = list[0];
      else if (event.key === "End") to = list[list.length - 1];
      else if (event.key === open) {
        if (node.kind === "schema" && node.expandable && !node.open) this.toggle(node.id);
        else if (node.kind === "schema") to = list[at + 1]?.parent === node.id ? list[at + 1] : undefined;
        else return;
      } else if (event.key === close) {
        if (node.kind === "schema" && node.open) this.toggle(node.id);
        else if (node.parent) to = list.find((n) => n.id === node.parent);
        else return;
      } else if (event.key === "Enter" || event.key === " ") this.onNode(node);
      else return;
      event.preventDefault();
      if (!to) return;
      this.focusId = to.id;
      const id = to.id;
      this.$nextTick(() => this.root.querySelector<HTMLElement>(`[data-node-id="${id}"]`)?.focus());
    },

    // ---- editor and running
    get modifies(): boolean {
      const self = this as unknown as State;
      return self.sql.trim() !== "" && !isReadOnlySql(self.sql);
    },
    get canRun(): boolean {
      const self = this as unknown as State;
      return !self.running && self.sql.trim() !== "";
    },
    onKeyDown(this: State, event: KeyboardEvent) {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.request();
      }
    },
    request(this: State, text?: string) {
      const statement = text ?? this.sql;
      if (this.running || !statement.trim()) return;
      if (this.config.confirmWrites && !isReadOnlySql(statement)) {
        this.confirmSql = statement;
        this.confirmOpen = true;
      } else void this.execute(statement);
    },
    confirmRun(this: State) {
      const text = this.confirmSql;
      this.confirmOpen = false;
      if (text) void this.execute(text);
    },
    async execute(this: State, text: string) {
      const statement = text.trim();
      if (!statement) return;
      this.running = true;
      this.tab = "results";
      this.history = pushHistory(this.history, statement);
      const outcome = await runQuery(this.root, statement, String(this.config.strings.genericError));
      if (!this.alive) return;
      this.outcome = outcome;
      this.sortIndex = -1;
      this.sortDir = null;
      this.copied = false;
      this.running = false;
    },
    pickTable(this: State, schema: string, table: string) {
      this.active = { schema, table };
      const next = buildSelectSql(table, schema, this.config.rowLimit);
      this.sql = next;
      void this.execute(next);
    },
    focusEditor(this: State) {
      this.root.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    },
    clearEditor(this: State) {
      this.sql = "";
      this.focusEditor();
    },
    useQuery(this: State, entry: string) {
      this.sql = entry;
      this.focusEditor();
    },
    clearHistory(this: State) {
      this.history = [];
    },
    oneLine(entry: string): string {
      return entry.replace(/\s+/g, " ");
    },

    // ---- results
    get isError(): boolean {
      const o = (this as unknown as State).outcome;
      return !!o && "error" in o;
    },
    get errorText(): string {
      const o = (this as unknown as State).outcome;
      return o && "error" in o ? o.error : "";
    },
    get result(): Result | null {
      const o = (this as unknown as State).outcome;
      return o && !("error" in o) ? o : null;
    },
    get hasResult(): boolean {
      return (this as unknown as State).result !== null;
    },
    get noColumns(): boolean {
      const r = (this as unknown as State).result;
      return !!r && r.columns.length === 0;
    },
    get hasRows(): boolean {
      const r = (this as unknown as State).result;
      return !!r && r.rows.length > 0;
    },
    get noRows(): boolean {
      const r = (this as unknown as State).result;
      return !!r && r.columns.length > 0 && r.rows.length === 0;
    },
    get truncated(): boolean {
      return !!(this as unknown as State).result?.truncated;
    },
    get truncatedText(): string {
      const r = (this as unknown as State).result;
      return fill(String((this as unknown as State).config.strings.truncated), { n: r?.rows.length ?? 0 });
    },
    get emptyTitle(): string {
      const self = this as unknown as State;
      const r = self.result;
      return r?.affectedRows !== undefined ? affectedText(self.config.strings, r.affectedRows) : String(self.config.strings.noRows);
    },
    get summary(): string {
      const self = this as unknown as State;
      const r = self.result;
      if (!r) return "";
      const head = r.affectedRows !== undefined && r.rows.length === 0 ? affectedText(self.config.strings, r.affectedRows) : rowsText(self.config.strings, r.rows.length);
      return r.durationMs !== undefined ? `${head} · ${fill(String(self.config.strings.took), { n: r.durationMs })}` : head;
    },
    get columnsView(): Array<{ index: number; name: string; align: "start" | "end"; sort: "asc" | "desc" | null; aria: "ascending" | "descending" | "none" }> {
      const self = this as unknown as State;
      const r = self.result;
      if (!r) return [];
      return r.columns.map((name, index) => {
        const sort = self.sortIndex === index ? self.sortDir : null;
        return { index, name, align: typeof r.rows[0]?.[index] === "number" ? "end" : "start", sort, aria: sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none" };
      });
    },
    get pageRows(): Array<{ i: number; cells: Array<{ kind: CellKind; text: string; cls: string; align: "start" | "end" }> }> {
      const self = this as unknown as State;
      const r = self.result;
      if (!r) return [];
      const rows = r.rows.map((cells, i) => ({ i, cells }));
      const sorted = sortRows(rows, self.sortIndex, self.sortDir, (row, index) => row.cells[index], self.config.locale);
      return sorted.slice(0, PAGE).map((row) => ({
        i: row.i,
        cells: r.columns.map((_, index) => {
          const value = row.cells[index];
          const kind = cellKind(value);
          return { kind, text: formatCell(value), cls: CELL_CLASS[kind], align: typeof r.rows[0]?.[index] === "number" ? "end" : "start" };
        }),
      }));
    },
    sortBy(this: State, index: number) {
      if (this.sortIndex !== index) {
        this.sortIndex = index;
        this.sortDir = "asc";
      } else if (this.sortDir === "asc") this.sortDir = "desc";
      else {
        this.sortIndex = -1;
        this.sortDir = null;
      }
    },
    async copyCsv(this: State) {
      const r = this.result;
      if (!r || r.rows.length === 0) return;
      const ok = await copyText(resultToCsv(r.columns, r.rows));
      if (!this.alive) return;
      clearTimeout(this.timer);
      this.copied = ok;
      this.timer = setTimeout(() => (this.copied = false), 1500);
    },
    exportCsv(this: State) {
      const r = this.result;
      if (!r || r.rows.length === 0) return;
      const event = new CustomEvent("nq-database-export", { detail: { result: r }, bubbles: true, cancelable: true });
      this.root.dispatchEvent(event);
      if (event.defaultPrevented) return;
      const blob = new Blob([resultToCsv(r.columns, r.rows)], { type: "text/csv;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "query.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 0);
    },

    // ---- structure
    get activeTable(): Table | null {
      const self = this as unknown as State;
      if (!self.active) return null;
      return self.config.schemas.find((s) => s.name === self.active!.schema)?.tables.find((t) => t.name === self.active!.table) ?? null;
    },
    get structure(): Column[] {
      return (this as unknown as { activeTable: Table | null }).activeTable?.columns ?? [];
    },
    get structureName(): string {
      return (this as unknown as { activeTable: Table | null }).activeTable?.name ?? "";
    },
    get hasStructure(): boolean {
      return (this as unknown as { activeTable: Table | null }).activeTable !== null;
    },
    refTitle(target: string): string {
      return fill(String((this as unknown as State).config.strings.references), { target });
    },
  }));
};

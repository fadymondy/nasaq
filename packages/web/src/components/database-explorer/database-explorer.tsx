"use client";

import { Database, Download, Eye, Key, Link2, Play, Search, Table2, Trash2 } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { CopyButton } from "../copy-button";
import { DataTable, type DataTableColumn, DataTableToolbar, useDataTable } from "../data-table";
import { Textarea } from "../field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Num } from "../numeric";
import { EmptyState } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import { TreeView, type TreeNode } from "../tree-view";
import { buildSelectSql, type CellKind, cellKind, formatCell, isReadOnlySql, pushHistory, resultToCsv } from "./database-format";

export { buildSelectSql, type CellKind, cellKind, formatCell, isReadOnlySql, pushHistory, quoteIdent, resultToCsv } from "./database-format";

const STRINGS = {
  en: {
    title: "Database explorer",
    tables: "Tables",
    filterTables: "Filter tables",
    noTables: "No tables match.",
    noSchema: "No tables yet",
    noSchemaBody: "This database has no tables to browse.",
    table: "table",
    view: "view",
    rows: (n: number) => (n === 1 ? "1 row" : `${n} rows`),
    editor: "SQL query",
    editorHint: "Ctrl or Cmd + Enter to run",
    placeholder: "SELECT * FROM users LIMIT 100;",
    run: "Run",
    running: "Running",
    clear: "Clear",
    results: "Results",
    structure: "Structure",
    history: "History",
    resultsTable: "Query results",
    noRun: "Run a query to see rows here",
    noRunBody: "Pick a table on the left, or write a query.",
    noRows: "The query returned no rows",
    affected: (n: number) => (n === 1 ? "1 row affected" : `${n} rows affected`),
    took: (ms: number) => `${ms} ms`,
    truncated: (n: number) => `Showing the first ${n} rows.`,
    exportCsv: "Download CSV",
    copyCsv: "Copy CSV",
    copied: "Copied to clipboard",
    queryFailed: "The query failed",
    genericError: "Something went wrong. Try again.",
    null: "NULL",
    column: "Column",
    type: "Type",
    nullable: "Nullable",
    yes: "Yes",
    no: "No",
    primaryKey: "Primary key",
    references: (target: string) => `References ${target}`,
    pickTable: "Pick a table to see its columns",
    historyEmpty: "Queries you run appear here",
    historyClear: "Clear history",
    useQuery: "Load into the editor",
    writeTitle: "Run a query that changes data?",
    writeBody: "This statement does not look read-only. It runs against the live connection and may not be reversible.",
    writeConfirm: "Run query",
    cancel: "Cancel",
    modifies: "Changes data",
  },
  ar: {
    title: "مستكشف قاعدة البيانات",
    tables: "الجداول",
    filterTables: "تصفية الجداول",
    noTables: "لا توجد جداول مطابقة.",
    noSchema: "لا توجد جداول بعد",
    noSchemaBody: "لا تحتوي قاعدة البيانات هذه على جداول لتصفحها.",
    table: "جدول",
    view: "عرض",
    rows: (n: number) => (n === 1 ? "صف واحد" : n === 2 ? "صفان" : n >= 3 && n <= 10 ? `${n} صفوف` : `${n} صفًا`),
    editor: "استعلام SQL",
    editorHint: "Ctrl أو Cmd + Enter للتنفيذ",
    placeholder: "SELECT * FROM users LIMIT 100;",
    run: "تنفيذ",
    running: "جارٍ التنفيذ",
    clear: "مسح",
    results: "النتائج",
    structure: "البنية",
    history: "السجل",
    resultsTable: "نتائج الاستعلام",
    noRun: "نفّذ استعلامًا لعرض الصفوف هنا",
    noRunBody: "اختر جدولًا من القائمة أو اكتب استعلامًا.",
    noRows: "لم يُرجع الاستعلام أي صفوف",
    affected: (n: number) => (n === 1 ? "تأثر صف واحد" : `تأثر ${n} صفوف`),
    took: (ms: number) => `${ms} مللي ثانية`,
    truncated: (n: number) => `يُعرض أول ${n} صفًا فقط.`,
    exportCsv: "تنزيل CSV",
    copyCsv: "نسخ CSV",
    copied: "تم النسخ",
    queryFailed: "فشل الاستعلام",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    null: "NULL",
    column: "العمود",
    type: "النوع",
    nullable: "يقبل الفراغ",
    yes: "نعم",
    no: "لا",
    primaryKey: "مفتاح أساسي",
    references: (target: string) => `يشير إلى ${target}`,
    pickTable: "اختر جدولًا لعرض أعمدته",
    historyEmpty: "تظهر هنا الاستعلامات التي تنفذها",
    historyClear: "مسح السجل",
    useQuery: "تحميل في المحرر",
    writeTitle: "تنفيذ استعلام يغيّر البيانات؟",
    writeBody: "لا يبدو أن هذا الاستعلام للقراءة فقط. سيُنفَّذ على الاتصال الحي وقد لا يمكن التراجع عنه.",
    writeConfirm: "تنفيذ الاستعلام",
    cancel: "إلغاء",
    modifies: "يغيّر البيانات",
  },
};

export type DatabaseExplorerLabels = { [K in keyof typeof STRINGS.en]: (typeof STRINGS.en)[K] };

function useLabels(labels?: Partial<DatabaseExplorerLabels>): DatabaseExplorerLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...(STRINGS[ar ? "ar" : "en"] as DatabaseExplorerLabels), ...labels };
}

export interface DatabaseColumn {
  name: string;
  /** The database's own type name: `uuid`, `varchar(120)`, `timestamptz`. */
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  /** `table.column` this column points at. */
  references?: string;
}

export interface DatabaseTable {
  name: string;
  kind?: "table" | "view";
  /** Estimated row count, shown next to the name. */
  rowCount?: number;
  columns: readonly DatabaseColumn[];
}

export interface DatabaseSchema {
  name: string;
  tables: readonly DatabaseTable[];
}

export interface QueryResult {
  columns: readonly string[];
  rows: readonly (readonly unknown[])[];
  durationMs?: number;
  /** For statements that change data and return no rows. */
  affectedRows?: number;
  /** The server cut the rows off at `rows.length`. */
  truncated?: boolean;
}

/** A result, or `{ error }` with a message from the database. */
export type QueryOutcome = QueryResult | { error: string };

export interface TableRef {
  schema: string;
  table: string;
}

export interface DatabaseExplorerProps extends Omit<ComponentProps<"section">, "children" | "title" | "onSelect"> {
  /** The schemas and tables to browse. */
  schemas: readonly DatabaseSchema[];
  /** Run a statement and return rows or `{ error }`. Rejecting shows a generic error. You own the connection. */
  onRunQuery: (sql: string) => Promise<QueryOutcome>;
  /** Selecting a table loads `SELECT * ... LIMIT rowLimit` and runs it. Default 100. */
  rowLimit?: number;
  /** Text in the editor at first. */
  defaultQuery?: string;
  /** Table selected at first (its structure shows; nothing runs). */
  defaultTable?: TableRef;
  /** Ask before running a statement that does not start with SELECT, WITH, EXPLAIN or SHOW. Default true. */
  confirmWrites?: boolean;
  /** Called by the CSV button with the result. Default: saves `query.csv`. */
  onExport?: (result: QueryResult) => void;
  title?: ReactNode;
  labels?: Partial<DatabaseExplorerLabels>;
}

type Row = { i: number; cells: readonly unknown[] };

const CELL_CLASS: Record<CellKind, string> = {
  null: "",
  number: "tabular-nums",
  boolean: "",
  json: "text-muted-foreground",
  date: "tabular-nums",
  text: "",
};

function Cell({ value, t }: { value: unknown; t: DatabaseExplorerLabels }) {
  const kind = cellKind(value);
  if (kind === "null") {
    return (
      <span dir="ltr" className="rounded-[3px] bg-secondary px-1 font-mono text-caption text-muted-foreground">
        {t.null}
      </span>
    );
  }
  const text = formatCell(value);
  return (
    <bdi dir="ltr" title={text} className={cn("block max-w-72 truncate font-mono text-code", CELL_CLASS[kind])}>
      {text}
    </bdi>
  );
}

function ResultGrid({ result, t, onExport }: { result: QueryResult; t: DatabaseExplorerLabels; onExport: (r: QueryResult) => void }) {
  const data = useMemo<Row[]>(() => result.rows.map((cells, i) => ({ i, cells })), [result]);
  const columns = useMemo<DataTableColumn<Row>[]>(
    () =>
      result.columns.map((name, index) => ({
        id: `c${index}`,
        label: name,
        header: (
          <bdi dir="ltr" className="font-mono">
            {name}
          </bdi>
        ),
        cell: (row) => <Cell value={row.cells[index]} t={t} />,
        sortValue: (row) => {
          const v = row.cells[index];
          if (v === null || v === undefined) return null;
          if (typeof v === "number" || typeof v === "string") return v;
          if (v instanceof Date) return v;
          if (typeof v === "boolean") return v ? 1 : 0;
          return formatCell(v);
        },
        searchValue: (row) => formatCell(row.cells[index]),
        align: typeof result.rows[0]?.[index] === "number" ? "end" : "start",
      })),
    [result, t],
  );
  const table = useDataTable({ data, columns, getRowId: (r) => String(r.i), pageSize: 25 });
  const csv = () => resultToCsv(result.columns, result.rows);
  const affected = result.affectedRows;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <DataTableToolbar>
        <p className="text-body-sm text-muted-foreground" role="status">
          {affected !== undefined && result.rows.length === 0 ? t.affected(affected) : t.rows(result.rows.length)}
          {result.durationMs !== undefined ? <span> · {t.took(result.durationMs)}</span> : null}
        </p>
        <div className="ms-auto flex items-center gap-2">
          <CopyButton value={csv} variant="secondary" size="sm" label={t.copyCsv} copiedLabel={t.copied} disabled={result.rows.length === 0}>
            {t.copyCsv}
          </CopyButton>
          <Button type="button" size="sm" disabled={result.rows.length === 0} onClick={() => onExport(result)}>
            <Download aria-hidden />
            {t.exportCsv}
          </Button>
        </div>
      </DataTableToolbar>
      {result.truncated ? (
        <Alert tone="warning">{t.truncated(result.rows.length)}</Alert>
      ) : null}
      {result.columns.length === 0 ? (
        <EmptyState title={affected !== undefined ? t.affected(affected) : t.noRows} />
      ) : (
        <DataTable table={table} label={t.resultsTable} empty={<EmptyState title={t.noRows} />} />
      )}
    </div>
  );
}

function StructureTable({ table, t }: { table: DatabaseTable | undefined; t: DatabaseExplorerLabels }) {
  if (!table) return <EmptyState icon={Table2} title={t.pickTable} />;
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table aria-label={table.name} className="w-full min-w-md border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-border text-start text-caption text-muted-foreground">
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.column}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.type}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.nullable}
            </th>
            <th scope="col" className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {table.columns.map((c) => (
            <tr key={c.name} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-3 py-2 text-start font-normal">
                <bdi dir="ltr" className="font-mono text-code text-foreground">
                  {c.name}
                </bdi>
              </th>
              <td className="px-3 py-2">
                <bdi dir="ltr" className="font-mono text-code text-muted-foreground">
                  {c.type}
                </bdi>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{c.nullable ? t.yes : t.no}</td>
              <td className="px-3 py-2">
                <span className="flex flex-wrap items-center justify-end gap-1.5">
                  {c.primaryKey ? (
                    <Badge variant="accent">
                      <Key aria-hidden />
                      {t.primaryKey}
                    </Badge>
                  ) : null}
                  {c.references ? (
                    <Badge variant="info" title={t.references(c.references)}>
                      <Link2 aria-hidden />
                      <bdi dir="ltr" className="font-mono">
                        {c.references}
                      </bdi>
                    </Badge>
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const idOf = (schema: string, table: string) => `${schema}\u0000${table}`;

/**
 * A database browser: a tree of schemas and tables, a SQL editor, and the results in a sortable grid with
 * CSV export, plus each table's structure and a history of what you ran. It has no connection: your
 * `onRunQuery` runs the statement and returns rows or an error.
 */
export function DatabaseExplorer({
  schemas,
  onRunQuery,
  rowLimit = 100,
  defaultQuery = "",
  defaultTable,
  confirmWrites = true,
  onExport,
  title,
  labels,
  className,
  ...props
}: DatabaseExplorerProps) {
  const t = useLabels(labels);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState<TableRef | null>(defaultTable ?? null);
  const [sql, setSql] = useState(defaultQuery);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<QueryOutcome | null>(null);
  const [runId, setRunId] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [tab, setTab] = useState("results");
  const [confirm, setConfirm] = useState<string | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const activeTable = useMemo(
    () => (active ? schemas.find((s) => s.name === active.schema)?.tables.find((x) => x.name === active.table) : undefined),
    [schemas, active],
  );

  const nodes = useMemo<TreeNode[]>(() => {
    const q = filter.trim().toLowerCase();
    const out: TreeNode[] = [];
    for (const s of schemas) {
      const tables = q ? s.tables.filter((x) => x.name.toLowerCase().includes(q)) : s.tables;
      if (q && tables.length === 0) continue;
      out.push({
        id: s.name,
        textValue: s.name,
        icon: <Database />,
        label: <bdi dir="ltr">{s.name}</bdi>,
        children: tables.map((x) => ({
          id: idOf(s.name, x.name),
          textValue: x.name,
          icon: x.kind === "view" ? <Eye /> : <Table2 />,
          label: (
            <span className="flex min-w-0 items-center justify-between gap-2">
              <bdi dir="ltr" className="truncate font-mono text-code">
                {x.name}
              </bdi>
              {x.rowCount !== undefined ? (
                <span className="shrink-0 text-caption text-muted-foreground">
                  <Num value={x.rowCount} />
                </span>
              ) : null}
            </span>
          ),
        })),
      });
    }
    return out;
  }, [schemas, filter]);

  async function execute(text: string) {
    const statement = text.trim();
    if (!statement) return;
    setRunning(true);
    setTab("results");
    setHistory((h) => pushHistory(h, statement));
    try {
      const result = await onRunQuery(statement);
      if (!alive.current) return;
      setOutcome(result);
      setRunId((n) => n + 1);
    } catch {
      if (alive.current) setOutcome({ error: t.genericError });
    } finally {
      if (alive.current) setRunning(false);
    }
  }

  function request(text: string) {
    if (running || !text.trim()) return;
    if (confirmWrites && !isReadOnlySql(text)) setConfirm(text);
    else void execute(text);
  }

  function pickTable(id: string) {
    const [schema, table] = id.split("\u0000");
    if (!schema || !table) return;
    setActive({ schema, table });
    const next = buildSelectSql(table, schema, rowLimit);
    setSql(next);
    void execute(next);
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      request(sql);
    }
  };

  const download = (result: QueryResult) => {
    if (onExport) return onExport(result);
    const blob = new Blob([resultToCsv(result.columns, result.rows)], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "query.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  };

  const modifies = sql.trim() !== "" && !isReadOnlySql(sql);
  const selectedIds = active ? [idOf(active.schema, active.table)] : [];

  return (
    <section
      data-slot="database-explorer"
      aria-label={typeof title === "string" ? title : t.title}
      className={cn("grid min-w-0 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]", className)}
      {...props}
    >
      <aside aria-label={t.tables} className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-2 lg:max-h-[42rem]">
        <InputGroup>
          <InputGroupAddon align="start">
            <Search aria-hidden className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput ltr type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t.filterTables} aria-label={t.filterTables} />
        </InputGroup>
        <div className="max-h-56 min-h-0 overflow-y-auto lg:max-h-none lg:flex-1">
          {schemas.length === 0 ? (
            <EmptyState className="border-0 px-2 py-6" title={t.noSchema} description={t.noSchemaBody} />
          ) : nodes.length === 0 ? (
            <p className="px-2 py-4 text-center text-body-sm text-muted-foreground">{t.noTables}</p>
          ) : (
            <TreeView
              key={filter ? "filtered" : "all"}
              aria-label={t.tables}
              items={nodes}
              defaultExpanded={schemas.map((s) => s.name)}
              selected={selectedIds}
              onSelectedChange={(ids) => {
                const id = ids[ids.length - 1];
                if (id?.includes("\u0000")) pickTable(id);
              }}
            />
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="db-explorer-sql" className="text-label text-foreground">
              {t.editor}
            </label>
            <span className="text-caption text-muted-foreground">{t.editorHint}</span>
          </div>
          <Textarea
            id="db-explorer-sql"
            ref={editor}
            dir="ltr"
            rows={5}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-28 resize-y font-mono text-code text-start"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="primary" size="sm" loading={running} disabled={!sql.trim()} onClick={() => request(sql)}>
              <Play aria-hidden />
              {running ? t.running : t.run}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!sql}
              onClick={() => {
                setSql("");
                editor.current?.focus();
              }}
            >
              {t.clear}
            </Button>
            {modifies ? <Badge variant="warning">{t.modifies}</Badge> : null}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList aria-label={title ? String(title) : t.title} variant="underline">
            <TabsTab value="results">{t.results}</TabsTab>
            <TabsTab value="structure">{t.structure}</TabsTab>
            <TabsTab value="history">
              {t.history}
              {history.length ? <span className="ms-1.5 text-caption text-muted-foreground tabular-nums">{history.length}</span> : null}
            </TabsTab>
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="results">
            {outcome && "error" in outcome ? (
              <Alert tone="danger" role="alert" title={t.queryFailed}>
                <bdi dir="ltr" className="whitespace-pre-wrap font-mono text-code">
                  {outcome.error}
                </bdi>
              </Alert>
            ) : outcome ? (
              <ResultGrid key={runId} result={outcome} t={t} onExport={download} />
            ) : (
              <EmptyState icon={Play} title={t.noRun} description={t.noRunBody} />
            )}
          </TabsPanel>

          <TabsPanel value="structure">
            <StructureTable table={activeTable} t={t} />
          </TabsPanel>

          <TabsPanel value="history">
            {history.length === 0 ? (
              <EmptyState title={t.historyEmpty} />
            ) : (
              <div className="flex flex-col gap-2">
                <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
                  {history.map((h) => (
                    <li key={h} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        title={t.useQuery}
                        onClick={() => {
                          setSql(h);
                          editor.current?.focus();
                        }}
                        className="block w-full px-3 py-2 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
                      >
                        <bdi dir="ltr" className="block truncate font-mono text-code text-foreground">
                          {h.replace(/\s+/g, " ")}
                        </bdi>
                      </button>
                    </li>
                  ))}
                </ul>
                <div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setHistory([])}>
                    <Trash2 aria-hidden />
                    {t.historyClear}
                  </Button>
                </div>
              </div>
            )}
          </TabsPanel>
        </Tabs>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.writeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.writeBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <bdi dir="ltr" className="block max-h-32 overflow-auto rounded-control border border-border bg-secondary p-2 font-mono text-code">
            {confirm}
          </bdi>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                const text = confirm;
                setConfirm(null);
                if (text) void execute(text);
              }}
            >
              {t.writeConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Download, ListOrdered, Search, X } from "lucide-react";
import { Children, type ComponentProps, isValidElement, type ReactNode, useMemo, useState } from "react";
import type { Components } from "react-markdown";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { CodeBlock, type CodeBlockProps } from "../code-block";
import { CopyButton } from "../copy-button";
import { saveExportBlob, toCsv } from "../export-action";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Icon } from "../icon";
import { Markdown, type MarkdownProps } from "../markdown";
import { DateTime, formatNumber } from "../numeric";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import {
  codeDownloadName,
  type FrontmatterValue,
  filterMarkdownRows,
  frontmatterLabel,
  nextMarkdownSort,
  parseFenceMeta,
  parseMarkdownFrontmatter,
  type MarkdownSortState,
  sortMarkdownRows,
} from "./markdown-extras-model";

const STRINGS = {
  en: {
    filter: "Filter rows",
    clearFilter: "Clear filter",
    sortBy: "Sort by {column}",
    rowCount: "{shown} of {total} rows",
    noMatch: "No rows match “{query}”.",
    downloadCsv: "Download CSV",
    downloadCode: "Download file",
    lineNumbers: "Line numbers",
    properties: "Properties",
    yes: "Yes",
    no: "No",
    sorted: "Sorted by {column}, {direction}",
    ascending: "ascending",
    descending: "descending",
    table: "Table",
  },
  ar: {
    filter: "تصفية الصفوف",
    clearFilter: "مسح التصفية",
    sortBy: "ترتيب حسب {column}",
    rowCount: "{shown} من {total} صفًا",
    noMatch: "لا صفوف تطابق «{query}».",
    downloadCsv: "تنزيل CSV",
    downloadCode: "تنزيل الملف",
    lineNumbers: "أرقام الأسطر",
    properties: "الخصائص",
    yes: "نعم",
    no: "لا",
    sorted: "مرتب حسب {column}، {direction}",
    ascending: "تصاعديًا",
    descending: "تنازليًا",
    table: "جدول",
  },
};

export type MarkdownExtrasLabels = Partial<(typeof STRINGS)["en"]>;

function useExtrasStrings(labels?: MarkdownExtrasLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels } };
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/** Plain text of rendered nodes, for sorting and filtering. */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/* ------------------------------------------------------------------ table */

export interface MarkdownTableColumn {
  /** The header as rendered. */
  header: ReactNode;
  /** The header as text, for the sort button's name and CSV. Default taken from `header`. */
  text?: string;
  align?: "start" | "center" | "end";
}

export interface MarkdownTableRow {
  /** Rendered cells, one per column. */
  cells: ReactNode[];
  /** Plain text of each cell. Default taken from `cells`. */
  texts?: string[];
}

export interface MarkdownTableProps extends Omit<ComponentProps<"div">, "children"> {
  columns: MarkdownTableColumn[];
  rows: MarkdownTableRow[];
  /** Click a header to sort (ascending, descending, off). Default true. */
  sortable?: boolean;
  /** Show the filter box. `auto` shows it from `filterMinRows` rows. Default `auto`. */
  filterable?: boolean | "auto";
  /** Rows from which `auto` shows the filter box. Default 6. */
  filterMinRows?: number;
  /** Adds a "Download CSV" button. Default false. */
  downloadable?: boolean;
  /** File name of the CSV. Default `table.csv`. */
  downloadName?: string;
  /** Accessible name of the table region. Default "Table". */
  label?: string;
  defaultSort?: MarkdownSortState | null;
  labels?: MarkdownExtrasLabels;
}

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" } as const;

/**
 * A data table for Markdown content: click a header to sort (numbers by value, text in the reader's language order, empty
 * cells last), type to filter (Arabic-folded), see "3 of 12 rows", and download CSV. Sorting and filtering happen on
 * the plain text of the cells, while the cells keep their formatting (links, bold, code).
 */
export function MarkdownTable({ columns, rows, sortable = true, filterable = "auto", filterMinRows = 6, downloadable = false, downloadName = "table.csv", label, defaultSort = null, labels, className, ...props }: MarkdownTableProps) {
  const { t, locale } = useExtrasStrings(labels);
  const [sort, setSort] = useState<MarkdownSortState | null>(defaultSort);
  const [query, setQuery] = useState("");
  const prepared = useMemo(() => rows.map((r, i) => ({ ...r, key: i, texts: r.texts ?? r.cells.map(textOf) })), [rows]);
  const headers = useMemo(() => columns.map((c) => c.text ?? textOf(c.header)), [columns]);
  const view = useMemo(() => sortMarkdownRows(filterMarkdownRows(prepared, query), sort), [prepared, query, sort]);
  const showFilter = filterable === true || (filterable === "auto" && rows.length >= filterMinRows);
  const n = (v: number) => formatNumber(v, locale);
  const sortedColumn = sort ? headers[sort.column] : undefined;

  return (
    <div data-slot="markdown-table" className={cn("flex min-w-0 flex-col gap-2", className)} {...props}>
      {showFilter || downloadable ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showFilter ? (
            <InputGroup className="h-control-sm max-w-64">
              <InputGroupAddon>
                <Icon icon={Search} />
              </InputGroupAddon>
              <InputGroupInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.filter} aria-label={t.filter} />
              {query ? (
                <InputGroupAddon align="end">
                  <button type="button" aria-label={t.clearFilter} onClick={() => setQuery("")} className="rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
                    <Icon icon={X} />
                  </button>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {showFilter ? (
              <span className="text-caption text-muted-foreground tabular-nums">{fill(t.rowCount, { shown: n(view.length), total: n(rows.length) })}</span>
            ) : null}
            {downloadable ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveExportBlob(new Blob([`﻿${toCsv([headers, ...view.map((r) => r.texts)])}`], { type: "text/csv;charset=utf-8" }), downloadName)}
              >
                <Icon icon={Download} />
                {t.downloadCsv}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <Table label={label ?? t.table} dir="auto">
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => {
              const active = sort?.column === i;
              const ariaSort = active ? (sort?.direction === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined;
              return (
                <TableHead key={headers[i] ? `${i}-${headers[i]}` : i} aria-sort={ariaSort} className={cn(ALIGN[col.align ?? "start"])}>
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => setSort((s) => nextMarkdownSort(s, i))}
                      title={fill(t.sortBy, { column: headers[i] ?? "" })}
                      className={cn(
                        "-mx-1.5 inline-flex items-center gap-1 rounded-control px-1.5 py-1 font-medium outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus",
                        active && "text-foreground",
                      )}
                    >
                      {col.header}
                      <Icon icon={active ? (sort?.direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown} className={cn("size-3", !active && "opacity-50")} />
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.map((row) => (
            <TableRow key={row.key}>
              {columns.map((col, i) => (
                <TableCell key={i} dir="auto" className={cn("h-auto whitespace-normal py-2", ALIGN[col.align ?? "start"])}>
                  {row.cells[i]}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {view.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-auto py-6 text-center whitespace-normal text-muted-foreground">
                {fill(t.noMatch, { query })}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
      <p className="sr-only" role="status">
        {sortedColumn ? fill(t.sorted, { column: sortedColumn, direction: sort?.direction === "asc" ? t.ascending : t.descending }) : ""}
        {showFilter ? ` ${fill(t.rowCount, { shown: n(view.length), total: n(rows.length) })}` : ""}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ frontmatter */

export interface FrontmatterTableProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  /** Pairs in display order (from `parseMarkdownFrontmatter`) or a plain record. */
  data: [key: string, value: FrontmatterValue][] | Record<string, FrontmatterValue>;
  /** Heading above the table. Default "Properties". */
  title?: ReactNode;
  labels?: MarkdownExtrasLabels;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function FrontmatterValueView({ value, yes, no }: { value: FrontmatterValue; yes: string; no: string }) {
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <Badge key={`${v}-${i}`} variant="outline">
            <bdi>{v}</bdi>
          </Badge>
        ))}
      </span>
    );
  }
  if (typeof value === "boolean") return <>{value ? yes : no}</>;
  if (typeof value === "number") return <bdi className="tabular-nums">{value}</bdi>;
  if (ISO_DATE.test(value)) return <DateTime value={value} format={{ dateStyle: "medium" }} />;
  if (/^https?:\/\/\S+$/i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" dir="ltr" className="break-all rounded-[2px] underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current focus-visible:outline-2 focus-visible:outline-nq-focus">
        {value}
      </a>
    );
  }
  return <span dir="auto">{value}</span>;
}

/** The frontmatter of a document as a two-column table: label, then the value (tags as badges, dates formatted, links clickable). */
export function FrontmatterTable({ data, title, labels, className, ...props }: FrontmatterTableProps) {
  const { t } = useExtrasStrings(labels);
  const pairs = Array.isArray(data) ? data : Object.entries(data);
  if (!pairs.length) return null;
  return (
    <section data-slot="frontmatter-table" className={cn("flex flex-col gap-2", className)} {...props}>
      <p className="eyebrow">{title ?? t.properties}</p>
      <div className="overflow-hidden rounded-card border border-border">
        <Table label={typeof title === "string" ? title : t.properties}>
          <TableBody>
            {pairs.map(([key, value]) => (
              <TableRow key={key}>
                <TableHead scope="row" className="h-auto w-1/3 max-w-48 py-2 align-top whitespace-normal">
                  <bdi>{frontmatterLabel(key)}</bdi>
                </TableHead>
                <TableCell className="h-auto py-2 whitespace-normal text-foreground">
                  <FrontmatterValueView value={value} yes={t.yes} no={t.no} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ code */

export interface DownloadableCodeBlockProps extends CodeBlockProps {
  /** Show the download button. Default true. */
  download?: boolean;
  /** File name of the download. Default the `filename`, else `code.<ext>` by language. */
  downloadName?: string;
  /** Show the line-number toggle. Default true. `lineNumbers` is the initial state. */
  lineNumberToggle?: boolean;
  labels?: MarkdownExtrasLabels;
}

/** A `CodeBlock` with a line-number toggle and a download button next to copy. */
export function DownloadableCodeBlock({ download = true, downloadName, lineNumberToggle = true, lineNumbers = false, labels, code, language = "text", filename, ...props }: DownloadableCodeBlockProps) {
  const { t } = useExtrasStrings(labels);
  const [numbers, setNumbers] = useState(lineNumbers);
  const source = code.replace(/\n$/, "");
  return (
    <CodeBlock
      code={code}
      language={language}
      filename={filename}
      lineNumbers={numbers}
      copyAction={
        <span className="flex items-center gap-0.5">
          {lineNumberToggle ? (
            <Button variant="ghost" size="icon-sm" aria-label={t.lineNumbers} aria-pressed={numbers} title={t.lineNumbers} onClick={() => setNumbers((v) => !v)} className={cn(numbers && "bg-nq-selected")}>
              <Icon icon={ListOrdered} />
            </Button>
          ) : null}
          {download ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.downloadCode}
              title={t.downloadCode}
              onClick={() => saveExportBlob(new Blob([source], { type: "text/plain;charset=utf-8" }), downloadName ?? codeDownloadName(language, filename))}
            >
              <Icon icon={Download} />
            </Button>
          ) : null}
          <CopyButton value={source} />
        </span>
      }
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ renderer */

type HastNode = { type?: string; tagName?: string; data?: { meta?: string }; children?: HastNode[]; properties?: { className?: string[] } };

export interface RichMarkdownProps extends Omit<MarkdownProps, "children"> {
  /** The Markdown source, with an optional frontmatter block. */
  children: string;
  /** `table` renders the frontmatter above the body, `hide` drops it. Default `table`. */
  frontmatter?: "table" | "hide";
  /** Sortable, filterable tables. `false` keeps the plain tables. */
  tables?: false | Pick<MarkdownTableProps, "sortable" | "filterable" | "filterMinRows" | "downloadable">;
  /** Code blocks with a line-number toggle and download. `false` keeps plain code blocks. */
  code?: false | { lineNumbers?: boolean; download?: boolean };
  labels?: MarkdownExtrasLabels;
}

function tableParts(children: ReactNode, node: HastNode | undefined) {
  const tags = (node?.children ?? []).filter((c) => c.type === "element").map((c) => c.tagName);
  const sections = Children.toArray(children).filter((c) => isValidElement<{ children?: ReactNode }>(c));
  if (tags.length !== sections.length) return null;
  const head: ReactNode[][] = [];
  const body: ReactNode[][] = [];
  const aligns: (string | undefined)[] = [];
  sections.forEach((section, i) => {
    const rows = Children.toArray((section as { props: { children?: ReactNode } }).props.children).filter((r) => isValidElement<{ children?: ReactNode }>(r));
    for (const row of rows) {
      const cells = Children.toArray((row as { props: { children?: ReactNode } }).props.children).filter((c) => isValidElement<{ children?: ReactNode; style?: { textAlign?: string } }>(c)) as {
        props: { children?: ReactNode; style?: { textAlign?: string } };
      }[];
      if (tags[i] === "thead") {
        head.push(cells.map((c) => c.props.children as ReactNode));
        cells.forEach((c, k) => {
          aligns[k] = c.props.style?.textAlign;
        });
      } else body.push(cells.map((c) => c.props.children as ReactNode));
    }
  });
  return head[0] ? { head: head[0], body, aligns } : null;
}

const alignOf = (a?: string): "start" | "center" | "end" | undefined => (a === "left" ? "start" : a === "right" ? "end" : a === "center" ? "center" : undefined);

/**
 * `Markdown` with the extras: the frontmatter as a table, tables you can sort, filter and download, and code blocks with
 * line numbers and download. Fence meta is understood: ```ts title="app.ts" showLineNumbers {2,4-6}.
 */
export function RichMarkdown({ children, frontmatter = "table", tables = {}, code = {}, labels, components, className, ...props }: RichMarkdownProps) {
  const parsed = useMemo(() => parseMarkdownFrontmatter(children), [children]);
  const custom = useMemo<Components>(
    () => ({
      ...(tables === false
        ? {}
        : {
            table: ({ node, children: tc }: { node?: unknown; children?: ReactNode }) => {
              const parts = tableParts(tc, node as HastNode | undefined);
              if (!parts) return <Table dir="auto">{tc}</Table>;
              return (
                <MarkdownTable
                  {...tables}
                  labels={labels}
                  columns={parts.head.map((h, i) => ({ header: h, align: alignOf(parts.aligns[i]) }))}
                  rows={parts.body.map((cells) => ({ cells }))}
                />
              );
            },
          }),
      ...(code === false
        ? {}
        : {
            pre: ({ node, children: pc }: { node?: unknown; children?: ReactNode }) => {
              const codeEl = Children.toArray(pc)[0];
              if (!isValidElement<{ className?: string; children?: ReactNode }>(codeEl)) return <pre>{pc}</pre>;
              const language = /language-([\w+-]+)/.exec(codeEl.props.className ?? "")?.[1] ?? "text";
              const meta = parseFenceMeta((node as HastNode | undefined)?.children?.[0]?.data?.meta);
              return (
                <DownloadableCodeBlock
                  code={Children.toArray(codeEl.props.children).join("")}
                  language={language}
                  {...(meta.title ? { filename: meta.title } : {})}
                  {...(meta.highlight ? { highlightLines: meta.highlight } : {})}
                  lineNumbers={meta.lineNumbers ?? code.lineNumbers ?? false}
                  download={code.download ?? true}
                  labels={labels}
                />
              );
            },
          }),
      ...components,
    }),
    [tables, code, labels, components],
  );
  return (
    <div data-slot="rich-markdown" className={cn("flex min-w-0 flex-col gap-4", className)}>
      {frontmatter === "table" && parsed.data.length ? <FrontmatterTable data={parsed.data} labels={labels} /> : null}
      <Markdown components={custom} {...props}>
        {parsed.body}
      </Markdown>
    </div>
  );
}

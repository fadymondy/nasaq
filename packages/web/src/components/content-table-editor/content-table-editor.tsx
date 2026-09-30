"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns3,
  Copy,
  Download,
  Ellipsis,
  Pencil,
  Plus,
  Redo2,
  Rows3,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Tooltip } from "../tooltip";
import { CellView, CheckboxCell, ChoiceEditor, TextEditor } from "./content-table-cell";
import {
  blankRow,
  type ContentCell,
  type ContentColumn,
  type ContentColumnType,
  type ContentRow,
  type ContentTableValue,
  CONTENT_COLUMN_TYPES,
  changeColumnType,
  cloneRow,
  coerceCell,
  emptyCell,
  filterRows,
  type History,
  insertAt,
  isEmpty,
  makeId,
  moveItem,
  parseOptions,
  pushHistory,
  redoHistory,
  type SortState,
  sortRows,
  summarize,
  toCsv,
  undoHistory,
  validateTable,
} from "./content-table-math";
import { type ContentTableLabels, useContentTableStrings } from "./content-table-strings";

export type { ContentCell, ContentColumn, ContentColumnType, ContentOption, ContentRow, ContentTableValue } from "./content-table-math";
export type { ContentTableLabels } from "./content-table-strings";

export interface ContentTableEditorProps {
  /** Controlled value: the columns and the rows. */
  value?: ContentTableValue;
  defaultValue?: ContentTableValue;
  onValueChange?: (value: ContentTableValue) => void;
  /** Persist the table. Return `{ error }` to show why it failed. Adds a Save button and the unsaved-changes state. */
  onSave?: (value: ContentTableValue) => Promise<void | { error?: string }>;
  /** Called with the CSV text when Export is pressed. Without it the browser downloads `content-table.csv`. */
  onExport?: (csv: string) => void;
  /** Show cells but refuse edits. */
  readOnly?: boolean;
  /** Let people add, rename, retype, reorder and delete columns. Default true. */
  editableColumns?: boolean;
  /** Show the search box. Default true. */
  searchable?: boolean;
  /** Accessible name of the grid. Default "Content table". */
  label?: string;
  /** Extra toolbar content, placed before the row actions. */
  toolbar?: ReactNode;
  /** Max height of the scrolling grid. Default `none`. */
  maxHeight?: string;
  labels?: ContentTableLabels;
  className?: string;
}

interface Active {
  rowId: string;
  col: number;
}

type ColumnDraft = { id: string | null; label: string; type: ContentColumnType; options: string; required: boolean };

const TYPE_KEY = {
  text: "typeText",
  number: "typeNumber",
  select: "typeSelect",
  date: "typeDate",
  checkbox: "typeCheckbox",
  url: "typeUrl",
  tags: "typeTags",
} as const;

const empty: ContentTableValue = { columns: [], rows: [] };

/**
 * A spreadsheet-like editor for structured content: typed columns (text, number, select, date, checkbox, link, tags),
 * inline editing with keyboard navigation, sort and search, row and column management, undo and redo, validation,
 * column summaries, CSV export and an optional async save.
 */
export function ContentTableEditor({
  value: valueProp,
  defaultValue,
  onValueChange,
  onSave,
  onExport,
  readOnly = false,
  editableColumns = true,
  searchable = true,
  label,
  toolbar,
  maxHeight,
  labels,
  className,
}: ContentTableEditorProps) {
  const { locale, t } = useContentTableStrings(labels);
  const n = (v: number) => formatNumber(v, locale);
  const uid = useId();

  const [hist, setHist] = useState<History<ContentTableValue>>(() => ({ past: [], present: defaultValue ?? valueProp ?? empty, future: [] }));
  const current = valueProp ?? hist.present;
  const [saved, setSaved] = useState<ContentTableValue>(current);
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "error"; message?: string }>({ status: "idle" });
  const dirty = saved !== current;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Active | null>(null);
  const [editing, setEditing] = useState<{ rowId: string; col: number; seed?: string } | null>(null);
  const [columnDraft, setColumnDraft] = useState<ColumnDraft | null>(null);
  const [announce, setAnnounce] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const pending = useRef<Active | null>(null);

  const commit = (next: ContentTableValue) => {
    setHist((h) => pushHistory({ ...h, present: current }, next));
    onValueChange?.(next);
    if (saveState.status === "error") setSaveState({ status: "idle" });
  };
  const undo = () => {
    const h = undoHistory({ ...hist, present: current });
    if (h.present === current) return;
    setHist(h);
    onValueChange?.(h.present);
  };
  const redo = () => {
    const h = redoHistory({ ...hist, present: current });
    if (h.present === current) return;
    setHist(h);
    onValueChange?.(h.present);
  };

  const { columns, rows } = current;
  const view = useMemo(() => sortRows(filterRows(rows, columns, query), columns, sort), [rows, columns, query, sort]);
  const issues = useMemo(() => validateTable(current), [current]);
  const issueOf = (rowId: string, columnId: string) => issues.find((i) => i.rowId === rowId && i.columnId === columnId)?.issue;
  const canReorder = !query.trim() && !sort;
  const editable = !readOnly;

  // After a structural change, move focus to the cell we asked for once it has rendered.
  useEffect(() => {
    if (!pending.current) return;
    const { rowId, col } = pending.current;
    pending.current = null;
    gridRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(rowId)}"][data-col="${col}"]`)?.focus();
  });

  useEffect(() => {
    setSelected((s) => {
      const ids = new Set(rows.map((r) => r.id));
      const next = new Set([...s].filter((id) => ids.has(id)));
      return next.size === s.size ? s : next;
    });
  }, [rows]);

  const focusCell = (rowId: string, col: number) => {
    setActive({ rowId, col });
    pending.current = { rowId, col };
  };

  /* ---------------------------------------------------------------- mutations */

  const setCell = (rowId: string, columnId: string, next: ContentCell) => {
    commit({ ...current, rows: rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: next } } : r)) });
  };

  const addRow = (at?: number) => {
    const row = blankRow(columns);
    commit({ ...current, rows: insertAt(rows, at ?? rows.length, row) });
    if (columns.length) focusCell(row.id, 0);
    setAnnounce(t.announceRowAdded);
  };

  const deleteRows = (ids: string[]) => {
    if (!ids.length) return;
    const set = new Set(ids);
    commit({ ...current, rows: rows.filter((r) => !set.has(r.id)) });
    setSelected(new Set());
    setAnnounce(t.announceRowsDeleted(n(ids.length)));
  };

  const duplicateRow = (row: ContentRow) => {
    const copy = cloneRow(row);
    commit({ ...current, rows: insertAt(rows, rows.indexOf(row) + 1, copy) });
    focusCell(copy.id, active?.col ?? 0);
  };

  const moveRow = (row: ContentRow, delta: number) => {
    const from = rows.indexOf(row);
    commit({ ...current, rows: moveItem(rows, from, from + delta) });
  };

  const applyColumn = () => {
    if (!columnDraft || !columnDraft.label.trim()) return;
    const options = columnDraft.type === "select" || columnDraft.type === "tags" ? parseOptions(columnDraft.options) : undefined;
    if (columnDraft.id === null) {
      const column: ContentColumn = { id: makeId("col"), label: columnDraft.label.trim(), type: columnDraft.type, options, required: columnDraft.required || undefined };
      commit({ columns: [...columns, column], rows: rows.map((r) => ({ ...r, cells: { ...r.cells, [column.id]: emptyCell(column.type) } })) });
      setAnnounce(t.announceColumnAdded(column.label));
    } else {
      const id = columnDraft.id;
      let next = changeColumnType(current, id, columnDraft.type);
      next = { ...next, columns: next.columns.map((c) => (c.id === id ? { ...c, label: columnDraft.label.trim(), options, required: columnDraft.required || undefined } : c)) };
      commit(next);
    }
    setColumnDraft(null);
  };

  const deleteColumn = (column: ContentColumn) => {
    commit({ columns: columns.filter((c) => c.id !== column.id), rows: rows.map((r) => ({ ...r, cells: Object.fromEntries(Object.entries(r.cells).filter(([k]) => k !== column.id)) })) });
    if (sort?.column === column.id) setSort(null);
    setActive(null);
    setAnnounce(t.announceColumnDeleted(column.label));
  };

  const sortBy = (column: ContentColumn, direction: "asc" | "desc" | null) => {
    if (direction === null) return setSort(null);
    setSort({ column: column.id, direction });
    setAnnounce(t.announceSorted(column.label, direction === "asc" ? t.ascending : t.descending));
  };

  const save = async () => {
    if (!onSave || issues.length) return;
    setSaveState({ status: "saving" });
    try {
      const result = await onSave(current);
      if (result && result.error) {
        setSaveState({ status: "error", message: result.error });
        return;
      }
      setSaved(current);
      setSaveState({ status: "idle" });
    } catch (error) {
      setSaveState({ status: "error", message: error instanceof Error ? error.message : t.saveFailed });
    }
  };

  const exportCsv = () => {
    const csv = toCsv(current);
    if (onExport) return onExport(csv);
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "content-table.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------------------------------------------------------- keyboard */

  const rowIndex = (rowId: string) => view.findIndex((r) => r.id === rowId);
  const moveActive = (dRow: number, dCol: number, from: Active) => {
    const r = Math.max(0, Math.min(view.length - 1, rowIndex(from.rowId) + dRow));
    const c = Math.max(0, Math.min(columns.length - 1, from.col + dCol));
    const row = view[r];
    if (row) focusCell(row.id, c);
  };

  const onCellKeyDown = (e: KeyboardEvent<HTMLTableCellElement>, row: ContentRow, col: number) => {
    if (e.target !== e.currentTarget) return;
    const column = columns[col];
    if (!column) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const here = { rowId: row.id, col };
    const step = (dCol: number) => moveActive(0, rtl ? -dCol : dCol, here);
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); return moveActive(1, 0, here);
      case "ArrowUp": e.preventDefault(); return moveActive(-1, 0, here);
      case "ArrowRight": e.preventDefault(); return step(1);
      case "ArrowLeft": e.preventDefault(); return step(-1);
      case "Home": e.preventDefault(); return e.ctrlKey ? moveActive(-view.length, -columns.length, here) : moveActive(0, -columns.length, here);
      case "End": e.preventDefault(); return e.ctrlKey ? moveActive(view.length, columns.length, here) : moveActive(0, columns.length, here);
      case "Tab": {
        const dir = e.shiftKey ? -1 : 1;
        const nextCol = col + dir;
        if (nextCol < 0 || nextCol >= columns.length) {
          const r = rowIndex(row.id) + dir;
          const target = view[r];
          if (!target) return; // let focus leave the grid
          e.preventDefault();
          return focusCell(target.id, dir === 1 ? 0 : columns.length - 1);
        }
        e.preventDefault();
        return focusCell(row.id, nextCol);
      }
      default:
    }
    if (!editable) return;
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      if (column.type === "checkbox") return setCell(row.id, column.id, !(row.cells[column.id] === true));
      return setEditing({ rowId: row.id, col });
    }
    if (e.key === " " && column.type === "checkbox") {
      e.preventDefault();
      return setCell(row.id, column.id, !(row.cells[column.id] === true));
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      return setCell(row.id, column.id, emptyCell(column.type));
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && (column.type === "text" || column.type === "number" || column.type === "url")) {
      e.preventDefault();
      setEditing({ rowId: row.id, col, seed: e.key });
    }
  };

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.target instanceof HTMLInputElement || !editable) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (key === "y" || (key === "z" && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  };

  const finishEdit = (rowId: string, col: number, raw: string | null, move: "down" | "right" | "left" | "none") => {
    const column = columns[col];
    setEditing(null);
    if (column && raw !== null) {
      const next = coerceCell(column.type, raw);
      const before = rows.find((r) => r.id === rowId)?.cells[column.id];
      if (JSON.stringify(next) !== JSON.stringify(before ?? emptyCell(column.type))) setCell(rowId, column.id, next);
    }
    if (move === "none") return;
    const r = rowIndex(rowId);
    if (move === "down") {
      const target = view[r + 1] ?? view[r];
      if (target) focusCell(target.id, col);
    } else {
      focusCell(rowId, Math.max(0, Math.min(columns.length - 1, col + (move === "right" ? 1 : -1))));
    }
  };

  /* ---------------------------------------------------------------- render */

  const selectedCount = selected.size;
  const allSelected = view.length > 0 && view.every((r) => selected.has(r.id));
  const someSelected = view.some((r) => selected.has(r.id));
  const statusBadge = !onSave ? null : saveState.status === "saving" ? (
    <Badge variant="info">{t.saving}</Badge>
  ) : saveState.status === "error" ? (
    <Badge variant="danger" role="alert">{saveState.message ?? t.saveFailed}</Badge>
  ) : dirty ? (
    <Badge variant="warning">{t.unsaved}</Badge>
  ) : (
    <Badge variant="success">{t.saved}</Badge>
  );

  const columnDialog = (
    <Dialog open={columnDraft !== null} onOpenChange={(open) => !open && setColumnDraft(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{columnDraft?.id === null ? t.addColumn : t.editColumn}</DialogTitle>
          <DialogDescription className="sr-only">{t.columnName}</DialogDescription>
        </DialogHeader>
        {columnDraft ? (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              applyColumn();
            }}
          >
            <Field>
              <FieldLabel>{t.columnName}</FieldLabel>
              <Input autoFocus value={columnDraft.label} onChange={(e) => setColumnDraft({ ...columnDraft, label: e.currentTarget.value })} />
            </Field>
            <Field>
              <FieldLabel>{t.columnType}</FieldLabel>
              <Select
                items={CONTENT_COLUMN_TYPES.map((type) => ({ value: type, label: t[TYPE_KEY[type]] }))}
                value={columnDraft.type}
                onValueChange={(v) => v && setColumnDraft({ ...columnDraft, type: v as ContentColumnType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_COLUMN_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t[TYPE_KEY[type]]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {columnDraft.type === "select" || columnDraft.type === "tags" ? (
              <Field>
                <FieldLabel>{t.options}</FieldLabel>
                <Textarea rows={4} value={columnDraft.options} onChange={(e) => setColumnDraft({ ...columnDraft, options: e.currentTarget.value })} />
                <p className="text-caption text-muted-foreground">{t.optionsHint}</p>
              </Field>
            ) : null}
            <label className="flex items-center gap-2 text-body-sm text-foreground">
              <Checkbox checked={columnDraft.required} onCheckedChange={(v) => setColumnDraft({ ...columnDraft, required: Boolean(v) })} />
              {t.required}
            </label>
            <DialogFooter>
              <Button type="button" onClick={() => setColumnDraft(null)}>
                {t.cancel}
              </Button>
              <Button type="submit" variant="primary" disabled={!columnDraft.label.trim()}>
                {t.saveColumn}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );

  const openColumn = (column: ContentColumn) =>
    setColumnDraft({ id: column.id, label: column.label, type: column.type, options: (column.options ?? []).map((o) => o.label).join("\n"), required: Boolean(column.required) });

  return (
    <div data-slot="content-table-editor" className={cn("flex min-w-0 flex-col gap-3", className)} onKeyDown={onGridKeyDown}>
      <div role="toolbar" aria-label={label ?? t.table} className="flex flex-wrap items-center gap-2">
        {searchable ? (
          <div className="relative min-w-40 flex-1 sm:max-w-xs">
            <Icon icon={Search} className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={t.search} placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.currentTarget.value)} className="ps-8 pe-8" />
            {query ? (
              <button
                type="button"
                aria-label={t.clearSearch}
                onClick={() => setQuery("")}
                className="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <Icon icon={X} className="size-4" />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {selectedCount > 0 && editable ? (
            <>
              <span className="text-body-sm text-muted-foreground">{t.selected(n(selectedCount))}</span>
              <Button size="sm" variant="danger" onClick={() => deleteRows([...selected])}>
                <Trash2 aria-hidden />
                {t.deleteSelected(n(selectedCount))}
              </Button>
            </>
          ) : null}
          {toolbar}
          {editable ? (
            <>
              <Tooltip content={t.undo}>
                <Button size="icon-sm" variant="ghost" aria-label={t.undo} disabled={hist.past.length === 0} onClick={undo}>
                  <Undo2 aria-hidden />
                </Button>
              </Tooltip>
              <Tooltip content={t.redo}>
                <Button size="icon-sm" variant="ghost" aria-label={t.redo} disabled={hist.future.length === 0} onClick={redo}>
                  <Redo2 aria-hidden />
                </Button>
              </Tooltip>
            </>
          ) : null}
          <Button size="sm" onClick={exportCsv}>
            <Download aria-hidden />
            {t.exportCsv}
          </Button>
          {editable && editableColumns ? (
            <Button size="sm" onClick={() => setColumnDraft({ id: null, label: "", type: "text", options: "", required: false })}>
              <Columns3 aria-hidden />
              {t.addColumn}
            </Button>
          ) : null}
          {editable ? (
            <Button size="sm" variant={onSave ? "secondary" : "primary"} onClick={() => addRow()} disabled={columns.length === 0}>
              <Plus aria-hidden />
              {t.addRow}
            </Button>
          ) : null}
          {statusBadge}
          {issues.length > 0 ? <Badge variant="danger">{t.issues(n(issues.length))}</Badge> : null}
          {onSave && editable ? (
            <Button size="sm" variant="primary" loading={saveState.status === "saving"} disabled={!dirty || issues.length > 0} onClick={save}>
              {t.save}
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={gridRef}
        className="min-w-0 overflow-auto rounded-card border border-border bg-card"
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        {columns.length === 0 || (rows.length === 0 && !query) ? (
          <EmptyState
            icon={Rows3}
            title={t.empty}
            description={t.emptyHint}
            actions={
              editable && columns.length > 0 ? (
                <Button variant="primary" onClick={() => addRow()}>
                  <Plus aria-hidden />
                  {t.addRow}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <table role="grid" aria-label={label ?? t.table} aria-rowcount={view.length + 1} aria-describedby={`${uid}-hint`} className="w-max min-w-full border-collapse text-body-sm">
            <thead className="sticky top-0 z-10 bg-secondary">
              <tr className="border-b border-border">
                <th scope="col" className="w-10 px-3 text-start">
                  {editable ? (
                    <Checkbox
                      aria-label={t.selectAll}
                      checked={allSelected}
                      indeterminate={!allSelected && someSelected}
                      onCheckedChange={(v) => setSelected(v ? new Set(view.map((r) => r.id)) : new Set())}
                    />
                  ) : null}
                </th>
                {columns.map((column, ci) => {
                  const dir = sort?.column === column.id ? sort.direction : null;
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                      style={{ width: column.width ?? 180, minWidth: column.width ?? 180 }}
                      className="h-row border-s border-border px-1 text-start align-middle text-caption font-medium text-muted-foreground first:border-s-0"
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => sortBy(column, dir === "asc" ? "desc" : dir === "desc" ? null : "asc")}
                          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[4px] px-2 py-1 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                        >
                          <span className="min-w-0 truncate">{column.label}</span>
                          {column.required ? <span aria-hidden className="text-nq-danger-text">*</span> : null}
                          {dir ? <Icon icon={dir === "asc" ? ArrowUp : ArrowDown} className="size-3.5 shrink-0 text-foreground" /> : null}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.columnMenu(column.label)} />}>
                            <Ellipsis aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-48">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => sortBy(column, "asc")}>
                                <ArrowUp aria-hidden />
                                {t.sortAsc}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => sortBy(column, "desc")}>
                                <ArrowDown aria-hidden />
                                {t.sortDesc}
                              </DropdownMenuItem>
                              {dir ? <DropdownMenuItem onClick={() => sortBy(column, null)}>{t.clearSort}</DropdownMenuItem> : null}
                            </DropdownMenuGroup>
                            {editable && editableColumns ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={() => openColumn(column)}>
                                    <Pencil aria-hidden />
                                    {t.editColumn}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled={ci === 0} onClick={() => commit({ ...current, columns: moveItem(columns, ci, ci - 1) })}>
                                    <Icon icon={ArrowLeft} />
                                    {t.moveLeft}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled={ci === columns.length - 1} onClick={() => commit({ ...current, columns: moveItem(columns, ci, ci + 1) })}>
                                    <Icon icon={ArrowRight} />
                                    {t.moveRight}
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="danger" onClick={() => deleteColumn(column)}>
                                  <Trash2 aria-hidden />
                                  {t.deleteColumn}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </th>
                  );
                })}
                <th scope="col" className="w-10 px-1" />
              </tr>
            </thead>
            <tbody>
              {view.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="p-0">
                    <EmptyState icon={Search} title={t.noMatches} actions={<Button onClick={() => setQuery("")}>{t.clearSearch}</Button>} />
                  </td>
                </tr>
              ) : null}
              {view.map((row, ri) => {
                const isSelected = selected.has(row.id);
                const rowNo = n(ri + 1);
                return (
                  <tr key={row.id} aria-rowindex={ri + 2} aria-selected={isSelected} data-state={isSelected ? "selected" : undefined} className="group border-b border-border last:border-b-0 hover:bg-nq-hover data-[state=selected]:bg-nq-selected">
                    <td className="w-10 px-3">
                      {editable ? (
                        <Checkbox aria-label={t.selectRow(rowNo)} checked={isSelected} onCheckedChange={(v) => setSelected((s) => { const next = new Set(s); if (v) next.add(row.id); else next.delete(row.id); return next; })} />
                      ) : (
                        <span className="text-caption text-muted-foreground tabular-nums">{rowNo}</span>
                      )}
                    </td>
                    {columns.map((column, ci) => {
                      const cell = row.cells[column.id];
                      const isActive = active ? active.rowId === row.id && active.col === ci : ri === 0 && ci === 0 && !active;
                      const isEditing = editing?.rowId === row.id && editing.col === ci;
                      const issue = issueOf(row.id, column.id);
                      const cellLabel = `${column.label}, ${t.selectRow(rowNo)}`;
                      const choice = column.type === "select" || column.type === "tags";
                      const view_ = <CellView column={column} value={cell} locale={locale} t={t} rowLabel={rowNo} />;
                      return (
                        <td
                          key={column.id}
                          role="gridcell"
                          tabIndex={isActive ? 0 : -1}
                          data-row={row.id}
                          data-col={ci}
                          aria-invalid={issue ? true : undefined}
                          aria-label={issue ? `${cellLabel}: ${issue === "required" ? t.issueRequired : t.issueUrl}` : undefined}
                          title={issue ? (issue === "required" ? t.issueRequired : t.issueUrl) : undefined}
                          onFocus={(e) => e.target === e.currentTarget && setActive({ rowId: row.id, col: ci })}
                          onKeyDown={(e) => onCellKeyDown(e, row, ci)}
                          onClick={(e) => {
                            if (!e.currentTarget.contains(e.target as Node)) return; // clicks inside a popover portal bubble here through React
                            if (choice && isEditing) return;
                            const was = active?.rowId === row.id && active.col === ci;
                            setActive({ rowId: row.id, col: ci });
                            if (!editable || column.type === "checkbox") return;
                            if (choice || was) setEditing({ rowId: row.id, col: ci });
                          }}
                          style={{ width: column.width ?? 180, minWidth: column.width ?? 180, maxWidth: column.width ?? 180 }}
                          className={cn(
                            "relative h-row border-s border-border px-3 align-middle outline-none first:border-s-0",
                            "focus:outline-2 focus:-outline-offset-2 focus:outline-nq-focus",
                            issue && "bg-nq-danger-soft",
                          )}
                        >
                          {column.type === "checkbox" ? (
                            <CheckboxCell checked={cell === true} disabled={!editable} label={cellLabel} onChange={(v) => setCell(row.id, column.id, v)} />
                          ) : isEditing && !choice ? (
                            <>
                              <span className="invisible">{view_}</span>
                              <TextEditor
                                column={column}
                                ariaLabel={cellLabel}
                                seeded={editing?.seed !== undefined}
                                initial={editing?.seed ?? (isEmpty(cell) ? "" : String(cell))}
                                onCommit={(raw, move) => finishEdit(row.id, ci, raw, move)}
                                onCancel={() => {
                                  setEditing(null);
                                  focusCell(row.id, ci);
                                }}
                              />
                            </>
                          ) : choice ? (
                            <ChoiceEditor
                              column={column}
                              value={cell}
                              open={isEditing}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setEditing(null);
                                  focusCell(row.id, ci);
                                }
                              }}
                              onChange={(next) => setCell(row.id, column.id, next)}
                              t={t}
                            >
                              <div className="flex min-h-6 w-full min-w-0 items-center outline-none">{view_}</div>
                            </ChoiceEditor>
                          ) : (
                            view_
                          )}
                        </td>
                      );
                    })}
                    <td className="w-10 px-1">
                      {editable ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t.rowActions(rowNo)} className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100" />}>
                            <Ellipsis aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-48">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => addRow(rows.indexOf(row))}>
                                <Plus aria-hidden />
                                {t.insertAbove}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => addRow(rows.indexOf(row) + 1)}>
                                <Plus aria-hidden />
                                {t.insertBelow}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateRow(row)}>
                                <Copy aria-hidden />
                                {t.duplicate}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem disabled={!canReorder || rows.indexOf(row) === 0} onClick={() => moveRow(row, -1)}>
                                <ArrowUp aria-hidden />
                                {t.moveUp}
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={!canReorder || rows.indexOf(row) === rows.length - 1} onClick={() => moveRow(row, 1)}>
                                <ArrowDown aria-hidden />
                                {t.moveDown}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="danger" onClick={() => deleteRows([row.id])}>
                              <Trash2 aria-hidden />
                              {t.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {view.length > 0 ? (
              <tfoot className="border-t border-border bg-secondary/50 text-caption text-muted-foreground">
                <tr>
                  <td className="px-3 py-1.5" />
                  {columns.map((column) => {
                    const s = summarize(view, column);
                    return (
                      <td key={column.id} className="border-s border-border px-3 py-1.5 first:border-s-0">
                        {column.type === "number" && s.sum !== undefined ? (
                          <span className="flex justify-between gap-2">
                            <span>{t.sum}</span>
                            <span className="tabular-nums text-foreground">{formatNumber(s.sum, locale)}</span>
                          </span>
                        ) : column.type === "checkbox" ? (
                          t.checked(n(s.checked ?? 0))
                        ) : (
                          t.filled(n(s.filled), n(s.total))
                        )}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
        <span id={`${uid}-hint`}>{editable ? t.gridHint : ""}</span>
        <span>{query ? t.rowCountOf(n(view.length), n(rows.length)) : t.rowCount(n(rows.length))}</span>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
      {columnDialog}
    </div>
  );
}

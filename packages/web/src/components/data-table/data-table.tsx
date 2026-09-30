"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Ellipsis, ListFilter, type LucideIcon, Search, Settings2, TriangleAlert, X } from "lucide-react";
import {
  type ComponentProps,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { normalizeForSearch } from "../commands";
import { ContextMenuActions, groupActions, openContextMenuAt } from "../context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Input } from "../field";
import { formatDate, formatNumber } from "../numeric";
import { Spinner } from "../spinner";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { Switch } from "../switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { type CellEditMove, type CellEditorOption, ChoiceEditor, hueOf, TextEditor } from "./cell-editors";
import { type CellEditKind, type CellPos, type CellValue, cellKey, coerceEditValue, nextCell, sameCellValue } from "./cell-edit-logic";

/* ------------------------------------------------------------------ types */

export type DataTableSortDirection = "asc" | "desc";
export interface DataTableSort {
  id: string;
  direction: DataTableSortDirection;
}

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  /** Plain-text name for the View menu, filters and screen readers, when `header` isn't a string. */
  label?: string;
  cell: (row: T) => ReactNode;
  /** The value to sort by. Giving one makes the column sortable. Nulls sort last. */
  sortValue?: (row: T) => string | number | Date | null | undefined;
  /** Text that DataTableSearch matches (Arabic-folded, case-insensitive). */
  searchValue?: (row: T) => string;
  /** The value DataTableFacetFilter matches against. */
  filterValue?: (row: T) => string;
  align?: "start" | "end" | "center";
  /** Listed in the View menu. Default true. */
  hideable?: boolean;
  defaultHidden?: boolean;
  className?: string;
  headerClassName?: string;
  /**
   * Makes the cells of this column editable in place (needs `onCellEdit` on `<DataTable>`). Enter, F2, a double-click
   * or just typing starts an edit; Enter and Tab save, Esc cancels. `cell` still renders the read-only view.
   */
  edit?: DataTableCellEdit<T>;
}

export type DataTableEditOption = CellEditorOption;
export type DataTableCellValue = CellValue;

/** What a custom cell editor receives. Call `commit` with the new value, or `cancel`. */
export interface DataTableCustomEditContext<T> {
  row: T;
  /** The value the cell holds now. */
  value: CellValue;
  commit: (value: CellValue, move?: CellEditMove) => void;
  cancel: () => void;
  /** The validation message for this cell, if the last commit was rejected. */
  error?: string;
  /** Id of the element that shows `error`; put it in `aria-describedby`. */
  errorId: string;
  /** Accessible name for the editor, e.g. "Amount, INV-104". */
  label: string;
}

export interface DataTableCellEdit<T> {
  /** `"switch"` toggles in place (no edit mode). `"custom"` uses `render`. Default `"text"`. */
  type?: CellEditKind;
  /** The value the editor starts from. Defaults to the column's `sortValue`, then its `searchValue`. */
  value?: (row: T) => CellValue | undefined;
  /** Choices for `"select"`. */
  options?: CellEditorOption[];
  /** A message keeps the editor open and shows it. Runs before `onCellEdit`. */
  validate?: (value: CellValue, row: T) => string | null | undefined;
  /** Rows that can't be edited in this column. */
  disabled?: (row: T) => boolean;
  /** Accessible name of the editor, without the row: "Amount". Defaults to the column label or header. */
  label?: string;
  /** The editor for `type: "custom"`. */
  render?: (context: DataTableCustomEditContext<T>) => ReactNode;
}

/** What `onCellEdit` may resolve with. `{ error }` rolls the cell back and shows the message. */
export type DataTableCellEditResult = void | undefined | { error?: string };

export interface DataTableRowAction {
  id: string;
  label: string;
  icon?: LucideIcon | ReactElement;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Separator between groups, in first-seen order. */
  group?: string;
}

/** A value plus its setter; pass both to control that piece of state (server-side tables), or neither. */
type Controlled<V> = { value?: V; onChange?: (value: V) => void };

export interface UseDataTableOptions<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Rows per page. Omit for no pagination. */
  pageSize?: number;
  /** Adds a checkbox column. Space toggles the focused row. */
  selectable?: boolean;
  defaultSort?: DataTableSort | null;
  sort?: Controlled<DataTableSort | null>;
  query?: Controlled<string>;
  filters?: Controlled<Record<string, string[]>>;
  page?: Controlled<number>;
  selection?: Controlled<ReadonlySet<string>>;
  hidden?: Controlled<ReadonlySet<string>>;
  /**
   * The server already sorted, filtered and paginated `data`. The table only renders it and reports state
   * changes. Pass `rowCount` so pagination knows the total.
   */
  manual?: boolean;
  rowCount?: number;
}

export interface DataTableInstance<T> {
  columns: DataTableColumn<T>[];
  visibleColumns: DataTableColumn<T>[];
  /** The rows to render: sorted, filtered and paginated. */
  rows: T[];
  /** Rows after filtering, before pagination. */
  rowCount: number;
  totalCount: number;
  getRowId: (row: T) => string;

  sort: DataTableSort | null;
  setSort: (sort: DataTableSort | null) => void;
  /** asc → desc → off. */
  toggleSort: (columnId: string) => void;

  query: string;
  setQuery: (query: string) => void;
  filters: Record<string, string[]>;
  setFilter: (columnId: string, values: string[]) => void;
  resetFilters: () => void;
  isFiltered: boolean;

  page: number;
  pageSize: number | undefined;
  pageCount: number;
  setPage: (page: number) => void;

  hidden: ReadonlySet<string>;
  toggleColumn: (columnId: string) => void;

  selectable: boolean;
  selection: ReadonlySet<string>;
  setSelection: (ids: ReadonlySet<string>) => void;
  selectedRows: T[];
  toggleRow: (id: string) => void;
  /** Selects or clears every row on the current page. */
  togglePage: () => void;
  pageSelection: "all" | "some" | "none";
}

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    search: "Search…",
    clearSearch: "Clear search",
    view: "View",
    columns: "Columns",
    selectAll: "Select all rows on this page",
    selectRow: (name: string) => `Select ${name}`,
    actions: "Actions",
    rowActions: (name: string) => `Actions for ${name}`,
    selected: (n: string) => `${n} selected`,
    clearSelection: "Clear selection",
    range: (from: string, to: string, total: string) => `${from}–${to} of ${total}`,
    previous: "Previous page",
    next: "Next page",
    pagination: "Pagination",
    empty: "Nothing here yet",
    noResults: "No matching results",
    noResultsHint: "Try a different search or clear the filters.",
    clearFilters: "Clear filters",
    error: "Couldn't load this list",
    retry: "Try again",
    loading: "Loading…",
    reset: "Reset",
    moreActions: "More actions",
    editCell: (column: string, row: string) => `${column}, ${row}`,
    invalidNumber: "Enter a number",
    invalidDate: "Enter a date",
    saving: "Saving…",
    saved: "Saved",
    saveFailed: "Couldn't save the change",
    saveFailedFor: (message: string) => `Couldn't save: ${message}`,
  },
  ar: {
    search: "ابحث…",
    clearSearch: "مسح البحث",
    view: "العرض",
    columns: "الأعمدة",
    selectAll: "تحديد كل صفوف هذه الصفحة",
    selectRow: (name: string) => `تحديد ${name}`,
    actions: "الإجراءات",
    rowActions: (name: string) => `إجراءات ${name}`,
    selected: (n: string) => `${n} محدد`,
    clearSelection: "إلغاء التحديد",
    range: (from: string, to: string, total: string) => `${from}–${to} من ${total}`,
    previous: "الصفحة السابقة",
    next: "الصفحة التالية",
    pagination: "التنقل بين الصفحات",
    empty: "لا شيء هنا بعد",
    noResults: "لا نتائج مطابقة",
    noResultsHint: "جرّب بحثًا آخر أو امسح عوامل التصفية.",
    clearFilters: "مسح التصفية",
    error: "تعذّر تحميل هذه القائمة",
    retry: "إعادة المحاولة",
    loading: "جارٍ التحميل…",
    reset: "إعادة الضبط",
    moreActions: "مزيد من الإجراءات",
    editCell: (column: string, row: string) => `${column}، ${row}`,
    invalidNumber: "أدخل رقمًا",
    invalidDate: "أدخل تاريخًا",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    saveFailed: "تعذّر حفظ التغيير",
    saveFailedFor: (message: string) => `تعذّر الحفظ: ${message}`,
  },
};
export type DataTableLabels = typeof STRINGS.en;

function useLocale() {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { locale, t: STRINGS[locale.startsWith("ar") ? "ar" : "en"] };
}

/* ------------------------------------------------------------------ state */

function useControllable<V>(controlled: Controlled<V> | undefined, initial: V): [V, (v: V) => void] {
  const [own, setOwn] = useState(initial);
  const value = controlled?.value !== undefined ? controlled.value : own;
  const onChange = controlled?.onChange;
  const set = useCallback(
    (v: V) => {
      if (controlled?.value === undefined) setOwn(v);
      onChange?.(v);
    },
    [controlled?.value, onChange],
  );
  return [value, set];
}

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Headless state for a DataTable: sorting, search, facet filters, pagination, column visibility and selection,
 * each optional. Client-side by default; `manual` hands sorting/filtering/paging to the server.
 */
export function useDataTable<T>(options: UseDataTableOptions<T>): DataTableInstance<T> {
  const { data, columns, getRowId, pageSize, selectable = false, manual = false } = options;
  const { locale } = useLocale();

  const [sort, setSortState] = useControllable(options.sort, options.defaultSort ?? null);
  const [query, setQueryState] = useControllable(options.query, "");
  const [filters, setFiltersState] = useControllable<Record<string, string[]>>(options.filters, {});
  const [page, setPage] = useControllable(options.page, 0);
  const [selection, setSelection] = useControllable(options.selection, EMPTY_SET);
  const [hidden, setHidden] = useControllable<ReadonlySet<string>>(
    options.hidden,
    new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );

  // Changing what is shown always returns to the first page.
  const setSort = useCallback((s: DataTableSort | null) => (setSortState(s), setPage(0)), [setSortState, setPage]);
  const setQuery = useCallback((q: string) => (setQueryState(q), setPage(0)), [setQueryState, setPage]);
  const setFilter = useCallback(
    (id: string, values: string[]) => {
      const next = { ...filters };
      if (values.length) next[id] = values;
      else delete next[id];
      setFiltersState(next);
      setPage(0);
    },
    [filters, setFiltersState, setPage],
  );

  const filtered = useMemo(() => {
    if (manual) return data;
    const q = normalizeForSearch(query);
    const searchable = columns.filter((c) => c.searchValue);
    const facets = Object.entries(filters)
      .map(([id, values]) => [columns.find((c) => c.id === id)?.filterValue, new Set(values)] as const)
      .filter(([fn]) => fn);
    return data.filter(
      (row) =>
        (!q || searchable.some((c) => normalizeForSearch(c.searchValue!(row)).includes(q))) &&
        facets.every(([fn, values]) => values.has(fn!(row))),
    );
  }, [manual, data, columns, query, filters]);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.id === sort.id);
    if (manual || !column?.sortValue) return filtered;
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    const dir = sort!.direction === "asc" ? 1 : -1;
    const value = column.sortValue;
    return filtered
      .map((row, i) => ({ row, i, v: value(row) }))
      .sort((a, b) => {
        if (a.v == null || b.v == null) return a.v == null ? (b.v == null ? a.i - b.i : 1) : -1;
        const cmp =
          typeof a.v === "string" && typeof b.v === "string" ? collator.compare(a.v, b.v) : Number(a.v) - Number(b.v);
        return cmp * dir || a.i - b.i;
      })
      .map((x) => x.row);
  }, [manual, filtered, sort, columns, locale]);

  const rowCount = manual ? (options.rowCount ?? data.length) : sorted.length;
  const pageCount = pageSize ? Math.max(1, Math.ceil(rowCount / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const rows = manual || !pageSize ? sorted : sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const pageIds = rows.map(getRowId);
  const selectedOnPage = pageIds.filter((id) => selection.has(id)).length;

  return {
    columns,
    visibleColumns: columns.filter((c) => !hidden.has(c.id)),
    rows,
    rowCount,
    totalCount: manual ? rowCount : data.length,
    getRowId,
    sort,
    setSort,
    toggleSort: (id) =>
      setSort(sort?.id !== id ? { id, direction: "asc" } : sort.direction === "asc" ? { id, direction: "desc" } : null),
    query,
    setQuery,
    filters,
    setFilter,
    resetFilters: () => (setFiltersState({}), setQueryState(""), setPage(0)),
    isFiltered: !!query || Object.keys(filters).length > 0,
    page: safePage,
    pageSize,
    pageCount,
    setPage: (p) => setPage(Math.max(0, Math.min(pageCount - 1, p))),
    hidden,
    toggleColumn: (id) => {
      const next = new Set(hidden);
      if (!next.delete(id)) next.add(id);
      setHidden(next);
    },
    selectable,
    selection,
    setSelection,
    selectedRows: data.filter((row) => selection.has(getRowId(row))),
    toggleRow: (id) => {
      const next = new Set(selection);
      if (!next.delete(id)) next.add(id);
      setSelection(next);
    },
    togglePage: () => {
      const next = new Set(selection);
      if (selectedOnPage === pageIds.length) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      setSelection(next);
    },
    pageSelection: selectedOnPage === 0 ? "none" : selectedOnPage === pageIds.length ? "all" : "some",
  };
}

/* ------------------------------------------------------------------ table */

export interface DataTableProps<T> extends Omit<ComponentProps<"table">, "children" | "contextMenu"> {
  table: DataTableInstance<T>;
  /** Accessible name of the table. Localise it. */
  label: string;
  /** Plain-text name of a row, for "Select MH-728" and "Actions for MH-728". Defaults to the row id. */
  rowLabel?: (row: T) => string;
  /** Makes rows activatable: click, or Enter on the focused row. Clicks on controls inside the row don't count. */
  onRowClick?: (row: T) => void;
  /**
   * Menu behind ⋯ at the row's inline end. The same actions open as a context menu at the pointer on context-click
   * or long-press, and at the row with Shift+F10 or the Menu key.
   */
  rowActions?: (row: T) => DataTableRowAction[];
  /** Open `rowActions` as a context menu on context-click. Default true. Set false to keep the browser's menu. */
  contextMenu?: boolean;
  /**
   * Saves an in-cell edit (columns with `edit`). The cell shows the new value while this is pending. Resolve with
   * `{ error }` or throw to roll the cell back and show the message. Update your data before it resolves.
   */
  onCellEdit?: (row: T, columnId: string, value: CellValue) => DataTableCellEditResult | Promise<DataTableCellEditResult>;
  loading?: boolean;
  /** Replaces the rows with an error state. Pass a message, or `true` for the default. */
  error?: ReactNode;
  onRetry?: () => void;
  /** Shown when there are no rows and nothing is filtered. */
  empty?: ReactNode;
  labels?: Partial<DataTableLabels>;
}

const INTERACTIVE = "a,button,input,select,textarea,[role=checkbox],[role=menuitem],[role=switch],[contenteditable=true]";

const isMenuKey = (event: KeyboardEvent) => (event.key === "F10" && event.shiftKey) || event.key === "ContextMenu";

type Editing = { rowId: string; colId: string; seed?: string };

/** The value an editor starts from: `edit.value`, else the column's sort or search value. */
function initialEditValue<T>(column: DataTableColumn<T>, row: T): CellValue {
  const edit = column.edit;
  const raw = edit?.value ? edit.value(row) : (column.sortValue?.(row) ?? column.searchValue?.(row));
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return raw === undefined ? null : (raw as CellValue);
}

/** How a saved-but-not-yet-confirmed value reads while `onCellEdit` is pending. */
function pendingView<T>(column: DataTableColumn<T>, value: CellValue, locale: string): ReactNode {
  if (value === null || value === "") return <span className="text-muted-foreground/60">{"—"}</span>;
  const kind = column.edit?.type ?? "text";
  if (kind === "number") return <span className="tabular-nums">{formatNumber(Number(value), locale)}</span>;
  if (kind === "date") return <span>{formatDate(`${String(value)}T00:00:00`, locale)}</span>;
  if (kind === "select") {
    const option = column.edit?.options?.find((o) => o.value === value);
    return (
      <Badge variant="tag" hue={hueOf(option?.hue)}>
        {option?.label ?? String(value)}
      </Badge>
    );
  }
  return <span>{String(value)}</span>;
}

/**
 * The Table, driven by \`useDataTable\`: sortable headers, selection, row actions (⋯ menu and context menu), roving row
 * focus (↑ ↓ Home End, Enter to open, Space to select, Shift+F10 for the menu), in-cell editing, and loading, empty
 * and error states.
 */
export function DataTable<T>({
  table,
  label,
  rowLabel,
  onRowClick,
  rowActions,
  contextMenu = true,
  onCellEdit,
  loading = false,
  error,
  onRetry,
  empty,
  labels,
  className,
  ...props
}: DataTableProps<T>) {
  const { locale, t: base } = useLocale();
  const t = { ...base, ...labels };
  const { rows, visibleColumns, selectable, getRowId } = table;
  const [active, setActive] = useState(0);
  const body = useRef<HTMLTableSectionElement>(null);
  const colSpan = visibleColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const current = Math.min(active, Math.max(0, rows.length - 1));
  const nameOf = (row: T) => rowLabel?.(row) ?? getRowId(row);
  const uid = useId();

  /* ---- in-cell editing state ---- */
  const [editing, setEditing] = useState<Editing | null>(null);
  const [invalid, setInvalid] = useState<{ key: string; message: string } | null>(null);
  const [pending, setPending] = useState<Record<string, CellValue>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState("");
  const [focusReq, setFocusReq] = useState<{ rowId: string; colId: string; edit: boolean } | null>(null);
  const canEdit = !!onCellEdit;

  const cellAt = (rowId: string, colId: string) =>
    Array.from(body.current?.querySelectorAll<HTMLElement>("[data-cell-row]") ?? []).find((el) => el.dataset.cellRow === rowId && el.dataset.cellCol === colId);

  const isEditable = (row: T, column: DataTableColumn<T>) => canEdit && !!column.edit && !column.edit.disabled?.(row) && !pending[cellKey(getRowId(row), column.id)];

  useEffect(() => {
    if (!focusReq) return;
    setFocusReq(null);
    if (focusReq.edit) setEditing({ rowId: focusReq.rowId, colId: focusReq.colId });
    else cellAt(focusReq.rowId, focusReq.colId)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusReq]);

  const beginEdit = (row: T, column: DataTableColumn<T>, seed?: string) => {
    if (!isEditable(row, column)) return;
    const kind = column.edit?.type ?? "text";
    if (kind === "switch") return;
    const key = cellKey(getRowId(row), column.id);
    setFailed((f) => {
      if (!(key in f)) return f;
      const { [key]: _drop, ...rest } = f;
      return rest;
    });
    setInvalid(null);
    setEditing({ rowId: getRowId(row), colId: column.id, seed });
  };

  const cancelEdit = (rowId: string, colId: string) => {
    setEditing(null);
    setInvalid(null);
    setFocusReq({ rowId, colId, edit: false });
  };

  const moveFrom = (rowId: string, colId: string, move: "down" | "up" | "right" | "left", edit: boolean) => {
    const from = { row: rows.findIndex((r) => getRowId(r) === rowId), col: visibleColumns.findIndex((c) => c.id === colId) };
    if (from.row < 0 || from.col < 0) return;
    const to: CellPos | null = nextCell(from, move, rows.length, visibleColumns.length, (r, c) => {
      const rowAt = rows[r];
      const col = visibleColumns[c];
      return !!rowAt && !!col && isEditable(rowAt, col);
    });
    const target = to ? { rowId: getRowId(rows[to.row]!), colId: visibleColumns[to.col]!.id } : { rowId, colId };
    setFocusReq({ ...target, edit: edit && !!to && (visibleColumns[to.col]!.edit?.type ?? "text") !== "switch" });
  };

  /** Validates, saves and moves on. Returns false when the editor must stay open. */
  const commitCell = (row: T, column: DataTableColumn<T>, raw: string | CellValue, move: CellEditMove): boolean => {
    const edit = column.edit!;
    const kind = edit.type ?? "text";
    const rowId = getRowId(row);
    const key = cellKey(rowId, column.id);
    const reject = (message: string) => {
      // Leaving the cell with an invalid value abandons the edit; Enter and Tab keep it open with the message.
      if (move === "none") {
        setEditing(null);
        setInvalid(null);
        return true;
      }
      setInvalid({ key, message });
      return false;
    };

    let value: CellValue;
    if (typeof raw === "string" && (kind === "number" || kind === "date" || kind === "text")) {
      const parsed = coerceEditValue(kind, raw);
      if (!parsed.ok) return reject(parsed.reason === "number" ? t.invalidNumber : t.invalidDate);
      value = parsed.value;
    } else {
      value = raw as CellValue;
    }
    const message = edit.validate?.(value, row);
    if (message) return reject(message);

    setInvalid(null);
    setEditing(null);
    const step = move === "down" ? "down" : move === "right" ? "right" : move === "left" ? "left" : null;
    const go = () => (step ? moveFrom(rowId, column.id, step, step !== "down") : move === "none" ? undefined : setFocusReq({ rowId, colId: column.id, edit: false }));

    if (sameCellValue(initialEditValue(column, row), value) || !onCellEdit) {
      go();
      return true;
    }

    setPending((p) => ({ ...p, [key]: value }));
    setFailed((f) => {
      if (!(key in f)) return f;
      const { [key]: _drop, ...rest } = f;
      return rest;
    });
    setAnnounce(t.saving);
    go();
    void (async () => {
      let result: DataTableCellEditResult;
      try {
        result = await onCellEdit(row, column.id, value);
      } catch (e) {
        result = { error: e instanceof Error && e.message ? e.message : t.saveFailed };
      }
      setPending((p) => {
        const { [key]: _drop, ...rest } = p;
        return rest;
      });
      const failure = (result as { error?: string } | undefined)?.error;
      if (failure) {
        setFailed((f) => ({ ...f, [key]: failure }));
        setAnnounce(t.saveFailedFor(failure));
      } else {
        setAnnounce(t.saved);
      }
    })();
    return true;
  };

  const focusRow = (index: number) => {
    const target = body.current?.querySelectorAll<HTMLTableRowElement>("tr[data-row]")[index];
    if (!target) return;
    setActive(index);
    target.focus();
  };

  const firstEditable = (row: T) => visibleColumns.find((c) => isEditable(row, c) && (c.edit?.type ?? "text") !== "switch");

  const onRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T, index: number) => {
    if (event.target !== event.currentTarget) return;
    const last = rows.length - 1;
    const move = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: last }[event.key];
    if (move !== undefined) {
      event.preventDefault();
      focusRow(Math.max(0, Math.min(last, move)));
    } else if (event.key === "F2" && firstEditable(row)) {
      event.preventDefault();
      beginEdit(row, firstEditable(row)!);
    } else if (event.key === "Enter" && onRowClick) {
      event.preventDefault();
      onRowClick(row);
    } else if (event.key === "Enter" && firstEditable(row)) {
      event.preventDefault();
      beginEdit(row, firstEditable(row)!);
    } else if (event.key === " " && selectable) {
      event.preventDefault();
      table.toggleRow(getRowId(row));
    } else if (isMenuKey(event)) {
      if (contextMenu && rowActions?.(row).length && openContextMenuAt(event.currentTarget)) {
        event.preventDefault();
        return;
      }
      const trigger = event.currentTarget.querySelector<HTMLElement>("[data-slot=data-table-row-actions]");
      if (trigger) {
        event.preventDefault();
        trigger.click();
      }
    }
  };

  const onCellKeyDown = (event: KeyboardEvent<HTMLTableCellElement>, row: T, column: DataTableColumn<T>) => {
    if (event.target !== event.currentTarget) return;
    const rowId = getRowId(row);
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const kind = column.edit?.type ?? "text";
    const dir = { ArrowDown: "down", ArrowUp: "up", ArrowRight: rtl ? "left" : "right", ArrowLeft: rtl ? "right" : "left" }[event.key] as "down" | "up" | "left" | "right" | undefined;
    if (dir) {
      event.preventDefault();
      event.stopPropagation();
      moveFrom(rowId, column.id, dir, false);
    } else if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      event.stopPropagation();
      beginEdit(row, column);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.closest<HTMLElement>("tr[data-row]")?.focus();
    } else if (isMenuKey(event)) {
      if (contextMenu && rowActions?.(row).length && openContextMenuAt(event.currentTarget)) {
        event.preventDefault();
        event.stopPropagation();
      }
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== " " && (kind === "text" || kind === "number")) {
      event.preventDefault();
      event.stopPropagation();
      beginEdit(row, column, event.key);
    }
  };

  const onRowMouse = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    const target = event.target as HTMLElement;
    const hit = target.closest(INTERACTIVE);
    if (hit && hit !== event.currentTarget) return;
    // Clicking an editable cell focuses it; it doesn't open the row.
    if (target.closest("[data-editable]")) return;
    if (window.getSelection()?.toString()) return;
    onRowClick?.(row);
  };

  const renderEditCell = (row: T, column: DataTableColumn<T>, tab: number) => {
    const edit = column.edit!;
    const kind = edit.type ?? "text";
    const rowId = getRowId(row);
    const key = cellKey(rowId, column.id);
    const isEditing = editing?.rowId === rowId && editing.colId === column.id;
    const message = invalid?.key === key ? invalid.message : undefined;
    const errorId = `${uid}-err`;
    const name = t.editCell(edit.label ?? column.label ?? (typeof column.header === "string" ? column.header : column.id), nameOf(row));
    const stored = initialEditValue(column, row);
    const shown = key in pending ? pending[key]! : stored;
    const view = key in pending ? pendingView(column, shown, locale) : column.cell(row);
    const editable = isEditable(row, column);

    if (kind === "switch") {
      return (
        <Switch
          checked={shown === true}
          disabled={!editable}
          aria-label={name}
          tabIndex={tab}
          onCheckedChange={(v) => void commitCell(row, column, v, "none")}
        />
      );
    }
    if (isEditing && kind === "select") {
      return (
        <ChoiceEditor
          column={{ type: "select", label: name, options: edit.options }}
          value={typeof shown === "boolean" ? String(shown) : shown}
          open
          onOpenChange={(open) => {
            if (!open) cancelEdit(rowId, column.id);
          }}
          onChange={(next) => void commitCell(row, column, next as string | null, "none")}
          labels={{ noOptions: t.empty, clear: t.reset }}
          clearable={false}
        >
          <div className="flex min-h-6 w-full min-w-0 items-center outline-none">{view}</div>
        </ChoiceEditor>
      );
    }
    if (isEditing && kind === "custom" && edit.render) {
      return (
        <>
          <span className="invisible">{view}</span>
          <div className="absolute inset-0 flex items-center bg-card px-2">
            {edit.render({
              row,
              value: shown,
              commit: (v, move = "none") => void commitCell(row, column, v, move),
              cancel: () => cancelEdit(rowId, column.id),
              error: message,
              errorId,
              label: name,
            })}
          </div>
          {message ? <EditMessage id={errorId} message={message} above={rows.length > 1 && rows[rows.length - 1] === row} /> : null}
        </>
      );
    }
    if (isEditing && (kind === "text" || kind === "number" || kind === "date")) {
      return (
        <>
          <span className="invisible">{view}</span>
          <TextEditor
            column={{ type: kind }}
            ariaLabel={name}
            seeded={editing?.seed !== undefined}
            initial={editing?.seed ?? (shown === null ? "" : String(shown))}
            invalid={!!message}
            describedBy={message ? errorId : undefined}
            onCommit={(raw, move) => commitCell(row, column, raw, move)}
            onCancel={() => cancelEdit(rowId, column.id)}
          />
          {message ? <EditMessage id={errorId} message={message} above={rows.length > 1 && rows[rows.length - 1] === row} /> : null}
        </>
      );
    }
    const isPending = key in pending;
    const failure = failed[key];
    return (
      <span className={cn("flex min-w-0 items-center gap-1.5", isPending && "opacity-60")}>
        <span className="min-w-0 flex-1">{view}</span>
        {isPending ? <Spinner aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        {failure ? (
          <span className="inline-flex shrink-0 items-center text-nq-danger-text" title={failure}>
            <TriangleAlert aria-hidden className="size-3.5" />
            <span className="sr-only">{t.saveFailedFor(failure)}</span>
          </span>
        ) : null}
      </span>
    );
  };

  let content: ReactNode;
  if (loading) {
    content = Array.from({ length: Math.min(table.pageSize ?? 5, 8) }, (_, i) => (
      <TableRow key={i} aria-hidden className="hover:bg-transparent">
        {selectable ? (
          <TableCell className="w-10 ps-4">
            <Skeleton className="size-4 rounded-[4px]" />
          </TableCell>
        ) : null}
        {visibleColumns.map((c, j) => (
          <TableCell key={c.id} className={cn(j === 0 && !selectable && "ps-4")}>
            <Skeleton className="h-3" style={{ inlineSize: `${[70, 48, 60, 40, 54][(i + j) % 5]}%` }} />
          </TableCell>
        ))}
        {rowActions ? <TableCell className="w-12" /> : null}
      </TableRow>
    ));
  } else if (error) {
    content = (
      <StateRow colSpan={colSpan}>
        <ErrorState
          title={error === true ? t.error : error}
          className="border-0"
          actions={onRetry ? <Button size="sm" onClick={onRetry}>{t.retry}</Button> : undefined}
        />
      </StateRow>
    );
  } else if (!rows.length) {
    content = (
      <StateRow colSpan={colSpan}>
        {table.isFiltered ? (
          <EmptyState
            icon={Search}
            title={t.noResults}
            description={t.noResultsHint}
            className="border-0"
            actions={<Button size="sm" onClick={table.resetFilters}>{t.clearFilters}</Button>}
          />
        ) : (
          (empty ?? <EmptyState title={t.empty} className="border-0" />)
        )}
      </StateRow>
    );
  } else {
    content = rows.map((row, index) => {
      const id = getRowId(row);
      const selected = table.selection.has(id);
      const tab = index === current ? 0 : -1;
      const actions = rowActions?.(row) ?? [];
      const tr = (
        <TableRow
          data-row=""
          data-state={selected ? "selected" : undefined}
          tabIndex={tab}
          onFocus={(e) => e.target === e.currentTarget && setActive(index)}
          onKeyDown={(e) => onRowKeyDown(e, row, index)}
          onClick={onRowClick ? (e) => onRowMouse(e, row) : undefined}
          className={cn(
            "group/row outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
            onRowClick && "cursor-pointer",
          )}
        >
          {selectable ? (
            <TableCell className="w-10 ps-4 pe-0">
              <Checkbox
                tabIndex={tab}
                checked={selected}
                onCheckedChange={() => table.toggleRow(id)}
                aria-label={t.selectRow(nameOf(row))}
                className="align-middle"
              />
            </TableCell>
          ) : null}
          {visibleColumns.map((c, j) => {
            const first = j === 0 && !selectable;
            if (!c.edit) {
              return (
                <TableCell key={c.id} className={cn(alignClass(c.align), first && "ps-4", c.className)}>
                  {c.cell(row)}
                </TableCell>
              );
            }
            const key = cellKey(id, c.id);
            const editable = isEditable(row, c);
            const isEditing = editing?.rowId === id && editing.colId === c.id;
            return (
              <TableCell
                key={c.id}
                data-cell-row={id}
                data-cell-col={c.id}
                data-editable={editable ? "" : undefined}
                data-editing={isEditing ? "" : undefined}
                data-pending={key in pending ? "" : undefined}
                aria-busy={key in pending || undefined}
                aria-invalid={failed[key] ? true : undefined}
                tabIndex={editable && (c.edit.type ?? "text") !== "switch" ? -1 : undefined}
                onKeyDown={(e) => onCellKeyDown(e, row, c)}
                onDoubleClick={editable ? () => beginEdit(row, c) : undefined}
                className={cn(
                  "relative outline-none focus:outline-2 focus:-outline-offset-2 focus:outline-nq-focus",
                  editable && "cursor-cell",
                  failed[key] && "bg-nq-danger-soft",
                  alignClass(c.align),
                  first && "ps-4",
                  c.className,
                )}
              >
                {renderEditCell(row, c, tab)}
              </TableCell>
            );
          })}
          {rowActions ? (
            <TableCell className="w-12 pe-2 text-end">
              <RowActions actions={actions} label={t.rowActions(nameOf(row))} tabIndex={tab} />
            </TableCell>
          ) : null}
        </TableRow>
      );
      return <ContextMenuActions key={id} actions={actions} disabled={!contextMenu} keyboard={false} render={tr} renderIcon={(a) => <ActionIcon icon={a.icon} />} />;
    });
  }

  const grid = (
    <Table label={label} aria-busy={loading || undefined} className={className} {...props}>
      <TableHeader>
        <TableRow>
          {selectable ? (
            <TableHead className="w-10 ps-4 pe-0">
              <Checkbox
                checked={table.pageSelection === "all"}
                indeterminate={table.pageSelection === "some"}
                disabled={!rows.length || loading}
                onCheckedChange={table.togglePage}
                aria-label={t.selectAll}
                className="align-middle"
              />
            </TableHead>
          ) : null}
          {visibleColumns.map((c, j) => (
            <SortHead key={c.id} table={table} column={c} first={j === 0 && !selectable} />
          ))}
          {rowActions ? (
            <TableHead className="w-12">
              <span className="sr-only">{t.actions}</span>
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody ref={body}>{content}</TableBody>
    </Table>
  );
  if (!canEdit) return grid;
  return (
    <>
      {grid}
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </>
  );
}

function EditMessage({ id, message, above }: { id: string; message: string; above: boolean }) {
  return (
    <span
      id={id}
      role="alert"
      className={cn(
        "absolute start-0 z-20 max-w-64 rounded-control border border-nq-danger-text/30 bg-card px-2 py-1 text-caption whitespace-normal text-nq-danger-text shadow-md",
        above ? "bottom-full mb-1" : "top-full mt-1",
      )}
    >
      {message}
    </span>
  );
}

function alignClass(align: DataTableColumn<unknown>["align"]) {
  return align === "end" ? "text-end" : align === "center" ? "text-center" : undefined;
}

function StateRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-auto p-0 whitespace-normal">
        {children}
      </TableCell>
    </TableRow>
  );
}

function SortHead<T>({ table, column, first }: { table: DataTableInstance<T>; column: DataTableColumn<T>; first: boolean }) {
  const active = table.sort?.id === column.id ? table.sort.direction : null;
  const cls = cn(alignClass(column.align), first && "ps-4", column.headerClassName);
  if (!column.sortValue) return <TableHead className={cls}>{column.header}</TableHead>;
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <TableHead className={cls} aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"}>
      <button
        type="button"
        onClick={() => table.toggleSort(column.id)}
        className={cn(
          "-mx-1.5 inline-flex h-7 items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq",
          "hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus",
          active && "text-foreground",
          column.align === "end" && "flex-row-reverse",
        )}
      >
        {column.header}
        <Icon aria-hidden className={cn("size-3.5 shrink-0", !active && "opacity-40")} />
      </button>
    </TableHead>
  );
}

function ActionIcon({ icon }: { icon: DataTableRowAction["icon"] }) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Glyph = icon as LucideIcon;
  return <Glyph aria-hidden />;
}

function RowActions({ actions, label, tabIndex }: { actions: DataTableRowAction[]; label: string; tabIndex: number }) {
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            tabIndex={tabIndex}
            data-slot="data-table-row-actions"
            className={cn(
              "text-muted-foreground opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100",
              "group-data-[state=selected]/row:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100",
            )}
          />
        }
      >
        <Ellipsis aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {groupActions(actions).map((items, i) => (
          <DropdownMenuGroup key={i}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            {items.map((a) => (
              <DropdownMenuItem key={a.id} variant={a.danger ? "danger" : "default"} disabled={a.disabled} onClick={a.onSelect}>
                <ActionIcon icon={a.icon} />
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ toolbar pieces */

/** Lays out search, filters and view options above the table; wraps on narrow screens. */
export function DataTableToolbar({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="data-table-toolbar" className={cn("flex flex-wrap items-center gap-2", className)} {...props} />;
}

export interface DataTableAction {
  id: string;
  label: string;
  icon?: LucideIcon | ReactElement;
  onSelect: () => void;
  /** The one prominent button. Only the first action with `primary` is used. */
  primary?: boolean;
  /** Always in the ⋯ menu, never a button. */
  overflow?: boolean;
  /** A button with just the icon (refresh). The label stays as its name. Ignored without an `icon`. */
  iconOnly?: boolean;
  disabled?: boolean;
  /** Spinner on the button and blocked while true (a refresh or export in flight). */
  loading?: boolean;
  danger?: boolean;
}

export interface DataTableActionsProps extends Omit<ComponentProps<"div">, "children"> {
  /** Create, import, export, refresh… in the order they should read. */
  actions: DataTableAction[];
  /** Anything custom, after the buttons. */
  children?: ReactNode;
  /** Name of the ⋯ button. Localised by default. */
  moreLabel?: string;
}

/**
 * Table-level actions for the toolbar: one primary button, secondary buttons, and a ⋯ menu. Below the `sm` breakpoint
 * the secondary buttons fold into the menu so the toolbar never overflows. It works next to DataTableBulkActions:
 * that bar shows only while rows are selected.
 */
export function DataTableActions({ actions, children, moreLabel, className, ...props }: DataTableActionsProps) {
  const { t } = useLocale();
  const primary = actions.find((a) => a.primary);
  const buttons = actions.filter((a) => a !== primary && !a.overflow);
  const menu = actions.filter((a) => a !== primary && a.overflow);
  const folded = [...buttons];
  if (!primary && !buttons.length && !menu.length && !children) return null;
  const button = (a: DataTableAction, variant: "primary" | "secondary", extra?: string) => {
    const iconOnly = !!a.iconOnly && !!a.icon;
    return (
      <Button
        key={a.id}
        size={iconOnly ? "icon-sm" : "sm"}
        variant={a.danger ? "danger" : variant}
        disabled={a.disabled}
        loading={a.loading}
        aria-label={iconOnly ? a.label : undefined}
        title={iconOnly ? a.label : undefined}
        data-action={a.id}
        onClick={a.onSelect}
        className={extra}
      >
        <ActionIcon icon={a.icon} />
        {iconOnly ? null : a.label}
      </Button>
    );
  };
  return (
    <div data-slot="data-table-actions" className={cn("flex items-center gap-2", className)} {...props}>
      {buttons.map((a) => button(a, "secondary", "max-sm:hidden"))}
      {children}
      {menu.length || folded.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={moreLabel ?? t.moreActions}
                data-slot="data-table-actions-more"
                className={cn(!menu.length && "sm:hidden")}
              />
            }
          >
            <Ellipsis aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuGroup>
              {[...folded.map((a) => [a, "sm:hidden"] as const), ...menu.map((a) => [a, undefined] as const)].map(([a, cls]) => (
                <DropdownMenuItem key={a.id} variant={a.danger ? "danger" : "default"} disabled={a.disabled || a.loading} onClick={a.onSelect} className={cls}>
                  <ActionIcon icon={a.icon} />
                  {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {primary ? button(primary, "primary") : null}
    </div>
  );
}

export interface DataTableSearchProps<T> extends Omit<ComponentProps<"input">, "value" | "onChange"> {
  table: DataTableInstance<T>;
}

/** Filters rows by every column that has a `searchValue`. Esc clears. */
export function DataTableSearch<T>({ table, placeholder, className, ...props }: DataTableSearchProps<T>) {
  const { t } = useLocale();
  return (
    <div data-slot="data-table-search" className={cn("relative w-full sm:w-64", className)}>
      <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={table.query}
        onChange={(e) => table.setQuery(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && table.query) {
            e.preventDefault();
            table.setQuery("");
          }
        }}
        placeholder={placeholder ?? t.search}
        aria-label={props["aria-label"] ?? placeholder ?? t.search}
        className="h-control-sm ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden"
        {...(props as object)}
      />
      {table.query ? (
        <button
          type="button"
          onClick={() => table.setQuery("")}
          aria-label={t.clearSearch}
          className="absolute end-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export interface DataTableFacetOption {
  value: string;
  label: string;
  icon?: LucideIcon | ReactElement;
}

export interface DataTableFacetFilterProps<T> {
  table: DataTableInstance<T>;
  /** A column with a `filterValue`. */
  column: string;
  /** Button label. Defaults to the column's label. */
  title?: string;
  options: DataTableFacetOption[];
}

/** A multi-select filter on one column ("Status: In progress, Blocked"). Shows the count of chosen values. */
export function DataTableFacetFilter<T>({ table, column, title, options }: DataTableFacetFilterProps<T>) {
  const { locale, t } = useLocale();
  const col = table.columns.find((c) => c.id === column);
  const name = title ?? col?.label ?? (typeof col?.header === "string" ? col.header : column);
  const chosen = new Set(table.filters[column] ?? []);
  const toggle = (value: string) => {
    const next = new Set(chosen);
    if (!next.delete(value)) next.add(value);
    table.setFilter(column, options.map((o) => o.value).filter((v) => next.has(v)));
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" className={cn(!chosen.size && "border-dashed text-muted-foreground")} />}
      >
        <ListFilter aria-hidden />
        {name}
        {chosen.size ? (
          <Badge variant="outline" className="-me-1 tabular-nums">
            {chosen.size === 1 ? options.find((o) => chosen.has(o.value))?.label : formatNumber(chosen.size, locale)}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48">
        <DropdownMenuGroup>
          {options.map((o) => (
            <DropdownMenuCheckboxItem key={o.value} checked={chosen.has(o.value)} onCheckedChange={() => toggle(o.value)} closeOnClick={false}>
              <ActionIcon icon={o.icon} />
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {chosen.size ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => table.setFilter(column, [])}>{t.reset}</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Column visibility: a "View" menu listing every hideable column. */
export function DataTableViewOptions<T>({ table, className }: { table: DataTableInstance<T>; className?: string }) {
  const { t } = useLocale();
  const hideable = table.columns.filter((c) => c.hideable !== false);
  if (!hideable.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" className={cn("ms-auto", className)} />}>
        <Settings2 aria-hidden />
        {t.view}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
          {hideable.map((c) => (
            <DropdownMenuCheckboxItem
              key={c.id}
              checked={!table.hidden.has(c.id)}
              onCheckedChange={() => table.toggleColumn(c.id)}
              // Keep one column: hiding them all leaves an empty table and no way to tell why.
              disabled={!table.hidden.has(c.id) && table.visibleColumns.length === 1}
              closeOnClick={false}
            >
              {c.label ?? c.header}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface DataTableBulkActionsProps<T> extends ComponentProps<"div"> {
  table: DataTableInstance<T>;
}

/**
 * Appears while rows are selected: the count, your actions (children), and clear. Renders nothing otherwise,
 * so put it where the toolbar is and it takes over only when needed.
 */
export function DataTableBulkActions<T>({ table, className, children, ...props }: DataTableBulkActionsProps<T>) {
  const { locale, t } = useLocale();
  const count = table.selection.size;
  return (
    <div
      data-slot="data-table-bulk-actions"
      role="toolbar"
      aria-label={t.selected(formatNumber(count, locale))}
      hidden={!count}
      className={cn("flex flex-wrap items-center gap-2 rounded-control bg-nq-selected py-1 ps-3 pe-1", className)}
      {...props}
    >
      <span aria-live="polite" className="me-auto text-label tabular-nums text-foreground">
        {t.selected(formatNumber(count, locale))}
      </span>
      {children}
      <Button variant="ghost" size="icon-sm" aria-label={t.clearSelection} onClick={() => table.setSelection(EMPTY_SET)}>
        <X aria-hidden />
      </Button>
    </div>
  );
}

/** "1–10 of 42" and previous / next. Renders nothing when everything fits on one page. */
export function DataTablePagination<T>({ table, className, ...props }: ComponentProps<"nav"> & { table: DataTableInstance<T> }) {
  const { locale, t } = useLocale();
  if (!table.pageSize || table.pageCount <= 1) return null;
  const from = table.page * table.pageSize + 1;
  const to = Math.min(table.rowCount, from + table.pageSize - 1);
  const n = (v: number) => formatNumber(v, locale);
  return (
    <nav data-slot="data-table-pagination" aria-label={t.pagination} className={cn("flex items-center justify-end gap-2", className)} {...props}>
      <span className="text-caption tabular-nums text-muted-foreground" aria-live="polite">
        {t.range(n(from), n(to), n(table.rowCount))}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label={t.previous} disabled={table.page === 0} onClick={() => table.setPage(table.page - 1)}>
        <ChevronLeft aria-hidden className="rtl:-scale-x-100" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.next}
        disabled={table.page >= table.pageCount - 1}
        onClick={() => table.setPage(table.page + 1)}
      >
        <ChevronRight aria-hidden className="rtl:-scale-x-100" />
      </Button>
    </nav>
  );
}

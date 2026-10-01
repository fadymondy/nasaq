"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Ellipsis, ListFilter, type LucideIcon, Search, Settings2, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  Fragment,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Input } from "../field";
import { NativeSelect } from "../native-select";
import { formatDate, formatNumber } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Spinner } from "../spinner";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { Switch } from "../switch";
import { Table, TableBody, TableCell, type TableDensity, TableHead, TableHeader, TableRow } from "../table";
import { type CellEditMove, type CellEditorOption, ChoiceEditor, hueOf, TextEditor } from "./cell-editors";
import { type CellEditKind, type CellPos, type CellValue, cellKey, coerceEditValue, nextCell, sameCellValue } from "./cell-edit-logic";
import {
  clampColumnSize,
  type DataTablePinning,
  type DataTableRange,
  type DataTableSort,
  inRange,
  isActiveRange,
  nextSorting,
  orderByPinning,
  pinColumnIn,
  pinOffsets,
  sortTableRows,
} from "./data-table-logic";

export * from "./data-table-logic";

/* ------------------------------------------------------------------ types */

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
  /** A number or date that DataTableRangeFilter compares (inclusive). */
  rangeValue?: (row: T) => number | Date | string | null | undefined;
  /** Keep the column in view while the table scrolls sideways. Changeable later with `table.pinColumn`. */
  pin?: "start" | "end";
  /** Starting width in pixels when the table is `resizable`. */
  size?: number;
  /** Narrowest a resize can make it. Default 48. */
  minSize?: number;
  /** Widest a resize can make it. Default 960. */
  maxSize?: number;
  /** Set false to keep this column a fixed width in a `resizable` table. */
  resizable?: boolean;
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
  /** Shift-click a header (or Shift+Enter) to sort by more columns after the first. Default false. */
  multiSort?: boolean;
  /** Starting sort keys, in priority order. Wins over `defaultSort`. */
  defaultSorting?: DataTableSort[];
  /** Every sort key, in priority order. Wins over `sort`. */
  sorting?: Controlled<DataTableSort[]>;
  query?: Controlled<string>;
  filters?: Controlled<Record<string, string[]>>;
  /** Range filters by column id (DataTableRangeFilter). */
  ranges?: Controlled<Record<string, DataTableRange>>;
  page?: Controlled<number>;
  /** The page size as state, for DataTablePagination's rows-per-page choice. Starts at `pageSize`. */
  perPage?: Controlled<number>;
  selection?: Controlled<ReadonlySet<string>>;
  hidden?: Controlled<ReadonlySet<string>>;
  /** Ids of the expanded rows (needs `renderExpanded` on DataTable). */
  expanded?: Controlled<ReadonlySet<string>>;
  /** Pinned columns. Starts from each column's `pin`. */
  pinning?: Controlled<DataTablePinning>;
  /** Drag or arrow-key the edge of a header to set a column's width. Default false. */
  resizable?: boolean;
  /** Column widths in pixels, by id. Starts from each column's `size`. */
  sizes?: Controlled<Record<string, number>>;
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

  /** The first sort key. */
  sort: DataTableSort | null;
  setSort: (sort: DataTableSort | null) => void;
  /** Every sort key, in priority order. */
  sorting: DataTableSort[];
  setSorting: (sorting: DataTableSort[]) => void;
  multiSort: boolean;
  /** asc → desc → off. With `additive` (Shift) and `multiSort`, adds the column to the sort instead. */
  toggleSort: (columnId: string, additive?: boolean) => void;

  query: string;
  setQuery: (query: string) => void;
  filters: Record<string, string[]>;
  setFilter: (columnId: string, values: string[]) => void;
  ranges: Record<string, DataTableRange>;
  /** `null` or an empty range clears it. */
  setRange: (columnId: string, range: DataTableRange | null) => void;
  resetFilters: () => void;
  isFiltered: boolean;

  page: number;
  pageSize: number | undefined;
  setPageSize: (size: number) => void;
  pageCount: number;
  setPage: (page: number) => void;

  hidden: ReadonlySet<string>;
  toggleColumn: (columnId: string) => void;

  expanded: ReadonlySet<string>;
  toggleExpanded: (id: string) => void;
  setExpanded: (ids: ReadonlySet<string>) => void;

  pinning: DataTablePinning;
  /** Pins a column to a side, or unpins it with `null`. */
  pinColumn: (columnId: string, side: "start" | "end" | null) => void;
  /** Which side a column is pinned to, if any. */
  pinOf: (columnId: string) => "start" | "end" | null;

  resizable: boolean;
  sizes: Record<string, number>;
  /** Sets a width in pixels (kept within the column's limits), or clears it with `null`. */
  setColumnSize: (columnId: string, width: number | null) => void;

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
    expandRow: (name: string) => `Show details for ${name}`,
    details: (name: string) => `Details for ${name}`,
    sortPriority: (n: string, dir: string) => `sort ${n}, ${dir}`,
    ascending: "ascending",
    descending: "descending",
    multiSortHint: "Shift-click to sort by more columns",
    resize: (name: string) => `Resize ${name}`,
    pin: "Pin",
    pinStart: "Pin to start",
    pinEnd: "Pin to end",
    unpin: "Unpin",
    density: "Density",
    densities: { compact: "Compact", default: "Default", comfortable: "Comfortable" } as Record<TableDensity, string>,
    rowsPerPage: "Rows per page",
    rangeFrom: "From",
    rangeTo: "To",
    rangeAtLeast: (v: string) => `≥ ${v}`,
    rangeAtMost: (v: string) => `≤ ${v}`,
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
    expandRow: (name: string) => `إظهار تفاصيل ${name}`,
    details: (name: string) => `تفاصيل ${name}`,
    sortPriority: (n: string, dir: string) => `ترتيب ${n}، ${dir}`,
    ascending: "تصاعدي",
    descending: "تنازلي",
    multiSortHint: "اضغط مع Shift للترتيب حسب أعمدة أخرى",
    resize: (name: string) => `تغيير عرض ${name}`,
    pin: "التثبيت",
    pinStart: "تثبيت في البداية",
    pinEnd: "تثبيت في النهاية",
    unpin: "إلغاء التثبيت",
    density: "الكثافة",
    densities: { compact: "مضغوطة", default: "عادية", comfortable: "مريحة" } as Record<TableDensity, string>,
    rowsPerPage: "صفوف في الصفحة",
    rangeFrom: "من",
    rangeTo: "إلى",
    rangeAtLeast: (v: string) => `≥ ${v}`,
    rangeAtMost: (v: string) => `≤ ${v}`,
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
  const { data, columns, getRowId, selectable = false, manual = false, multiSort = false, resizable = false } = options;
  const { locale } = useLocale();

  // `sorting` is the state; the older single `sort` option maps onto its first key.
  const legacySort = options.sort;
  const sortingControl: Controlled<DataTableSort[]> | undefined =
    options.sorting ??
    (legacySort
      ? {
          value: legacySort.value === undefined ? undefined : legacySort.value ? [legacySort.value] : [],
          onChange: legacySort.onChange && ((s) => legacySort.onChange!(s[0] ?? null)),
        }
      : undefined);
  const [sorting, setSortingState] = useControllable(sortingControl, options.defaultSorting ?? (options.defaultSort ? [options.defaultSort] : []));
  const [query, setQueryState] = useControllable(options.query, "");
  const [filters, setFiltersState] = useControllable<Record<string, string[]>>(options.filters, {});
  const [ranges, setRangesState] = useControllable<Record<string, DataTableRange>>(options.ranges, {});
  const [page, setPage] = useControllable(options.page, 0);
  const [perPage, setPerPage] = useControllable<number | undefined>(options.perPage as Controlled<number | undefined> | undefined, options.pageSize);
  const pageSize = perPage;
  const [selection, setSelection] = useControllable(options.selection, EMPTY_SET);
  const [hidden, setHidden] = useControllable<ReadonlySet<string>>(
    options.hidden,
    new Set(columns.filter((c) => c.defaultHidden).map((c) => c.id)),
  );
  const [expanded, setExpanded] = useControllable(options.expanded, EMPTY_SET);
  const [pinning, setPinning] = useControllable<DataTablePinning>(options.pinning, {
    start: columns.filter((c) => c.pin === "start").map((c) => c.id),
    end: columns.filter((c) => c.pin === "end").map((c) => c.id),
  });
  const [sizes, setSizes] = useControllable<Record<string, number>>(
    options.sizes,
    Object.fromEntries(columns.filter((c) => c.size).map((c) => [c.id, c.size!])),
  );

  // Changing what is shown always returns to the first page.
  const setSorting = useCallback((s: DataTableSort[]) => (setSortingState(s), setPage(0)), [setSortingState, setPage]);
  const setSort = useCallback((s: DataTableSort | null) => setSorting(s ? [s] : []), [setSorting]);
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
  const setRange = useCallback(
    (id: string, range: DataTableRange | null) => {
      const next = { ...ranges };
      if (isActiveRange(range)) next[id] = range!;
      else delete next[id];
      setRangesState(next);
      setPage(0);
    },
    [ranges, setRangesState, setPage],
  );

  const filtered = useMemo(() => {
    if (manual) return data;
    const q = normalizeForSearch(query);
    const searchable = columns.filter((c) => c.searchValue);
    const facets = Object.entries(filters)
      .map(([id, values]) => [columns.find((c) => c.id === id)?.filterValue, new Set(values)] as const)
      .filter(([fn]) => fn);
    const bounded = Object.entries(ranges)
      .map(([id, range]) => [columns.find((c) => c.id === id)?.rangeValue, range] as const)
      .filter(([fn, range]) => fn && isActiveRange(range));
    return data.filter(
      (row) =>
        (!q || searchable.some((c) => normalizeForSearch(c.searchValue!(row)).includes(q))) &&
        facets.every(([fn, values]) => values.has(fn!(row))) &&
        bounded.every(([fn, range]) => inRange(fn!(row), range)),
    );
  }, [manual, data, columns, query, filters, ranges]);

  const sorted = useMemo(
    () => (manual ? filtered : sortTableRows(filtered, sorting, (id) => columns.find((c) => c.id === id)?.sortValue, locale)),
    [manual, filtered, sorting, columns, locale],
  );

  const rowCount = manual ? (options.rowCount ?? data.length) : sorted.length;
  const pageCount = pageSize ? Math.max(1, Math.ceil(rowCount / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const rows = manual || !pageSize ? sorted : sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const pageIds = rows.map(getRowId);
  const selectedOnPage = pageIds.filter((id) => selection.has(id)).length;

  const byId = new Map(columns.map((c) => [c.id, c]));
  const order = orderByPinning(
    columns.filter((c) => !hidden.has(c.id)).map((c) => c.id),
    pinning,
  );
  const pinOf = (id: string) => (pinning.start?.includes(id) ? "start" : pinning.end?.includes(id) ? "end" : null);

  return {
    columns,
    visibleColumns: order.map((id) => byId.get(id)!),
    rows,
    rowCount,
    totalCount: manual ? rowCount : data.length,
    getRowId,
    sort: sorting[0] ?? null,
    setSort,
    sorting,
    setSorting,
    multiSort,
    toggleSort: (id, additive = false) => setSorting(nextSorting(sorting, id, additive && multiSort)),
    query,
    setQuery,
    filters,
    setFilter,
    ranges,
    setRange,
    resetFilters: () => (setFiltersState({}), setRangesState({}), setQueryState(""), setPage(0)),
    isFiltered: !!query || Object.keys(filters).length > 0 || Object.values(ranges).some(isActiveRange),
    page: safePage,
    pageSize,
    setPageSize: (size) => (setPerPage(size), setPage(0)),
    pageCount,
    setPage: (p) => setPage(Math.max(0, Math.min(pageCount - 1, p))),
    hidden,
    toggleColumn: (id) => {
      const next = new Set(hidden);
      if (!next.delete(id)) next.add(id);
      setHidden(next);
    },
    expanded,
    setExpanded,
    toggleExpanded: (id) => {
      const next = new Set(expanded);
      if (!next.delete(id)) next.add(id);
      setExpanded(next);
    },
    pinning,
    pinColumn: (id, side) => setPinning(pinColumnIn(pinning, id, side)),
    pinOf,
    resizable,
    sizes,
    setColumnSize: (id, width) => {
      const next = { ...sizes };
      const column = byId.get(id);
      if (width === null) delete next[id];
      else next[id] = clampColumnSize(width, column?.minSize, column?.maxSize);
      setSizes(next);
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
  /**
   * Content under a row, shown by its chevron (or → / ← on the focused row). Adds the chevron column. State lives in
   * `table.expanded`.
   */
  renderExpanded?: (row: T) => ReactNode;
  /** Rows that have details. Default: every row. */
  canExpand?: (row: T) => boolean;
  loading?: boolean;
  /** Replaces the rows with an error state. Pass a message, or `true` for the default. */
  error?: ReactNode;
  onRetry?: () => void;
  /** Shown when there are no rows and nothing is filtered. */
  empty?: ReactNode;
  /** Cell padding: `compact`, `default` or `comfortable`. See `Table`. */
  density?: TableDensity;
  /** A rounded border around the table, with a tinted header. */
  frame?: boolean;
  /** Lines between columns as well as rows. */
  bordered?: boolean;
  /** Every other row tinted. */
  striped?: boolean;
  /** Highlight the row under the pointer. Default true. */
  hover?: boolean;
  labels?: Partial<DataTableLabels>;
}

const INTERACTIVE = "a,button,input,select,textarea,[role=checkbox],[role=menuitem],[role=switch],[contenteditable=true]";

// Ids of the utility columns, for pin offsets.
const SELECT_COL = "__nq-select";
const EXPAND_COL = "__nq-expand";
const ACTIONS_COL = "__nq-actions";

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
  renderExpanded,
  canExpand,
  loading = false,
  error,
  onRetry,
  empty,
  labels,
  className,
  style,
  frame,
  striped,
  hover = true,
  ...props
}: DataTableProps<T>) {
  const { locale, t: base } = useLocale();
  const t = { ...base, ...labels };
  const { rows, visibleColumns, selectable, getRowId } = table;
  const [active, setActive] = useState(0);
  const body = useRef<HTMLTableSectionElement>(null);
  const headRow = useRef<HTMLTableRowElement>(null);
  const expandable = !!renderExpanded;
  const colSpan = visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + (rowActions ? 1 : 0);

  /* ---- pinning: the utility columns follow the side they sit on ---- */
  const hasStart = visibleColumns.some((c) => table.pinOf(c.id) === "start");
  const hasEnd = visibleColumns.some((c) => table.pinOf(c.id) === "end");
  const pinFor = (id: string): "start" | "end" | null =>
    id === SELECT_COL || id === EXPAND_COL ? (hasStart ? "start" : null) : id === ACTIONS_COL ? (hasEnd ? "end" : null) : table.pinOf(id);
  const lastStart = [...visibleColumns].reverse().find((c) => table.pinOf(c.id) === "start")?.id;
  const firstEnd = visibleColumns.find((c) => table.pinOf(c.id) === "end")?.id;
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const pinKey = `${hasStart}|${hasEnd}|${visibleColumns.map((c) => `${c.id}:${table.pinOf(c.id) ?? ""}`).join(",")}`;
  useLayoutEffect(() => {
    const row = headRow.current;
    if (!row || (!hasStart && !hasEnd)) {
      setOffsets((o) => (Object.keys(o).length ? {} : o));
      return;
    }
    const measure = () => {
      const cells = Array.from(row.querySelectorAll<HTMLElement>("th[data-col]"));
      const next = pinOffsets(cells.map((th) => ({ id: th.dataset.col!, pin: pinFor(th.dataset.col!), width: th.getBoundingClientRect().width })));
      setOffsets((o) => (JSON.stringify(o) === JSON.stringify(next) ? o : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const th of Array.from(row.querySelectorAll("th"))) ro.observe(th);
    return () => ro.disconnect();
    // pinKey captures every input of pinFor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, table.sizes]);

  /** Sticky placement and a solid background for a pinned cell, so scrolled cells pass under it. */
  const pinProps = (id: string, head = false): { style?: CSSProperties; className?: string; "data-pin"?: string } => {
    const side = pinFor(id);
    if (!side) return {};
    const edge = (side === "start" && id === (lastStart ?? "")) || (side === "end" && id === (firstEnd ?? ""));
    return {
      "data-pin": side,
      style: side === "start" ? { insetInlineStart: offsets[id] ?? 0 } : { insetInlineEnd: offsets[id] ?? 0 },
      className: cn(
        "sticky z-[1] bg-[var(--nq-data-table-pin-bg)]",
        head
          ? frame && "bg-[image:linear-gradient(var(--nq-data-table-head-tint),var(--nq-data-table-head-tint))]"
          : cn(
              striped && "group-even/row:bg-[image:linear-gradient(var(--nq-data-table-stripe),var(--nq-data-table-stripe))]",
              hover && "group-hover/row:bg-[image:linear-gradient(var(--nq-hover),var(--nq-hover))]",
              "group-data-[state=selected]/row:bg-[image:linear-gradient(var(--nq-selected),var(--nq-selected))]",
            ),
        edge && "after:pointer-events-none after:absolute after:inset-y-0 after:w-px after:bg-border",
        edge && (side === "start" ? "after:end-0" : "after:start-0"),
      ),
    };
  };
  const tableStyle = {
    "--nq-data-table-pin-bg": frame ? "var(--card)" : "var(--background)",
    "--nq-data-table-head-tint": "color-mix(in oklab, var(--secondary) 50%, transparent)",
    "--nq-data-table-stripe": "color-mix(in oklab, var(--secondary) 40%, transparent)",
    ...style,
  } as CSSProperties;
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
    } else if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && expandable && (canExpand?.(row) ?? true)) {
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
      const open = (event.key === "ArrowRight") !== rtl;
      const id = getRowId(row);
      if (open !== table.expanded.has(id)) {
        event.preventDefault();
        table.toggleExpanded(id);
      }
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

  const expanderCell = (row: T, tab: number) => {
    const id = getRowId(row);
    const can = canExpand?.(row) ?? true;
    const open = can && table.expanded.has(id);
    const pin = pinProps(EXPAND_COL);
    return (
      <TableCell data-col={EXPAND_COL} className={cn("w-10 pe-0", pin.className)} style={pin.style} data-pin={pin["data-pin"]}>
        {can ? (
          <Button
            variant="ghost"
            size="icon-sm"
            tabIndex={tab}
            aria-expanded={open}
            aria-controls={open ? `${uid}-x-${id}` : undefined}
            aria-label={t.expandRow(nameOf(row))}
            data-slot="data-table-expand"
            onClick={() => table.toggleExpanded(id)}
            className="text-muted-foreground"
          >
            <ChevronRight aria-hidden className={cn("transition-transform duration-150 ease-nq rtl:-scale-x-100", open && "rotate-90 rtl:-rotate-90")} />
          </Button>
        ) : null}
      </TableCell>
    );
  };

  const cellPin = (id: string, extra?: string) => {
    const pin = pinProps(id);
    return { className: cn(extra, pin.className), style: pin.style, "data-pin": pin["data-pin"] };
  };

  let content: ReactNode;
  if (loading) {
    content = Array.from({ length: Math.min(table.pageSize ?? 5, 8) }, (_, i) => (
      <TableRow key={i} aria-hidden className="hover:bg-transparent">
        {selectable ? (
          <TableCell {...cellPin(SELECT_COL, "w-10 pe-0")}>
            <Skeleton className="size-4 rounded-[4px]" />
          </TableCell>
        ) : null}
        {expandable ? <TableCell {...cellPin(EXPAND_COL, "w-10 pe-0")} /> : null}
        {visibleColumns.map((c, j) => (
          <TableCell key={c.id} {...cellPin(c.id)}>
            <Skeleton className="h-3" style={{ inlineSize: `${[70, 48, 60, 40, 54][(i + j) % 5]}%` }} />
          </TableCell>
        ))}
        {rowActions ? <TableCell {...cellPin(ACTIONS_COL, "w-12")} /> : null}
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
      const open = expandable && (canExpand?.(row) ?? true) && table.expanded.has(id);
      const tr = (
        <TableRow
          data-row=""
          data-state={selected ? "selected" : undefined}
          data-expanded={open || undefined}
          aria-expanded={expandable && (canExpand?.(row) ?? true) ? open : undefined}
          tabIndex={tab}
          onFocus={(e) => e.target === e.currentTarget && setActive(index)}
          onKeyDown={(e) => onRowKeyDown(e, row, index)}
          onClick={onRowClick ? (e) => onRowMouse(e, row) : undefined}
          className={cn(
            "group/row outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
            onRowClick && "cursor-pointer",
            open && "border-b-0",
          )}
        >
          {selectable ? (
            <TableCell {...cellPin(SELECT_COL, "w-10 pe-0")}>
              <Checkbox
                tabIndex={tab}
                checked={selected}
                onCheckedChange={() => table.toggleRow(id)}
                aria-label={t.selectRow(nameOf(row))}
                className="align-middle"
              />
            </TableCell>
          ) : null}
          {expandable ? expanderCell(row, tab) : null}
          {visibleColumns.map((c) => {
            const pin = pinProps(c.id);
            if (!c.edit) {
              return (
                <TableCell
                  key={c.id}
                  data-pin={pin["data-pin"]}
                  style={pin.style}
                  className={cn(alignClass(c.align), table.resizable && "overflow-hidden text-ellipsis", c.className, pin.className)}
                >
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
                data-pin={pin["data-pin"]}
                style={pin.style}
                aria-busy={key in pending || undefined}
                aria-invalid={failed[key] ? true : undefined}
                tabIndex={editable && (c.edit.type ?? "text") !== "switch" ? -1 : undefined}
                onKeyDown={(e) => onCellKeyDown(e, row, c)}
                onDoubleClick={editable ? () => beginEdit(row, c) : undefined}
                className={cn(
                  "relative outline-none focus:outline-2 focus:-outline-offset-2 focus:outline-nq-focus",
                  editable && "cursor-cell",
                  alignClass(c.align),
                  c.className,
                  pin.className,
                  failed[key] && "bg-nq-danger-soft",
                )}
              >
                {renderEditCell(row, c, tab)}
              </TableCell>
            );
          })}
          {rowActions ? (
            <TableCell {...cellPin(ACTIONS_COL, "w-12 pe-2 text-end")}>
              <RowActions actions={actions} label={t.rowActions(nameOf(row))} tabIndex={tab} />
            </TableCell>
          ) : null}
        </TableRow>
      );
      return (
        <Fragment key={id}>
          <ContextMenuActions actions={actions} disabled={!contextMenu} keyboard={false} render={tr} renderIcon={(a) => <ActionIcon icon={a.icon} />} />
          {open ? (
            <TableRow data-slot="data-table-expanded" className="hover:bg-transparent">
              <TableCell colSpan={colSpan} className="h-auto p-0 whitespace-normal">
                <section id={`${uid}-x-${id}`} aria-label={t.details(nameOf(row))} className="border-s-2 border-nq-action/50 bg-secondary/40 px-4 py-3 ps-14">
                  {renderExpanded!(row)}
                </section>
              </TableCell>
            </TableRow>
          ) : null}
        </Fragment>
      );
    });
  }

  const headPin = (id: string, extra?: string) => {
    const pin = pinProps(id, true);
    return { "data-col": id, className: cn(extra, pin.className), style: pin.style, "data-pin": pin["data-pin"] };
  };

  const grid = (
    <Table
      label={label}
      aria-busy={loading || undefined}
      frame={frame}
      striped={striped}
      hover={hover}
      className={cn(table.resizable && "table-fixed", className)}
      style={tableStyle}
      {...props}
    >
      <TableHeader>
        <TableRow ref={headRow}>
          {selectable ? (
            <TableHead {...headPin(SELECT_COL, "w-10 pe-0")}>
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
          {expandable ? (
            <TableHead {...headPin(EXPAND_COL, "w-10 pe-0")}>
              <span className="sr-only">{t.details("")}</span>
            </TableHead>
          ) : null}
          {visibleColumns.map((c) => (
            <SortHead key={c.id} table={table} column={c} t={t} cell={headPin(c.id)} />
          ))}
          {rowActions ? (
            <TableHead {...headPin(ACTIONS_COL, "w-12")}>
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

interface HeadCell {
  "data-col": string;
  "data-pin"?: string;
  className?: string;
  style?: CSSProperties;
}

function SortHead<T>({ table, column, t, cell }: { table: DataTableInstance<T>; column: DataTableColumn<T>; t: DataTableLabels; cell: HeadCell }) {
  const index = table.sorting.findIndex((s) => s.id === column.id);
  const active = index >= 0 ? table.sorting[index]!.direction : null;
  const many = table.sorting.length > 1;
  const name = column.label ?? (typeof column.header === "string" ? column.header : column.id);
  const width = table.sizes[column.id];
  const canResize = table.resizable && column.resizable !== false;
  const cls = cn(alignClass(column.align), canResize && "relative", column.headerClassName, cell.className);
  const style = width ? { ...cell.style, width } : cell.style;
  const resizer = canResize ? <ResizeHandle table={table} column={column} label={t.resize(name)} /> : null;
  if (!column.sortValue) {
    return (
      <TableHead data-col={cell["data-col"]} data-pin={cell["data-pin"]} className={cls} style={style}>
        {column.header}
        {resizer}
      </TableHead>
    );
  }
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ChevronsUpDown;
  // aria-sort belongs on the primary key only; later keys say their place in words.
  const ariaSort = index === 0 ? (active === "asc" ? "ascending" : "descending") : index > 0 ? undefined : "none";
  return (
    <TableHead data-col={cell["data-col"]} data-pin={cell["data-pin"]} className={cls} style={style} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={(e) => table.toggleSort(column.id, e.shiftKey)}
        title={table.multiSort ? t.multiSortHint : undefined}
        className={cn(
          "-mx-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq",
          "hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus",
          active && "text-foreground",
          column.align === "end" && "flex-row-reverse",
        )}
      >
        <span className={cn(table.resizable && "truncate")}>{column.header}</span>
        <Icon aria-hidden className={cn("size-3.5 shrink-0", !active && "opacity-40")} />
        {many && index >= 0 ? (
          <span aria-hidden data-slot="data-table-sort-index" className="text-[10px] leading-none tabular-nums text-muted-foreground">
            {index + 1}
          </span>
        ) : null}
        {many && index > 0 ? <span className="sr-only">{t.sortPriority(String(index + 1), active === "asc" ? t.ascending : t.descending)}</span> : null}
      </button>
      {resizer}
    </TableHead>
  );
}

/** The drag edge of a header: a focusable separator. Arrows resize by 16px (Shift: 64), double-click resets. */
function ResizeHandle<T>({ table, column, label }: { table: DataTableInstance<T>; column: DataTableColumn<T>; label: string }) {
  const drag = useRef<{ x: number; w: number; dir: number } | null>(null);
  const width = table.sizes[column.id];
  const measure = (el: HTMLElement) => {
    const th = el.closest("th")!;
    return { w: th.getBoundingClientRect().width, dir: getComputedStyle(th).direction === "rtl" ? -1 : 1 };
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable separator is the window-splitter pattern; <hr> can't take focus
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width ? Math.round(width) : undefined}
      aria-valuemin={column.minSize ?? 48}
      aria-valuemax={column.maxSize ?? 960}
      tabIndex={0}
      data-slot="data-table-resize-handle"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        const { w, dir } = measure(e.currentTarget);
        drag.current = { x: e.clientX, w, dir };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d) table.setColumnSize(column.id, d.w + (e.clientX - d.x) * d.dir);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={() => table.setColumnSize(column.id, null)}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const { w, dir } = measure(e.currentTarget);
        const grow = (e.key === "ArrowRight" ? 1 : -1) * dir;
        table.setColumnSize(column.id, (width ?? w) + grow * (e.shiftKey ? 64 : 16));
      }}
      className={cn(
        "absolute inset-y-0 end-0 z-[2] w-2 cursor-col-resize touch-none outline-none",
        "after:absolute after:inset-y-2 after:end-0 after:w-px after:bg-border after:transition-colors after:duration-150",
        "hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-nq-focus",
      )}
    />
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

export interface DataTableViewOptionsProps<T> {
  table: DataTableInstance<T>;
  className?: string;
  /** Adds a Density choice. Pass the same value to `<DataTable density>`. */
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  /** Adds Pin to start / end / Unpin for each column. Default false. */
  pinning?: boolean;
}

/** Column visibility: a "View" menu listing every hideable column, plus optional density and pinning. */
export function DataTableViewOptions<T>({ table, className, density, onDensityChange, pinning = false }: DataTableViewOptionsProps<T>) {
  const { t } = useLocale();
  const hideable = table.columns.filter((c) => c.hideable !== false);
  const withDensity = !!(density && onDensityChange);
  if (!hideable.length && !withDensity && !pinning) return null;
  const nameOf = (c: DataTableColumn<T>) => c.label ?? c.header;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" className={cn("ms-auto", className)} />}>
        <Settings2 aria-hidden />
        {t.view}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {hideable.length ? (
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
                {nameOf(c)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        ) : null}
        {pinning ? (
          <>
            {hideable.length ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t.pin}</DropdownMenuLabel>
              {table.visibleColumns.map((c) => (
                <DropdownMenuSub key={c.id}>
                  <DropdownMenuSubTrigger>
                    <span className="min-w-0 flex-1 truncate">{nameOf(c)}</span>
                    {table.pinOf(c.id) ? (
                      <span className="text-caption text-muted-foreground">{table.pinOf(c.id) === "start" ? t.pinStart : t.pinEnd}</span>
                    ) : null}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-40">
                    <DropdownMenuRadioGroup
                      value={table.pinOf(c.id) ?? "none"}
                      onValueChange={(v) => table.pinColumn(c.id, v === "none" ? null : (v as "start" | "end"))}
                    >
                      <DropdownMenuRadioItem value="start">{t.pinStart}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="end">{t.pinEnd}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="none">{t.unpin}</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
        {withDensity ? (
          <>
            {hideable.length || pinning ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t.density}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={density} onValueChange={(v) => onDensityChange!(v as TableDensity)}>
                {(["compact", "default", "comfortable"] as const).map((d) => (
                  <DropdownMenuRadioItem key={d} value={d} closeOnClick={false}>
                    {t.densities[d]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface DataTableRangeFilterProps<T> {
  table: DataTableInstance<T>;
  /** A column with a `rangeValue`. */
  column: string;
  /** Button label. Defaults to the column's label. */
  title?: string;
  /** `"date"` uses date inputs and `YYYY-MM-DD` bounds. Default `"number"`. */
  kind?: "number" | "date";
  /** Limits and step for the inputs. */
  min?: number | string;
  max?: number | string;
  step?: number;
  /** How a bound reads on the button. Default: the locale's number or date format. */
  format?: (value: number | string) => string;
}

/** A from–to filter on one column ("Amount: 100–500", "Due: ≥ 1 Mar"). Both ends are inclusive and optional. */
export function DataTableRangeFilter<T>({ table, column, title, kind = "number", min, max, step, format }: DataTableRangeFilterProps<T>) {
  const { locale, t } = useLocale();
  const uid = useId();
  const col = table.columns.find((c) => c.id === column);
  const name = title ?? col?.label ?? (typeof col?.header === "string" ? col.header : column);
  const range = table.ranges[column] ?? {};
  const active = isActiveRange(range);
  const show = (v: number | string) =>
    format ? format(v) : kind === "date" ? formatDate(`${String(v)}T00:00:00`, locale) : formatNumber(Number(v), locale);
  const has = (v: unknown): v is number | string => v !== undefined && v !== null && v !== "";
  const summary = !active
    ? null
    : has(range.min) && has(range.max)
      ? `${show(range.min)}–${show(range.max)}`
      : has(range.min)
        ? t.rangeAtLeast(show(range.min))
        : has(range.max)
          ? t.rangeAtMost(show(range.max))
          : null;
  const set = (edge: "min" | "max", raw: string) => {
    const value = raw === "" ? null : kind === "number" ? Number(raw) : raw;
    table.setRange(column, { ...range, [edge]: value });
  };
  const input = (edge: "min" | "max") => {
    const v = range[edge];
    return (
      <div className="grid gap-1">
        <label htmlFor={`${uid}-${edge}`} className="text-caption text-muted-foreground">
          {edge === "min" ? t.rangeFrom : t.rangeTo}
        </label>
        <Input
          id={`${uid}-${edge}`}
          type={kind}
          inputMode={kind === "number" ? "decimal" : undefined}
          min={min}
          max={max}
          step={step}
          value={has(v) ? String(v) : ""}
          onChange={(e) => set(edge, e.currentTarget.value)}
          className="h-control-sm text-body-sm tabular-nums"
        />
      </div>
    );
  };
  return (
    <Popover>
      <PopoverTrigger render={<Button size="sm" data-slot="data-table-range-filter" className={cn(!active && "border-dashed text-muted-foreground")} />}>
        <SlidersHorizontal aria-hidden />
        {name}
        {summary ? (
          <Badge variant="outline" className="-me-1 tabular-nums">
            {summary}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-label text-foreground">{name}</legend>
          <div className="grid grid-cols-2 gap-2">
            {input("min")}
            {input("max")}
          </div>
          {active ? (
            <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => table.setRange(column, null)}>
              {t.reset}
            </Button>
          ) : null}
        </fieldset>
      </PopoverContent>
    </Popover>
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

export interface DataTablePaginationProps<T> extends ComponentProps<"nav"> {
  table: DataTableInstance<T>;
  /** Adds a rows-per-page choice, e.g. `[10, 25, 50]`. */
  pageSizeOptions?: readonly number[];
}

/**
 * "1–10 of 42" and previous / next, plus a rows-per-page choice with `pageSizeOptions`. Renders nothing when
 * everything fits on the smallest page.
 */
export function DataTablePagination<T>({ table, pageSizeOptions, className, ...props }: DataTablePaginationProps<T>) {
  const { locale, t } = useLocale();
  const uid = useId();
  const smallest = pageSizeOptions?.length ? Math.min(...pageSizeOptions) : undefined;
  if (!table.pageSize) return null;
  if (smallest !== undefined ? table.rowCount <= smallest : table.pageCount <= 1) return null;
  const from = table.rowCount ? table.page * table.pageSize + 1 : 0;
  const to = Math.min(table.rowCount, table.page * table.pageSize + table.pageSize);
  const n = (v: number) => formatNumber(v, locale);
  return (
    <nav data-slot="data-table-pagination" aria-label={t.pagination} className={cn("flex flex-wrap items-center justify-end gap-2", className)} {...props}>
      {pageSizeOptions?.length ? (
        <span className="me-auto inline-flex items-center gap-2 sm:me-2">
          <label htmlFor={`${uid}-size`} className="text-caption text-muted-foreground">
            {t.rowsPerPage}
          </label>
          <NativeSelect
            id={`${uid}-size`}
            size="sm"
            value={String(table.pageSize)}
            onChange={(e) => table.setPageSize(Number(e.currentTarget.value))}
            options={pageSizeOptions.map((o) => ({ value: String(o), label: n(o) }))}
            className="w-auto"
          />
        </span>
      ) : null}
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

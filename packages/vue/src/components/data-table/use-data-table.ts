import { computed, proxyRefs, ref, toValue, type Component, type MaybeRefOrGetter, type VNodeChild } from "vue";
import { useNasaq } from "../../provider";
import { normalizeForSearch } from "../commands";
import type { CellEditKind, CellValue } from "./cell-edit-logic";
import {
  clampColumnSize,
  inRange,
  isActiveRange,
  nextSorting,
  orderByPinning,
  pinColumnIn,
  sortTableRows,
  type DataTablePinning,
  type DataTableRange,
  type DataTableSort,
} from "./data-table-logic";

/* ------------------------------------------------------------------ types */

export interface DataTableEditOption {
  value: string;
  label: string;
  /** A badge hue from the Nasaq tag palette: gray, red, orange, amber, green, teal, blue, violet, pink. */
  hue?: string;
}
export type DataTableCellValue = CellValue;
export type CellEditMove = "down" | "right" | "left" | "none";

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
  options?: DataTableEditOption[];
  /** A message keeps the editor open and shows it. Runs before `onCellEdit`. */
  validate?: (value: CellValue, row: T) => string | null | undefined;
  /** Rows that can't be edited in this column. */
  disabled?: (row: T) => boolean;
  /** Accessible name of the editor, without the row: "Amount". Defaults to the column label or header. */
  label?: string;
  /** The editor for `type: "custom"`. Returns a vnode (use `h`). */
  render?: (context: DataTableCustomEditContext<T>) => VNodeChild;
}

/** What `onCellEdit` may resolve with. `{ error }` rolls the cell back and shows the message. */
export type DataTableCellEditResult = void | undefined | { error?: string };

export interface DataTableColumn<T> {
  id: string;
  /** A string, or a function returning vnodes. */
  header: string | (() => VNodeChild);
  /** Plain-text name for the View menu, filters and screen readers, when `header` isn't a string. */
  label?: string;
  /** Returns text or vnodes (use `h`). */
  cell: (row: T) => VNodeChild;
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
  minSize?: number;
  maxSize?: number;
  /** Set false to keep this column a fixed width in a `resizable` table. */
  resizable?: boolean;
  align?: "start" | "end" | "center";
  /** Listed in the View menu. Default true. */
  hideable?: boolean;
  defaultHidden?: boolean;
  className?: string;
  headerClassName?: string;
  /** Makes the cells of this column editable in place (needs `onCellEdit` on the table). */
  edit?: DataTableCellEdit<T>;
}

export interface DataTableRowAction {
  id: string;
  label: string;
  /** A lucide-vue-next icon component. */
  icon?: Component;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Separator between groups, in first-seen order. */
  group?: string;
}

/** A value plus its setter; pass both to control that piece of state (server-side tables), or neither. `value` may be a ref or getter. */
export type Controlled<V> = { value?: MaybeRefOrGetter<V | undefined>; onChange?: (value: V) => void };

export interface UseDataTableOptions<T> {
  /** The rows. A ref or getter keeps the table in step with your data. */
  data: MaybeRefOrGetter<T[]>;
  columns: MaybeRefOrGetter<DataTableColumn<T>[]>;
  getRowId: (row: T) => string;
  pageSize?: number;
  selectable?: boolean;
  defaultSort?: DataTableSort | null;
  sort?: Controlled<DataTableSort | null>;
  multiSort?: boolean;
  defaultSorting?: DataTableSort[];
  sorting?: Controlled<DataTableSort[]>;
  query?: Controlled<string>;
  filters?: Controlled<Record<string, string[]>>;
  ranges?: Controlled<Record<string, DataTableRange>>;
  page?: Controlled<number>;
  perPage?: Controlled<number>;
  selection?: Controlled<ReadonlySet<string>>;
  hidden?: Controlled<ReadonlySet<string>>;
  expanded?: Controlled<ReadonlySet<string>>;
  pinning?: Controlled<DataTablePinning>;
  resizable?: boolean;
  sizes?: Controlled<Record<string, number>>;
  /** The server already sorted, filtered and paginated `data`. Pass `rowCount` for the total. */
  manual?: boolean;
  rowCount?: number;
}

export interface DataTableInstance<T> {
  columns: DataTableColumn<T>[];
  visibleColumns: DataTableColumn<T>[];
  rows: T[];
  rowCount: number;
  totalCount: number;
  getRowId: (row: T) => string;
  sort: DataTableSort | null;
  setSort: (sort: DataTableSort | null) => void;
  sorting: DataTableSort[];
  setSorting: (sorting: DataTableSort[]) => void;
  multiSort: boolean;
  toggleSort: (columnId: string, additive?: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  filters: Record<string, string[]>;
  setFilter: (columnId: string, values: string[]) => void;
  ranges: Record<string, DataTableRange>;
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
  pinColumn: (columnId: string, side: "start" | "end" | null) => void;
  pinOf: (columnId: string) => "start" | "end" | null;
  resizable: boolean;
  sizes: Record<string, number>;
  setColumnSize: (columnId: string, width: number | null) => void;
  selectable: boolean;
  selection: ReadonlySet<string>;
  setSelection: (ids: ReadonlySet<string>) => void;
  selectedRows: T[];
  toggleRow: (id: string) => void;
  togglePage: () => void;
  pageSelection: "all" | "some" | "none";
}

/** Plain text of a column's name, for menus and accessible names. */
export function columnName<T>(c: { id: string; label?: string; header: DataTableColumn<T>["header"] } | undefined, fallback = ""): string {
  if (!c) return fallback;
  return c.label ?? (typeof c.header === "string" ? c.header : c.id);
}

/* ------------------------------------------------------------------ state */

function useControllable<V>(controlled: Controlled<V> | undefined, initial: V) {
  const own = ref(initial) as { value: V };
  const value = computed<V>(() => {
    const c = controlled?.value === undefined ? undefined : toValue(controlled.value);
    return c !== undefined ? c : own.value;
  });
  const set = (v: V) => {
    const c = controlled?.value === undefined ? undefined : toValue(controlled.value);
    if (c === undefined) own.value = v;
    controlled?.onChange?.(v);
  };
  return [value, set] as const;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Headless state for a DataTable: sorting, search, facet filters, pagination, column visibility and selection,
 * each optional. Client-side by default; `manual` hands sorting/filtering/paging to the server.
 */
export function useDataTable<T>(options: UseDataTableOptions<T>): DataTableInstance<T> {
  const { getRowId, selectable = false, manual = false, multiSort = false, resizable = false } = options;
  const nq = useNasaq();
  const data = computed(() => toValue(options.data));
  const columns = computed(() => toValue(options.columns));

  const legacySort = options.sort;
  const sortingControl: Controlled<DataTableSort[]> | undefined =
    options.sorting ??
    (legacySort
      ? {
          value: () => {
            const v = legacySort.value === undefined ? undefined : toValue(legacySort.value);
            return v === undefined ? undefined : v ? [v] : [];
          },
          onChange: legacySort.onChange && ((s) => legacySort.onChange!(s[0] ?? null)),
        }
      : undefined);
  const [sorting, setSortingState] = useControllable(sortingControl, options.defaultSorting ?? (options.defaultSort ? [options.defaultSort] : []));
  const [query, setQueryState] = useControllable(options.query, "");
  const [filters, setFiltersState] = useControllable<Record<string, string[]>>(options.filters, {});
  const [ranges, setRangesState] = useControllable<Record<string, DataTableRange>>(options.ranges, {});
  const [page, setPageState] = useControllable(options.page, 0);
  const [perPage, setPerPage] = useControllable<number | undefined>(options.perPage as Controlled<number | undefined> | undefined, options.pageSize);
  const [selection, setSelection] = useControllable<ReadonlySet<string>>(options.selection, EMPTY_SET);
  const [hidden, setHidden] = useControllable<ReadonlySet<string>>(options.hidden, new Set(columns.value.filter((c) => c.defaultHidden).map((c) => c.id)));
  const [expanded, setExpanded] = useControllable<ReadonlySet<string>>(options.expanded, EMPTY_SET);
  const [pinning, setPinning] = useControllable<DataTablePinning>(options.pinning, {
    start: columns.value.filter((c) => c.pin === "start").map((c) => c.id),
    end: columns.value.filter((c) => c.pin === "end").map((c) => c.id),
  });
  const [sizes, setSizes] = useControllable<Record<string, number>>(options.sizes, Object.fromEntries(columns.value.filter((c) => c.size).map((c) => [c.id, c.size!])));

  // Changing what is shown always returns to the first page.
  const setSorting = (s: DataTableSort[]) => (setSortingState(s), setPageState(0));
  const setSort = (s: DataTableSort | null) => setSorting(s ? [s] : []);
  const setQuery = (q: string) => (setQueryState(q), setPageState(0));
  const setFilter = (id: string, values: string[]) => {
    const next = { ...filters.value };
    if (values.length) next[id] = values;
    else delete next[id];
    setFiltersState(next);
    setPageState(0);
  };
  const setRange = (id: string, range: DataTableRange | null) => {
    const next = { ...ranges.value };
    if (isActiveRange(range)) next[id] = range!;
    else delete next[id];
    setRangesState(next);
    setPageState(0);
  };

  const filtered = computed(() => {
    if (manual) return data.value;
    const cols = columns.value;
    const q = normalizeForSearch(query.value);
    const searchable = cols.filter((c) => c.searchValue);
    const facets = Object.entries(filters.value)
      .map(([id, values]) => [cols.find((c) => c.id === id)?.filterValue, new Set(values)] as const)
      .filter(([fn]) => fn);
    const bounded = Object.entries(ranges.value)
      .map(([id, range]) => [cols.find((c) => c.id === id)?.rangeValue, range] as const)
      .filter(([fn, range]) => fn && isActiveRange(range));
    return data.value.filter(
      (row) =>
        (!q || searchable.some((c) => normalizeForSearch(c.searchValue!(row)).includes(q))) &&
        facets.every(([fn, values]) => values.has(fn!(row))) &&
        bounded.every(([fn, range]) => inRange(fn!(row), range)),
    );
  });
  const sorted = computed(() => (manual ? filtered.value : sortTableRows(filtered.value, sorting.value, (id) => columns.value.find((c) => c.id === id)?.sortValue, nq.locale.value)));
  const rowCount = computed(() => (manual ? (options.rowCount ?? data.value.length) : sorted.value.length));
  const pageSize = computed(() => perPage.value);
  const pageCount = computed(() => (pageSize.value ? Math.max(1, Math.ceil(rowCount.value / pageSize.value)) : 1));
  const safePage = computed(() => Math.min(page.value, pageCount.value - 1));
  const rows = computed(() => {
    const size = pageSize.value;
    return manual || !size ? sorted.value : sorted.value.slice(safePage.value * size, safePage.value * size + size);
  });
  const pageIds = computed(() => rows.value.map(getRowId));
  const selectedOnPage = computed(() => pageIds.value.filter((id) => selection.value.has(id)).length);
  const visibleColumns = computed(() => {
    const byId = new Map(columns.value.map((c) => [c.id, c]));
    return orderByPinning(
      columns.value.filter((c) => !hidden.value.has(c.id)).map((c) => c.id),
      pinning.value,
    ).map((id) => byId.get(id)!);
  });
  const pinOf = (id: string): "start" | "end" | null => (pinning.value.start?.includes(id) ? "start" : pinning.value.end?.includes(id) ? "end" : null);
  const toggled = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    return next;
  };

  // proxyRefs unwraps the computed values, so `table.rows` reads like the React instance and stays reactive.
  return proxyRefs({
    columns,
    visibleColumns,
    rows,
    rowCount,
    totalCount: computed(() => (manual ? rowCount.value : data.value.length)),
    getRowId,
    sort: computed(() => sorting.value[0] ?? null),
    setSort,
    sorting,
    setSorting,
    multiSort,
    toggleSort: (id: string, additive = false) => setSorting(nextSorting(sorting.value, id, additive && multiSort)),
    query,
    setQuery,
    filters,
    setFilter,
    ranges,
    setRange,
    resetFilters: () => (setFiltersState({}), setRangesState({}), setQueryState(""), setPageState(0)),
    isFiltered: computed(() => !!query.value || Object.keys(filters.value).length > 0 || Object.values(ranges.value).some(isActiveRange)),
    page: safePage,
    pageSize,
    setPageSize: (size: number) => (setPerPage(size), setPageState(0)),
    pageCount,
    setPage: (p: number) => setPageState(Math.max(0, Math.min(pageCount.value - 1, p))),
    hidden,
    toggleColumn: (id: string) => setHidden(toggled(hidden.value, id)),
    expanded,
    setExpanded,
    toggleExpanded: (id: string) => setExpanded(toggled(expanded.value, id)),
    pinning,
    pinColumn: (id: string, side: "start" | "end" | null) => setPinning(pinColumnIn(pinning.value, id, side)),
    pinOf,
    resizable,
    sizes,
    setColumnSize: (id: string, width: number | null) => {
      const next = { ...sizes.value };
      const column = columns.value.find((c) => c.id === id);
      if (width === null) delete next[id];
      else next[id] = clampColumnSize(width, column?.minSize, column?.maxSize);
      setSizes(next);
    },
    selectable,
    selection,
    setSelection,
    selectedRows: computed(() => data.value.filter((row) => selection.value.has(getRowId(row)))),
    toggleRow: (id: string) => setSelection(toggled(selection.value, id)),
    togglePage: () => {
      const next = new Set(selection.value);
      if (selectedOnPage.value === pageIds.value.length) pageIds.value.forEach((id) => next.delete(id));
      else pageIds.value.forEach((id) => next.add(id));
      setSelection(next);
    },
    pageSelection: computed(() => (selectedOnPage.value === 0 ? "none" : selectedOnPage.value === pageIds.value.length ? "all" : "some")),
  }) as unknown as DataTableInstance<T>;
}

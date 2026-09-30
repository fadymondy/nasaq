"use client";

import { ArrowDownUp, Check, Ellipsis, LayoutGrid, List, ListFilter, type LucideIcon, Search, X } from "lucide-react";
import { type CSSProperties, isValidElement, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { normalizeForSearch } from "../commands";
import { ContextMenuActions, groupActions, openContextMenuAt } from "../context-menu";
import {
  DataTable,
  type DataTableAction,
  DataTableActions,
  DataTableBulkActions,
  type DataTableCellEditResult,
  type DataTableCellValue,
  type DataTableColumn,
  type DataTableFacetOption,
  type DataTableInstance,
  type DataTableLabels,
  DataTablePagination,
  type DataTableRowAction,
  DataTableSearch,
  DataTableToolbar,
  DataTableViewOptions,
  type UseDataTableOptions,
  useDataTable,
} from "../data-table";
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
import { formatNumber } from "../numeric";
import { EmptyState, ErrorState, Skeleton } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    viewTable: "Table view",
    viewCards: "Card view",
    viewSwitch: "Layout",
    sort: "Sort",
    sortBy: "Sort by",
    clearAll: "Clear filters",
    results: (n: string) => `${n} results`,
    resultsOne: "1 result",
    selectRowCard: (name: string) => `Select ${name}`,
    loadingList: "Loading the list",
    facetReset: "Reset",
  },
  ar: {
    viewTable: "عرض جدول",
    viewCards: "عرض بطاقات",
    viewSwitch: "التخطيط",
    sort: "الترتيب",
    sortBy: "ترتيب حسب",
    clearAll: "مسح التصفية",
    results: (n: string) => `${n} نتيجة`,
    resultsOne: "نتيجة واحدة",
    selectRowCard: (name: string) => `تحديد ${name}`,
    loadingList: "جارٍ تحميل القائمة",
    facetReset: "إعادة الضبط",
  },
};
export type EntityListLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export type EntityListView = "table" | "cards";

/** A multi-select filter whose value can be several per row (tags, members). */
export interface EntityFacet<T> {
  id: string;
  /** Button label, e.g. "Tags". Localise it. */
  title: string;
  options: DataTableFacetOption[];
  /** Every value this row has for the facet. The row matches when it has any of the chosen values. */
  getValues: (row: T) => string[];
}

/** What the toolbar slot and the bulk actions receive. */
export interface EntityListContext<T> {
  table: DataTableInstance<T>;
  view: EntityListView;
  /** Every row passed as `data`. */
  allRows: T[];
  /** Rows that match the search and the filters, before paging. */
  filteredRows: T[];
  /** The selected rows. */
  selectedRows: T[];
  clearSelection: () => void;
}

export interface EntityListProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** The list's accessible name. Localise it. */
  label: string;
  /** The content of one card. The checkbox and the row menu are added at the inline end. */
  renderCard: (row: T) => ReactNode;
  /** Multi-value filters shown next to the search. */
  facets?: EntityFacet<T>[];
  /** `"table"` or `"cards"`. Controlled when set. */
  view?: EntityListView;
  defaultView?: EntityListView;
  onViewChange?: (view: EntityListView) => void;
  /** Which layouts to offer. One entry hides the toggle. Default both. */
  views?: EntityListView[];
  pageSize?: number;
  /** Checkboxes and the bulk bar. Default true. */
  selectable?: boolean;
  selection?: UseDataTableOptions<T>["selection"];
  searchPlaceholder?: string;
  /**
   * Table-level actions (create, import, export, refresh) at the inline end of the toolbar: one primary button plus a
   * ⋯ menu on narrow widths. See DataTableActions.
   */
  actions?: DataTableAction[];
  /** Buttons at the inline end of the toolbar (export, add). Receives the current state. */
  toolbar?: ReactNode | ((context: EntityListContext<T>) => ReactNode);
  /** Buttons shown in the bulk bar while rows are selected. */
  bulkActions?: (context: EntityListContext<T>) => ReactNode;
  /** The ⋯ menu of a row or card. It also opens as a context menu: context-click, long-press, Shift+F10 or the Menu key. */
  rowActions?: (row: T) => DataTableRowAction[];
  /** Open `rowActions` as a context menu on context-click (table rows and cards). Default true. */
  contextMenu?: boolean;
  /** Saves an in-cell edit in the table view (columns with `edit`). See DataTable. */
  onCellEdit?: (row: T, columnId: string, value: DataTableCellValue) => DataTableCellEditResult | Promise<DataTableCellEditResult>;
  onRowClick?: (row: T) => void;
  /** Plain-text row name for "Select …" labels. Defaults to the id. */
  rowLabel?: (row: T) => string;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  /** Shown when there is no data at all (not when filters hide everything). */
  empty?: ReactNode;
  /** Minimum card width in px. Default 272. */
  cardMinWidth?: number;
  defaultSort?: UseDataTableOptions<T>["defaultSort"];
  labels?: Partial<EntityListLabels> & Partial<DataTableLabels>;
  className?: string;
}

/* ------------------------------------------------------------------ helpers */

const EMPTY_SET: ReadonlySet<string> = new Set();

function Glyph({ icon }: { icon: LucideIcon | ReactElement | undefined }) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon as LucideIcon;
  return <Icon aria-hidden />;
}

function FacetMenu<T>({
  facet,
  chosen,
  onChange,
  resetLabel,
  locale,
}: {
  facet: EntityFacet<T>;
  chosen: string[];
  onChange: (values: string[]) => void;
  resetLabel: string;
  locale: string;
}) {
  const set = new Set(chosen);
  const toggle = (value: string) => {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    onChange(facet.options.map((o) => o.value).filter((v) => next.has(v)));
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" data-facet={facet.id} className={cn(!set.size && "border-dashed text-muted-foreground")} />}>
        <ListFilter aria-hidden />
        {facet.title}
        {set.size ? (
          <Badge variant="outline" className="-me-1 tabular-nums">
            {set.size === 1 ? facet.options.find((o) => set.has(o.value))?.label : formatNumber(set.size, locale)}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 min-w-48 overflow-y-auto">
        <DropdownMenuGroup>
          {facet.options.map((o) => (
            <DropdownMenuCheckboxItem key={o.value} checked={set.has(o.value)} onCheckedChange={() => toggle(o.value)} closeOnClick={false}>
              <Glyph icon={o.icon} />
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {set.size ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange([])}>{resetLabel}</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortMenu<T>({ table, label, byLabel }: { table: DataTableInstance<T>; label: string; byLabel: string }) {
  const sortable = table.columns.filter((c) => c.sortValue);
  if (!sortable.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="sm" />}>
        <ArrowDownUp aria-hidden />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{byLabel}</DropdownMenuLabel>
          {sortable.map((c) => {
            const active = table.sort?.id === c.id ? table.sort.direction : null;
            return (
              <DropdownMenuItem key={c.id} closeOnClick={false} onClick={() => table.toggleSort(c.id)}>
                <span className="inline-flex size-4 items-center justify-center">{active ? <Check aria-hidden /> : null}</span>
                <span className="flex-1">{c.label ?? c.header}</span>
                {active ? (
                  <span aria-hidden className="text-muted-foreground">
                    {active === "asc" ? "↑" : "↓"}
                  </span>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CardMenu({ actions, label, tabIndex }: { actions: DataTableRowAction[]; label: string; tabIndex: number }) {
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} tabIndex={tabIndex} data-slot="entity-card-actions" className="text-muted-foreground" />}
      >
        <Ellipsis aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {groupActions(actions).map((items, i) => (
          <DropdownMenuGroup key={i}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            {items.map((a) => (
              <DropdownMenuItem key={a.id} variant={a.danger ? "danger" : "default"} disabled={a.disabled} onClick={a.onSelect}>
                <Glyph icon={a.icon} />
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const INTERACTIVE = "a,button,input,select,textarea,[role=checkbox],[role=menuitem],[contenteditable=true]";

/* ------------------------------------------------------------------ component */

/**
 * A list of records that can be a table or a grid of cards. It is a DataTable underneath (the same search,
 * sorting, paging and selection), plus multi-value filters, a layout toggle, a card grid with the same keyboard
 * model as table rows, bulk actions, and skeleton, empty and error states for both layouts.
 */
export function EntityList<T>({
  data,
  columns,
  getRowId,
  label,
  renderCard,
  facets = [],
  view: viewProp,
  defaultView = "table",
  onViewChange,
  views = ["table", "cards"],
  pageSize,
  selectable = true,
  selection,
  searchPlaceholder,
  actions,
  toolbar,
  bulkActions,
  rowActions,
  contextMenu = true,
  onCellEdit,
  onRowClick,
  rowLabel,
  loading = false,
  error,
  onRetry,
  empty,
  cardMinWidth = 272,
  defaultSort,
  labels,
  className,
}: EntityListProps<T>) {
  const nq = useOptionalNasaq();
  const locale = nq?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const dt = useDataTableStrings(locale);
  const t = { ...dt, ...base, ...labels };
  const n = (v: number) => formatNumber(v, locale);

  const [ownView, setOwnView] = useState<EntityListView>(views.includes(defaultView) ? defaultView : (views[0] ?? "table"));
  const view = viewProp ?? ownView;
  const setView = (next: EntityListView) => {
    if (viewProp === undefined) setOwnView(next);
    onViewChange?.(next);
  };

  // Facets can match several values per row, so they filter the data before the table sees it.
  const [facetState, setFacetState] = useState<Record<string, string[]>>({});
  const facetActive = facets.some((f) => (facetState[f.id]?.length ?? 0) > 0);
  const facetFiltered = useMemo(() => {
    const active = facets.filter((f) => facetState[f.id]?.length);
    if (!active.length) return data;
    return data.filter((row) =>
      active.every((f) => {
        const wanted = new Set(facetState[f.id]);
        return f.getValues(row).some((v) => wanted.has(v));
      }),
    );
  }, [data, facets, facetState]);

  const table = useDataTable({
    data: facetFiltered,
    columns,
    getRowId,
    pageSize,
    selectable,
    defaultSort,
    selection,
  });

  const query = normalizeForSearch(table.query);
  const filteredRows = useMemo(() => {
    if (!query) return facetFiltered;
    const searchable = columns.filter((c) => c.searchValue);
    return facetFiltered.filter((row) => searchable.some((c) => normalizeForSearch(c.searchValue!(row)).includes(query)));
  }, [facetFiltered, columns, query]);

  const selectedRows = useMemo(() => data.filter((row) => table.selection.has(getRowId(row))), [data, table.selection, getRowId]);
  const context: EntityListContext<T> = {
    table,
    view,
    allRows: data,
    filteredRows,
    selectedRows,
    clearSelection: () => table.setSelection(EMPTY_SET),
  };

  const clearAll = () => {
    setFacetState({});
    table.resetFilters();
  };
  const showClear = facetActive || table.isFiltered;
  const noResults = (
    <EmptyState
      icon={Search}
      title={t.noResults}
      description={t.noResultsHint}
      className="border-0"
      actions={
        <Button size="sm" onClick={clearAll}>
          {t.clearFilters}
        </Button>
      }
    />
  );

  return (
    <div data-slot="entity-list" data-view={view} className={cn("flex flex-col gap-3", className)}>
      <DataTableToolbar>
        {view === "cards" && selectable && !loading ? (
          <Checkbox
            checked={table.pageSelection === "all"}
            indeterminate={table.pageSelection === "some"}
            disabled={!table.rows.length}
            onCheckedChange={table.togglePage}
            aria-label={t.selectAll}
            className="me-1"
          />
        ) : null}
        <DataTableSearch table={table} placeholder={searchPlaceholder} />
        {facets.map((facet) => (
          <FacetMenu
            key={facet.id}
            facet={facet}
            chosen={facetState[facet.id] ?? []}
            onChange={(values) => {
              setFacetState((s) => ({ ...s, [facet.id]: values }));
              table.setPage(0);
            }}
            resetLabel={t.facetReset}
            locale={locale}
          />
        ))}
        {showClear ? (
          <Button size="sm" variant="ghost" onClick={clearAll}>
            <X aria-hidden />
            {t.clearAll}
          </Button>
        ) : null}
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {actions?.length ? <DataTableActions actions={actions} /> : null}
          {typeof toolbar === "function" ? toolbar(context) : toolbar}
          {view === "table" ? <DataTableViewOptions table={table} className="ms-0" /> : <SortMenu table={table} label={t.sort} byLabel={t.sortBy} />}
          {views.length > 1 ? (
            <ToggleGroup
              aria-label={t.viewSwitch}
              value={[view]}
              onValueChange={(v) => {
                const next = v[0] as EntityListView | undefined;
                if (next) setView(next);
              }}
            >
              <Toggle value="table" aria-label={t.viewTable}>
                <List aria-hidden />
              </Toggle>
              <Toggle value="cards" aria-label={t.viewCards}>
                <LayoutGrid aria-hidden />
              </Toggle>
            </ToggleGroup>
          ) : null}
        </div>
      </DataTableToolbar>

      {selectable && bulkActions ? <DataTableBulkActions table={table}>{bulkActions(context)}</DataTableBulkActions> : null}

      <span role="status" aria-live="polite" className="sr-only">
        {loading ? t.loadingList : filteredRows.length === 1 ? t.resultsOne : t.results(n(filteredRows.length))}
      </span>

      {view === "table" ? (
        <DataTable
          table={table}
          label={label}
          rowLabel={rowLabel}
          onRowClick={onRowClick}
          rowActions={rowActions}
          contextMenu={contextMenu}
          onCellEdit={onCellEdit}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={facetActive ? noResults : empty}
          labels={labels}
        />
      ) : (
        <CardGrid
          table={table}
          label={label}
          renderCard={renderCard}
          rowLabel={rowLabel}
          onRowClick={onRowClick}
          rowActions={rowActions}
          contextMenu={contextMenu}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={table.isFiltered || facetActive ? noResults : (empty ?? <EmptyState title={t.empty} className="border-0" />)}
          minWidth={cardMinWidth}
          t={t}
        />
      )}
      <DataTablePagination table={table} />
    </div>
  );
}

/** DataTable keeps its strings private, so the few the list shows itself are repeated here. */
function useDataTableStrings(locale: string) {
  const ar = locale.startsWith("ar");
  return ar
    ? {
        selectAll: "تحديد كل صفوف هذه الصفحة",
        rowActions: (name: string) => `إجراءات ${name}`,
        noResults: "لا نتائج مطابقة",
        noResultsHint: "جرّب بحثًا آخر أو امسح عوامل التصفية.",
        clearFilters: "مسح التصفية",
        empty: "لا شيء هنا بعد",
        error: "تعذّر تحميل هذه القائمة",
        retry: "إعادة المحاولة",
      }
    : {
        selectAll: "Select all rows on this page",
        rowActions: (name: string) => `Actions for ${name}`,
        noResults: "No matching results",
        noResultsHint: "Try a different search or clear the filters.",
        clearFilters: "Clear filters",
        empty: "Nothing here yet",
        error: "Couldn't load this list",
        retry: "Try again",
      };
}

/* ------------------------------------------------------------------ cards */

/**
 * Room the top row of a card leaves at its inline end for the checkbox and the row menu, as the CSS variable
 * --entity-card-controls. Only the top row uses it, so the rest of the card keeps its full width.
 */
function controlsWidth(checkbox: boolean, menu: boolean) {
  if (checkbox && menu) return "3.25rem";
  if (menu) return "2rem";
  if (checkbox) return "1.5rem";
  return "0px";
}

interface CardGridProps<T> {
  table: DataTableInstance<T>;
  label: string;
  renderCard: (row: T) => ReactNode;
  rowLabel?: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => DataTableRowAction[];
  contextMenu: boolean;
  loading: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  empty: ReactNode;
  minWidth: number;
  t: ReturnType<typeof useDataTableStrings> & EntityListLabels;
}

function CardGrid<T>({ table, label, renderCard, rowLabel, onRowClick, rowActions, contextMenu, loading, error, onRetry, empty, minWidth, t }: CardGridProps<T>) {
  const { rows, selectable, getRowId } = table;
  const [active, setActive] = useState(0);
  const grid = useRef<HTMLUListElement>(null);
  const current = Math.min(active, Math.max(0, rows.length - 1));
  const nameOf = (row: T) => rowLabel?.(row) ?? getRowId(row);
  const gridStyle = { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minWidth}px), 1fr))` };

  if (loading) {
    return (
      <ul role="list" aria-busy="true" aria-label={label} className="grid gap-3" style={gridStyle}>
        {Array.from({ length: Math.min(table.pageSize ?? 6, 8) }, (_, i) => (
          <li key={i} aria-hidden className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3" style={{ inlineSize: `${[64, 48, 72][i % 3]}%` }} />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
            <Skeleton className="h-3 w-4/5" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-10" />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  if (error) {
    return (
      <ErrorState
        title={error === true ? t.error : error}
        actions={
          onRetry ? (
            <Button size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
      />
    );
  }
  if (!rows.length) return <div className="rounded-card border border-dashed border-border">{empty}</div>;

  const cards = () => Array.from(grid.current?.querySelectorAll<HTMLElement>("[data-card]") ?? []);
  const focusCard = (index: number) => {
    const target = cards()[index];
    if (!target) return;
    setActive(index);
    target.focus();
  };
  /** The card in the next row up or down whose left edge is closest to this one's. */
  const vertical = (from: number, dir: 1 | -1) => {
    const els = cards();
    const origin = els[from]?.getBoundingClientRect();
    if (!origin) return from;
    let best = from;
    let bestDy = Infinity;
    let bestDx = Infinity;
    els.forEach((el, i) => {
      const b = el.getBoundingClientRect();
      const dy = (b.top - origin.top) * dir;
      if (dy <= 4) return;
      const dx = Math.abs(b.left - origin.left);
      if (dy < bestDy - 4 || (Math.abs(dy - bestDy) <= 4 && dx < bestDx)) {
        best = i;
        bestDy = dy;
        bestDx = dx;
      }
    });
    return best;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, row: T, index: number) => {
    if (event.target !== event.currentTarget) return;
    const last = rows.length - 1;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = (d: number) => Math.max(0, Math.min(last, index + d));
    let move: number | undefined;
    if (event.key === "ArrowRight") move = step(rtl ? -1 : 1);
    else if (event.key === "ArrowLeft") move = step(rtl ? 1 : -1);
    else if (event.key === "ArrowDown") move = vertical(index, 1);
    else if (event.key === "ArrowUp") move = vertical(index, -1);
    else if (event.key === "Home") move = 0;
    else if (event.key === "End") move = last;
    if (move !== undefined) {
      event.preventDefault();
      focusCard(move);
    } else if (event.key === "Enter" && onRowClick) {
      event.preventDefault();
      onRowClick(row);
    } else if (event.key === " " && selectable) {
      event.preventDefault();
      table.toggleRow(getRowId(row));
    } else if ((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu") {
      if (contextMenu && rowActions?.(row).length && openContextMenuAt(event.currentTarget)) {
        event.preventDefault();
        return;
      }
      const trigger = event.currentTarget.querySelector<HTMLElement>("[data-slot=entity-card-actions]");
      if (trigger) {
        event.preventDefault();
        trigger.click();
      }
    }
  };

  const onMouse = (event: MouseEvent<HTMLElement>, row: T) => {
    const hit = (event.target as HTMLElement).closest(INTERACTIVE);
    if (hit && hit !== event.currentTarget) return;
    if (window.getSelection()?.toString()) return;
    onRowClick?.(row);
  };

  return (
    <ul ref={grid} role="list" aria-label={label} className="grid gap-3" style={gridStyle}>
      {rows.map((row, index) => {
        const id = getRowId(row);
        const selected = table.selection.has(id);
        const tab = index === current ? 0 : -1;
        const actions = rowActions?.(row) ?? [];
        const card = (
          <li
            data-card=""
            data-state={selected ? "selected" : undefined}
            tabIndex={tab}
            onFocus={(e) => e.target === e.currentTarget && setActive(index)}
            onKeyDown={(e) => onKeyDown(e, row, index)}
            onClick={onRowClick ? (e) => onMouse(e, row) : undefined}
            style={{ "--entity-card-controls": controlsWidth(selectable, actions.length > 0) } as CSSProperties}
            className={cn(
              "group/card relative flex min-w-0 flex-col rounded-card border border-border bg-card p-4 text-card-foreground outline-none transition-colors duration-150 ease-nq",
              "hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-[state=selected]:border-primary data-[state=selected]:bg-nq-selected",
              onRowClick && "cursor-pointer",
            )}
          >
            {/* The card keeps its full width. Only its top row should leave room for the controls: use pe-(--entity-card-controls). */}
            <div className="min-w-0 flex-1">{renderCard(row)}</div>
            {selectable || actions.length ? (
              <div className="absolute end-2 top-2 flex items-center gap-1">
                {selectable ? <Checkbox tabIndex={tab} checked={selected} onCheckedChange={() => table.toggleRow(id)} aria-label={t.selectRowCard(nameOf(row))} /> : null}
                {actions.length ? <CardMenu actions={actions} label={t.rowActions(nameOf(row))} tabIndex={tab} /> : null}
              </div>
            ) : null}
          </li>
        );
        return <ContextMenuActions key={id} actions={actions} disabled={!contextMenu} keyboard={false} render={card} renderIcon={(a) => <Glyph icon={a.icon} />} />;
      })}
    </ul>
  );
}

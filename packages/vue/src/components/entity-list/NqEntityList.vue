<script lang="ts">
import type { Controlled, DataTableAction, DataTableCellEditResult, DataTableCellValue, DataTableColumn, DataTableInstance, DataTableLabels, DataTableRowAction } from "../data-table";
import type { EntityFacet, EntityListLabels, EntityListView } from "./entity-list-logic";

/** What the toolbar and bulk slots receive. */
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

/** Props of NqEntityList. Slots: `card` ({ row }, required for the card layout), `toolbar`, `bulk` (both receive the context), `empty`. */
export interface EntityListProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** The list's accessible name. Localise it. */
  label: string;
  /** Multi-value filters shown next to the search. */
  facets?: EntityFacet<T>[];
  /** `"table"` or `"cards"`. Controlled when set (listen to `update:view`). */
  view?: EntityListView;
  defaultView?: EntityListView;
  /** Which layouts to offer. One entry hides the toggle. Default both. */
  views?: EntityListView[];
  pageSize?: number;
  /** Checkboxes and the bulk bar. Default true. */
  selectable?: boolean;
  selection?: Controlled<ReadonlySet<string>>;
  searchPlaceholder?: string;
  /** Table-level actions (create, import, export, refresh) at the inline end of the toolbar. */
  actions?: DataTableAction[];
  /** The menu of a row or card. It also opens as a context menu: context-click, long-press, Shift+F10 or the Menu key. */
  rowActions?: (row: T) => DataTableRowAction[];
  /** Open `rowActions` as a context menu on context-click (table rows and cards). Default true. */
  contextMenu?: boolean;
  /** Saves an in-cell edit in the table view (columns with `edit`). */
  onCellEdit?: (row: T, columnId: string, value: DataTableCellValue) => DataTableCellEditResult | Promise<DataTableCellEditResult>;
  onRowClick?: (row: T) => void;
  /** Plain-text row name for "Select …" labels. Defaults to the id. */
  rowLabel?: (row: T) => string;
  loading?: boolean;
  /** A message, or `true` for the default. */
  error?: string | boolean;
  onRetry?: () => void;
  /** Minimum card width in px. Default 272. */
  cardMinWidth?: number;
  defaultSort?: { id: string; direction: "asc" | "desc" } | null;
  labels?: Partial<EntityListLabels> & Partial<DataTableLabels>;
}
</script>

<script setup lang="ts" generic="T">
import { LayoutGrid, List, Search, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { normalizeForSearch } from "../commands";
import {
  NqDataTable,
  NqDataTableActions,
  NqDataTableBulkActions,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  NqDataTableViewOptions,
  dataTableStrings,
  useDataTable,
} from "../data-table";
import { formatNumber } from "../numeric";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqEntityCardGrid from "./NqEntityCardGrid.vue";
import NqEntityFacetMenu from "./NqEntityFacetMenu.vue";
import NqEntitySortMenu from "./NqEntitySortMenu.vue";
import { ENTITY_STRINGS, filterByFacets } from "./entity-list-logic";

// A list of records that can be a table or a grid of cards. It is a DataTable underneath (the same search, sorting,
// paging and selection), plus multi-value filters, a layout toggle, a card grid with the same keyboard model as table
// rows, bulk actions, and skeleton, empty and error states for both layouts.
const props = withDefaults(defineProps<EntityListProps<T> & { class?: string }>(), {
  facets: () => [],
  view: undefined,
  defaultView: "table",
  views: () => ["table", "cards"],
  selectable: true,
  contextMenu: true,
  cardMinWidth: 272,
  loading: false,
  error: undefined,
});
const emit = defineEmits<{ "update:view": [view: EntityListView] }>();
const slots = defineSlots<{
  card?: (p: { row: T }) => unknown;
  toolbar?: (p: EntityListContext<T>) => unknown;
  bulk?: (p: EntityListContext<T>) => unknown;
  empty?: () => unknown;
}>();

const EMPTY_SET: ReadonlySet<string> = new Set();
const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...dataTableStrings(locale.value), ...ENTITY_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const n = (v: number) => formatNumber(v, locale.value);

const ownView = ref<EntityListView>(props.views.includes(props.defaultView) ? props.defaultView : (props.views[0] ?? "table"));
const view = computed(() => props.view ?? ownView.value);
function setView(next: EntityListView) {
  if (props.view === undefined) ownView.value = next;
  emit("update:view", next);
}

// Facets can match several values per row, so they filter the data before the table sees it.
const facetState = ref<Record<string, string[]>>({});
const facetActive = computed(() => props.facets.some((f) => (facetState.value[f.id]?.length ?? 0) > 0));
const facetFiltered = computed(() => filterByFacets(props.data, props.facets, facetState.value));

const table = useDataTable({
  data: facetFiltered,
  columns: () => props.columns,
  getRowId: (row: T) => props.getRowId(row),
  pageSize: props.pageSize,
  selectable: props.selectable,
  defaultSort: props.defaultSort,
  selection: props.selection,
}) as unknown as DataTableInstance<T>;

const query = computed(() => normalizeForSearch(table.query));
const filteredRows = computed(() => {
  if (!query.value) return facetFiltered.value;
  const searchable = props.columns.filter((c) => c.searchValue);
  return facetFiltered.value.filter((row) => searchable.some((c) => normalizeForSearch(c.searchValue!(row)).includes(query.value)));
});
const selectedRows = computed(() => props.data.filter((row) => table.selection.has(props.getRowId(row))));
const context = computed<EntityListContext<T>>(() => ({
  table,
  view: view.value,
  allRows: props.data,
  filteredRows: filteredRows.value,
  selectedRows: selectedRows.value,
  clearSelection: () => table.setSelection(EMPTY_SET),
}));

function clearAll() {
  facetState.value = {};
  table.resetFilters();
}
const showClear = computed(() => facetActive.value || table.isFiltered);
function onFacet(id: string, values: string[]) {
  facetState.value = { ...facetState.value, [id]: values };
  table.setPage(0);
}
const status = computed(() => (props.loading ? t.value.loadingList : filteredRows.value.length === 1 ? t.value.resultsOne : t.value.results(n(filteredRows.value.length))));
const showNoResults = computed(() => (view.value === "cards" ? table.isFiltered || facetActive.value : facetActive.value));
</script>

<template>
  <div data-slot="entity-list" :data-view="view" :class="cn('flex flex-col gap-3', props.class)">
    <NqDataTableToolbar>
      <NqCheckbox
        v-if="view === 'cards' && props.selectable && !props.loading"
        :model-value="table.pageSelection === 'all'"
        :indeterminate="table.pageSelection === 'some'"
        :disabled="!table.rows.length"
        :aria-label="t.selectAll"
        class="me-1"
        @update:model-value="table.togglePage()"
      />
      <NqDataTableSearch :table="table" :placeholder="props.searchPlaceholder" />
      <NqEntityFacetMenu
        v-for="facet in props.facets"
        :key="facet.id"
        :facet="facet"
        :chosen="facetState[facet.id] ?? []"
        :reset-label="t.facetReset"
        :locale="locale"
        @change="(values: string[]) => onFacet(facet.id, values)"
      />
      <NqButton v-if="showClear" size="sm" variant="ghost" @click="clearAll()">
        <X aria-hidden="true" />
        {{ t.clearAll }}
      </NqButton>
      <div class="ms-auto flex flex-wrap items-center gap-2">
        <NqDataTableActions v-if="props.actions?.length" :actions="props.actions" />
        <slot name="toolbar" v-bind="context" />
        <NqDataTableViewOptions v-if="view === 'table'" :table="table" class="ms-0" />
        <NqEntitySortMenu v-else :table="table" :label="t.sort" :by-label="t.sortBy" />
        <NqToggleGroup v-if="props.views.length > 1" :aria-label="t.viewSwitch" :model-value="[view]" @update:model-value="(v: string[]) => v[0] && setView(v[0] as EntityListView)">
          <NqToggle value="table" :aria-label="t.viewTable"><List aria-hidden="true" /></NqToggle>
          <NqToggle value="cards" :aria-label="t.viewCards"><LayoutGrid aria-hidden="true" /></NqToggle>
        </NqToggleGroup>
      </div>
    </NqDataTableToolbar>

    <NqDataTableBulkActions v-if="props.selectable && slots.bulk" :table="table"><slot name="bulk" v-bind="context" /></NqDataTableBulkActions>

    <span role="status" aria-live="polite" class="sr-only">{{ status }}</span>

    <NqDataTable
      v-if="view === 'table'"
      :table="table"
      :label="props.label"
      :row-label="props.rowLabel"
      :on-row-click="props.onRowClick"
      :row-actions="props.rowActions"
      :context-menu="props.contextMenu"
      :on-cell-edit="props.onCellEdit"
      :loading="props.loading"
      :error="props.error"
      :on-retry="props.onRetry"
      :labels="props.labels"
    >
      <template #empty>
        <NqEmptyState v-if="facetActive" :icon="Search" :title="t.noResults" :description="t.noResultsHint" class="border-0">
          <template #actions><NqButton size="sm" @click="clearAll()">{{ t.clearFilters }}</NqButton></template>
        </NqEmptyState>
        <slot v-else name="empty"><NqEmptyState :title="t.empty" class="border-0" /></slot>
      </template>
    </NqDataTable>
    <NqEntityCardGrid
      v-else
      :table="table"
      :label="props.label"
      :row-label="props.rowLabel"
      :on-row-click="props.onRowClick"
      :row-actions="props.rowActions"
      :context-menu="props.contextMenu"
      :loading="props.loading"
      :error="props.error"
      :on-retry="props.onRetry"
      :min-width="props.cardMinWidth"
      :t="t"
    >
      <template #card="{ row }"><slot name="card" :row="row" /></template>
      <template #empty>
        <NqEmptyState v-if="showNoResults" :icon="Search" :title="t.noResults" :description="t.noResultsHint" class="border-0">
          <template #actions><NqButton size="sm" @click="clearAll()">{{ t.clearFilters }}</NqButton></template>
        </NqEmptyState>
        <slot v-else name="empty"><NqEmptyState :title="t.empty" class="border-0" /></slot>
      </template>
    </NqEntityCardGrid>
    <NqDataTablePagination :table="table" />
  </div>
</template>

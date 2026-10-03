<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Search, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { saveExportBlob, toCsv } from "../export-action";
import { NqIcon } from "../icon";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { formatNumber } from "../numeric";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { filterMarkdownRows, nextMarkdownSort, sortMarkdownRows, type MarkdownSortState } from "./markdown-extras-model";
import NqMarkdownContent from "./NqMarkdownContent";
import { fillExtras, useExtrasStrings, type MarkdownExtrasLabels } from "./strings";
import { markdownTextOf, type MarkdownTableColumn, type MarkdownTableRow } from "./types";

// A data table for Markdown content: click a header to sort (numbers by value, text in the reader's language order, empty cells last),
// type to filter (Arabic-folded), see "3 of 12 rows", and download CSV. Sorting and filtering happen on the plain text of the cells,
// while the cells keep their formatting (links, bold, code).
interface Props {
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
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  sortable: true,
  filterable: "auto",
  filterMinRows: 6,
  downloadable: false,
  downloadName: "table.csv",
  label: undefined,
  defaultSort: null,
  labels: undefined,
});

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" } as const;
const { t, locale } = useExtrasStrings(() => props.labels);
const sort = ref<MarkdownSortState | null>(props.defaultSort);
const query = ref("");
const prepared = computed(() => props.rows.map((r, i) => ({ ...r, key: i, texts: r.texts ?? r.cells.map(markdownTextOf) })));
const headers = computed(() => props.columns.map((c) => c.text ?? markdownTextOf(c.header)));
const view = computed(() => sortMarkdownRows(filterMarkdownRows(prepared.value, query.value), sort.value));
const showFilter = computed(() => props.filterable === true || (props.filterable === "auto" && props.rows.length >= props.filterMinRows));
const n = (v: number) => formatNumber(v, locale.value);
const sortedColumn = computed(() => (sort.value ? headers.value[sort.value.column] : undefined));
const count = computed(() => fillExtras(t.value.rowCount, { shown: n(view.value.length), total: n(props.rows.length) }));
const status = computed(
  () =>
    (sortedColumn.value ? fillExtras(t.value.sorted, { column: sortedColumn.value, direction: sort.value?.direction === "asc" ? t.value.ascending : t.value.descending }) : "") +
    (showFilter.value ? ` ${count.value}` : ""),
);
const ariaSort = (i: number) => (sort.value?.column === i ? (sort.value.direction === "asc" ? "ascending" : "descending") : props.sortable ? "none" : undefined);
const sortIcon = (i: number) => (sort.value?.column === i ? (sort.value.direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown);

function download() {
  saveExportBlob(new Blob([`﻿${toCsv([headers.value, ...view.value.map((r) => r.texts)])}`], { type: "text/csv;charset=utf-8" }), props.downloadName);
}
</script>

<template>
  <div data-slot="markdown-table" :class="cn('flex min-w-0 flex-col gap-2', props.class)">
    <div v-if="showFilter || props.downloadable" class="flex flex-wrap items-center justify-between gap-2">
      <NqInputGroup v-if="showFilter" class="h-control-sm max-w-64">
        <NqInputGroupAddon><NqIcon :icon="Search" /></NqInputGroupAddon>
        <NqInputGroupInput v-model="query" type="search" :placeholder="t.filter" :aria-label="t.filter" />
        <NqInputGroupAddon v-if="query" align="end">
          <button type="button" :aria-label="t.clearFilter" class="rounded-[2px] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus" @click="query = ''">
            <NqIcon :icon="X" />
          </button>
        </NqInputGroupAddon>
      </NqInputGroup>
      <span v-else />
      <div class="flex items-center gap-2">
        <span v-if="showFilter" class="text-caption text-muted-foreground tabular-nums">{{ count }}</span>
        <NqButton v-if="props.downloadable" variant="ghost" size="sm" @click="download">
          <NqIcon :icon="Download" />
          {{ t.downloadCsv }}
        </NqButton>
      </div>
    </div>
    <NqTable :label="props.label ?? t.table" dir="auto">
      <NqTableHeader>
        <NqTableRow>
          <NqTableHead v-for="(col, i) in props.columns" :key="headers[i] ? `${i}-${headers[i]}` : i" :aria-sort="ariaSort(i)" :class="cn(ALIGN[col.align ?? 'start'])">
            <button
              v-if="props.sortable"
              type="button"
              :title="fillExtras(t.sortBy, { column: headers[i] ?? '' })"
              :class="cn('-mx-1.5 inline-flex items-center gap-1 rounded-control px-1.5 py-1 font-medium outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus', sort?.column === i && 'text-foreground')"
              @click="sort = nextMarkdownSort(sort, i)"
            >
              <NqMarkdownContent :content="col.header" />
              <NqIcon :icon="sortIcon(i)" :class="cn('size-3', sort?.column !== i && 'opacity-50')" />
            </button>
            <NqMarkdownContent v-else :content="col.header" />
          </NqTableHead>
        </NqTableRow>
      </NqTableHeader>
      <NqTableBody>
        <NqTableRow v-for="row in view" :key="row.key">
          <NqTableCell v-for="(col, i) in props.columns" :key="i" dir="auto" :class="cn('h-auto whitespace-normal py-2', ALIGN[col.align ?? 'start'])">
            <NqMarkdownContent :content="row.cells[i]" />
          </NqTableCell>
        </NqTableRow>
        <NqTableRow v-if="view.length === 0">
          <NqTableCell :colspan="props.columns.length" class="h-auto py-6 text-center whitespace-normal text-muted-foreground">{{ fillExtras(t.noMatch, { query }) }}</NqTableCell>
        </NqTableRow>
      </NqTableBody>
    </NqTable>
    <p class="sr-only" role="status">{{ status }}</p>
  </div>
</template>

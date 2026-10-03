<script setup lang="ts">
import { Download } from "lucide-vue-next";
import { computed, h } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { NqDataTable, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { NqEmptyState } from "../states";
import { cellKind, formatCell, resultToCsv, type CellKind } from "./database-format";
import type { DatabaseExplorerLabels } from "./strings";
import type { QueryResult } from "./types";

// The results tab: row count and duration, Copy / Download CSV, and the rows in a sortable grid. Internal to NqDatabaseExplorer.
const props = defineProps<{ result: QueryResult; t: DatabaseExplorerLabels }>();
const emit = defineEmits<{ export: [result: QueryResult] }>();

type Row = { i: number; cells: readonly unknown[] };

const CELL_CLASS: Record<CellKind, string> = {
  null: "",
  number: "tabular-nums",
  boolean: "",
  json: "text-muted-foreground",
  date: "tabular-nums",
  text: "",
};

function renderCell(value: unknown) {
  const kind = cellKind(value);
  if (kind === "null") {
    return h("span", { dir: "ltr", class: "rounded-[3px] bg-secondary px-1 font-mono text-caption text-muted-foreground" }, props.t.null);
  }
  const text = formatCell(value);
  return h("bdi", { dir: "ltr", title: text, class: cn("block max-w-72 truncate font-mono text-code", CELL_CLASS[kind]) }, text);
}

const data = computed<Row[]>(() => props.result.rows.map((cells, i) => ({ i, cells })));
const columns = computed<DataTableColumn<Row>[]>(() =>
  props.result.columns.map((name, index) => ({
    id: `c${index}`,
    label: name,
    header: () => h("bdi", { dir: "ltr", class: "font-mono" }, name),
    cell: (row) => renderCell(row.cells[index]),
    sortValue: (row) => {
      const v = row.cells[index];
      if (v === null || v === undefined) return null;
      if (typeof v === "number" || typeof v === "string") return v;
      if (v instanceof Date) return v;
      if (typeof v === "boolean") return v ? 1 : 0;
      return formatCell(v);
    },
    searchValue: (row) => formatCell(row.cells[index]),
    align: typeof props.result.rows[0]?.[index] === "number" ? "end" : "start",
  })),
);
const table = useDataTable<Row>({ data, columns, getRowId: (r) => String(r.i), pageSize: 25 });
const csv = () => resultToCsv(props.result.columns, props.result.rows);
const affected = computed(() => props.result.affectedRows);
const empty = computed(() => props.result.rows.length === 0);
</script>

<template>
  <div class="flex min-w-0 flex-col gap-3">
    <NqDataTableToolbar>
      <p class="text-body-sm text-muted-foreground" role="status">
        {{ affected !== undefined && empty ? props.t.affected(affected) : props.t.rows(props.result.rows.length) }}<span v-if="props.result.durationMs !== undefined"> · {{ props.t.took(props.result.durationMs) }}</span>
      </p>
      <div class="ms-auto flex items-center gap-2">
        <NqCopyButton :value="csv" variant="secondary" size="sm" :label="props.t.copyCsv" :copied-label="props.t.copied" :disabled="empty">{{ props.t.copyCsv }}</NqCopyButton>
        <NqButton type="button" size="sm" :disabled="empty" @click="emit('export', props.result)">
          <Download aria-hidden="true" />
          {{ props.t.exportCsv }}
        </NqButton>
      </div>
    </NqDataTableToolbar>
    <NqAlert v-if="props.result.truncated" tone="warning">{{ props.t.truncated(props.result.rows.length) }}</NqAlert>
    <NqEmptyState v-if="props.result.columns.length === 0" :title="affected !== undefined ? props.t.affected(affected) : props.t.noRows" />
    <NqDataTable v-else :table="table" :label="props.t.resultsTable">
      <template #empty><NqEmptyState :title="props.t.noRows" /></template>
    </NqDataTable>
  </div>
</template>

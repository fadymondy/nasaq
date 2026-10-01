<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqTableHead } from "../table";
import NqDataTableResizeHandle from "./NqDataTableResizeHandle.vue";
import { NqDtRender } from "./render";
import type { DataTableLabels } from "./strings";
import { columnName, type DataTableColumn, type DataTableInstance } from "./use-data-table";

// A column header: a sort button when the column has a sortValue, plus the resize edge. Internal to the data table.
interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: DataTableInstance<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: DataTableColumn<any>;
  t: DataTableLabels;
  /** class, style, data-col and data-pin from the table's pinning. */
  cell: Record<string, unknown>;
}
const props = defineProps<Props>();
const index = computed(() => props.table.sorting.findIndex((s) => s.id === props.column.id));
const active = computed(() => (index.value >= 0 ? props.table.sorting[index.value]!.direction : null));
const many = computed(() => props.table.sorting.length > 1);
const name = computed(() => columnName(props.column));
const width = computed(() => props.table.sizes[props.column.id]);
const canResize = computed(() => props.table.resizable && props.column.resizable !== false);
const align = computed(() => (props.column.align === "end" ? "text-end" : props.column.align === "center" ? "text-center" : undefined));
const cls = computed(() => cn(align.value, canResize.value && "relative", props.column.headerClassName, props.cell.class as string));
const style = computed(() => (width.value ? { ...(props.cell.style as object), width: `${width.value}px` } : (props.cell.style as object)));
const header = computed(() => (typeof props.column.header === "string" ? props.column.header : props.column.header()));
// aria-sort belongs on the primary key only; later keys say their place in words.
const ariaSort = computed(() => (index.value === 0 ? (active.value === "asc" ? "ascending" : "descending") : index.value > 0 ? undefined : "none"));
const Icon = computed(() => (active.value === "asc" ? ArrowUp : active.value === "desc" ? ArrowDown : ChevronsUpDown));
</script>

<template>
  <NqTableHead :data-col="props.cell['data-col']" :data-pin="props.cell['data-pin']" :class="cls" :style="style" :aria-sort="props.column.sortValue ? ariaSort : undefined">
    <template v-if="!props.column.sortValue">
      <NqDtRender :content="header" />
    </template>
    <button
      v-else
      type="button"
      :title="props.table.multiSort ? props.t.multiSortHint : undefined"
      :class="
        cn(
          '-mx-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-control px-1.5 outline-none transition-colors duration-150 ease-nq',
          'hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus',
          active && 'text-foreground',
          props.column.align === 'end' && 'flex-row-reverse',
        )
      "
      @click="props.table.toggleSort(props.column.id, $event.shiftKey)"
    >
      <span :class="cn(props.table.resizable && 'truncate')"><NqDtRender :content="header" /></span>
      <component :is="Icon" aria-hidden="true" :class="cn('size-3.5 shrink-0', !active && 'opacity-40')" />
      <span v-if="many && index >= 0" aria-hidden="true" data-slot="data-table-sort-index" class="text-[10px] leading-none tabular-nums text-muted-foreground">{{ index + 1 }}</span>
      <span v-if="many && index > 0" class="sr-only">{{ props.t.sortPriority(String(index + 1), active === "asc" ? props.t.ascending : props.t.descending) }}</span>
    </button>
    <NqDataTableResizeHandle v-if="canResize" :table="props.table" :column="props.column" :label="props.t.resize(name)" />
  </NqTableHead>
</template>

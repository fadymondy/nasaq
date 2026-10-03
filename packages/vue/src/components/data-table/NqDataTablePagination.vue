<script setup lang="ts" generic="T">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqNativeSelect } from "../native-select";
import { formatNumber } from "../numeric";
import { dataTableStrings } from "./strings";
import type { DataTableInstance } from "./use-data-table";

// "1–10 of 42" and previous / next, plus a rows-per-page choice with `pageSizeOptions`. Hidden when everything fits.
const props = defineProps<{
  table: DataTableInstance<T>;
  /** Adds a rows-per-page choice, e.g. `[10, 25, 50]`. */
  pageSizeOptions?: readonly number[];
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => dataTableStrings(nq.locale.value));
const uid = useId();
const n = (v: number) => formatNumber(v, nq.locale.value);
const visible = computed(() => {
  const tb = props.table;
  if (!tb.pageSize) return false;
  const smallest = props.pageSizeOptions?.length ? Math.min(...props.pageSizeOptions) : undefined;
  return smallest !== undefined ? tb.rowCount > smallest : tb.pageCount > 1;
});
const from = computed(() => (props.table.rowCount ? props.table.page * props.table.pageSize! + 1 : 0));
const to = computed(() => Math.min(props.table.rowCount, props.table.page * props.table.pageSize! + props.table.pageSize!));
const sizeOptions = computed(() => (props.pageSizeOptions ?? []).map((o) => ({ value: String(o), label: n(o) })));
</script>

<template>
  <nav v-if="visible" data-slot="data-table-pagination" :aria-label="t.pagination" :class="cn('flex flex-wrap items-center justify-end gap-2', props.class)">
    <span v-if="props.pageSizeOptions?.length" class="me-auto inline-flex items-center gap-2 sm:me-2">
      <label :for="`${uid}-size`" class="text-caption text-muted-foreground">{{ t.rowsPerPage }}</label>
      <NqNativeSelect :id="`${uid}-size`" size="sm" :model-value="String(props.table.pageSize)" :options="sizeOptions" class="w-auto" @update:model-value="(v: string) => props.table.setPageSize(Number(v))" />
    </span>
    <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite">{{ t.range(n(from), n(to), n(props.table.rowCount)) }}</span>
    <NqButton variant="ghost" size="icon-sm" :aria-label="t.previous" :disabled="props.table.page === 0" @click="props.table.setPage(props.table.page - 1)">
      <ChevronLeft aria-hidden="true" class="rtl:-scale-x-100" />
    </NqButton>
    <NqButton variant="ghost" size="icon-sm" :aria-label="t.next" :disabled="props.table.page >= props.table.pageCount - 1" @click="props.table.setPage(props.table.page + 1)">
      <ChevronRight aria-hidden="true" class="rtl:-scale-x-100" />
    </NqButton>
  </nav>
</template>

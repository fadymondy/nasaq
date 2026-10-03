<script setup lang="ts" generic="T">
import { X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { formatNumber } from "../numeric";
import { dataTableStrings } from "./strings";
import type { DataTableInstance } from "./use-data-table";

// Appears while rows are selected: the count, your actions (slot), and clear. Hidden otherwise.
const props = defineProps<{
  table: DataTableInstance<T>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => dataTableStrings(nq.locale.value));
const count = computed(() => props.table.selection.size);
const label = computed(() => t.value.selected(formatNumber(count.value, nq.locale.value)));
</script>

<template>
  <div
    data-slot="data-table-bulk-actions"
    role="toolbar"
    :aria-label="label"
    :hidden="!count"
    :class="cn('flex flex-wrap items-center gap-2 rounded-control bg-nq-selected py-1 ps-3 pe-1', props.class)"
  >
    <span aria-live="polite" class="me-auto text-label tabular-nums text-foreground">{{ label }}</span>
    <slot />
    <NqButton variant="ghost" size="icon-sm" :aria-label="t.clearSelection" @click="props.table.setSelection(new Set())">
      <X aria-hidden="true" />
    </NqButton>
  </div>
</template>

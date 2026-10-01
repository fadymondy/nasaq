<script setup lang="ts" generic="T">
import { SlidersHorizontal } from "lucide-vue-next";
import { computed, useId } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { formatDate, formatNumber } from "../numeric";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { isActiveRange } from "./data-table-logic";
import { dataTableStrings } from "./strings";
import { columnName, type DataTableInstance } from "./use-data-table";

// A from–to filter on one column ("Amount: 100–500", "Due: ≥ 1 Mar"). Both ends are inclusive and optional.
const props = withDefaults(defineProps<{
  table: DataTableInstance<T>;
  /** A column with a `rangeValue`. */
  column: string;
  title?: string;
  /** `"date"` uses date inputs and `YYYY-MM-DD` bounds. Default `"number"`. */
  kind?: "number" | "date";
  min?: number | string;
  max?: number | string;
  step?: number;
  /** How a bound reads on the button. Default: the locale's number or date format. */
  format?: (value: number | string) => string;
}>(), { kind: "number" });
const nq = useNasaq();
const t = computed(() => dataTableStrings(nq.locale.value));
const uid = useId();
const name = computed(() => props.title ?? columnName(props.table.columns.find((c) => c.id === props.column), props.column));
const range = computed(() => props.table.ranges[props.column] ?? {});
const active = computed(() => isActiveRange(range.value));
const show = (v: number | string) =>
  props.format ? props.format(v) : props.kind === "date" ? formatDate(`${String(v)}T00:00:00`, nq.locale.value) : formatNumber(Number(v), nq.locale.value);
const has = (v: unknown): v is number | string => v !== undefined && v !== null && v !== "";
const summary = computed(() => {
  const r = range.value;
  if (!active.value) return null;
  if (has(r.min) && has(r.max)) return `${show(r.min)}–${show(r.max)}`;
  if (has(r.min)) return t.value.rangeAtLeast(show(r.min));
  if (has(r.max)) return t.value.rangeAtMost(show(r.max));
  return null;
});
function set(edge: "min" | "max", raw: string) {
  const value = raw === "" ? null : props.kind === "number" ? Number(raw) : raw;
  props.table.setRange(props.column, { ...range.value, [edge]: value });
}
const valueOf = (edge: "min" | "max") => {
  const v = range.value[edge];
  return has(v) ? String(v) : "";
};
</script>

<template>
  <NqPopover>
    <NqPopoverTrigger as-child>
      <NqButton size="sm" data-slot="data-table-range-filter" :class="cn(!active && 'border-dashed text-muted-foreground')">
        <SlidersHorizontal aria-hidden="true" />
        {{ name }}
        <NqBadge v-if="summary" variant="outline" class="-me-1 tabular-nums">{{ summary }}</NqBadge>
      </NqButton>
    </NqPopoverTrigger>
    <NqPopoverContent align="start" class="w-64">
      <fieldset class="grid gap-3">
        <legend class="mb-2 text-label text-foreground">{{ name }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <div v-for="edge in (['min', 'max'] as const)" :key="edge" class="grid gap-1">
            <label :for="`${uid}-${edge}`" class="text-caption text-muted-foreground">{{ edge === "min" ? t.rangeFrom : t.rangeTo }}</label>
            <NqInput
              :id="`${uid}-${edge}`"
              :type="props.kind"
              :inputmode="props.kind === 'number' ? 'decimal' : undefined"
              :min="props.min"
              :max="props.max"
              :step="props.step"
              :model-value="valueOf(edge)"
              class="h-control-sm text-body-sm tabular-nums"
              @update:model-value="(v: string | number | undefined) => set(edge, String(v ?? ''))"
            />
          </div>
        </div>
        <NqButton v-if="active" size="sm" variant="ghost" class="justify-self-start" @click="props.table.setRange(props.column, null)">{{ t.reset }}</NqButton>
      </fieldset>
    </NqPopoverContent>
  </NqPopover>
</template>

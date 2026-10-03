<script setup lang="ts" generic="T">
import { ListFilter } from "lucide-vue-next";
import { computed, type Component } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuCheckboxItem, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { formatNumber } from "../numeric";
import { dataTableStrings } from "./strings";
import { columnName, type DataTableInstance } from "./use-data-table";

// A multi-select filter on one column ("Status: In progress, Blocked"). Shows the count of chosen values.
export interface DataTableFacetOption {
  value: string;
  label: string;
  icon?: Component;
}
const props = defineProps<{
  table: DataTableInstance<T>;
  /** A column with a `filterValue`. */
  column: string;
  /** Button label. Defaults to the column's label. */
  title?: string;
  options: DataTableFacetOption[];
}>();
const nq = useNasaq();
const t = computed(() => dataTableStrings(nq.locale.value));
const name = computed(() => props.title ?? columnName(props.table.columns.find((c) => c.id === props.column), props.column));
const chosen = computed(() => new Set(props.table.filters[props.column] ?? []));
function toggle(value: string) {
  const next = new Set(chosen.value);
  if (!next.delete(value)) next.add(value);
  props.table.setFilter(props.column, props.options.map((o) => o.value).filter((v) => next.has(v)));
}
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger as-child>
      <NqButton size="sm" :class="cn(!chosen.size && 'border-dashed text-muted-foreground')">
        <ListFilter aria-hidden="true" />
        {{ name }}
        <NqBadge v-if="chosen.size" variant="outline" class="-me-1 tabular-nums">
          {{ chosen.size === 1 ? props.options.find((o) => chosen.has(o.value))?.label : formatNumber(chosen.size, nq.locale.value) }}
        </NqBadge>
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent class="min-w-48">
      <NqDropdownMenuGroup>
        <NqDropdownMenuCheckboxItem v-for="o in props.options" :key="o.value" :model-value="chosen.has(o.value)" @update:model-value="toggle(o.value)">
          <component :is="o.icon" v-if="o.icon" aria-hidden="true" />
          {{ o.label }}
        </NqDropdownMenuCheckboxItem>
      </NqDropdownMenuGroup>
      <template v-if="chosen.size">
        <NqDropdownMenuSeparator />
        <NqDropdownMenuItem @select="props.table.setFilter(props.column, [])">{{ t.reset }}</NqDropdownMenuItem>
      </template>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>

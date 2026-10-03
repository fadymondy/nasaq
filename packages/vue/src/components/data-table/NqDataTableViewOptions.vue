<script setup lang="ts" generic="T">
import { Settings2 } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import {
  NqDropdownMenu,
  NqDropdownMenuCheckboxItem,
  NqDropdownMenuContent,
  NqDropdownMenuGroup,
  NqDropdownMenuLabel,
  NqDropdownMenuRadioGroup,
  NqDropdownMenuRadioItem,
  NqDropdownMenuSeparator,
  NqDropdownMenuSub,
  NqDropdownMenuSubContent,
  NqDropdownMenuSubTrigger,
  NqDropdownMenuTrigger,
} from "../dropdown-menu";
import type { TableDensity } from "../table";
import { dataTableStrings } from "./strings";
import { columnName, type DataTableInstance } from "./use-data-table";

// Column visibility: a "View" menu listing every hideable column, plus optional density and pinning.
const props = withDefaults(defineProps<{
  table: DataTableInstance<T>;
  class?: string;
  /** Adds a Density choice. Pass the same value to `<NqDataTable density>`. */
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  /** Adds Pin to start / end / Unpin for each column. Default false. */
  pinning?: boolean;
}>(), { pinning: false });
const nq = useNasaq();
const t = computed(() => dataTableStrings(nq.locale.value));
const hideable = computed(() => props.table.columns.filter((c) => c.hideable !== false));
const withDensity = computed(() => !!(props.density && props.onDensityChange));
const show = computed(() => hideable.value.length > 0 || withDensity.value || props.pinning);
const DENSITIES = ["compact", "default", "comfortable"] as const;
</script>

<template>
  <NqDropdownMenu v-if="show">
    <NqDropdownMenuTrigger as-child>
      <NqButton size="sm" :class="cn('ms-auto', props.class)">
        <Settings2 aria-hidden="true" />
        {{ t.view }}
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-48">
      <NqDropdownMenuGroup v-if="hideable.length">
        <NqDropdownMenuLabel>{{ t.columns }}</NqDropdownMenuLabel>
        <!-- Keep one column: hiding them all leaves an empty table and no way to tell why. -->
        <NqDropdownMenuCheckboxItem
          v-for="c in hideable"
          :key="c.id"
          :model-value="!props.table.hidden.has(c.id)"
          :disabled="!props.table.hidden.has(c.id) && props.table.visibleColumns.length === 1"
          @update:model-value="props.table.toggleColumn(c.id)"
        >
          {{ columnName(c) }}
        </NqDropdownMenuCheckboxItem>
      </NqDropdownMenuGroup>
      <template v-if="props.pinning">
        <NqDropdownMenuSeparator v-if="hideable.length" />
        <NqDropdownMenuGroup>
          <NqDropdownMenuLabel>{{ t.pin }}</NqDropdownMenuLabel>
          <NqDropdownMenuSub v-for="c in props.table.visibleColumns" :key="c.id">
            <NqDropdownMenuSubTrigger>
              <span class="min-w-0 flex-1 truncate">{{ columnName(c) }}</span>
              <span v-if="props.table.pinOf(c.id)" class="text-caption text-muted-foreground">{{ props.table.pinOf(c.id) === "start" ? t.pinStart : t.pinEnd }}</span>
            </NqDropdownMenuSubTrigger>
            <NqDropdownMenuSubContent class="min-w-40">
              <NqDropdownMenuRadioGroup
                :model-value="props.table.pinOf(c.id) ?? 'none'"
                @update:model-value="(v: string) => props.table.pinColumn(c.id, v === 'none' ? null : (v as 'start' | 'end'))"
              >
                <NqDropdownMenuRadioItem value="start">{{ t.pinStart }}</NqDropdownMenuRadioItem>
                <NqDropdownMenuRadioItem value="end">{{ t.pinEnd }}</NqDropdownMenuRadioItem>
                <NqDropdownMenuRadioItem value="none">{{ t.unpin }}</NqDropdownMenuRadioItem>
              </NqDropdownMenuRadioGroup>
            </NqDropdownMenuSubContent>
          </NqDropdownMenuSub>
        </NqDropdownMenuGroup>
      </template>
      <template v-if="withDensity">
        <NqDropdownMenuSeparator v-if="hideable.length || props.pinning" />
        <NqDropdownMenuGroup>
          <NqDropdownMenuLabel>{{ t.density }}</NqDropdownMenuLabel>
          <NqDropdownMenuRadioGroup :model-value="props.density" @update:model-value="(v: string) => props.onDensityChange!(v as TableDensity)">
            <NqDropdownMenuRadioItem v-for="d in DENSITIES" :key="d" :value="d">{{ t.densities[d] }}</NqDropdownMenuRadioItem>
          </NqDropdownMenuRadioGroup>
        </NqDropdownMenuGroup>
      </template>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>

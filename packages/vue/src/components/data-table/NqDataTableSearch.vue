<script setup lang="ts" generic="T">
import { Search, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqInput } from "../field";
import { dataTableStrings } from "./strings";
import type { DataTableInstance } from "./use-data-table";

// Filters rows by every column that has a `searchValue`. Esc clears.
const props = defineProps<{
  table: DataTableInstance<T>;
  placeholder?: string;
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => dataTableStrings(nq.locale.value));
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && props.table.query) {
    e.preventDefault();
    props.table.setQuery("");
  }
}
</script>

<template>
  <div data-slot="data-table-search" :class="cn('relative w-full sm:w-64', props.class)">
    <Search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <NqInput
      type="search"
      :model-value="props.table.query"
      :placeholder="props.placeholder ?? t.search"
      :aria-label="props.ariaLabel ?? props.placeholder ?? t.search"
      class="h-control-sm ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden"
      @update:model-value="(v: string | number | undefined) => props.table.setQuery(String(v ?? ''))"
      @keydown="onKey"
    />
    <button
      v-if="props.table.query"
      type="button"
      :aria-label="t.clearSearch"
      class="absolute end-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
      @click="props.table.setQuery('')"
    >
      <X aria-hidden="true" class="size-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ArrowDownUp, Check } from "lucide-vue-next";
import { computed } from "vue";
import { NqButton } from "../button";
import { columnName, type DataTableInstance } from "../data-table";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuLabel, NqDropdownMenuTrigger } from "../dropdown-menu";

// The card layout's Sort menu: every column that has a sort value. Internal.
const props = defineProps<{ table: DataTableInstance<T>; label: string; byLabel: string }>();
const sortable = computed(() => props.table.columns.filter((c) => c.sortValue));
const directionOf = (id: string) => (props.table.sort?.id === id ? props.table.sort.direction : null);
</script>

<template>
  <NqDropdownMenu v-if="sortable.length">
    <NqDropdownMenuTrigger as-child>
      <NqButton size="sm">
        <ArrowDownUp aria-hidden="true" />
        {{ props.label }}
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-44">
      <NqDropdownMenuGroup>
        <NqDropdownMenuLabel>{{ props.byLabel }}</NqDropdownMenuLabel>
        <NqDropdownMenuItem v-for="c in sortable" :key="c.id" @select.prevent="props.table.toggleSort(c.id)">
          <span class="inline-flex size-4 items-center justify-center"><Check v-if="directionOf(c.id)" aria-hidden="true" /></span>
          <span class="flex-1">{{ columnName(c) }}</span>
          <span v-if="directionOf(c.id)" aria-hidden="true" class="text-muted-foreground">{{ directionOf(c.id) === "asc" ? "↑" : "↓" }}</span>
        </NqDropdownMenuItem>
      </NqDropdownMenuGroup>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>

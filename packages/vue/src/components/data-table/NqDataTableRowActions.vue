<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { groupActions } from "../context-menu";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import type { DataTableRowAction } from "./use-data-table";

// The ⋯ button at a row's inline end and the menu behind it. Internal to the data table.
const props = defineProps<{ actions: DataTableRowAction[]; label: string; tabindex: number }>();
</script>

<template>
  <NqDropdownMenu v-if="props.actions.length">
    <NqDropdownMenuTrigger as-child>
      <NqButton
        variant="ghost"
        size="icon-sm"
        :aria-label="props.label"
        :tabindex="props.tabindex"
        data-slot="data-table-row-actions"
        :class="
          cn(
            'text-muted-foreground opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100',
            'group-data-[state=selected]/row:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100',
          )
        "
      >
        <Ellipsis aria-hidden="true" />
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-44">
      <NqDropdownMenuGroup v-for="(items, i) in groupActions(props.actions)" :key="i">
        <NqDropdownMenuSeparator v-if="i > 0" />
        <NqDropdownMenuItem v-for="a in items" :key="a.id" :variant="a.danger ? 'danger' : 'default'" :disabled="a.disabled" @select="a.onSelect()">
          <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
          {{ a.label }}
        </NqDropdownMenuItem>
      </NqDropdownMenuGroup>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>

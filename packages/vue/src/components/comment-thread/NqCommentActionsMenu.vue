<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { computed } from "vue";
import { NqButton } from "../button";
import { groupActions, type ContextMenuAction } from "../context-menu";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";

// The "…" menu that mirrors a ContextMenuAction[], so every context-click action also has a visible button.
interface Props {
  actions: readonly ContextMenuAction[];
  /** Accessible name of the "…" button. */
  label: string;
}
const props = defineProps<Props>();
const groups = computed(() => groupActions(props.actions));
</script>

<template>
  <NqDropdownMenu v-if="props.actions.length">
    <NqDropdownMenuTrigger as-child>
      <NqButton variant="ghost" size="icon-sm" :aria-label="props.label"><Ellipsis aria-hidden="true" /></NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-44">
      <NqDropdownMenuGroup v-for="(items, i) in groups" :key="i">
        <NqDropdownMenuSeparator v-if="i > 0" />
        <NqDropdownMenuItem v-for="a in items" :key="a.id" :variant="a.danger ? 'danger' : 'default'" :disabled="a.disabled" @select="a.onSelect()">
          <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
          {{ a.label }}
        </NqDropdownMenuItem>
      </NqDropdownMenuGroup>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>

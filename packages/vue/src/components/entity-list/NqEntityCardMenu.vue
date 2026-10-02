<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { computed } from "vue";
import { NqButton } from "../button";
import { groupActions, type ContextMenuAction } from "../context-menu";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";

// The card's more menu. Internal to the entity list.
const props = defineProps<{ actions: readonly ContextMenuAction[]; label: string; tabindex: number }>();
const groups = computed(() => groupActions(props.actions));
</script>

<template>
  <NqDropdownMenu v-if="props.actions.length">
    <NqDropdownMenuTrigger as-child>
      <NqButton variant="ghost" size="icon-sm" :aria-label="props.label" :tabindex="props.tabindex" data-slot="entity-card-actions" class="text-muted-foreground">
        <Ellipsis aria-hidden="true" />
      </NqButton>
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

<script setup lang="ts">
import { Ellipsis } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { groupActions } from "../context-menu";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuGroup, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import type { NoteAction } from "./use-note-menu";

// A "…" button that opens a note's actions as a dropdown. The same list backs the context menu.
interface Props {
  actions: readonly NoteAction[];
  /** Accessible name of the button. */
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  align?: "start" | "end";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "ghost", size: "icon-sm", align: "end" });
const groups = computed(() => groupActions(props.actions));
</script>

<template>
  <NqDropdownMenu v-if="props.actions.length">
    <NqDropdownMenuTrigger as-child>
      <NqButton :variant="props.variant" :size="props.size" :aria-label="props.label" :class="cn('text-muted-foreground', props.class)" data-slot="note-actions-trigger">
        <slot name="icon"><Ellipsis aria-hidden="true" /></slot>
      </NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent :align="props.align" class="min-w-52">
      <NqDropdownMenuGroup v-for="(items, i) in groups" :key="i">
        <NqDropdownMenuSeparator v-if="i > 0" />
        <NqDropdownMenuItem v-for="a in items" :key="a.id" :variant="a.danger ? 'danger' : 'default'" :disabled="a.disabled" :shortcut="a.shortcut" @select="a.onSelect()">
          <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
          {{ a.label }}
        </NqDropdownMenuItem>
      </NqDropdownMenuGroup>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>

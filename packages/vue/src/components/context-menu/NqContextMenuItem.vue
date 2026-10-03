<script setup lang="ts">
import { ContextMenuItem } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { menuItemClass } from "../dropdown-menu/menu-styles";
import NqDropdownMenuShortcut from "../dropdown-menu/NqDropdownMenuShortcut.vue";

// One action. Listen with @select. Icon and label go in the default slot; `shortcut` shows a hint at the inline end.
interface Props {
  variant?: "default" | "danger";
  /** A keyboard hint, rendered at the inline end. */
  shortcut?: string;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "default", shortcut: undefined });
const emits = defineEmits<{ select: [event: Event] }>();
</script>

<template>
  <ContextMenuItem
    data-slot="context-menu-item"
    :data-variant="props.variant"
    :disabled="props.disabled"
    :class="cn(menuItemClass, props.variant === 'danger' && 'text-nq-danger-text [&_svg]:text-current', props.class)"
    @select="emits('select', $event)"
  >
    <slot />
    <NqDropdownMenuShortcut v-if="props.shortcut">{{ props.shortcut }}</NqDropdownMenuShortcut>
  </ContextMenuItem>
</template>

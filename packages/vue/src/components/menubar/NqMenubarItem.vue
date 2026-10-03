<script setup lang="ts">
import { MenubarItem } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { menuItemClass } from "../dropdown-menu/menu-styles";
import NqMenubarShortcut from "./NqMenubarShortcut.vue";

// One action. Listen with @select. Icon and label go in the default slot; `shortcut` shows a hint at the inline end.
interface Props {
  variant?: "default" | "danger";
  /** Shown at the inline end with Kbd: a string ("⌘S") or a key list (["Ctrl", "S"]). */
  shortcut?: string | readonly string[];
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "default", shortcut: undefined });
const emits = defineEmits<{ select: [event: Event] }>();
</script>

<template>
  <MenubarItem
    data-slot="menubar-item"
    :data-variant="props.variant"
    :disabled="props.disabled"
    :class="cn(menuItemClass, props.variant === 'danger' && 'text-nq-danger-text [&_svg]:text-current', props.class)"
    @select="emits('select', $event)"
  >
    <slot />
    <NqMenubarShortcut v-if="props.shortcut" :keys="typeof props.shortcut === 'string' ? undefined : props.shortcut">{{ typeof props.shortcut === "string" ? props.shortcut : "" }}</NqMenubarShortcut>
  </MenubarItem>
</template>

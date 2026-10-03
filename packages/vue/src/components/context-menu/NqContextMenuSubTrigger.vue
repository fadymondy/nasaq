<script setup lang="ts">
import { ChevronRight } from "lucide-vue-next";
import { ContextMenuSubTrigger } from "reka-ui";
import { inject, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import { MENU_SUB_OPEN } from "./context";
import { menuItemClass } from "../dropdown-menu/menu-styles";

// An item that opens a submenu. Appends a chevron that mirrors in RTL.
const props = defineProps<{ disabled?: boolean; class?: HTMLAttributes["class"] }>();
const open = inject(MENU_SUB_OPEN, ref(false));
</script>

<template>
  <ContextMenuSubTrigger
    data-slot="context-menu-sub-trigger"
    :disabled="props.disabled"
    :data-popup-open="open ? '' : undefined"
    :class="cn(menuItemClass, 'data-popup-open:bg-nq-selected', props.class)"
  >
    <slot />
    <NqIcon :icon="ChevronRight" directional class="ms-auto" />
  </ContextMenuSubTrigger>
</template>

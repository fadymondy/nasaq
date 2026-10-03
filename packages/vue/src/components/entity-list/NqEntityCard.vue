<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import {
  NqContextMenu,
  NqContextMenuContent,
  NqContextMenuGroup,
  NqContextMenuItem,
  NqContextMenuSeparator,
  NqContextMenuTrigger,
  groupActions,
  NATIVE_CONTEXT_SELECTOR,
  type ContextMenuAction,
} from "../context-menu";

// A card (an li) that opens its actions as a context menu: context-click and long-press. Keyboard opening is the grid's job.
// Internal to the entity list.
interface Props {
  actions: readonly ContextMenuAction[];
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
defineOptions({ inheritAttrs: false });
const groups = computed(() => groupActions(props.actions));
const inert = computed(() => props.disabled || !props.actions.length);

function onContextMenu(event: MouseEvent) {
  const native = (event.target as HTMLElement).closest(NATIVE_CONTEXT_SELECTOR);
  const current = event.currentTarget as HTMLElement;
  // Leave it to the browser: stop the menu's own handler so the native menu shows.
  if (event.shiftKey || (native && current.contains(native))) event.stopImmediatePropagation();
}
</script>

<template>
  <li v-if="inert" v-bind="$attrs" :class="props.class"><slot /></li>
  <NqContextMenu v-else>
    <NqContextMenuTrigger as-child>
      <li v-bind="$attrs" :class="cn('data-popup-open:bg-nq-hover', props.class)" @contextmenu.capture="onContextMenu"><slot /></li>
    </NqContextMenuTrigger>
    <NqContextMenuContent class="min-w-44">
      <NqContextMenuGroup v-for="(items, i) in groups" :key="i">
        <NqContextMenuSeparator v-if="i > 0" />
        <NqContextMenuItem v-for="a in items" :key="a.id" :variant="a.danger ? 'danger' : 'default'" :disabled="a.disabled" @select="a.onSelect()">
          <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
          {{ a.label }}
        </NqContextMenuItem>
      </NqContextMenuGroup>
    </NqContextMenuContent>
  </NqContextMenu>
</template>

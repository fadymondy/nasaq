<script setup lang="ts">
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqContextMenu from "./NqContextMenu.vue";
import NqContextMenuContent from "./NqContextMenuContent.vue";
import NqContextMenuGroup from "./NqContextMenuGroup.vue";
import NqContextMenuItem from "./NqContextMenuItem.vue";
import NqContextMenuSeparator from "./NqContextMenuSeparator.vue";
import NqContextMenuTrigger from "./NqContextMenuTrigger.vue";
import { groupActions, NATIVE_CONTEXT_SELECTOR, openContextMenuAt, type ContextMenuAction } from "./context-actions";

// Turns any element into a context-menu region driven by an action list: context-click, long-press, Shift+F10 or the Menu key.
// Right-clicks on inputs, textareas, selects, links and editable text keep the browser's own menu, and so does Shift+context-click.
interface Props {
  /** The same list a row's more menu shows. An empty list (or `disabled`) renders the element untouched. */
  actions: readonly ContextMenuAction[];
  disabled?: boolean;
  /** The element that becomes the trigger (a tr, li, a card). Default div. */
  as?: string | Component;
  /** Also open on Shift+F10 and the Menu key, at the focused element. Default true. */
  keyboard?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { as: "div", keyboard: true });
// Attributes (data-slot, aria-*, listeners) land on the region element, not on the menu root, which renders nothing.
defineOptions({ inheritAttrs: false });
const groups = computed(() => groupActions(props.actions));
const inert = computed(() => props.disabled || !props.actions.length);

function onContextMenu(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const native = target.closest(NATIVE_CONTEXT_SELECTOR);
  const current = event.currentTarget as HTMLElement;
  if (event.shiftKey || (native && current.contains(native))) {
    // Leave it to the browser: stop the menu's own handler so the native menu shows.
    event.stopImmediatePropagation();
  }
}
function onKeydown(event: KeyboardEvent) {
  if (!props.keyboard || event.defaultPrevented) return;
  if (!((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu")) return;
  const target = event.target as HTMLElement;
  if (target.closest(NATIVE_CONTEXT_SELECTOR)) return;
  if (openContextMenuAt(target)) event.preventDefault();
}
</script>

<template>
  <component :is="props.as" v-if="inert" v-bind="$attrs" :class="props.class"><slot /></component>
  <NqContextMenu v-else>
    <NqContextMenuTrigger v-bind="$attrs" :as="props.as" :class="cn('data-popup-open:bg-nq-hover', props.class)" @contextmenu.capture="onContextMenu" @keydown="onKeydown">
      <slot />
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

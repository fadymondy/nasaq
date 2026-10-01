<script setup lang="ts">
import { injectNavigationMenuContext, NavigationMenuViewport } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { usePanelPresence } from "./usePanelPresence";

// Internal: the one shared panel NqNavigationMenu renders under the bar (React's Positioner > Popup > Viewport).
// Reka measures the open content into --reka-navigation-menu-viewport-width/height/left; they are mapped to the
// popup vars the React classes use, so the panel resizes and follows the active trigger.
const props = defineProps<{ align: "start" | "center" | "end"; panelClassName?: HTMLAttributes["class"] }>();
const menu = injectNavigationMenuContext();
const open = computed(() => menu.modelValue.value !== "");
const viewport = ref<{ $el: HTMLElement } | null>(null);
const { shown } = usePanelPresence(open, () => viewport.value?.$el);
</script>

<template>
  <NavigationMenuViewport
    ref="viewport"
    force-mount
    :align="props.align"
    data-slot="navigation-menu-popup"
    :data-open="open ? '' : undefined"
    :data-closed="open ? undefined : ''"
    data-side="bottom"
    :data-align="props.align"
    :style="{
      '--popup-width': 'calc(var(--reka-navigation-menu-viewport-width) + 2px)',
      '--popup-height': 'calc(var(--reka-navigation-menu-viewport-height) + 2px)',
      '--transform-origin': 'top',
      left: 'var(--reka-navigation-menu-viewport-left)',
      display: shown ? undefined : 'none',
    }"
    :class="
      cn(
        'relative h-[var(--popup-height)] w-[var(--popup-width)] origin-[var(--transform-origin)] overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none',
        'transition-[opacity,scale,width,height] duration-300 ease-nq motion-reduce:transition-none',
        'data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150',
        props.panelClassName,
      )
    "
  >
    <slot />
  </NavigationMenuViewport>
</template>

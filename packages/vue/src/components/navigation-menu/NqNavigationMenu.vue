<script setup lang="ts">
import { NavigationMenuRoot, NavigationMenuViewport } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A site header menu. Put an NqNavigationMenuList inside; the panel that holds each trigger's
// NqNavigationMenuContent is rendered for you and is shared, so it grows and shrinks between triggers
// instead of closing and reopening.
interface Props {
  /** Where the shared panel sits against its trigger. Default `start`. */
  align?: "start" | "center" | "end";
  /** Gap between the bar and the panel. Default 8. */
  sideOffset?: number;
  /** Class for the panel (the animated viewport). */
  panelClassName?: HTMLAttributes["class"];
  /** Open item value (v-model). */
  modelValue?: string;
  defaultValue?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { align: "start", sideOffset: 8 });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const justify = computed(() => ({ start: "justify-start", center: "justify-center", end: "justify-end" })[props.align]);
</script>

<template>
  <NavigationMenuRoot
    data-slot="navigation-menu"
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :class="cn('relative flex w-max max-w-full', props.class)"
    @update:model-value="(v: string) => emit('update:modelValue', v)"
  >
    <slot />
    <div
      data-slot="navigation-menu-positioner"
      :class="cn('absolute start-0 top-full z-50 flex w-full', justify)"
      :style="{ marginTop: `${props.sideOffset}px` }"
    >
      <NavigationMenuViewport
        data-slot="navigation-menu-viewport"
        :class="
          cn(
            'relative left-[var(--reka-navigation-menu-viewport-left)] h-[var(--reka-navigation-menu-viewport-height)] w-[var(--reka-navigation-menu-viewport-width)] max-w-full origin-top overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none',
            'transition-[opacity,scale,width,height] duration-300 ease-nq motion-reduce:transition-none',
            'data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=closed]:duration-150',
            props.panelClassName,
          )
        "
      />
    </div>
  </NavigationMenuRoot>
</template>

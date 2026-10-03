<script setup lang="ts">
import { NavigationMenuRoot } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqNavigationMenuPopup from "./NqNavigationMenuPopup.vue";

// A site header menu. Put an NqNavigationMenuList inside; the panel that holds each trigger's
// NqNavigationMenuContent is rendered for you and is shared, so it grows, shrinks and slides between triggers
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
      class="absolute left-0 top-full z-50 w-max before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-['']"
      :style="{ marginTop: `${props.sideOffset}px` }"
    >
      <NqNavigationMenuPopup :align="props.align" :panel-class-name="props.panelClassName" />
    </div>
  </NavigationMenuRoot>
</template>

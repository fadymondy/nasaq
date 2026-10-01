<script setup lang="ts">
import { MenubarRoot } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The bar. Arrow keys move between the triggers by reading direction (Left and Right swap in RTL), and once one
// menu is open, hovering or arrowing to a neighbouring trigger opens that menu.
interface Props {
  /** The value of the open menu (v-model). */
  modelValue?: string;
  dir?: "ltr" | "rtl";
  loop?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, dir: undefined, loop: true });
const emits = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <MenubarRoot
    data-slot="menubar"
    :model-value="props.modelValue"
    :dir="props.dir"
    :loop="props.loop"
    :class="cn('flex h-control w-fit items-center gap-0.5 rounded-control border border-border bg-card p-0.5 text-foreground', props.class)"
    @update:model-value="emits('update:modelValue', String($event ?? ``))"
  >
    <slot />
  </MenubarRoot>
</template>

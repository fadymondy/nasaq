<script setup lang="ts">
import { provide, toRef, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { chipGroupKey } from "./context";

// A single-select row of filter chips. Scrolls sideways on narrow screens instead of wrapping.
interface Props {
  /** The selected chip's value (v-model). */
  modelValue: string;
  /** Accessible name of the group: "Categories". Required, since the chips alone don't say what they filter. */
  ariaLabel: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
provide(chipGroupKey, { value: toRef(props, "modelValue"), select: (v) => emit("update:modelValue", v) });
</script>

<template>
  <div
    role="group"
    data-slot="chip-group"
    :aria-label="props.ariaLabel"
    :class="cn('-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', props.class)"
  >
    <slot />
  </div>
</template>

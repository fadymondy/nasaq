<script setup lang="ts">
import { TabsRoot, useForwardPropsEmits } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Switches between views of the same subject without leaving the page. Arrow keys follow the reading direction.
interface Props {
  modelValue?: string | number;
  defaultValue?: string | number;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, orientation: "horizontal", activationMode: "automatic" });
const emits = defineEmits<{ "update:modelValue": [value: string | number] }>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <TabsRoot data-slot="tabs" v-bind="{ ...forwarded, class: undefined }" :class="cn('flex flex-col gap-4', props.class)">
    <slot />
  </TabsRoot>
</template>

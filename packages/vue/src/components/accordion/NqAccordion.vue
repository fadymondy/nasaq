<script setup lang="ts">
import { AccordionRoot } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Root. One panel open at a time by default; pass `multiple` to let several stay open.
// v-model carries the open item values and is always an array, as in React.
interface Props {
  /** Allow several open panels. */
  multiple?: boolean;
  /** Values of the open items (v-model). Always an array. */
  modelValue?: string[];
  defaultValue?: string[];
  /** Disable every item. */
  disabled?: boolean;
  dir?: "ltr" | "rtl";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { multiple: false, modelValue: undefined, defaultValue: undefined, disabled: false, dir: undefined });
const emits = defineEmits<{ "update:modelValue": [value: string[]] }>();

const inner = ref<string[]>(props.defaultValue ?? []);
const current = computed(() => props.modelValue ?? inner.value);
// Reka takes a string in single mode and an array in multiple mode; the item value is the same.
const forReka = computed(() => (props.multiple ? current.value : current.value[0]));
function onChange(next: string | string[] | undefined) {
  const list = Array.isArray(next) ? next : next === undefined || next === "" ? [] : [next];
  inner.value = list;
  emits("update:modelValue", list);
}
</script>

<template>
  <AccordionRoot
    data-slot="accordion"
    :type="props.multiple ? 'multiple' : 'single'"
    :collapsible="true"
    :model-value="forReka as never"
    :disabled="props.disabled"
    :dir="props.dir"
    :unmount-on-hide="false"
    :class="cn('flex w-full flex-col rounded-card border border-border bg-card', props.class)"
    @update:model-value="onChange"
  >
    <slot />
  </AccordionRoot>
</template>

<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { injectSelectRootContext, SelectItem, SelectItemIndicator, SelectItemText } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// One choice. `value` must not be an empty string.
interface Props {
  value: string | number;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const root = injectSelectRootContext();
// Base UI marks the chosen item with data-selected (Reka only has data-state="checked").
const selected = computed(() => {
  const v = root.modelValue.value;
  return Array.isArray(v) ? v.includes(props.value) : v === props.value;
});
</script>

<template>
  <SelectItem
    data-slot="select-item"
    :value="props.value"
    :disabled="props.disabled"
    :data-selected="selected ? '' : undefined"
    :class="
      cn(
        'relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none',
        'data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50',
        props.class,
      )
    "
  >
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
      <SelectItemIndicator><Check class="size-4" /></SelectItemIndicator>
    </span>
    <SelectItemText class="min-w-0 flex-1 truncate"><slot /></SelectItemText>
  </SelectItem>
</template>

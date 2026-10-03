<script setup lang="ts">
import { injectSelectRootContext, SelectValue } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The selected item's label, or the placeholder while nothing is chosen.
interface Props {
  placeholder?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const root = injectSelectRootContext();
const empty = computed(() => {
  const v = root.modelValue.value;
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
});
</script>

<template>
  <SelectValue
    data-slot="select-value"
    :placeholder="props.placeholder"
    :data-placeholder="empty ? '' : undefined"
    :class="cn('min-w-0 flex-1 truncate text-start data-placeholder:text-muted-foreground', props.class)"
  />
</template>

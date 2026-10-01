<script setup lang="ts">
import { injectRadioGroupRootContext, RadioGroupIndicator, RadioGroupItem } from "reka-ui";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// One round radio. Pair it with a `<label>` so the text is clickable.
interface Props {
  value: string;
  disabled?: boolean;
  id?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const root = injectRadioGroupRootContext();
const checked = computed(() => root.modelValue?.value === props.value);
defineOptions({ inheritAttrs: false });
</script>

<template>
  <RadioGroupItem
    v-bind="$attrs"
    data-slot="radio"
    :id="props.id"
    :value="props.value"
    :disabled="props.disabled"
    :data-checked="checked ? '' : undefined"
    :data-unchecked="checked ? undefined : ''"
    :class="
      cn(
        'relative inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-nq-line-strong bg-card outline-none',
        'transition-colors duration-150 ease-nq data-checked:border-primary data-checked:bg-primary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        // A 24px hit area around the 16px circle, without changing layout.
        'after:absolute after:-inset-1 after:rounded-full',
        props.class,
      )
    "
  >
    <RadioGroupIndicator data-slot="radio-indicator" class="block size-1.5 rounded-full bg-primary-foreground" />
  </RadioGroupItem>
</template>

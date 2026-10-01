<script setup lang="ts">
import type { Component, HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useFieldControl } from "../field/context";
import { NqPopoverTrigger } from "../popover";
import { pickerTriggerClass } from "./date-picker-logic";

// Input-looking button shared by the date pickers (not exported). Inside a NqField it takes the field's id and state,
// so the label, description and invalid state apply.
interface Props {
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  label: string | null;
  placeholder: string;
  icon: Component;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { disabled: undefined });
const field = useFieldControl(() => props.id);
const isDisabled = computed(() => props.disabled ?? field.disabled.value);
</script>

<template>
  <NqPopoverTrigger as-child>
    <button
      type="button"
      :id="field.id.value"
      :disabled="isDisabled || undefined"
      :aria-label="props.ariaLabel"
      :aria-invalid="field.invalid.value || undefined"
      :aria-describedby="field.describedBy.value"
      :data-invalid="field.invalid.value ? '' : undefined"
      :data-disabled="isDisabled ? '' : undefined"
      data-slot="date-picker-trigger"
      :class="cn(pickerTriggerClass, props.class)"
    >
      <span :class="cn('min-w-0 flex-1 truncate text-start tabular-nums', !props.label && 'text-muted-foreground')" :data-placeholder="props.label ? undefined : ''">{{
        props.label ?? props.placeholder
      }}</span>
      <component :is="props.icon" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
    </button>
  </NqPopoverTrigger>
</template>

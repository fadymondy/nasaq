<script setup lang="ts">
import { computed, inject, type HTMLAttributes } from "vue";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel } from "../field";
import { FORM } from "./form";

// Label, control, description and error for one field, wired by `name`. The control is the default slot.
interface Props {
  /** The field name; matches the key in `errors`. */
  name: string;
  label?: string;
  description?: string;
  /** Force the invalid state (the form's error for `name` also sets it). */
  invalid?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { invalid: undefined, disabled: false });
const form = inject(FORM, null);
const error = computed(() => form?.errors.value[props.name]);
const invalid = computed(() => props.invalid ?? Boolean(error.value));
// Typing in the control clears its server error (a native input/change event bubbles up to here).
const onEdit = () => form?.clear(props.name);
</script>

<template>
  <NqField :name="props.name" :invalid="invalid" :disabled="props.disabled" :class="props.class" @input="onEdit" @change="onEdit">
    <NqFieldLabel v-if="props.label || $slots.label"><slot name="label">{{ props.label }}</slot></NqFieldLabel>
    <slot />
    <NqFieldDescription v-if="props.description || $slots.description"><slot name="description">{{ props.description }}</slot></NqFieldDescription>
    <NqFieldError>{{ error }}</NqFieldError>
  </NqField>
</template>

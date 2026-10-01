<script setup lang="ts">
import { NqField, NqFieldDescription, NqFieldLabel, NqInput, NqTextarea } from "../field";

// One labelled text input (or textarea) with an optional hint and error. Internal to the landing page editor.
interface Props {
  label: string;
  modelValue: string;
  ltr?: boolean;
  multiline?: boolean;
  hint?: string;
  error?: string;
}
const props = withDefaults(defineProps<Props>(), { ltr: false, multiline: false, hint: undefined, error: undefined });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <NqField :invalid="!!props.error">
    <NqFieldLabel>{{ props.label }}</NqFieldLabel>
    <NqTextarea v-if="props.multiline" :model-value="props.modelValue" dir="auto" :rows="3" @update:model-value="(v: string | number | undefined) => emit('update:modelValue', String(v ?? ''))" />
    <NqInput v-else :model-value="props.modelValue" :ltr="props.ltr" :dir="props.ltr ? 'ltr' : 'auto'" @update:model-value="(v: string | number | undefined) => emit('update:modelValue', String(v ?? ''))" />
    <p v-if="props.error" role="alert" class="text-caption text-nq-danger-text">{{ props.error }}</p>
    <NqFieldDescription v-else-if="props.hint">{{ props.hint }}</NqFieldDescription>
  </NqField>
</template>

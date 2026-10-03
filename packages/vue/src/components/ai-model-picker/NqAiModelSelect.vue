<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { useLabels, type AiModelPickerLabels } from "./strings";
import type { AiModel } from "./types";

// The compact model chooser: one select listing the models. It is what a chat composer shows; NqAiModelPicker is the
// full version with effort and agent.
interface Props {
  models: readonly Pick<AiModel, "id" | "label" | "description">[];
  /** The chosen model id (`v-model`). */
  modelValue?: string;
  disabled?: boolean;
  /** Accessible name of the select. Default "Model" / "النموذج". */
  label?: string;
  labels?: AiModelPickerLabels;
  /** Classes for the trigger. */
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [id: string] }>();
const { t } = useLabels(() => props.labels);
</script>

<template>
  <NqSelect :model-value="props.modelValue" :disabled="props.disabled" @update:model-value="(v) => v != null && emit('update:modelValue', String(v))">
    <NqSelectTrigger data-slot="ai-model-select" :aria-label="props.label ?? t.model" :class="props.class">
      <NqSelectValue />
    </NqSelectTrigger>
    <NqSelectContent>
      <NqSelectItem v-for="m in props.models" :key="m.id" :value="m.id">{{ m.label }}</NqSelectItem>
    </NqSelectContent>
  </NqSelect>
</template>

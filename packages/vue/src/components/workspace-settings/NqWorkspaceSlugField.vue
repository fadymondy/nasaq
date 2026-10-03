<script setup lang="ts">
import { CircleCheck, CircleX } from "lucide-vue-next";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel } from "../field";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput, NqInputGroupText } from "../input-group";
import { NqSpinner } from "../spinner";
import type { SlugState } from "./types";

// The address field shared by the create form and the settings form: a prefix, the input, and the availability mark.
defineProps<{
  label: string;
  prefix?: string;
  state: SlugState;
  /** The error to show, if any. */
  error?: string;
  /** The hint under the field when there is no error. */
  hint: string;
  disabled?: boolean;
  /** Announce the hint as a status. */
  live?: boolean;
}>();
const model = defineModel<string>({ required: true });
const emit = defineEmits<{ edit: [] }>();

function onInput(v?: string | number) {
  model.value = String(v ?? "").toLowerCase();
  emit("edit");
}
</script>

<template>
  <NqField :invalid="!!error">
    <NqFieldLabel>{{ label }}</NqFieldLabel>
    <NqInputGroup dir="ltr">
      <NqInputGroupAddon v-if="prefix"><NqInputGroupText>{{ prefix }}</NqInputGroupText></NqInputGroupAddon>
      <NqInputGroupInput :model-value="model" autocapitalize="none" autocorrect="off" :spellcheck="false" :disabled="disabled" @update:model-value="onInput" />
      <NqInputGroupAddon v-if="state.status !== 'idle'" align="end">
        <NqSpinner v-if="state.status === 'checking'" class="size-4" />
        <CircleCheck v-else-if="state.status === 'available'" aria-hidden class="text-nq-success-text" />
        <CircleX v-else-if="state.status === 'taken'" aria-hidden class="text-nq-danger-text" />
      </NqInputGroupAddon>
    </NqInputGroup>
    <NqFieldError v-if="error" match>{{ error }}</NqFieldError>
    <NqFieldDescription v-else :role="live && state.status !== 'idle' ? 'status' : undefined">{{ hint }}</NqFieldDescription>
  </NqField>
</template>

<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import NqPublicForm from "./NqPublicForm.vue";
import { contactFormDefinition, type ContactTopic, type FormDefinition, type FormValues } from "./form-model";
import type { PublicFormLabels } from "./labels";

// Name, email, topic, message and a honeypot: NqPublicForm with the contact preset.
interface Props {
  /** What people are writing about. Default: sales, support, something else. */
  topics?: readonly ContactTopic[];
  /** Change the fields, thank-you text or honeypot of the preset. */
  form?: FormDefinition;
  onSubmit?: (data: FormValues) => void | { error?: string } | Promise<void | { error?: string }>;
  defaultValues?: FormValues;
  submitLabel?: string;
  preview?: boolean;
  locale?: string;
  labels?: PublicFormLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { topics: undefined, form: undefined, onSubmit: undefined, defaultValues: undefined, submitLabel: undefined, preview: false, locale: undefined, labels: undefined });
const definition = computed(() => props.form ?? contactFormDefinition(props.topics));
</script>

<template>
  <NqPublicForm :form="definition" :on-submit="props.onSubmit" :default-values="props.defaultValues" :submit-label="props.submitLabel" :preview="props.preview" :locale="props.locale" :labels="props.labels" :class="props.class" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel } from "../field";
import { useSchemaForm } from "./context";
import NqSchemaLeafInput from "./NqSchemaLeafInput.vue";
import type { SchemaTreeLeaf } from "./schema-tree";

// One field of the form: label, control, description and error, in the grid.
interface Props {
  node: SchemaTreeLeaf;
  value: unknown;
  path: string;
}
const props = defineProps<Props>();
const ctx = useSchemaForm();
const field = computed(() => props.node.field);
const message = computed(() => ctx.messageFor(props.path));
const required = computed(() => ctx.states[props.path]?.required ?? props.node.required);
const wide = computed(() => field.value.type === "switch" || (field.value.type === "text" && field.value.multiline) || field.value.width !== "half");
const span = computed(() => (wide.value ? "sm:col-span-2" : ""));
const isSwitch = computed(() => field.value.type === "switch" && !field.value.relation);
</script>

<template>
  <NqField v-if="isSwitch" :data-schema-path="props.path" :invalid="!!message" :disabled="ctx.disabled" :class="cn(span, 'flex-row items-start justify-between gap-4 rounded-control border border-border px-3 py-2.5')">
    <div class="flex min-w-0 flex-col gap-0.5">
      <NqFieldLabel>{{ field.label }}<span v-if="required" aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span></NqFieldLabel>
      <NqFieldDescription v-if="field.description">{{ field.description }}</NqFieldDescription>
      <NqFieldError v-if="message" match>{{ message }}</NqFieldError>
    </div>
    <NqSchemaLeafInput :field="field" :model-value="props.value" :required="required" @update:model-value="(v) => ctx.onChange(props.path, v)" />
  </NqField>
  <NqField v-else :data-schema-path="props.path" :invalid="!!message" :disabled="ctx.disabled" :class="span">
    <NqFieldLabel>{{ field.label }}<span v-if="required" aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span></NqFieldLabel>
    <NqSchemaLeafInput :field="field" :model-value="props.value" :required="required" @update:model-value="(v) => ctx.onChange(props.path, v)" />
    <NqFieldDescription v-if="field.description">{{ field.description }}</NqFieldDescription>
    <NqFieldError v-if="message" match>{{ message }}</NqFieldError>
  </NqField>
</template>

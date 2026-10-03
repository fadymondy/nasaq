<script setup lang="ts">
import { NqField, NqFieldLabel } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";

// A labelled select inside a rule dialog. Internal.
const props = defineProps<{ label: string; items: { value: string; label: string }[]; disabled?: boolean }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <NqField>
    <NqFieldLabel>{{ props.label }}</NqFieldLabel>
    <NqSelect :model-value="model" :disabled="props.disabled" @update:model-value="(v: string | number | null) => v !== null && (model = String(v))">
      <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem v-for="o in props.items" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
  </NqField>
</template>

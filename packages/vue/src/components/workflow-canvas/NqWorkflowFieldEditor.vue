<script setup lang="ts">
import { computed } from "vue";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { fieldText, type WorkflowFieldDef } from "./workflow-model";

// One config field, drawn from its definition.
const props = defineProps<{ def: WorkflowFieldDef; value?: unknown; disabled?: boolean; invalid?: boolean; requiredLabel: string }>();
const emit = defineEmits<{ change: [value: unknown] }>();

const text = computed(() => fieldText(props.value));
const ltr = computed(() => props.def.kind === "url" || props.def.kind === "number");
const onInput = (v: string | number | undefined) => emit("change", props.def.kind === "number" ? (v === "" || v === undefined ? "" : Number(v)) : (v ?? ""));
</script>

<template>
  <NqField v-if="props.def.kind === 'boolean'" :disabled="props.disabled" class="flex-row items-center justify-between gap-3">
    <div class="min-w-0">
      <NqFieldLabel>{{ props.def.label }}</NqFieldLabel>
      <NqFieldDescription v-if="props.def.help">{{ props.def.help }}</NqFieldDescription>
    </div>
    <NqSwitch :model-value="Boolean(props.value)" @update:model-value="(v: boolean) => emit('change', v)" />
  </NqField>
  <NqField v-else :invalid="props.invalid" :disabled="props.disabled">
    <NqFieldLabel>
      {{ props.def.label }}
      <span v-if="props.def.required" aria-hidden="true" class="ms-1 text-nq-danger-text">*</span>
    </NqFieldLabel>
    <NqSelect v-if="props.def.kind === 'select'" :model-value="text || undefined" :disabled="props.disabled" @update:model-value="(v) => emit('change', v ?? '')">
      <NqSelectTrigger>
        <NqSelectValue :placeholder="props.def.placeholder" />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem v-for="o in props.def.options ?? []" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>
    <NqTextarea
      v-else-if="props.def.kind === 'textarea' || props.def.kind === 'code'"
      :model-value="text"
      :placeholder="props.def.placeholder"
      :rows="props.def.kind === 'code' ? 5 : 3"
      :dir="props.def.kind === 'code' ? 'ltr' : undefined"
      :spellcheck="props.def.kind === 'code' ? false : undefined"
      :class="props.def.kind === 'code' ? 'font-mono text-caption' : undefined"
      @update:model-value="(v: string | undefined) => emit('change', v ?? '')"
    />
    <NqInput
      v-else
      :type="props.def.kind === 'number' ? 'number' : 'text'"
      :inputmode="props.def.kind === 'number' ? 'decimal' : props.def.kind === 'url' ? 'url' : undefined"
      :model-value="text"
      :ltr="ltr"
      :placeholder="props.def.placeholder"
      @update:model-value="onInput"
    />
    <NqFieldDescription v-if="props.def.help">{{ props.def.help }}</NqFieldDescription>
    <NqFieldError v-if="props.invalid" match>{{ props.requiredLabel }}</NqFieldError>
  </NqField>
</template>

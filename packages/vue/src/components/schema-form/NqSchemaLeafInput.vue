<script setup lang="ts">
import { computed } from "vue";
import { NqDatePicker } from "../date-picker";
import { NqInput, NqTextarea } from "../field";
import { NqRelationPicker } from "../relation-picker";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { schemaFormDateOf, schemaFormIsoOf, useSchemaForm } from "./context";
import type { SchemaFormField } from "./schema-fields";

// The control of a field, without label or message. Used by single fields and by the items of a list.
interface Props {
  field: SchemaFormField;
  modelValue: unknown;
  id?: string;
  required?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: unknown] }>();

const ctx = useSchemaForm();
const f = computed(() => props.field);
const source = computed(() => (f.value.relation ? (ctx.relations?.[f.value.relation.resource] ?? {}) : {}));
const text = computed(() => (typeof props.modelValue === "string" ? props.modelValue : ""));
const numberText = computed(() => (typeof props.modelValue === "number" && Number.isFinite(props.modelValue) ? String(props.modelValue) : ""));
const ids = computed(() => (Array.isArray(props.modelValue) ? (props.modelValue as string[]) : []));
const aria = computed(() => ({ "aria-label": props.ariaLabel, "aria-invalid": props.invalid || undefined }));
</script>

<template>
  <template v-if="f.relation">
    <NqRelationPicker
      v-if="f.relation.multiple"
      v-bind="source"
      multiple
      :id="props.id"
      :invalid="props.invalid"
      :disabled="ctx.disabled"
      :aria-label="props.ariaLabel ?? f.label"
      :locale="ctx.locale"
      :model-value="ids"
      @update:model-value="(next) => emit('update:modelValue', next)"
    />
    <NqRelationPicker
      v-else
      v-bind="source"
      :id="props.id"
      :invalid="props.invalid"
      :disabled="ctx.disabled"
      :aria-label="props.ariaLabel ?? f.label"
      :locale="ctx.locale"
      :model-value="typeof props.modelValue === 'string' && props.modelValue ? props.modelValue : null"
      @update:model-value="(next) => emit('update:modelValue', next ?? '')"
    />
  </template>

  <template v-else-if="f.type === 'text'">
    <NqTextarea v-if="f.multiline" :id="props.id" :model-value="text" :disabled="ctx.disabled" :placeholder="f.placeholder" :required="props.required" :dir="f.ltr ? 'ltr' : undefined" v-bind="aria" @update:model-value="(v?: string) => emit('update:modelValue', v ?? '')" />
    <NqInput v-else :id="props.id" :model-value="text" :type="f.inputType ?? 'text'" :ltr="f.ltr" :disabled="ctx.disabled" :placeholder="f.placeholder" :required="props.required" v-bind="aria" @update:model-value="(v?: string | number) => emit('update:modelValue', String(v ?? ''))" />
  </template>

  <div v-else-if="f.type === 'number'" class="relative">
    <NqInput
      :id="props.id"
      ltr
      type="number"
      :inputmode="f.integer ? 'numeric' : 'decimal'"
      :model-value="numberText"
      :min="f.min"
      :max="f.max"
      :step="f.step ?? (f.integer ? 1 : 'any')"
      :placeholder="f.placeholder"
      :disabled="ctx.disabled"
      :required="props.required"
      v-bind="aria"
      :class="f.unit ? 'pe-12' : undefined"
      @update:model-value="(v?: string | number) => emit('update:modelValue', v === '' || v === undefined ? null : Number(v))"
    />
    <span v-if="f.unit" class="pointer-events-none absolute inset-y-0 end-3 flex items-center text-body-sm text-muted-foreground">{{ f.unit }}</span>
  </div>

  <NqSelect v-else-if="f.type === 'select'" :model-value="typeof props.modelValue === 'string' ? props.modelValue : undefined" :disabled="ctx.disabled" @update:model-value="(next) => emit('update:modelValue', next ?? null)">
    <NqSelectTrigger :id="props.id" :aria-label="props.ariaLabel" :invalid="props.invalid">
      <NqSelectValue :placeholder="f.placeholder ?? ctx.t.select" />
    </NqSelectTrigger>
    <NqSelectContent>
      <NqSelectItem v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
    </NqSelectContent>
  </NqSelect>

  <NqSwitch v-else-if="f.type === 'switch'" :id="props.id" :model-value="props.modelValue === true" :disabled="ctx.disabled" :aria-label="props.ariaLabel ?? f.label" @update:model-value="(next: boolean) => emit('update:modelValue', next)" />

  <NqDatePicker
    v-else-if="f.type === 'date'"
    :id="props.id"
    :model-value="schemaFormDateOf(props.modelValue)"
    :disabled="ctx.disabled"
    :min="schemaFormDateOf(f.min) ?? undefined"
    :max="schemaFormDateOf(f.max) ?? undefined"
    :aria-label="props.ariaLabel ?? f.label"
    @update:model-value="(next) => emit('update:modelValue', next ? schemaFormIsoOf(next) : null)"
  />
</template>

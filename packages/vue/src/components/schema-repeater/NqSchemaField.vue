<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqDatePicker } from "../date-picker";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { dateOf, isoOf, schemaStrings, useSchema } from "./context";
import NqSchemaRows from "./NqSchemaRows.vue";
import type { FieldIssue, SchemaField, SchemaRow } from "./schema";

// One field of a row: the control that matches its type, with label, description and error.
interface Props {
  field: SchemaField;
  rowId: string;
  modelValue: unknown;
  issue?: FieldIssue;
  serverIssue?: FieldIssue;
  disabled: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ "update:modelValue": [value: unknown] }>();

const { locale, showErrors, touched, touch } = useSchema();
const t = computed(() => schemaStrings(locale.value));
const path = computed(() => `${props.rowId}.${props.field.key}`);
const revealed = computed(() => showErrors.value || touched.value.has(path.value));
const message = computed(() => props.serverIssue?.message ?? (revealed.value ? props.issue?.message : undefined));
const f = computed(() => props.field);
const span = computed(() => (f.value.type === "switch" || f.value.type === "repeater" || (f.value.type === "text" && f.value.multiline) || f.value.width !== "half" ? "sm:col-span-2" : ""));
const nestedMin = computed(() => (f.value.type === "repeater" ? Math.max(f.value.min ?? 0, f.value.required ? 1 : 0) : 0));

function set(value: unknown) {
  touch(path.value);
  emit("update:modelValue", value);
}
const text = computed(() => (typeof props.modelValue === "string" ? props.modelValue : ""));
const numberText = computed(() => (typeof props.modelValue === "number" && Number.isFinite(props.modelValue) ? String(props.modelValue) : ""));
function setNumber(raw: string | number | undefined) {
  set(raw === "" || raw === undefined ? null : Number(raw));
}
</script>

<template>
  <fieldset v-if="f.type === 'repeater'" data-slot="schema-repeater-nested" :disabled="props.disabled" class="flex min-w-0 flex-col gap-2 border-0 p-0 sm:col-span-2">
    <legend class="mb-1 text-label text-foreground">
      {{ f.label }}<span v-if="f.required" aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span>
    </legend>
    <p v-if="f.description" class="-mt-1 text-caption text-muted-foreground">{{ f.description }}</p>
    <NqSchemaRows
      :model-value="Array.isArray(props.modelValue) ? (props.modelValue as SchemaRow[]) : []"
      :fields="f.fields"
      :issues="props.issue?.rows ?? []"
      :server-issues="props.serverIssue?.rows"
      :min="nestedMin || undefined"
      :max="f.max"
      :label="f.label"
      :title-key="f.titleKey"
      :add-label="f.addLabel"
      @update:model-value="(next: SchemaRow[]) => set(next)"
    />
    <p v-if="message" role="alert" class="text-caption text-nq-danger-text">{{ message }}</p>
  </fieldset>

  <NqField v-else-if="f.type === 'switch'" :invalid="!!message" :disabled="props.disabled" :class="cn(span, 'flex-row items-start justify-between gap-4 rounded-control border border-border px-3 py-2.5')">
    <div class="flex min-w-0 flex-col gap-0.5">
      <NqFieldLabel>{{ f.label }}<span v-if="f.required" aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span></NqFieldLabel>
      <NqFieldDescription v-if="f.description">{{ f.description }}</NqFieldDescription>
      <NqFieldError match v-if="message">{{ message }}</NqFieldError>
    </div>
    <NqSwitch :model-value="props.modelValue === true" :disabled="props.disabled" :aria-label="f.label" @update:model-value="(next: boolean) => set(next)" />
  </NqField>

  <NqField v-else :invalid="!!message" :disabled="props.disabled" :class="span">
    <NqFieldLabel>{{ f.label }}<span v-if="f.required" aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span></NqFieldLabel>

    <template v-if="f.type === 'text'">
      <NqTextarea v-if="f.multiline" :model-value="text" :disabled="props.disabled" :placeholder="f.placeholder" :required="f.required" :dir="f.ltr ? 'ltr' : undefined" @update:model-value="(v?: string) => set(v ?? '')" @blur="touch(path)" />
      <NqInput
        v-else
        :model-value="text"
        :type="f.inputType ?? 'text'"
        :ltr="f.ltr || f.inputType === 'email' || f.inputType === 'url' || f.inputType === 'tel'"
        :disabled="props.disabled"
        :placeholder="f.placeholder"
        :required="f.required"
        @update:model-value="(v?: string | number) => set(String(v ?? ''))"
        @blur="touch(path)"
      />
    </template>

    <div v-else-if="f.type === 'number'" class="relative">
      <NqInput
        ltr
        type="number"
        :inputmode="f.integer ? 'numeric' : 'decimal'"
        :model-value="numberText"
        :min="f.min"
        :max="f.max"
        :step="f.step ?? (f.integer ? 1 : 'any')"
        :placeholder="f.placeholder"
        :disabled="props.disabled"
        :class="f.unit ? 'pe-12' : undefined"
        @update:model-value="setNumber"
        @blur="touch(path)"
      />
      <span v-if="f.unit" class="pointer-events-none absolute inset-y-0 end-3 flex items-center text-body-sm text-muted-foreground">{{ f.unit }}</span>
    </div>

    <NqSelect v-else-if="f.type === 'select'" :model-value="typeof props.modelValue === 'string' ? props.modelValue : undefined" :disabled="props.disabled" @update:model-value="(next) => set(next ?? null)">
      <NqSelectTrigger :invalid="!!message" @blur="touch(path)">
        <NqSelectValue :placeholder="f.placeholder ?? t.select" />
      </NqSelectTrigger>
      <NqSelectContent>
        <NqSelectItem v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
      </NqSelectContent>
    </NqSelect>

    <NqDatePicker
      v-else-if="f.type === 'date'"
      :model-value="dateOf(props.modelValue)"
      :disabled="props.disabled"
      :min="dateOf(f.min) ?? undefined"
      :max="dateOf(f.max) ?? undefined"
      :aria-label="f.label"
      @update:model-value="(next) => set(next ? isoOf(next) : null)"
    />

    <NqFieldDescription v-if="f.description">{{ f.description }}</NqFieldDescription>
    <NqFieldError match v-if="message">{{ message }}</NqFieldError>
  </NqField>
</template>

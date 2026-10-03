<script setup lang="ts">
import { CircleCheck } from "lucide-vue-next";
import { computed, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqPhoneInput } from "../phone-input";
import { NqRadio, NqRadioGroup } from "../radio-group";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { buildFormSubmission, FORM_HONEYPOT, formFieldStates, formText, validateFormValues, type FormDefinition, type FormErrorCode, type FormValues } from "./form-model";
import { usePublicFormStrings, type PublicFormLabels } from "./labels";

// Renders a FormDefinition for visitors: fields, show/hide/require rules, validation in the visitor language, a honeypot and a thank-you.
// `onSubmit` gets the visible answers; return or throw `{ error }` to keep the form.
interface Props {
  form: FormDefinition;
  /** Called with the visible answers when valid. Resolve `{ error }` or throw to show a message and keep the form. Spam never reaches it. */
  onSubmit?: (data: FormValues) => void | { error?: string } | Promise<void | { error?: string }>;
  defaultValues?: FormValues;
  /** Text of the submit button. Default "Send". */
  submitLabel?: string;
  /** Validate only, never send: for the builder live preview. */
  preview?: boolean;
  locale?: string;
  labels?: PublicFormLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onSubmit: undefined, defaultValues: undefined, submitLabel: undefined, preview: false, locale: undefined, labels: undefined });

const { locale, t } = usePublicFormStrings(
  () => props.locale,
  () => props.labels,
);
const formEl = ref<HTMLFormElement | null>(null);
const values = ref<FormValues>({ ...props.defaultValues });
const errors = ref<Record<string, FormErrorCode>>({});
const busy = ref(false);
const done = ref(false);
const failure = ref<string | null>(null);
const states = computed(() => formFieldStates(props.form, values.value));
watch(
  () => props.defaultValues,
  (v) => (values.value = { ...v }),
);

const text = (id: string) => (typeof values.value[id] === "string" ? (values.value[id] as string) : "");
const opt = (o: { label: string; labelAr?: string }) => formText(o.label, o.labelAr, locale.value);
function set(id: string, value: string | boolean) {
  values.value = { ...values.value, [id]: value };
  if (errors.value[id]) {
    const { [id]: _drop, ...rest } = errors.value;
    errors.value = rest;
  }
}

async function submit() {
  const found = validateFormValues(props.form, values.value);
  errors.value = found;
  failure.value = null;
  const first = props.form.fields.find((f) => found[f.id]);
  if (first) {
    await nextTick();
    formEl.value?.querySelector<HTMLElement>(`[data-field="${first.id}"] :is(input, textarea, button, [role=radio]):not([type=hidden])`)?.focus();
    return;
  }
  if (props.preview) return;
  const { data, spam } = buildFormSubmission(props.form, values.value);
  if (spam) {
    done.value = true;
    return;
  }
  busy.value = true;
  try {
    const result = await props.onSubmit?.(data);
    if (result && typeof result === "object" && result.error) failure.value = result.error;
    else done.value = true;
  } catch {
    failure.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}
function again() {
  values.value = { ...props.defaultValues };
  done.value = false;
}
</script>

<template>
  <p v-if="!props.form.enabled && !props.preview" data-slot="public-form" data-state="closed" role="status" :class="cn('rounded-card border border-border bg-nq-surface-soft p-4 text-body-sm text-muted-foreground', props.class)">
    {{ t.closed }}
  </p>
  <div v-else-if="done" data-slot="public-form" data-state="done" role="status" :class="cn('flex flex-col items-start gap-3 rounded-card border border-border bg-card p-5', props.class)">
    <CircleCheck aria-hidden="true" class="size-6 text-nq-success" />
    <p class="text-body">{{ formText(props.form.thanksEn, props.form.thanksAr, locale) }}</p>
    <NqButton type="button" variant="link" class="px-0" @click="again">{{ t.another }}</NqButton>
  </div>
  <form v-else ref="formEl" data-slot="public-form" :data-kind="props.form.kind" novalidate :class="cn('relative flex w-full flex-col gap-4', props.class)" @submit.prevent="submit">
    <template v-for="f in props.form.fields" :key="f.id">
      <NqField v-if="states[f.id]?.visible" :invalid="Boolean(errors[f.id])" :data-field="f.id">
        <label v-if="f.kind === 'checkbox'" class="flex items-start gap-2 text-body">
          <NqCheckbox :model-value="values[f.id] === true" class="mt-1" :aria-invalid="errors[f.id] ? true : undefined" @update:model-value="(c: boolean | 'indeterminate') => set(f.id, c === true)" />
          <span>{{ formText(f.label, f.labelAr, locale) }}</span>
        </label>
        <NqFieldLabel v-else>
          {{ formText(f.label, f.labelAr, locale) }}
          <span v-if="!states[f.id]?.required" class="ms-1 font-normal text-muted-foreground">({{ t.optional }})</span>
        </NqFieldLabel>
        <NqTextarea
          v-if="f.kind === 'textarea'"
          :rows="4"
          :model-value="text(f.id)"
          :required="states[f.id]?.required"
          :aria-invalid="errors[f.id] ? true : undefined"
          :placeholder="formText(f.placeholder, f.placeholderAr, locale) || undefined"
          @update:model-value="(v: string | number | undefined) => set(f.id, String(v ?? ''))"
        />
        <NqPhoneInput v-else-if="f.kind === 'phone'" :model-value="text(f.id)" :invalid="Boolean(errors[f.id])" @update:model-value="(v: string) => set(f.id, v)" />
        <NqSelect v-else-if="f.kind === 'select'" :model-value="text(f.id) || null" @update:model-value="(v) => set(f.id, typeof v === 'string' ? v : '')">
          <NqSelectTrigger :aria-invalid="errors[f.id] ? true : undefined">
            <NqSelectValue :placeholder="formText(f.placeholder, f.placeholderAr, locale) || t.choose" />
          </NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="o in f.options ?? []" :key="o.value" :value="o.value">{{ opt(o) }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
        <NqRadioGroup v-else-if="f.kind === 'radio'" :model-value="text(f.id)" :aria-invalid="errors[f.id] ? true : undefined" @update:model-value="(v: string) => set(f.id, String(v))">
          <label v-for="o in f.options ?? []" :key="o.value" class="flex items-center gap-2 text-body">
            <NqRadio :value="o.value" />
            {{ opt(o) }}
          </label>
        </NqRadioGroup>
        <NqInput
          v-else-if="f.kind !== 'checkbox'"
          type="text"
          :model-value="text(f.id)"
          :required="states[f.id]?.required"
          :ltr="f.kind === 'email' || f.kind === 'number'"
          :inputmode="f.kind === 'email' ? 'email' : f.kind === 'number' ? 'decimal' : undefined"
          :autocomplete="f.kind === 'email' ? 'email' : undefined"
          :aria-invalid="errors[f.id] ? true : undefined"
          :placeholder="formText(f.placeholder, f.placeholderAr, locale) || undefined"
          @update:model-value="(v: string | number | undefined) => set(f.id, String(v ?? ''))"
        />
        <NqFieldDescription v-if="formText(f.help, f.helpAr, locale)">{{ formText(f.help, f.helpAr, locale) }}</NqFieldDescription>
        <NqFieldError v-if="errors[f.id]" match>{{ t.errors[errors[f.id]!] }}</NqFieldError>
      </NqField>
    </template>

    <div v-if="props.form.honeypot" aria-hidden="true" class="pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
      <label>
        {{ t.honeypot }}
        <input type="text" :name="FORM_HONEYPOT" tabindex="-1" autocomplete="off" :value="String(values[FORM_HONEYPOT] ?? '')" @input="set(FORM_HONEYPOT, ($event.target as HTMLInputElement).value)" />
      </label>
    </div>

    <p v-if="failure" role="alert" class="text-body-sm text-nq-danger-text">{{ failure }}</p>
    <div class="flex flex-wrap items-center gap-3">
      <NqButton type="submit" :loading="busy">{{ props.submitLabel ?? t.submit }}</NqButton>
      <span v-if="props.preview" class="text-caption text-muted-foreground">{{ t.preview }}</span>
    </div>
  </form>
</template>

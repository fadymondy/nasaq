<script setup lang="ts">
import { Clock } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqInput } from "../field";
import { isTimeInRange, parseTimeInput, stepTimeValue } from "./time-fields-model";
import { useTimeFieldsLocale, type TimeFieldsLabels } from "./time-fields-shared";

// A 24 hour time field you type into. Type 930 and it becomes 09:30; 9 becomes 09:00; 9.30, 9:30, 0930 and 9:30 pm all work.
// Arrow keys step by `step` minutes, PageUp / PageDown by an hour, Escape puts back the last accepted time.
interface Props {
  /** The time as "HH:mm" (24 hour), or null / "" when empty. Use `v-model`. */
  modelValue?: string | null;
  defaultValue?: string | null;
  /** Earliest and latest time accepted, "HH:mm". */
  min?: string;
  max?: string;
  /** Minutes an arrow key moves the time, snapped to the step. Default 5. PageUp and PageDown move an hour. */
  step?: number;
  /** Accept 24:00 as the end of the day. */
  allowEndOfDay?: boolean;
  /** Hide the "Will be 09:30" preview under the field while typing. */
  hidePreview?: boolean;
  /** An error from outside (for example "The end must be after the start"). Shown in place of the built-in ones. */
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** Form field name: a hidden input carries the normalised "HH:mm". */
  name?: string;
  /** Id of the text input, so a `<label for>` can point at it. */
  inputId?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Text overrides. */
  labels?: Partial<TimeFieldsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
  min: undefined,
  max: undefined,
  step: 5,
  error: undefined,
  name: undefined,
  inputId: undefined,
  placeholder: undefined,
  ariaLabel: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  /** A typed time was accepted (blur or Enter) or stepped. */
  valueChange: [value: string | null];
}>();

const { t } = useTimeFieldsLocale(() => props.labels);
const autoId = useId();
const id = computed(() => props.inputId ?? `${autoId}-input`);
const messageId = `${autoId}-message`;

const inner = ref<string | null>(props.defaultValue || null);
const value = computed(() => (props.modelValue !== undefined ? props.modelValue || null : inner.value));
const text = ref(value.value ?? "");
const problem = ref<"invalid" | "range" | null>(null);
let typing = false;

// Follow the value when it changes from outside, but never overwrite what a person is typing.
watch(value, (v) => {
  if (!typing) {
    text.value = v ?? "";
    problem.value = null;
  }
});

function commit(next: string | null) {
  const changed = next !== value.value;
  inner.value = next;
  text.value = next ?? "";
  problem.value = null;
  if (changed) {
    emit("update:modelValue", next);
    emit("valueChange", next);
  }
}

function accept(raw: string) {
  typing = false;
  if (!raw.trim()) return commit(null);
  const parsed = parseTimeInput(raw, { allowEndOfDay: props.allowEndOfDay });
  if (!parsed) {
    problem.value = "invalid";
    return;
  }
  if (!isTimeInRange(parsed, props.min, props.max)) {
    problem.value = "range";
    return;
  }
  commit(parsed);
}

const parsedNow = computed(() => (text.value.trim() ? parseTimeInput(text.value, { allowEndOfDay: props.allowEndOfDay }) : null));
const preview = computed(() => (!props.hidePreview && parsedNow.value && parsedNow.value !== text.value.trim() && !problem.value ? parsedNow.value : null));
const message = computed(
  () => props.error ?? (problem.value === "invalid" ? t.value.invalid : problem.value === "range" ? t.value.outOfRange(props.min ?? "00:00", props.max ?? "23:59") : null),
);
const invalid = computed(() => Boolean(message.value));

function stepBy(delta: number) {
  typing = false;
  const current = parseTimeInput(text.value, { allowEndOfDay: props.allowEndOfDay }) ?? value.value;
  commit(stepTimeValue(current, delta, { min: props.min, max: props.max }));
}

function onInput(raw: string | number | undefined) {
  typing = true;
  text.value = String(raw ?? "");
  if (problem.value) problem.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (props.readOnly || props.disabled) return;
  if (event.key === "Enter") accept((event.target as HTMLInputElement).value);
  else if (event.key === "Escape") {
    typing = false;
    text.value = value.value ?? "";
    problem.value = null;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    stepBy(props.step);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    stepBy(-props.step);
  } else if (event.key === "PageUp") {
    event.preventDefault();
    stepBy(60);
  } else if (event.key === "PageDown") {
    event.preventDefault();
    stepBy(-60);
  }
}
</script>

<template>
  <div data-slot="time-field" :class="cn('flex min-w-0 flex-col gap-1', props.class)">
    <div class="relative">
      <Clock aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
      <NqInput
        :id="id"
        ltr
        inputmode="numeric"
        autocomplete="off"
        :spellcheck="false"
        :model-value="text"
        :disabled="props.disabled"
        :readonly="props.readOnly"
        :required="props.required"
        :placeholder="props.placeholder ?? t.placeholder"
        :aria-label="props.ariaLabel ?? (props.inputId ? undefined : t.time)"
        :aria-invalid="invalid || undefined"
        :aria-describedby="message || preview ? messageId : undefined"
        class="ps-9 tabular-nums"
        @update:model-value="onInput"
        @blur="(e: FocusEvent) => accept((e.target as HTMLInputElement).value)"
        @keydown="onKeydown"
      />
      <input v-if="props.name" type="hidden" :name="props.name" :value="value ?? ''" />
    </div>
    <p :id="messageId" aria-live="polite" :class="cn('min-h-4 text-caption empty:hidden', invalid ? 'text-nq-danger-text' : 'text-muted-foreground')">
      <template v-if="message">{{ message }}</template>
      <template v-else-if="preview">{{ t.becomes }} <bdi dir="ltr" class="font-mono text-foreground">{{ preview }}</bdi></template>
    </p>
  </div>
</template>

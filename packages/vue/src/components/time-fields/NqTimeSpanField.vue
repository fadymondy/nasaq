<script setup lang="ts">
import { MoveRight } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import NqTimeField from "./NqTimeField.vue";
import { formatTimeSpan, timeSpanMinutes, type TimeSpan } from "./time-fields-model";
import { useTimeFieldsLocale, type TimeFieldsLabels } from "./time-fields-shared";

// A start and an end time side by side, for opening hours, shifts and quiet hours. Each side is a NqTimeField, so 800 and 1730
// are enough. It shows how long the span is; an end before the start is an error unless `allowOvernight` makes it the next day.
interface Props {
  /** Start and end as "HH:mm". Use `v-model`. */
  modelValue?: TimeSpan;
  defaultValue?: TimeSpan;
  /** An end before the start means the next day (a night shift), shown with a badge. Default false: it is an error. */
  allowOvernight?: boolean;
  /** Show the length ("8h 30m") after the two fields. Default true. */
  showDuration?: boolean;
  step?: number;
  min?: string;
  max?: string;
  disabled?: boolean;
  labels?: Partial<TimeFieldsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: () => ({ start: "09:00", end: "17:00" }),
  showDuration: true,
  step: undefined,
  min: undefined,
  max: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: TimeSpan];
  valueChange: [value: TimeSpan];
}>();

const { t, locale } = useTimeFieldsLocale(() => props.labels);
const inner = ref<TimeSpan>(props.defaultValue);
const span = computed(() => props.modelValue ?? inner.value);
function update(patch: Partial<TimeSpan>) {
  const next = { ...span.value, ...patch };
  inner.value = next;
  emit("update:modelValue", next);
  emit("valueChange", next);
}
const minutes = computed(() => timeSpanMinutes(span.value, props.allowOvernight));
const overnight = computed(() => props.allowOvernight && span.value.end < span.value.start);
const backwards = computed(() => !props.allowOvernight && span.value.start && span.value.end && span.value.end < span.value.start);
</script>

<template>
  <div data-slot="time-span-field" role="group" :aria-label="t.span" :class="cn('flex min-w-0 flex-col gap-1.5', props.class)">
    <div class="flex flex-wrap items-start gap-x-2 gap-y-1">
      <NqTimeField
        :model-value="span.start || null"
        :aria-label="t.start"
        :step="props.step"
        :min="props.min"
        :max="props.max"
        :disabled="props.disabled"
        :labels="props.labels"
        class="w-32"
        @update:model-value="(v) => update({ start: v ?? '' })"
      />
      <MoveRight aria-hidden="true" class="mt-2.5 size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
      <NqTimeField
        :model-value="span.end || null"
        :aria-label="t.end"
        :step="props.step"
        :min="props.min"
        :max="props.max"
        :disabled="props.disabled"
        :labels="props.labels"
        :error="backwards ? t.endBeforeStart : undefined"
        class="w-32"
        @update:model-value="(v) => update({ end: v ?? '' })"
      />
      <NqBadge v-if="overnight" variant="info" class="mt-1.5">{{ t.overnight }}</NqBadge>
    </div>
    <p v-if="props.showDuration && minutes !== null" class="text-caption text-muted-foreground">
      {{ t.duration }}: <bdi dir="ltr" class="font-medium text-foreground tabular-nums">{{ formatTimeSpan(minutes, locale) }}</bdi>
    </p>
  </div>
</template>

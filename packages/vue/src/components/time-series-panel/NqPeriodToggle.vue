<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqToggle, NqToggleGroup } from "../toggle-group";

// Segmented "7 days / 28 days / 90 days" control that pages use to set the reporting period (`v-model` is the number of days).
const STRINGS = {
  en: { period: "Period", lastDays: (n: number) => `${n} days` },
  ar: { period: "الفترة", lastDays: (n: number) => `${n} يومًا` },
};
export type PeriodToggleLabels = typeof STRINGS.en;

const props = withDefaults(
  defineProps<{
    /** Period lengths in days. Default 7, 28, 90. */
    options?: readonly number[];
    modelValue: number;
    labels?: Partial<PeriodToggleLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { options: () => [7, 28, 90], labels: undefined },
);
const emit = defineEmits<{ "update:modelValue": [days: number] }>();
const t = useAnalyticsLabels(STRINGS, () => props.labels);
const value = computed(() => [String(props.modelValue)]);
</script>

<template>
  <NqToggleGroup :aria-label="t.period" :class="props.class" :model-value="value" @update:model-value="(v) => v[0] && emit('update:modelValue', Number(v[0]))">
    <NqToggle v-for="n in options" :key="n" :value="String(n)">{{ t.lastDays(n) }}</NqToggle>
  </NqToggleGroup>
</template>

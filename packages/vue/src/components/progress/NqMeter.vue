<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { fillClass, fillTone, formatGauge, headClass, labelClass, rootClass, toFraction, trackVariants, valueClass, type ProgressSize, type ProgressTone } from "./variants";

// A quantity against a limit: seats used, storage, monthly budget. It never animates and is never indeterminate.
// The fill turns warning past `warnAt` and danger past `dangerAt`.
interface Props {
  /** Current amount within `min`..`max`. */
  value: number;
  /** Fraction of the range (0 to 1) at which the fill turns warning. Default 0.8. */
  warnAt?: number;
  /** Fraction of the range (0 to 1) at which the fill turns danger. Default 0.95. */
  dangerAt?: number;
  /** Forces a tone instead of deriving it from the thresholds. */
  tone?: ProgressTone;
  label?: string;
  showValue?: boolean;
  valueText?: string;
  format?: Intl.NumberFormatOptions;
  locale?: string;
  size?: ProgressSize;
  min?: number;
  max?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { warnAt: 0.8, dangerAt: 0.95, size: "md", min: 0, max: 100, tone: undefined, label: undefined, showValue: undefined, valueText: undefined, format: undefined, locale: undefined });
const id = useId();
const nq = useNasaq();
const fraction = computed(() => toFraction(props.value, props.min, props.max));
const derived = computed<ProgressTone>(() => props.tone ?? (fraction.value >= props.dangerAt ? "danger" : fraction.value >= props.warnAt ? "warning" : "default"));
const formatted = computed(() => formatGauge(props.value, props.locale ?? nq.locale.value, props.format));
const shown = computed(() => props.showValue ?? props.label !== undefined);
</script>

<template>
  <div
    data-slot="meter"
    :data-tone="derived"
    role="meter"
    :aria-labelledby="props.label !== undefined ? `${id}-label` : undefined"
    :aria-valuemin="props.min"
    :aria-valuemax="props.max"
    :aria-valuenow="props.value"
    :aria-valuetext="formatted"
    :class="cn(rootClass, props.class)"
  >
    <div v-if="props.label !== undefined || shown" data-slot="progress-head" :class="headClass">
      <span v-if="props.label !== undefined" :id="`${id}-label`" :class="labelClass">{{ props.label }}</span>
      <span v-else />
      <span v-if="shown" aria-hidden="true" :class="valueClass">{{ props.valueText ?? formatted }}</span>
    </div>
    <div data-slot="meter-track" :class="trackVariants({ size: props.size })">
      <div data-slot="meter-indicator" :class="cn(fillClass, fillTone[derived])" :style="{ insetInlineStart: 0, width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }" />
    </div>
  </div>
</template>

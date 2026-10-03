<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { fillClass, fillTone, formatGauge, headClass, labelClass, rootClass, toFraction, trackVariants, valueClass, type ProgressSize, type ProgressTone } from "../progress/variants";

// The Meter markup with a rich label (icon + text) and a rich value (an isolated number), which NqMeter's string
// props cannot carry. Same slots, classes and ARIA as NqMeter.
interface Props {
  /** Accessible name; also the default label text. */
  label: string;
  value: number;
  /** The figure shown at the inline end; the default slot of `value`. */
  valueText?: string;
  size?: ProgressSize;
  warnAt?: number;
  dangerAt?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { valueText: undefined, size: "md", warnAt: 0.8, dangerAt: 0.95 });
const id = useId();
const nq = useNasaq();
const fraction = computed(() => toFraction(props.value, 0, 100));
const tone = computed<ProgressTone>(() => (fraction.value >= props.dangerAt ? "danger" : fraction.value >= props.warnAt ? "warning" : "default"));
const formatted = computed(() => formatGauge(props.value, nq.locale.value));
</script>

<template>
  <div
    data-slot="meter"
    :data-tone="tone"
    role="meter"
    :aria-labelledby="`${id}-label`"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="props.value"
    :aria-valuetext="formatted"
    :class="cn(rootClass, props.class)"
  >
    <div data-slot="progress-head" :class="headClass">
      <span :id="`${id}-label`" :class="labelClass"><slot name="label">{{ props.label }}</slot></span>
      <span aria-hidden="true" :class="valueClass"><slot name="value">{{ props.valueText ?? formatted }}</slot></span>
    </div>
    <div data-slot="meter-track" :class="trackVariants({ size: props.size })">
      <div data-slot="meter-indicator" :class="cn(fillClass, fillTone[tone])" :style="{ insetInlineStart: 0, width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }" />
    </div>
  </div>
</template>

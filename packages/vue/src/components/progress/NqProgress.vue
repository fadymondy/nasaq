<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { fillClass, fillTone, formatGauge, headClass, labelClass, rootClass, toFraction, trackVariants, valueClass, type ProgressSize, type ProgressTone } from "./variants";

// A bar for work in progress: an upload, an import, a setup. `:value="null"` shows an indeterminate pulse.
// For a quantity measured against a limit (seats, storage, budget), use NqMeter.
interface Props {
  /** Current value. `null` is indeterminate: work is running and its length is unknown. */
  value: number | null;
  tone?: ProgressTone;
  /** Visible name shown above the bar. Without it, pass `aria-label`. */
  label?: string;
  /** Show the formatted value at the inline end of the label row. Default true when `label` is set. */
  showValue?: boolean;
  /** Replaces the formatted value text, e.g. "45 of 50 seats". Spoken value stays the number. */
  valueText?: string;
  /** `Intl.NumberFormat` options for the value. Default: the value as a percentage of the range. */
  format?: Intl.NumberFormatOptions;
  /** Locale for number formatting. Defaults to the runtime locale. */
  locale?: string;
  size?: ProgressSize;
  min?: number;
  max?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tone: "default", size: "md", min: 0, max: 100, label: undefined, showValue: undefined, valueText: undefined, format: undefined, locale: undefined });
const id = useId();
const nq = useNasaq();
const indeterminate = computed(() => props.value === null);
const formatted = computed(() => (props.value === null ? undefined : formatGauge(props.value, props.locale ?? nq.locale.value, props.format)));
const shown = computed(() => props.showValue ?? props.label !== undefined);
const pct = computed(() => (props.value === null ? 0 : toFraction(props.value, props.min, props.max) * 100));
const status = computed(() => (indeterminate.value ? "indeterminate" : props.value! >= props.max ? "complete" : "progressing"));
</script>

<template>
  <div
    data-slot="progress"
    :data-tone="props.tone"
    role="progressbar"
    :aria-labelledby="props.label !== undefined ? `${id}-label` : undefined"
    :aria-valuemin="props.min"
    :aria-valuemax="props.max"
    :aria-valuenow="props.value ?? undefined"
    :aria-valuetext="indeterminate ? 'indeterminate progress' : formatted"
    :data-progressing="status === 'progressing' ? '' : undefined"
    :data-complete="status === 'complete' ? '' : undefined"
    :data-indeterminate="status === 'indeterminate' ? '' : undefined"
    :class="cn(rootClass, props.class)"
  >
    <div v-if="props.label !== undefined || shown" data-slot="progress-head" :class="headClass">
      <span v-if="props.label !== undefined" :id="`${id}-label`" :class="labelClass">{{ props.label }}</span>
      <span v-else />
      <span v-if="shown && !indeterminate" aria-hidden="true" :class="valueClass">{{ props.valueText ?? formatted }}</span>
    </div>
    <div
      data-slot="progress-track"
      :class="trackVariants({ size: props.size })"
      :data-progressing="status === 'progressing' ? '' : undefined"
      :data-complete="status === 'complete' ? '' : undefined"
      :data-indeterminate="status === 'indeterminate' ? '' : undefined"
    >
      <div
        data-slot="progress-indicator"
        :class="cn(fillClass, fillTone[props.tone], indeterminate && 'w-full motion-safe:animate-pulse')"
        :style="indeterminate ? { insetInlineStart: 0 } : { insetInlineStart: 0, width: `${pct}%` }"
        :data-progressing="status === 'progressing' ? '' : undefined"
        :data-complete="status === 'complete' ? '' : undefined"
        :data-indeterminate="status === 'indeterminate' ? '' : undefined"
      />
    </div>
  </div>
</template>

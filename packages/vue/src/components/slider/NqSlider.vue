<script setup lang="ts">
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from "reka-ui";
import { computed, onBeforeUnmount, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { formatNumber, type FormatNumberOptions } from "../numeric";

export interface SliderMark {
  /** Position on the scale, between `min` and `max`. */
  value: number;
  /** Text under the tick. Omit for a bare tick. */
  label?: string;
}

defineOptions({ inheritAttrs: false });

// A draggable value or range picker. Pass a number for a single thumb, or an array for a range
// (`:default-value="[20, 80]"`). Built on Reka UI Slider: keyboard, pointer and touch. In RTL the track fills from
// the right and ArrowLeft increases the value.
interface Props {
  /** v-model: a number for one thumb, an array for a range. */
  modelValue?: number | number[];
  defaultValue?: number | number[];
  /** Visible name shown above the track. Without it, pass `aria-label`. */
  label?: string;
  /** Show the formatted value at the inline end of the label row. Default true when `label` is set. */
  showValue?: boolean;
  /** `Intl.NumberFormat` options for the value label and the spoken value, e.g. `{ style: "percent" }`. */
  format?: FormatNumberOptions;
  /** Ticks under the track. `true` puts one on every step (only sensible for a few steps). */
  marks?: readonly SliderMark[] | boolean;
  /** Accessible name of each thumb of a range, e.g. `["Minimum price", "Maximum price"]`. */
  thumbLabels?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  name?: string;
  /** Range only: the least number of steps between two thumbs. */
  minStepsBetweenThumbs?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  label: undefined,
  showValue: undefined,
  format: undefined,
  marks: undefined,
  thumbLabels: undefined,
  min: 0,
  max: 100,
  step: 1,
  name: undefined,
  minStepsBetweenThumbs: 0,
});
const emit = defineEmits<{ "update:modelValue": [value: number | number[]]; valueCommit: [value: number[]] }>();

const nq = useNasaq();
const id = useId();
const initial = props.modelValue ?? props.defaultValue ?? props.min;
const range = Array.isArray(initial);
const inner = ref<number[]>(Array.isArray(initial) ? [...initial] : [initial]);
const values = computed(() => {
  const v = props.modelValue ?? inner.value;
  return Array.isArray(v) ? v : [v];
});
function update(next: number[] | undefined) {
  if (!next) return;
  inner.value = [...next];
  emit("update:modelValue", range ? [...next] : (next[0] as number));
}

/** Locale digits are always Latin (Nasaq numbering rule), whatever the UI language. */
const fmt = (n: number) => formatNumber(n, nq.locale.value, props.format);
const list = computed<readonly SliderMark[]>(() => {
  if (!props.marks) return [];
  if (props.marks !== true) return props.marks;
  const out: SliderMark[] = [];
  for (let v = props.min; v <= props.max; v += props.step) out.push({ value: v });
  return out;
});
const withValue = computed(() => props.showValue ?? props.label !== undefined);
const text = computed(() => values.value.map(fmt).join(" – "));

// Base UI marks the thumb being dragged with data-dragging; the React classes style it.
const dragging = ref(false);
const focused = ref(-1);
const stop = () => {
  dragging.value = false;
  window.removeEventListener("pointerup", stop);
};
const start = () => {
  dragging.value = true;
  window.addEventListener("pointerup", stop);
};
onBeforeUnmount(() => window.removeEventListener("pointerup", stop));
</script>

<template>
  <div v-bind="$attrs" data-slot="slider" :data-disabled="props.disabled ? '' : undefined" :class="cn('flex w-full flex-col gap-2 data-disabled:opacity-50', props.class)">
    <div v-if="props.label !== undefined || withValue" data-slot="slider-head" class="flex items-baseline justify-between gap-3 text-body-sm">
      <span v-if="props.label !== undefined" :id="`${id}-label`" class="text-label text-foreground">{{ props.label }}</span>
      <span v-else />
      <output v-if="withValue" data-slot="slider-value" class="text-muted-foreground tabular-nums"><bdi>{{ text }}</bdi></output>
    </div>
    <SliderRoot
      data-slot="slider-control"
      as="div"
      :model-value="values"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :disabled="props.disabled"
      :name="props.name"
      :dir="nq.direction.value"
      :min-steps-between-thumbs="props.minStepsBetweenThumbs"
      class="flex h-5 w-full touch-none select-none items-center"
      @update:model-value="update"
      @value-commit="emit('valueCommit', $event)"
      @pointerdown.capture="start"
    >
      <SliderTrack data-slot="slider-track" as="div" class="relative h-1.5 w-full rounded-full bg-nq-surface-soft">
        <SliderRange data-slot="slider-range" as="div" class="rounded-full bg-primary" style="position: absolute; top: 0; bottom: 0" />
        <SliderThumb
          v-for="(value, i) in values"
          :key="i"
          as="div"
          data-slot="slider-thumb"
          :aria-label="props.thumbLabels?.[i]"
          :aria-labelledby="props.thumbLabels?.[i] === undefined && props.label !== undefined ? `${id}-label` : undefined"
          :aria-valuetext="fmt(value)"
          :data-dragging="dragging && focused === i ? '' : undefined"
          style="top: 50%; translate: 0 -50%"
          class="size-4 rounded-full border border-primary bg-card shadow-xs outline-none transition-[box-shadow] duration-150 ease-nq motion-reduce:transition-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-nq-focus data-dragging:shadow-md data-disabled:pointer-events-none"
          @focus="focused = i"
        />
      </SliderTrack>
    </SliderRoot>
    <div v-if="list.length" data-slot="slider-marks" aria-hidden="true" class="relative h-6 w-full">
      <span
        v-for="mark in list"
        :key="mark.value"
        data-slot="slider-mark"
        :style="{ insetInlineStart: `${props.max === props.min ? 0 : ((mark.value - props.min) / (props.max - props.min)) * 100}%` }"
        class="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 text-caption text-muted-foreground rtl:translate-x-1/2"
      >
        <span class="h-1.5 w-px bg-border" />
        <span v-if="mark.label !== undefined" class="tabular-nums">{{ mark.label }}</span>
      </span>
    </div>
  </div>
</template>

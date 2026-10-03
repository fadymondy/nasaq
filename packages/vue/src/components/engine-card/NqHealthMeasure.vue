<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import type { FormatNumberOptions } from "../numeric";
import { customUnitLabel, formatMeasure, useHealthLabels, type MeasureUnit } from "./health-format";
import { STRINGS } from "./strings";

// A health figure with its unit, "3,000 mL" or "72 bpm". Tabular digits, and an LTR isolate so the number and its
// unit keep their order inside an Arabic sentence.
interface Props {
  value: number;
  unit: MeasureUnit;
  /** Intl options, e.g. `{ maximumFractionDigits: 1 }`. */
  format?: FormatNumberOptions;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { locale, ar } = useHealthLabels(STRINGS);
const text = computed(() => formatMeasure(props.value, props.unit, locale.value, props.format, customUnitLabel(ar.value, props.unit)));
</script>

<template>
  <bdi data-slot="measure" data-numeric="" dir="ltr" :class="cn('tabular-nums [unicode-bidi:isolate]', props.class)">{{ text }}</bdi>
</template>

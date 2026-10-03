<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "./composables";
import type { FormatNumberOptions } from "./format";

// A formatted figure: tabular digits (columns align, values don't jitter as they update) and bidi
// isolation, so "-12.5%" or "SAR 1,200" keeps its order inside Arabic sentences.
interface Props {
  value: number | bigint;
  /** Intl options, e.g. `{ style: "percent" }`, `{ style: "currency", currency: "SAR" }`, `{ notation: "compact" }`. */
  format?: FormatNumberOptions;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const fmt = useFormatNumber();
</script>

<template>
  <bdi data-slot="num" data-numeric="" :class="cn('tabular-nums', props.class)">{{ fmt(props.value, props.format) }}</bdi>
</template>

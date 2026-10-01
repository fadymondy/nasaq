<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatDate } from "./composables";
import type { DateInput, FormatDateOptions } from "./format";

// A date as <time>: machine-readable `datetime`, locale formatting, Nasaq digits, and its own bidi isolate.
interface Props {
  value: DateInput;
  format?: FormatDateOptions;
  /** Show "3 hours ago"; the absolute date moves to the `title`. */
  relative?: boolean;
  title?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { relative: false, format: undefined, title: undefined });
const fmt = useFormatDate();
const date = computed(() => (props.value instanceof Date ? props.value : new Date(props.value)));
const absolute = computed(() => fmt.date(date.value, props.format));
</script>

<template>
  <time
    data-slot="date-time"
    :datetime="date.toISOString()"
    dir="auto"
    :title="props.title ?? (props.relative ? absolute : undefined)"
    :class="cn('tabular-nums [unicode-bidi:isolate]', props.class)"
  >{{ props.relative ? fmt.relative(date) : absolute }}</time>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { formatDurationSeconds, useHealthLabels } from "./health-format";
import { STRINGS } from "./strings";

// A duration such as "1 h 12 min", made of at most two Intl units, in an LTR isolate.
const props = defineProps<{ seconds: number; class?: HTMLAttributes["class"] }>();
const { locale } = useHealthLabels(STRINGS);
const text = computed(() => formatDurationSeconds(props.seconds, locale.value));
</script>

<template>
  <bdi data-slot="duration" data-numeric="" dir="ltr" :class="cn('tabular-nums [unicode-bidi:isolate]', props.class)">{{ text }}</bdi>
</template>

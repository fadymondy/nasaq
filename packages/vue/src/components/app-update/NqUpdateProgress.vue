<script setup lang="ts">
import { computed } from "vue";
import NqProgress from "../progress/NqProgress.vue";
import { clampUpdatePercent, formatUpdateSpeed, formatUpdateTime, secondsLeft } from "./app-update-format";
import type { AppUpdateLabels } from "./strings";

// The download bar with speed and time left. Internal to NqUpdateSheet and NqForcedUpdateGate.
interface Props {
  progress: number;
  speed?: number;
  totalBytes?: number;
  t: AppUpdateLabels;
  locale: string;
}
const props = defineProps<Props>();
const percent = computed(() => clampUpdatePercent(props.progress));
const done = computed(() => (props.totalBytes ? (props.totalBytes * percent.value) / 100 : 0));
const left = computed(() => (props.totalBytes && props.speed ? secondsLeft(props.totalBytes, done.value, props.speed) : null));
</script>

<template>
  <div data-slot="update-progress" class="flex flex-col gap-1.5">
    <NqProgress :value="percent" :label="props.t.downloading" />
    <p class="flex items-center justify-between text-caption text-muted-foreground tabular-nums">
      <span dir="ltr">{{ props.speed ? formatUpdateSpeed(props.speed, props.locale) : null }}</span>
      <span dir="ltr">{{ left !== null ? `${formatUpdateTime(left)} ${props.t.remaining}` : null }}</span>
    </p>
  </div>
</template>

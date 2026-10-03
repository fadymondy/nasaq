<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { formatDate, formatNumber } from "../numeric";
import { isKnownTimeZone, isWorkingNow, offsetHours, type ProfileWorkingHours } from "./personal-model";
import { fill, usePersonalStrings, type PersonalWidgetLabels } from "./strings";

// The owner's local time, whether it is working time there, and the offset from the visitor's clock.
interface Props {
  /** IANA zone of the owner: "Asia/Riyadh". */
  timeZone: string;
  /** Place name shown under the time. */
  city?: string;
  /** The visitor's zone, to show the difference. Default the browser's. */
  viewerTimeZone?: string;
  workingHours?: ProfileWorkingHours;
  /** Freeze the clock at this instant (stories, tests). Default the real time, updated every 15 seconds. */
  now?: Date | number;
  labels?: PersonalWidgetLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t, locale } = usePersonalStrings(() => props.labels);

const now = ref<number>(props.now ? new Date(props.now).getTime() : Date.now());
const viewer = ref(props.viewerTimeZone ?? "UTC");
let timer: ReturnType<typeof setInterval> | undefined;
function start() {
  if (timer) clearInterval(timer);
  timer = undefined;
  if (props.now) {
    now.value = new Date(props.now).getTime();
    return;
  }
  timer = setInterval(() => (now.value = Date.now()), 15_000);
}
onMounted(() => {
  if (!props.viewerTimeZone) viewer.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  start();
});
watch(() => props.now, start);
watch(
  () => props.viewerTimeZone,
  (v) => {
    if (v) viewer.value = v;
  },
);
onBeforeUnmount(() => timer && clearInterval(timer));

const zone = computed(() => (isKnownTimeZone(props.timeZone) ? props.timeZone : "UTC"));
const working = computed(() => isWorkingNow(now.value, zone.value, props.workingHours));
const diff = computed(() => (isKnownTimeZone(viewer.value) ? offsetHours(now.value, zone.value, viewer.value) : 0));
const n = computed(() => formatNumber(Math.abs(diff.value), locale.value));
const time = computed(() => formatDate(now.value, locale.value, { timeZone: zone.value, hour: "numeric", minute: "2-digit" }));
</script>

<template>
  <NqCard data-slot="local-clock" :class="cn('gap-2', props.class)">
    <NqCardHeader><NqCardTitle>{{ t.localTime }}</NqCardTitle></NqCardHeader>
    <NqCardContent class="flex flex-col gap-1">
      <p class="flex items-baseline gap-2">
        <time :datetime="new Date(now).toISOString()" class="text-h1 tabular-nums text-foreground" dir="ltr">{{ time }}</time>
        <span v-if="props.city || $slots.city" class="text-body-sm text-muted-foreground"><slot name="city">{{ fill(t.inTimezone, { city: props.city ?? "" }) }}</slot></span>
      </p>
      <p class="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <span aria-hidden="true" :class="cn('size-2 rounded-full', working ? 'bg-nq-success' : 'bg-nq-line-strong')" />
        {{ working ? t.working : t.offHours }}
      </p>
      <p class="text-caption text-muted-foreground">{{ diff === 0 ? t.sameTime : fill(diff > 0 ? t.ahead : t.behind, { n }) }}</p>
    </NqCardContent>
  </NqCard>
</template>

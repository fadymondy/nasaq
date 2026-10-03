<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import { merchCountdownParts, merchNextTick } from "./store-merch-model";
import { merchFill, useMerchStrings, type MerchLabels } from "./strings";

// A ticking deadline readout (days, hours, minutes, seconds). Screen readers get the time left once a minute, not every
// second. When the time is up it shows a plain "ended" message.
interface Props {
  /** Epoch milliseconds when the offer ends. */
  endsAt: number;
  /** Fixed clock for stories and tests; without it the countdown ticks. */
  now?: number;
  labels?: MerchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { now: undefined, labels: undefined });
/** Fires once when time runs out. */
const emit = defineEmits<{ expire: [] }>();
const { t } = useMerchStrings(() => props.labels);
const fmt = useFormatNumber();

const tick = ref(props.now ?? Date.now());
let timer: ReturnType<typeof setTimeout> | undefined;
function loop() {
  const at = Date.now();
  tick.value = at;
  const wait = merchNextTick(props.endsAt, at);
  if (wait > 0) timer = setTimeout(loop, wait);
}
function start() {
  clearTimeout(timer);
  if (props.now !== undefined) {
    tick.value = props.now;
    return;
  }
  loop();
}
onMounted(start);
watch(() => [props.endsAt, props.now], start);
onBeforeUnmount(() => clearTimeout(timer));

const p = computed(() => merchCountdownParts(props.endsAt, props.now ?? tick.value));
watch(
  () => p.value.done,
  (done) => {
    if (done) emit("expire");
  },
  { immediate: true },
);

const pad = (n: number) => fmt(n, { minimumIntegerDigits: 2, useGrouping: false });
const units = computed(() => {
  const x = p.value;
  const all = [
    x.days > 0 ? { key: "d", v: fmt(x.days, { useGrouping: false }), long: t.value.days, short: t.value.dayShort } : null,
    { key: "h", v: pad(x.hours), long: t.value.hours, short: t.value.hourShort },
    { key: "m", v: pad(x.minutes), long: t.value.minutes, short: t.value.minuteShort },
    { key: "s", v: pad(x.seconds), long: t.value.seconds, short: t.value.secondShort },
  ];
  return all.filter((u): u is { key: string; v: string; long: string; short: string } => u !== null);
});
// Whole-minute label so assistive tech is not spammed every second.
const spoken = computed(() =>
  units.value
    .filter((u) => u.key !== "s")
    .map((u) => `${u.v} ${u.long}`)
    .join(" "),
);
</script>

<template>
  <span v-if="p.done" :class="cn('text-body-sm text-muted-foreground', props.class)">{{ t.dealEnded }}</span>
  <div v-else data-slot="store-countdown" role="timer" :aria-label="merchFill(t.timeLeft, { time: spoken })" :class="cn('inline-flex items-center gap-1.5', props.class)" dir="ltr">
    <span v-for="u in units" :key="u.key" aria-hidden="true" class="inline-flex min-w-11 flex-col items-center rounded-control bg-foreground px-1.5 py-1 text-background">
      <span class="text-label tabular-nums leading-none">{{ u.v }}</span>
      <span class="text-[10px] leading-tight opacity-80">{{ u.short }}</span>
    </span>
  </div>
</template>

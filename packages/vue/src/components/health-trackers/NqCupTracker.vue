<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { formatNumber } from "../numeric";
import NqHealthCup from "./NqHealthCup.vue";
import { cupCounts, cupState } from "./health-trackers-logic";
import { healthFill, healthStrings, type HealthTrackerResult, type HealthTrackersLabels } from "./health-trackers-strings";

// A day of a countable unit drawn as the cups it takes. Filled cups are logged, the next one is the only button, the
// rest are outlines. The whole row has one accessible name ("7 of 20 cups logged today").
const props = withDefaults(
  defineProps<{
    /** Units logged today. */
    filled: number;
    /** How long the row is. Give the number your server sent; nothing here works out the length of a day. */
    total: number;
    /** Logs one unit. Not "set the total to N": there is a single intent. */
    onLog: () => Promise<HealthTrackerResult>;
    /** Blocks logging, for example while a cooldown runs. */
    disabled?: boolean;
    /** Time left before the next cup can be logged, already formatted (for example "0:12"). Shown on the next cup. */
    waitLabel?: string;
    /** What one cup holds, shown under the row (for example "250 ml"). */
    unitLabel?: string;
    labels?: HealthTrackersLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { disabled: false, waitLabel: undefined, unitLabel: undefined, labels: undefined },
);

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => healthStrings(locale.value, props.labels));
const counts = computed(() => cupCounts(props.filled, props.total));
const done = computed(() => counts.value.total > 0 && counts.value.filled >= counts.value.total);
const cups = computed(() => Array.from({ length: counts.value.total }, (_, i) => ({ i, state: cupState(i, counts.value.filled, counts.value.total) })));
const pending = ref(false);
const error = ref<string>();

async function log() {
  if (pending.value) return;
  pending.value = true;
  error.value = undefined;
  try {
    const result = await props.onLog();
    if (result && typeof result === "object" && result.error) error.value = result.error;
  } catch {
    error.value = t.value.cupsFailed;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div data-slot="cup-tracker" :class="cn('flex min-w-0 flex-col gap-2', props.class)">
    <div
      role="group"
      :aria-label="healthFill(t.cupsLabel, { filled: formatNumber(counts.filled, locale), total: formatNumber(counts.total, locale) })"
      class="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1.5"
    >
      <template v-for="c in cups" :key="c.i">
        <span v-if="c.state !== 'next'" :data-state="c.state" class="aspect-[3/4] w-full"><NqHealthCup :state="c.state" /></span>
        <button
          v-else
          type="button"
          data-state="next"
          :disabled="props.disabled || pending"
          :aria-busy="pending || undefined"
          :aria-label="props.waitLabel ? healthFill(t.cupWait, { time: props.waitLabel }) : t.cupNext"
          class="relative aspect-[3/4] w-full rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-60"
          @click="log"
        >
          <NqHealthCup state="next" />
          <span dir="ltr" class="absolute inset-0 flex items-center justify-center text-caption font-medium tabular-nums text-muted-foreground">
            <template v-if="props.waitLabel">{{ props.waitLabel }}</template>
            <Plus v-else aria-hidden="true" class="size-3.5 text-primary" />
          </span>
        </button>
      </template>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
      <span class="tabular-nums">{{ formatNumber(counts.filled, locale) }} / {{ formatNumber(counts.total, locale) }}</span>
      <bdi v-if="props.unitLabel" dir="ltr">{{ props.unitLabel }}</bdi>
      <span v-if="pending" role="status">{{ t.cupsLogging }}</span>
      <span v-if="done" role="status" class="text-nq-success-text">{{ t.cupsDone }}</span>
    </div>
    <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
  </div>
</template>

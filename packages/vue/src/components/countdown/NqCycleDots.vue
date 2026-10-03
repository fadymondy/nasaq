<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { fill, useCountdownStrings, type CountdownLabels } from "./strings";

// One dot per focus session in the set. Filled dots are done; the next one is ringed while a session runs.
interface Props {
  /** Sessions in one set, for example 4. */
  total: number;
  /** Finished sessions in this set. */
  done: number;
  /** Rings the session under way (the dot after the finished ones). */
  active?: boolean;
  labels?: CountdownLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { active: false, labels: undefined });
const t = useCountdownStrings(() => props.labels);
const count = computed(() => Math.max(0, Math.floor(props.total)));
const finished = computed(() => Math.min(count.value, Math.max(0, Math.floor(props.done))));
const stateOf = (i: number) => (i < finished.value ? "done" : props.active && i === finished.value ? "current" : "todo");
</script>

<template>
  <div data-slot="cycle-dots" role="img" :aria-label="fill(t.cycles, { done: finished, total: count })" :class="cn('inline-flex items-center gap-2', props.class)">
    <span
      v-for="i in count"
      :key="i"
      :data-state="stateOf(i - 1)"
      :class="
        cn(
          'size-2.5 rounded-full border transition-colors duration-200 ease-nq motion-reduce:transition-none',
          stateOf(i - 1) === 'done' ? 'border-primary bg-primary' : stateOf(i - 1) === 'current' ? 'border-primary bg-transparent ring-2 ring-primary/30' : 'border-nq-line-strong bg-transparent',
        )
      "
    />
  </div>
</template>

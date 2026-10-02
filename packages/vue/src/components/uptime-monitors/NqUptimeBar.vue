<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { CheckResult } from "./format";
import { useUptimeStrings, type UptimeMonitorsLabels } from "./strings";

// A strip of thin segments, one per check, oldest first. It reads right to left in RTL. Status is also in the
// title of each segment.
const props = defineProps<{
  checks: readonly CheckResult[];
  /** Accessible summary. Default: how many of the checks were up. */
  label?: string;
  labels?: UptimeMonitorsLabels;
  class?: HTMLAttributes["class"];
}>();

const segment: Record<CheckResult, string> = { up: "bg-nq-success", degraded: "bg-nq-warning", down: "bg-nq-danger", none: "bg-border" };
const t = useUptimeStrings(() => props.labels);
const summary = computed(() => {
  const measured = props.checks.filter((c) => c !== "none");
  const up = measured.filter((c) => c !== "down").length;
  return props.label ?? t.value.historyFor("", up, measured.length).replace(/^: /, "");
});
</script>

<template>
  <div data-slot="uptime-bar" role="img" :aria-label="summary" :class="cn('flex h-6 min-w-24 items-stretch gap-px', props.class)">
    <span v-for="(c, i) in props.checks" :key="i" :title="t.checkNames[c]" :class="cn('min-w-px flex-1 rounded-[1px]', segment[c])" />
  </div>
</template>

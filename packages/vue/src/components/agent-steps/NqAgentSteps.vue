<script setup lang="ts">
import { computed, useId } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqNum } from "../numeric";
import { NqSpinner } from "../spinner";
import { agentRunState, agentStepCounts, currentStep, totalDurationMs, type AgentStep } from "./agent-steps-logic";
import { agentStepsStrings, type AgentStepsLabels } from "./agent-steps-strings";
import NqAgentStepRow from "./NqAgentStepRow.vue";

// The tool calls an agent made, planned or is waiting to make, in order. A summary line says where the run stands
// (working, waiting for you, failed, done). Each step opens to its arguments and result. A step that needs a person
// shows the `confirm` slot (scoped with the step), so the run and the decision sit together.
const props = withDefaults(
  defineProps<{
    steps: readonly AgentStep[];
    /** Heading above the list. Default "Agent steps". */
    title?: string;
    /** Argument keys whose values are masked in the details, at any depth: `["password", "token"]`. */
    redactKeys?: readonly string[];
    /** Step ids whose details start open. */
    defaultOpenIds?: readonly string[];
    /** Runs a failed step again. Omit to hide the Retry button. */
    onRetry?: (stepId: string) => void;
    labels?: Partial<AgentStepsLabels>;
    class?: string;
  }>(),
  { title: undefined, redactKeys: () => [], defaultOpenIds: () => [], onRetry: undefined, labels: undefined, class: undefined },
);

const nq = useNasaq();
const uid = useId();
const t = computed(() => agentStepsStrings(nq.locale.value, props.labels));
const state = computed(() => agentRunState(props.steps));
const counts = computed(() => agentStepCounts(props.steps));
const total = computed(() => totalDurationMs(props.steps));
const index = computed(() => {
  const current = currentStep(props.steps);
  return current ? props.steps.indexOf(current) + 1 : 0;
});
const summary = computed(() =>
  state.value === "awaiting"
    ? t.value.awaiting
    : state.value === "error"
      ? t.value.failed
      : state.value === "done"
        ? t.value.done
        : state.value === "running"
          ? `${t.value.running}. ${t.value.stepOf(index.value, counts.value.total)}`
          : t.value.idle,
);
</script>

<template>
  <section data-slot="agent-steps" :data-state="state" :aria-labelledby="`${uid}-h`" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h3 :id="`${uid}-h`" class="text-body-sm font-semibold text-foreground">{{ props.title ?? t.steps }}</h3>
      <p role="status" class="flex items-center gap-2 text-caption text-muted-foreground">
        <NqSpinner v-if="state === 'running'" class="size-3.5" />
        <span :class="cn(state === 'awaiting' && 'text-nq-warning-text', state === 'error' && 'text-nq-danger-text', state === 'done' && 'text-nq-success-text')">{{ summary }}</span>
        <NqNum v-if="state === 'done' && total > 0" :value="total / 1000" :format="{ style: 'unit', unit: 'second', unitDisplay: 'narrow', maximumFractionDigits: 1 }" />
      </p>
    </header>
    <ol class="flex flex-col">
      <NqAgentStepRow
        v-for="(s, i) in props.steps"
        :key="s.id"
        :step="s"
        :last="i === props.steps.length - 1"
        :redact-keys="props.redactKeys"
        :default-open="props.defaultOpenIds.includes(s.id) || s.status === 'awaiting'"
        :can-retry="Boolean(props.onRetry)"
        :t="t"
        @retry="(id: string) => props.onRetry?.(id)"
      >
        <template v-if="s.status === 'awaiting' && $slots.confirm" #confirm>
          <slot name="confirm" :step="s" />
        </template>
      </NqAgentStepRow>
    </ol>
  </section>
</template>

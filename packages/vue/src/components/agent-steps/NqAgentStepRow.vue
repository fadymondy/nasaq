<script setup lang="ts">
import { Ban, Check, ChevronDown, CircleDashed, ShieldQuestion, TriangleAlert } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqNum } from "../numeric";
import { NqSpinner } from "../spinner";
import { resultLanguage, stringifyArgs, type AgentStep, type AgentStepStatus } from "./agent-steps-logic";
import type { AgentStepsLabels } from "./agent-steps-strings";

// One row of NqAgentSteps: the status icon on the rail, the label with its tool and status, and the details disclosure.
const props = defineProps<{
  step: AgentStep;
  last: boolean;
  redactKeys: readonly string[];
  defaultOpen: boolean;
  canRetry: boolean;
  t: AgentStepsLabels;
}>();
const emit = defineEmits<{ retry: [stepId: string] }>();

const BADGE: Record<AgentStepStatus, "outline" | "info" | "warning" | "success" | "danger" | "neutral"> = {
  pending: "outline",
  running: "info",
  awaiting: "warning",
  done: "success",
  error: "danger",
  skipped: "neutral",
};
const ICONS = { awaiting: ShieldQuestion, done: Check, error: TriangleAlert, skipped: Ban, pending: CircleDashed } as const;
const ICON_CLASS: Record<AgentStepStatus, string> = {
  pending: "text-muted-foreground",
  running: "",
  awaiting: "text-nq-warning-text",
  done: "text-nq-success-text",
  error: "text-nq-danger-text",
  skipped: "text-muted-foreground",
};

const open = ref(props.defaultOpen);
const args = computed(() => stringifyArgs(props.step.args, props.redactKeys));
const hasDetails = computed(() => args.value !== "" || Boolean(props.step.result) || Boolean(props.step.error));
const statusText = computed<Record<AgentStepStatus, string>>(() => ({
  pending: props.t.pending,
  running: props.t.stepRunning,
  awaiting: props.t.stepAwaiting,
  done: props.t.stepDone,
  error: props.t.stepError,
  skipped: props.t.stepSkipped,
}));
const ms = computed(() => props.step.durationMs ?? 0);
</script>

<template>
  <li data-slot="agent-step" :data-status="props.step.status" class="flex gap-3">
    <div class="flex flex-col items-center">
      <span class="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-card">
        <NqSpinner v-if="props.step.status === 'running'" class="size-4" />
        <component :is="ICONS[props.step.status as Exclude<AgentStepStatus, 'running'>]" v-else aria-hidden="true" :class="cn('size-4', ICON_CLASS[props.step.status])" />
      </span>
      <span v-if="!props.last" aria-hidden="true" class="my-1 w-px flex-1 bg-border" />
    </div>
    <div :class="cn('flex min-w-0 flex-1 flex-col gap-2', !props.last && 'pb-4')">
      <NqCollapsible v-model:open="open">
        <div class="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
          <span dir="auto" :class="cn('text-body-sm text-foreground', props.step.status === 'pending' && 'text-muted-foreground')">{{ props.step.label }}</span>
          <code v-if="props.step.tool" dir="ltr" class="rounded-sm bg-secondary px-1 font-mono text-[0.85em] text-muted-foreground">{{ props.step.tool }}</code>
          <NqBadge :variant="BADGE[props.step.status]">{{ statusText[props.step.status] }}</NqBadge>
          <span v-if="props.step.durationMs !== undefined && props.step.status !== 'pending'" class="text-caption text-muted-foreground">
            <NqNum :value="ms < 1000 ? ms : ms / 1000" :format="{ style: 'unit', unit: ms < 1000 ? 'millisecond' : 'second', unitDisplay: 'narrow', maximumFractionDigits: 1 }" />
          </span>
          <span class="flex-1" />
          <NqButton v-if="props.step.status === 'error' && props.canRetry" size="sm" variant="secondary" @click="emit('retry', props.step.id)">{{ props.t.retry }}</NqButton>
          <NqCollapsibleTrigger
            v-if="hasDetails"
            :aria-label="open ? props.t.hideDetails : props.t.showDetails"
            class="grid size-6 place-items-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          >
            <ChevronDown aria-hidden="true" :class="cn('size-4 transition-transform duration-150 ease-nq', open && 'rotate-180')" />
          </NqCollapsibleTrigger>
        </div>
        <NqCollapsiblePanel v-if="hasDetails">
          <div class="mt-2 flex flex-col gap-2">
            <NqAlert v-if="props.step.error" tone="danger" :title="props.t.error">
              <span dir="auto">{{ props.step.error }}</span>
            </NqAlert>
            <div v-if="args" class="flex flex-col gap-1">
              <span class="text-caption text-muted-foreground">{{ props.t.arguments }}</span>
              <NqCodeBlock :code="args" language="json" :label="props.t.arguments" pre-class-name="max-h-48" />
            </div>
            <div v-if="props.step.result" class="flex flex-col gap-1">
              <span class="text-caption text-muted-foreground">{{ props.t.result }}</span>
              <NqCodeBlock :code="props.step.result" :language="resultLanguage(props.step)" :label="props.t.result" pre-class-name="max-h-48" />
            </div>
          </div>
        </NqCollapsiblePanel>
      </NqCollapsible>
      <slot name="confirm" />
    </div>
  </li>
</template>

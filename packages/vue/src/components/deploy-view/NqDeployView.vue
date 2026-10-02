<script setup lang="ts">
import { Square } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqProgress } from "../progress";
import { completedCount, deriveStatus, formatDuration, totalDuration, type DeployStatus } from "./deploy-format";
import NqDeployStatusIcon from "./NqDeployStatusIcon.vue";
import NqDeployStep from "./NqDeployStep.vue";
import { useDeployViewLabels, type DeployViewLabels } from "./strings";
import type { DeployResult, DeployStep } from "./types";

// A deploy run: ordered steps with status, live durations, expandable ANSI logs that follow the output while
// a step runs, and retry for failed steps. Presentational; your callbacks talk to the pipeline.
// <NqDeployView title="Deploy api to production" :steps="steps" :on-retry="retry" />
interface Props {
  /** What is being deployed: "Deploy api to production". The `title` slot overrides it. */
  title?: string;
  /** Ordered steps. Update their status, duration and logs as the deploy advances. */
  steps: readonly DeployStep[];
  /** Overall status. Default: derived from the steps. */
  status?: DeployStatus;
  /** Cancel the running deploy. The button shows only while the run is running. */
  onCancel?: () => Promise<DeployResult> | DeployResult;
  /** Retry one failed step. Resolve with `{ error }` to show a message; the step stays failed. */
  onRetry?: (stepId: string) => Promise<DeployResult> | DeployResult;
  /** Step ids open at the start. Default: failed and running steps. */
  defaultExpanded?: readonly string[];
  /** Keep at most this many log lines per step. Default 500. */
  maxLogLines?: number;
  /** Height of each step's log area. Default 14rem. */
  logHeight?: string;
  labels?: Partial<DeployViewLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  status: undefined,
  onCancel: undefined,
  onRetry: undefined,
  defaultExpanded: undefined,
  maxLogLines: 500,
  logHeight: "14rem",
  labels: undefined,
});

const t = useDeployViewLabels(() => props.labels);
const status = computed<DeployStatus>(() => props.status ?? deriveStatus(props.steps));
const anyRunning = computed(() => props.steps.some((s) => s.status === "running"));
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
watch(
  anyRunning,
  (active) => {
    if (timer) clearInterval(timer);
    timer = undefined;
    if (!active) return;
    now.value = Date.now();
    timer = setInterval(() => (now.value = Date.now()), 1000);
  },
  { immediate: true },
);
onBeforeUnmount(() => timer && clearInterval(timer));

const done = computed(() => completedCount(props.steps));
const total = computed(() => totalDuration(props.steps, now.value));
const toggled = ref<Record<string, boolean>>(
  Object.fromEntries((props.defaultExpanded ?? props.steps.filter((s) => s.status === "failed" || s.status === "running").map((s) => s.id)).map((id) => [id, true])),
);
const cancelling = ref(false);
async function cancel() {
  if (!props.onCancel) return;
  cancelling.value = true;
  try {
    await props.onCancel();
  } finally {
    cancelling.value = false;
  }
}

const BADGE = { pending: "neutral", running: "info", success: "success", failed: "danger", skipped: "neutral", cancelled: "warning" } as const;
const PROGRESS_TONE = { pending: "default", running: "info", success: "success", failed: "danger", skipped: "default", cancelled: "warning" } as const;
</script>

<template>
  <section
    data-slot="deploy-view"
    :data-status="status"
    :aria-label="props.title ?? t.title"
    :class="cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card text-start', props.class)"
  >
    <header class="flex flex-col gap-3 border-b border-border p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-h3 text-foreground"><slot name="title">{{ props.title ?? t.title }}</slot></h3>
            <NqBadge :variant="BADGE[status]" data-slot="deploy-status">
              <NqDeployStatusIcon :status="status" class="size-3" />
              {{ t.status[status] }}
            </NqBadge>
          </div>
          <div v-if="$slots.meta" class="text-body-sm text-muted-foreground"><slot name="meta" /></div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-body-sm text-muted-foreground">
            {{ t.duration }} <bdi dir="ltr" class="font-mono text-foreground tabular-nums">{{ formatDuration(total, t.units) }}</bdi>
          </span>
          <NqButton v-if="props.onCancel && status === 'running'" type="button" size="sm" variant="secondary" :loading="cancelling" @click="cancel">
            <Square aria-hidden="true" />
            {{ t.cancel }}
          </NqButton>
        </div>
      </div>
      <NqProgress
        :value="props.steps.length ? (done / props.steps.length) * 100 : 0"
        :tone="PROGRESS_TONE[status]"
        size="sm"
        :aria-label="t.progress(done, props.steps.length)"
        :value-text="t.progress(done, props.steps.length)"
        :label="t.progress(done, props.steps.length)"
        :show-value="false"
      />
    </header>
    <ol :aria-label="t.steps" class="m-0 flex list-none flex-col p-0">
      <NqDeployStep
        v-for="(step, i) in props.steps"
        :key="step.id"
        :step="step"
        :index="i"
        :now="now"
        :open="toggled[step.id] ?? false"
        :on-retry="props.onRetry"
        :max-log-lines="props.maxLogLines"
        :log-height="props.logHeight"
        :t="t"
        @update:open="toggled = { ...toggled, [step.id]: $event }"
      />
    </ol>
  </section>
</template>

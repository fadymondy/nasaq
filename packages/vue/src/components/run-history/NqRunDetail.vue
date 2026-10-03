<script setup lang="ts">
import { RotateCcw, Square } from "lucide-vue-next";
import { computed, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqDateTime } from "../numeric";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqWorkflowStatusGlyph } from "../workflow-canvas";
import { useCanvasLabels } from "../workflow-canvas/labels";
import NqRunSpanTimeline from "./NqRunSpanTimeline.vue";
import NqRunStepRow from "./NqRunStepRow.vue";
import { useRunLabels, type RunHistoryLabels } from "./labels";
import { failingStep, formatRunDuration, rawRun, runLength, stepBars, type RunRecord } from "./run-model";

// One run: its status and timing, the step that failed and why, every step with its input, output, logs and
// screenshots on a shared time axis, the span trace with attributes, and the raw data. The `leading` slot sits at the
// start of the header (a back button on small screens).
interface Props {
  run: RunRecord;
  /** Shows "Run again" on a finished run. Resolve `{ error }` to show a message. */
  onRetry?: (run: RunRecord) => Promise<void | { error?: string }>;
  /** Shows "Cancel run" on a running one. */
  onCancel?: (run: RunRecord) => Promise<void | { error?: string }>;
  /** Tab shown first. Default "steps". */
  defaultTab?: "steps" | "trace" | "raw";
  labels?: Partial<RunHistoryLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onRetry: undefined, onCancel: undefined, defaultTab: "steps", labels: undefined });

const { t, ar } = useRunLabels(() => props.labels);
const { t: c } = useCanvasLabels();
const failing = computed(() => failingStep(props.run));
const bars = computed(() => stepBars(props.run.steps));
const total = computed(() => runLength(props.run));
const tab = ref<string>(props.defaultTab);
const open = ref<Set<string>>(new Set(failing.value ? [failing.value.id] : []));
const busy = ref(false);
const error = ref<string | null>(null);
const raw = computed(() => rawRun(props.run));
const running = computed(() => props.run.status === "running" || props.run.status === "waiting");

watch([() => props.run.id, failing], () => {
  open.value = new Set(failing.value ? [failing.value.id] : []);
  error.value = null;
});

function toggle(id: string) {
  const next = new Set(open.value);
  if (!next.delete(id)) next.add(id);
  open.value = next;
}

async function act(fn: (run: RunRecord) => Promise<void | { error?: string }>) {
  busy.value = true;
  error.value = null;
  const res = await fn(props.run);
  busy.value = false;
  if (res && res.error) error.value = res.error;
}

async function showFailing() {
  const f = failing.value;
  if (!f) return;
  tab.value = "steps";
  open.value = new Set(open.value).add(f.id);
  await nextTick();
  const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(f.id) : f.id;
  document.querySelector(`[data-step="${esc}"]`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
}
</script>

<template>
  <div data-slot="run-detail" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <header class="flex flex-wrap items-start gap-3">
      <slot name="leading" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <NqWorkflowStatusGlyph :status="props.run.status" :label="c.status[props.run.status]" class="size-5" />
          <h2 class="text-h4 text-foreground">{{ props.run.name ?? t.unnamed }}</h2>
          <NqBadge :variant="props.run.status === 'error' ? 'danger' : props.run.status === 'success' ? 'success' : props.run.status === 'running' ? 'info' : 'neutral'">{{ c.status[props.run.status] }}</NqBadge>
        </div>
        <dl class="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-muted-foreground">
          <div class="flex gap-1.5">
            <dt>{{ t.started }}</dt>
            <dd class="text-foreground"><NqDateTime :value="props.run.startedAt" :format="{ dateStyle: 'medium', timeStyle: 'medium' }" /></dd>
          </div>
          <div class="flex gap-1.5">
            <dt>{{ t.duration }}</dt>
            <dd class="text-foreground" dir="ltr">{{ formatRunDuration(total, ar) }}</dd>
          </div>
          <div v-if="props.run.trigger" class="flex gap-1.5">
            <dt>{{ t.trigger }}</dt>
            <dd class="text-foreground">{{ props.run.trigger }}</dd>
          </div>
          <div class="flex gap-1.5">
            <dt class="sr-only">ID</dt>
            <dd dir="ltr" class="font-mono text-code">{{ props.run.id }}</dd>
          </div>
        </dl>
      </div>
      <div class="flex items-center gap-2">
        <NqButton v-if="props.onRetry && !running" variant="secondary" size="sm" :loading="busy" @click="act(props.onRetry)">
          <RotateCcw aria-hidden="true" />
          {{ t.retry }}
        </NqButton>
        <NqButton v-if="props.onCancel && running" variant="secondary" size="sm" :loading="busy" @click="act(props.onCancel)">
          <Square aria-hidden="true" />
          {{ t.cancel }}
        </NqButton>
      </div>
    </header>

    <p v-if="error" role="alert" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">{{ error }}</p>

    <NqAlert v-if="props.run.status === 'error' || failing" tone="danger" :title="failing ? t.failure(failing.name) : t.failureRun">
      <span dir="auto">{{ failing?.error ?? props.run.error }}</span>
      <template v-if="failing" #action>
        <NqButton variant="secondary" size="sm" @click="showFailing">{{ t.showStep }}</NqButton>
      </template>
    </NqAlert>

    <NqTabs :model-value="tab" @update:model-value="(v) => (tab = String(v))">
      <NqTabsList variant="underline">
        <NqTabsTab value="steps">
          {{ t.steps }} <span class="ms-1 text-caption text-muted-foreground tabular-nums">{{ props.run.steps.length }}</span>
        </NqTabsTab>
        <NqTabsTab value="trace">{{ t.trace }}</NqTabsTab>
        <NqTabsTab value="raw">{{ t.raw }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="steps">
        <p v-if="props.run.steps.length === 0" class="text-body-sm text-muted-foreground">{{ t.stepsNone }}</p>
        <ol v-else class="divide-y divide-border rounded-control border border-border">
          <NqRunStepRow
            v-for="(s, i) in props.run.steps"
            :key="s.id"
            :step="s"
            :bar="bars[i] as { left: number; width: number }"
            :open="open.has(s.id)"
            :failing="failing?.id === s.id"
            :t="t"
            :ar="ar"
            :status="c.status[s.status]"
            @toggle="toggle(s.id)"
          />
        </ol>
      </NqTabsPanel>
      <NqTabsPanel value="trace">
        <NqRunSpanTimeline v-if="props.run.spans?.length" :spans="props.run.spans" :t="t" :ar="ar" />
        <p v-else class="text-body-sm text-muted-foreground">{{ t.traceNone }}</p>
      </NqTabsPanel>
      <NqTabsPanel value="raw">
        <NqCodeBlock :code="raw" language="json" :label="t.rawLabel" filename="run.json" pre-class-name="max-h-[28rem]" />
      </NqTabsPanel>
    </NqTabs>
  </div>
</template>

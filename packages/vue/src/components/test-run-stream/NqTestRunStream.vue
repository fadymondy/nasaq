<script setup lang="ts">
import { FlaskConical, Play, RotateCcw, Square } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { formatNumber } from "../numeric";
import { NqSpinner } from "../spinner";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { fillTestRun, TEST_RUN_STRINGS, type TestRunStreamLabels } from "./labels";
import type { TestRunHandlers } from "./handlers";
import NqTestRunResult from "./NqTestRunResult.vue";
import {
  formatTestRunDuration,
  settleTestRunSteps,
  testRunCounts,
  testRunStepStatus,
  upsertTestRunStep,
  type TestRunResult,
  type TestRunState,
  type TestRunStep,
} from "./test-run-stream-logic";

// A test run that streams: Run and Stop, each step appearing and updating as the server reports it, a live elapsed time and
// summary, and what the run saved, with its raw data behind a toggle.

type Labels = Partial<Omit<TestRunStreamLabels, "status" | "summary">> & {
  status?: Partial<TestRunStreamLabels["status"]>;
  summary?: Partial<TestRunStreamLabels["summary"]>;
};
interface Props {
  /**
   * Starts a run, e.g. opening an event stream. Report through `handlers`; stop when `signal` aborts.
   * Returning a promise also works: resolving finishes the run, rejecting fails it.
   */
  run: (handlers: TestRunHandlers, signal: AbortSignal) => void | Promise<unknown>;
  /** Blocks starting a run, e.g. while the settings have problems. */
  disabled?: boolean;
  /** `null` hides the heading. */
  title?: string | null;
  description?: string | null;
  headingAs?: string;
  labels?: Labels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { disabled: false, title: undefined, description: undefined, headingAs: "h3", labels: undefined });
const emit = defineEmits<{ stateChange: [state: TestRunState] }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed<TestRunStreamLabels>(() => {
  const base = TEST_RUN_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"];
  return { ...base, ...props.labels, status: { ...base.status, ...props.labels?.status }, summary: { ...base.summary, ...props.labels?.summary } };
});
const id = useId();

const state = ref<TestRunState>("idle");
const steps = ref<TestRunStep[]>([]);
const results = ref<TestRunResult[]>([]);
const error = ref<string | null>(null);
const startedAt = ref(0);
const elapsed = ref(0);
let controller: AbortController | null = null;
let token = 0;
let startedAtMs = 0;
let timer: ReturnType<typeof setInterval> | undefined;

watch(state, (s) => {
  emit("stateChange", s);
  if (timer) clearInterval(timer);
  timer = undefined;
  if (s === "running") timer = setInterval(() => (elapsed.value = Date.now() - startedAt.value), 100);
});
// Stop a run that is still going when the panel goes away.
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  controller?.abort();
});

function finish(mine: number, next: TestRunState, message?: string) {
  if (token !== mine) return;
  token += 1;
  controller = null;
  steps.value = settleTestRunSteps(steps.value);
  elapsed.value = Math.max(elapsed.value, Date.now() - startedAtMs);
  if (message !== undefined) error.value = message;
  state.value = next;
}

function start() {
  controller?.abort();
  const ac = new AbortController();
  controller = ac;
  token += 1;
  const mine = token;
  const now = Date.now();
  startedAtMs = now;
  startedAt.value = now;
  elapsed.value = 0;
  steps.value = [];
  results.value = [];
  error.value = null;
  state.value = "running";
  const live = () => token === mine;
  const handlers: TestRunHandlers = {
    step: (step) => {
      if (live()) steps.value = upsertTestRunStep(steps.value, step);
    },
    result: (result) => {
      if (!live()) return;
      results.value = results.value.some((r) => r.id === result.id) ? results.value.map((r) => (r.id === result.id ? result : r)) : [...results.value, result];
    },
    done: () => finish(mine, "done"),
    fail: (message) => finish(mine, "error", message),
  };
  try {
    const out = props.run(handlers, ac.signal);
    if (out && typeof (out as Promise<unknown>).then === "function") {
      (out as Promise<unknown>).then(
        () => finish(mine, "done"),
        (e: unknown) => {
          if (!ac.signal.aborted) finish(mine, "error", e instanceof Error ? e.message : String(e));
        },
      );
    }
  } catch (e) {
    finish(mine, "error", e instanceof Error ? e.message : String(e));
  }
}

function stop() {
  const mine = token;
  controller?.abort();
  finish(mine, "stopped");
}

function clear() {
  state.value = "idle";
  steps.value = [];
  results.value = [];
  error.value = null;
  elapsed.value = 0;
}

const toneOf: Record<"ok" | "error" | "skipped", StatusTone> = { ok: "success", error: "danger", skipped: "neutral" };
const num = (n: number) => formatNumber(n, locale.value);
const counts = computed(() => testRunCounts(steps.value));
const line = computed(() => {
  const time = formatTestRunDuration(elapsed.value);
  const parts = (["ok", "error", "skipped"] as const).filter((k) => counts.value[k] > 0).map((k) => fillTestRun(t.value.summary[k], { n: num(counts.value[k]) }));
  if (state.value === "running") return `${t.value.running} · ${fillTestRun(t.value.stepsCount, { n: num(counts.value.total) })} · ${time}`;
  if (state.value === "done") return [fillTestRun(t.value.finished, { time }), ...parts].join(" · ");
  if (state.value === "stopped") return [fillTestRun(t.value.stopped, { time }), ...parts].join(" · ");
  if (state.value === "error") return fillTestRun(t.value.failed, { time });
  return "";
});
const heading = computed(() => (props.title === undefined ? t.value.title : props.title));
const sub = computed(() => (props.description === undefined ? t.value.description : props.description));
</script>

<template>
  <section
    data-slot="test-run-stream"
    :data-state="state"
    :aria-labelledby="heading ? `${id}-title` : undefined"
    :class="cn('flex flex-col rounded-card border border-border bg-card', props.class)"
  >
    <header class="flex flex-wrap items-start gap-3 border-b border-border px-5 py-4">
      <div v-if="heading || sub" class="flex min-w-48 flex-1 flex-col gap-1">
        <component :is="props.headingAs" v-if="heading" :id="`${id}-title`" class="text-h4 text-foreground">{{ heading }}</component>
        <p v-if="sub" class="text-body-sm text-muted-foreground">{{ sub }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="controls" />
        <NqButton v-if="state === 'running'" data-action="stop" @click="stop">
          <Square aria-hidden="true" />
          {{ t.stop }}
        </NqButton>
        <template v-else>
          <NqButton v-if="state !== 'idle'" variant="ghost" @click="clear">
            <RotateCcw aria-hidden="true" />
            {{ t.clear }}
          </NqButton>
          <NqButton variant="primary" :disabled="props.disabled" data-action="run" @click="start">
            <Play aria-hidden="true" />
            {{ state === "idle" ? t.run : t.runAgain }}
          </NqButton>
        </template>
      </div>
    </header>

    <div class="flex flex-col gap-4 px-5 py-4">
      <p role="status" data-slot="test-run-summary" :class="cn('text-body-sm tabular-nums', state === 'idle' ? 'sr-only' : 'text-muted-foreground')">{{ line }}</p>

      <p v-if="error" role="alert" dir="auto" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">{{ error }}</p>

      <NqEmptyState v-if="state === 'idle'" :icon="FlaskConical" :title="t.idleTitle" :description="t.idleBody" />
      <template v-else>
        <div class="flex flex-col gap-2">
          <h4 :id="`${id}-steps`" class="text-caption text-muted-foreground">{{ t.steps }}</h4>
          <ol v-if="steps.length" :aria-labelledby="`${id}-steps`" class="divide-y divide-border rounded-control border border-border">
            <li
              v-for="(step, i) in steps"
              :key="step.id ?? step.name"
              data-slot="test-run-step"
              :data-status="testRunStepStatus(step.status)"
              class="flex items-start gap-3 px-3 py-2.5"
            >
              <span aria-hidden="true" class="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                <NqSpinner v-if="testRunStepStatus(step.status) === 'running'" />
                <NqStatus v-else :tone="toneOf[testRunStepStatus(step.status) as 'ok' | 'error' | 'skipped']" />
              </span>
              <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="text-caption text-muted-foreground tabular-nums">{{ num(i + 1) }}.</span>
                  <span dir="auto" class="text-label text-foreground">{{ step.name }}</span>
                  <NqBadge v-if="typeof step.count === 'number' && step.count > 0" variant="neutral">{{ fillTestRun(t.items, { n: num(step.count) }) }}</NqBadge>
                </div>
                <p v-if="step.detail" dir="auto" class="text-caption text-muted-foreground">{{ step.detail }}</p>
                <p v-if="step.error" dir="auto" class="text-caption text-nq-danger-text">{{ step.error }}</p>
              </div>
              <span class="flex shrink-0 flex-col items-end gap-0.5">
                <span :class="cn('text-caption', testRunStepStatus(step.status) === 'error' ? 'text-nq-danger-text' : 'text-muted-foreground')">{{ t.status[testRunStepStatus(step.status)] }}</span>
                <bdi v-if="typeof step.durationMs === 'number'" dir="ltr" class="text-caption text-muted-foreground tabular-nums">{{ formatTestRunDuration(step.durationMs) }}</bdi>
              </span>
            </li>
          </ol>
          <p v-else-if="state === 'running'" class="flex items-center gap-2 rounded-control border border-dashed border-border px-3 py-2.5 text-body-sm text-muted-foreground">
            <NqSpinner aria-hidden="true" />
            {{ t.waiting }}
          </p>
        </div>

        <div v-if="results.length || state === 'done'" class="flex flex-col gap-2">
          <h4 :id="`${id}-results`" class="flex items-center gap-2 text-caption text-muted-foreground">
            {{ t.results }}
            <NqBadge variant="neutral">{{ num(results.length) }}</NqBadge>
          </h4>
          <ul v-if="results.length" :aria-labelledby="`${id}-results`" class="divide-y divide-border rounded-control border border-border">
            <NqTestRunResult v-for="r in results" :key="r.id" :result="r" :t="t" />
          </ul>
          <p v-else class="text-body-sm text-muted-foreground">{{ t.noResults }}</p>
        </div>
      </template>
    </div>
  </section>
</template>

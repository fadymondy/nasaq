<script setup lang="ts">
import { Check, CircleAlert, CircleDashed, Loader, Microscope, Quote, RotateCcw, Square, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAiConfidenceMeter, NqAiGeneratedLabel, NqAiThinking, usePrefersReducedMotion } from "../ai-states";
import { NqButton } from "../button";
import { NqCopilotSources, copilotHostOf, copilotIsSafeUrl } from "../copilot-chat";
import { NqTextarea } from "../field";
import { NqDateTime, useFormatNumber } from "../numeric";
import { researchRunWords, type ResearchRunLabelOverrides } from "./labels";
import { researchCitedNumbers, researchEvidenceNumbers, researchStageProgress, researchUncitedEvidence } from "./research-run-logic";
import type { ResearchEvidence, ResearchRunData, ResearchRunResult } from "./types";

// Ask a research question and follow it: an ask box, live progress (stages, sources checked and read, stop), then an answer whose
// paragraphs cite numbered evidence. Choosing a citation highlights the passage it rests on. Failed and stopped runs say so and offer
// a retry. It runs nothing itself: you start the run, stream the data in, and it renders it.
const props = withDefaults(
  defineProps<{
    /** The current run, or nothing before the first question. */
    run?: ResearchRunData | null;
    /** Start researching a question. */
    onAsk: (question: string) => Promise<ResearchRunResult> | ResearchRunResult;
    /** Stop a queued or running run. Shows the stop button. */
    onCancel?: (run: ResearchRunData) => void | Promise<void>;
    /** Try the same question again after a failure or a stop. */
    onRetry?: (run: ResearchRunData) => void | Promise<void>;
    /** Example questions shown before the first run. */
    suggestions?: readonly string[];
    defaultQuestion?: string;
    labels?: ResearchRunLabelOverrides;
    class?: HTMLAttributes["class"];
  }>(),
  { run: undefined, onCancel: undefined, onRetry: undefined, suggestions: undefined, defaultQuestion: "", labels: undefined },
);

const STAGE_ICON = { pending: CircleDashed, running: Loader, done: Check, failed: X } as const;

const nq = useNasaq();
const fmt = useFormatNumber();
const t = computed(() => researchRunWords(nq.locale.value, props.labels));
const reduced = usePrefersReducedMotion();
const root = ref<HTMLElement | null>(null);
const question = ref(props.defaultQuestion);
const pending = ref(false);
const problem = ref<string | null>(null);
const active = ref<string | null>(null);

const live = computed(() => props.run?.status === "queued" || props.run?.status === "running");
const evidence = computed(() => props.run?.evidence ?? []);
const blocks = computed(() => props.run?.answer ?? []);
const numbers = computed(() => researchEvidenceNumbers(evidence.value));
const sourceOf = computed(() => new Map((props.run?.sources ?? []).map((s) => [s.id, s])));
const extra = computed(() => researchUncitedEvidence(evidence.value, blocks.value));
const mainEvidence = computed(() => evidence.value.filter((e) => !extra.value.includes(e)));
const progress = computed(() => researchStageProgress(props.run?.stages ?? []));
const activeStage = computed(() => props.run?.stages?.[progress.value.current]);
const showStages = computed(() => !!props.run?.stages && props.run.stages.length > 0 && (live.value || props.run.status !== "done"));
const waitLabel = computed(() => (props.run?.status === "queued" ? t.value.queued : t.value.asking));
const sections = computed(() => {
  const out: { key: string; label: string | null; items: ResearchEvidence[] }[] = [{ key: "main", label: null, items: mainEvidence.value }];
  if (extra.value.length > 0) out.push({ key: "extra", label: t.value.notCited, items: extra.value });
  return out;
});

async function submit(text = question.value) {
  const q = text.trim();
  if (!q || pending.value || live.value) return;
  pending.value = true;
  problem.value = null;
  try {
    const result = await props.onAsk(q);
    if (result && result.error) problem.value = result.error;
  } catch (err) {
    problem.value = err instanceof Error ? err.message : t.value.failed;
  } finally {
    pending.value = false;
  }
}

function pick(s: string) {
  question.value = s;
  void submit(s);
}

function focusEvidence(id: string) {
  active.value = id;
  const el = root.value?.querySelector<HTMLElement>(`[data-evidence-id="${CSS.escape(id)}"]`);
  el?.scrollIntoView?.({ behavior: reduced.value ? "auto" : "smooth", block: "nearest" });
}
</script>

<template>
  <section ref="root" data-slot="research-run" :aria-label="t.label" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <form class="flex flex-col gap-2" @submit.prevent="submit()">
      <NqTextarea
        v-model="question"
        dir="auto"
        :rows="2"
        :placeholder="t.placeholder"
        :aria-label="t.placeholder"
        :disabled="live || pending"
        class="min-h-16 resize-none"
        @keydown="(e: KeyboardEvent) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submit()"
      />
      <div class="flex flex-wrap items-center gap-2">
        <NqButton v-if="live && props.run && props.onCancel" type="button" variant="secondary" @click="props.onCancel(props.run)">
          <Square aria-hidden="true" />
          {{ t.cancel }}
        </NqButton>
        <NqButton type="submit" variant="primary" class="ms-auto" :loading="pending || live" :disabled="!question.trim()">
          <Microscope aria-hidden="true" />
          {{ pending || live ? t.asking : t.ask }}
        </NqButton>
      </div>
      <p role="alert" class="min-h-4 text-caption text-nq-danger-text">{{ problem ?? "" }}</p>
    </form>

    <div v-if="!props.run && props.suggestions && props.suggestions.length > 0" class="flex flex-col gap-2">
      <span class="text-caption text-muted-foreground">{{ t.suggestions }}</span>
      <ul class="flex flex-wrap gap-2">
        <li v-for="s in props.suggestions" :key="s">
          <NqButton type="button" size="sm" variant="secondary" dir="auto" @click="pick(s)">{{ s }}</NqButton>
        </li>
      </ul>
    </div>

    <div v-if="props.run" :data-status="props.run.status" class="flex min-w-0 flex-col gap-4">
      <div v-if="showStages" data-slot="research-progress" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <NqAiThinking v-if="live" :label="waitLabel" :steps="activeStage ? [activeStage.label] : undefined" :current="0" compact />
          <span v-else class="text-label text-foreground">{{ t.stages }}</span>
          <span class="text-caption tabular-nums text-muted-foreground">{{ fmt(progress.done) }} / {{ fmt(progress.total) }}</span>
        </div>
        <ol :aria-label="t.stages" class="flex flex-col gap-2">
          <li v-for="s in props.run.stages" :key="s.id" :data-state="s.state" :aria-current="s.state === 'running' ? 'step' : undefined" class="flex items-center gap-2.5 text-body-sm">
            <component
              :is="STAGE_ICON[s.state]"
              aria-hidden="true"
              :class="
                cn(
                  'size-4 shrink-0',
                  s.state === 'done' && 'text-nq-success-text',
                  s.state === 'failed' && 'text-nq-danger-text',
                  s.state === 'running' && cn('text-nq-accent-text', !reduced && 'animate-spin'),
                  s.state === 'pending' && 'text-muted-foreground',
                )
              "
            />
            <span :class="cn('min-w-0 flex-1', s.state === 'pending' ? 'text-muted-foreground' : 'text-foreground')">{{ s.label }}</span>
            <span v-if="s.detail" class="text-caption text-muted-foreground">{{ s.detail }}</span>
            <span class="sr-only">{{ t.stageStates[s.state] }}</span>
          </li>
        </ol>
        <p v-if="props.run.sourcesChecked !== undefined" class="text-caption text-muted-foreground">
          {{ t.checked(fmt(props.run.sourcesChecked)) }}{{ props.run.sourcesRead !== undefined ? ` · ${t.read(fmt(props.run.sourcesRead))}` : "" }}
        </p>
      </div>
      <div v-if="live && (!props.run.stages || props.run.stages.length === 0)" role="status" class="rounded-card border border-border bg-card p-4">
        <NqAiThinking :label="waitLabel" />
      </div>

      <div v-if="props.run.status === 'failed' || props.run.status === 'cancelled'" role="alert" class="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-4">
        <CircleAlert aria-hidden="true" :class="cn('size-4 shrink-0', props.run.status === 'failed' ? 'text-nq-danger-text' : 'text-muted-foreground')" />
        <p dir="auto" class="min-w-0 flex-1 text-body-sm text-foreground">{{ props.run.status === "failed" ? (props.run.error ?? t.failed) : t.cancelled }}</p>
        <NqButton v-if="props.onRetry" size="sm" @click="props.onRetry(props.run)">
          <RotateCcw aria-hidden="true" />
          {{ t.retry }}
        </NqButton>
      </div>

      <template v-if="props.run.status === 'done'">
        <article data-slot="research-answer" :aria-label="t.answer" class="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
          <header class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 class="text-label text-foreground">{{ t.answer }}</h3>
            <NqAiGeneratedLabel :model="props.run.model" />
            <NqAiConfidenceMeter v-if="props.run.confidence !== undefined" :value="props.run.confidence" class="ms-auto" />
          </header>
          <p v-if="blocks.length === 0" class="text-body-sm text-muted-foreground">{{ t.noAnswer }}</p>
          <p v-for="b in blocks" :key="b.id" dir="auto" class="text-body text-nq-fg-body">
            {{ b.text }}
            <button
              v-for="c in researchCitedNumbers(b.cites, numbers)"
              :key="c.id"
              type="button"
              :aria-label="t.showEvidence(String(c.n))"
              :aria-pressed="active === c.id"
              :class="
                cn(
                  'ms-1 inline-grid size-5 -translate-y-0.5 place-items-center rounded-full border border-border align-baseline text-[11px] tabular-nums outline-none',
                  'transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus',
                  active === c.id ? 'border-primary bg-nq-selected text-foreground' : 'bg-secondary text-muted-foreground',
                )
              "
              @click="focusEvidence(c.id)"
            >
              {{ fmt(c.n) }}
            </button>
          </p>
          <p v-if="props.run.finishedAt" class="text-caption text-muted-foreground">{{ t.finished }} <NqDateTime :value="props.run.finishedAt" relative /></p>
        </article>

        <div v-if="evidence.length > 0" class="flex flex-col gap-2">
          <div>
            <h3 class="text-label text-foreground">{{ t.evidence }}</h3>
            <p class="text-caption text-muted-foreground">{{ t.evidenceHint }}</p>
          </div>
          <template v-for="sec in sections" :key="sec.key">
            <p v-if="sec.label" class="text-caption text-muted-foreground">{{ sec.label }}</p>
            <ol :aria-label="sec.label ?? t.evidence" class="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
              <li
                v-for="e in sec.items"
                :key="e.id"
                :data-evidence-id="e.id"
                :data-active="active === e.id ? '' : undefined"
                :class="cn('flex gap-3 px-4 py-3 transition-colors duration-150 ease-nq', active === e.id && 'bg-nq-selected')"
              >
                <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] tabular-nums text-muted-foreground">{{ fmt(numbers.get(e.id) ?? 0) }}</span>
                <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                  <blockquote dir="auto" class="flex gap-2 text-body-sm text-foreground">
                    <Quote aria-hidden="true" class="mt-0.5 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                    <span>{{ e.quote }}</span>
                  </blockquote>
                  <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                    <template v-if="sourceOf.get(e.sourceId)">
                      <a
                        v-if="copilotIsSafeUrl(sourceOf.get(e.sourceId)!.url)"
                        :href="sourceOf.get(e.sourceId)!.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex min-w-0 items-center gap-1.5 text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current"
                      >
                        <span dir="auto" class="truncate">{{ sourceOf.get(e.sourceId)!.title }}</span>
                        <bdi dir="ltr" class="shrink-0 text-muted-foreground">{{ copilotHostOf(sourceOf.get(e.sourceId)!.url) }}</bdi>
                        <span class="sr-only">{{ t.openSource }}</span>
                      </a>
                      <span v-else dir="auto" class="truncate text-foreground">{{ sourceOf.get(e.sourceId)!.title }}</span>
                    </template>
                    <span v-if="e.relevance !== undefined">{{ t.relevance(fmt(e.relevance, { style: "percent", maximumFractionDigits: 0 })) }}</span>
                  </p>
                </div>
              </li>
            </ol>
          </template>
        </div>

        <NqCopilotSources v-if="props.run.sources && props.run.sources.length > 0" :sources="props.run.sources" :labels="{ sources: t.sources }" />
      </template>
    </div>
  </section>
</template>

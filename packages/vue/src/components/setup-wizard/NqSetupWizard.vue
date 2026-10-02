<script setup lang="ts">
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-vue-next";
import { computed, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { useAuthLocale, type AuthSubmitResult } from "../auth-layout/auth-utils";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { NqStepper, NqStepperItem } from "../stepper";
import { clampStep, missingSteps, setupProgress } from "./setup-model";
import { fill, STRINGS, type SetupWizardLabels } from "./strings";

// A first-run wizard: a step rail on wide screens, a progress bar on phones, Back, Continue and Skip, and a finish gate the server
// controls (`canFinish`, `completed`). Steps are your own forms; the wizard owns order, gating, focus and the completion screen.
// Slots: `step-<id>` (or the generic `step`, with { step, index }) for each body, `done-action` on the completion screen.
interface SetupStep {
  id: string;
  title: string;
  description?: string;
  /** Shows "Optional" and a skip button. The finish gate ignores it. */
  optional?: boolean;
  /** Set false to hold the Continue button until this step's work is done (a form valid, an agent connected). Default true. */
  ready?: boolean;
}
interface Props {
  steps: SetupStep[];
  /** Controlled current step (zero-based); listen to `onCurrentChange` and write it back. */
  current?: number;
  defaultCurrent?: number;
  onCurrentChange?: (index: number, stepId: string) => void;
  /** Step ids the server already counts as done. Required steps missing from it block Finish. */
  completed?: string[];
  /** Runs when leaving a step forward. Resolve `{ error }` to stay put and show why. */
  onStepComplete?: (stepId: string) => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** The server's verdict that setup may finish. `false` blocks Finish and shows `gateMessage`. Default true. */
  canFinish?: boolean;
  /** Why Finish is blocked, when the server has said so. */
  gateMessage?: string;
  /** Called by Finish. Resolve `{ error }` if the server refuses. */
  onFinish: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  title?: string;
  description?: string;
  /** The completion screen. */
  doneTitle?: string;
  doneDescription?: string;
  labels?: Partial<SetupWizardLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  current: undefined,
  defaultCurrent: 0,
  onCurrentChange: undefined,
  completed: undefined,
  onStepComplete: undefined,
  canFinish: true,
  gateMessage: undefined,
  title: undefined,
  description: undefined,
  doneTitle: undefined,
  doneDescription: undefined,
  labels: undefined,
});

const locale = useAuthLocale();
const t = computed<SetupWizardLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const inner = ref(props.defaultCurrent);
const current = computed(() => clampStep(props.current ?? inner.value, props.steps.length));
const pending = ref<"next" | "finish" | null>(null);
const error = ref<string | undefined>();
const done = ref(false);
const heading = ref<HTMLHeadingElement>();

const step = computed(() => props.steps[current.value]);
const last = computed(() => current.value === props.steps.length - 1);
// The step on screen is being finished right now, so it is not held against the gate.
const missing = computed(() => missingSteps(props.steps, props.completed).filter((s) => s.id !== step.value?.id));
const gated = computed(() => last.value && (!props.canFinish || missing.value.length > 0));

function go(index: number) {
  const next = clampStep(index, props.steps.length);
  if (props.current === undefined) inner.value = next;
  error.value = undefined;
  props.onCurrentChange?.(next, props.steps[next]!.id);
}

watch([current, done], () => void nextTick(() => heading.value?.focus({ preventScroll: false })));

async function run(kind: "next" | "finish", action: () => Promise<AuthSubmitResult> | AuthSubmitResult, after: () => void) {
  pending.value = kind;
  error.value = undefined;
  try {
    const result = await action();
    if (result?.error) error.value = result.error;
    else after();
  } catch {
    error.value = t.value.failed;
  } finally {
    pending.value = null;
  }
}

const next = () =>
  void run(
    "next",
    () => props.onStepComplete?.(step.value!.id),
    () => go(current.value + 1),
  );
const finishSequence = () =>
  void run(
    "finish",
    async () => {
      const stepResult = await props.onStepComplete?.(step.value!.id);
      if (stepResult?.error) return stepResult;
      return props.onFinish();
    },
    () => {
      done.value = true;
    },
  );

const stepCount = computed(() => {
  const [before, after] = t.value.stepOf.split("{current}");
  const [middle, tail] = (after ?? "").split("{total}");
  return { before, middle, tail };
});
</script>

<template>
  <NqCard v-if="done" data-slot="setup-wizard" data-state="done" :class="cn('mx-auto w-full max-w-xl items-center gap-4 p-8 text-center', props.class)">
    <span class="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
      <CircleCheck aria-hidden="true" class="size-6" />
    </span>
    <h2 ref="heading" tabindex="-1" class="text-h2 text-foreground outline-none">{{ props.doneTitle ?? t.doneTitle }}</h2>
    <p class="text-body text-muted-foreground">{{ props.doneDescription ?? t.doneDescription }}</p>
    <slot name="done-action" />
  </NqCard>
  <NqCard v-else-if="step" data-slot="setup-wizard" :data-step="step.id" :class="cn('mx-auto w-full max-w-4xl gap-0 p-0 md:grid md:grid-cols-[15rem_1fr]', props.class)">
    <aside class="hidden flex-col gap-5 border-e border-border bg-muted/50 p-6 md:flex">
      <div v-if="props.title || props.description" class="flex flex-col gap-1">
        <p v-if="props.title" class="text-label text-foreground">{{ props.title }}</p>
        <p v-if="props.description" class="text-caption text-muted-foreground">{{ props.description }}</p>
      </div>
      <nav :aria-label="t.steps">
        <NqStepper :current="current" orientation="vertical">
          <NqStepperItem
            v-for="(s, i) in props.steps"
            :key="s.id"
            :title="s.title"
            :description="s.optional ? t.optional : undefined"
            v-bind="i < current && !pending ? { onClick: () => go(i) } : {}"
          />
        </NqStepper>
      </nav>
    </aside>
    <div class="flex min-w-0 flex-col gap-5 p-5 sm:p-8">
      <div class="flex flex-col gap-2 md:hidden">
        <p v-if="props.title" class="text-label text-foreground">{{ props.title }}</p>
        <NqProgress :value="setupProgress(current + 1, props.steps.length)" :label="fill(t.stepOf, { current: current + 1, total: props.steps.length })" :show-value="false" :aria-label="t.steps" />
      </div>
      <header class="flex flex-col gap-1">
        <p class="hidden text-caption text-muted-foreground md:block">
          {{ stepCount.before }}<NqNum :value="current + 1" />{{ stepCount.middle }}<NqNum :value="props.steps.length" />{{ stepCount.tail }}
        </p>
        <h2 ref="heading" tabindex="-1" class="text-h2 text-foreground outline-none">{{ step.title }}</h2>
        <p v-if="step.description" class="text-body-sm text-muted-foreground">{{ step.description }}</p>
      </header>

      <div data-slot="setup-wizard-body" :aria-busy="pending !== null || undefined" class="min-w-0">
        <slot :name="`step-${step.id}`" :step="step" :index="current"><slot name="step" :step="step" :index="current" /></slot>
      </div>

      <NqAlert v-if="gated" tone="warning" :title="props.gateMessage ?? t.gate">
        <ul v-if="missing.length" class="m-0 flex list-disc flex-col gap-0.5 ps-4">
          <li v-for="s in missing" :key="s.id">
            <button type="button" class="text-start underline underline-offset-2" @click="go(props.steps.findIndex((x) => x.id === s.id))">{{ s.title }}</button>
          </li>
        </ul>
      </NqAlert>
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>

      <footer class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <NqButton variant="ghost" :disabled="current === 0 || pending !== null" :class="cn(current === 0 && 'invisible')" @click="go(current - 1)">
          <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.back }}
        </NqButton>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <NqButton v-if="step.optional && !last" variant="secondary" :disabled="pending !== null" @click="go(current + 1)">{{ t.skip }}</NqButton>
          <NqButton v-if="last" variant="primary" :loading="pending === 'finish'" :disabled="gated || step.ready === false || pending === 'next'" @click="finishSequence">
            <CircleCheck aria-hidden="true" />
            {{ t.finish }}
          </NqButton>
          <NqButton v-else variant="primary" :loading="pending === 'next'" :disabled="step.ready === false" @click="next">
            {{ t.next }}
            <ArrowRight aria-hidden="true" class="rtl:-scale-x-100" />
          </NqButton>
        </div>
      </footer>
    </div>
  </NqCard>
</template>

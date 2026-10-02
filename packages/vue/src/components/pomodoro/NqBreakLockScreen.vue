<script setup lang="ts">
import { Coffee, Droplets, Eye, Footprints, RefreshCw, SkipForward, Sparkles } from "lucide-vue-next";
import { DialogContent, DialogDescription, DialogPortal, DialogRoot, DialogTitle } from "reka-ui";
import { computed, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { NqButton } from "../button";
import { NqCycleDots, NqTimerReadout, NqTimerRing, timerToneText } from "../countdown";
import { useFormatNumber } from "../numeric";
import { fill, phaseTone, usePomodoroStrings, type PomodoroLabels } from "./strings";

// The full-screen break. It covers the page, traps focus and ignores clicks outside. Escape does not close
// it: it opens "Skip this break?", and only confirming skips. Motion stops under `prefers-reduced-motion`.
export type BreakSuggestionKind = "stretch" | "water" | "eyes" | "walk";
export interface BreakSuggestion {
  id: string;
  kind: BreakSuggestionKind;
  title: string;
  description?: string;
}

interface Props {
  /** Show the screen. Usually `pomodoro.onBreak.value`. */
  open: boolean;
  phase: "shortBreak" | "longBreak";
  /** Whole seconds left in the break. */
  seconds: number;
  /** Share of the break left, 0 to 1, for the ring. */
  fraction: number;
  /** Finished focus sessions in the set, for the dots. */
  cycle?: number;
  /** Sessions in a set. */
  cycles?: number;
  /** Sessions finished today, for the message. */
  completed?: number;
  /** Ideas for the break. Defaults to stretch, water, eyes and walk in the active language. */
  suggestions?: readonly BreakSuggestion[];
  /** Minutes a postponement adds. Default 5. */
  postponeMinutes?: number;
  /** Adds the Postpone button. Turns the break into more focus time. */
  postpone?: boolean;
  /** Ask before skipping. Default true. */
  confirmSkip?: boolean;
  /** The task waiting after the break. */
  nextTask?: string;
  paused?: boolean;
  labels?: PomodoroLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  cycle: 0,
  cycles: 4,
  completed: undefined,
  suggestions: undefined,
  postponeMinutes: 5,
  postpone: false,
  confirmSkip: true,
  nextTask: undefined,
  paused: false,
  labels: undefined,
});
const emit = defineEmits<{
  /** Called once the person confirms skipping. */
  skip: [];
  /** Postpone was pressed: turn the break into `minutes` more focus time. */
  postponed: [minutes: number];
}>();

const t = usePomodoroStrings(() => props.labels);
const number = useFormatNumber();
const confirming = ref(false);
const offset = ref(0);
const skipBtn = ref<{ $el?: HTMLElement } | null>(null);
// While the screen fades out the controller has already moved on, so keep showing the break that just ended.
const shown = ref({ phase: props.phase, seconds: props.seconds, fraction: props.fraction });
watch(
  () => [props.open, props.phase, props.seconds, props.fraction] as const,
  ([open, phase, seconds, fraction]) => {
    if (open) shown.value = { phase, seconds, fraction };
  },
  { immediate: true },
);

const defaults = computed<BreakSuggestion[]>(() => [
  { id: "stretch", kind: "stretch", title: t.value.stretchTitle, description: t.value.stretchBody },
  { id: "water", kind: "water", title: t.value.waterTitle, description: t.value.waterBody },
  { id: "eyes", kind: "eyes", title: t.value.eyesTitle, description: t.value.eyesBody },
  { id: "walk", kind: "walk", title: t.value.walkTitle, description: t.value.walkBody },
]);
const list = computed(() => (props.suggestions && props.suggestions.length > 0 ? props.suggestions : defaults.value));
const suggestion = computed(() => list.value[(props.cycle + offset.value) % list.value.length] as BreakSuggestion);
const SuggestionIcon = computed(() => ({ stretch: Sparkles, water: Droplets, eyes: Eye, walk: Footprints })[suggestion.value.kind]);
const tone = computed(() => phaseTone[shown.value.phase]);
const breakName = computed(() => (shown.value.phase === "longBreak" ? t.value.longBreak : t.value.shortBreak));

// A new break starts on a clean screen.
watch(
  () => props.open,
  (open) => {
    if (!open) {
      confirming.value = false;
      offset.value = 0;
    }
  },
);
// Focus returns to Skip when the person decides to keep resting.
watch(confirming, async (now, was) => {
  if (was && !now) {
    await nextTick();
    skipBtn.value?.$el?.focus();
  }
});

function skip() {
  if (props.confirmSkip) confirming.value = true;
  else emit("skip");
}
// Nothing closes this screen but the parent. Escape asks about skipping instead.
function onEscape(event: KeyboardEvent) {
  event.preventDefault();
  if (confirming.value) confirming.value = false;
  else skip();
}
</script>

<template>
  <DialogRoot :open="props.open" modal>
    <DialogPortal>
      <Transition v-bind="presence">
        <DialogContent
          v-if="props.open"
          force-mount
          data-slot="break-lock-screen"
          :data-phase="shown.phase"
          :data-confirming="confirming ? '' : undefined"
          :class="
            cn(
              'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-background p-6 text-center text-foreground outline-none',
              'transition-opacity duration-300 ease-nq motion-reduce:transition-none data-starting-style:opacity-0 data-ending-style:opacity-0',
              props.class,
            )
          "
          @escape-key-down="onEscape"
          @pointer-down-outside.prevent
          @interact-outside.prevent
        >
          <DialogTitle class="text-h1 text-foreground">{{ confirming ? t.confirmTitle : shown.phase === "longBreak" ? t.breakTitleLong : t.breakTitleShort }}</DialogTitle>
          <DialogDescription class="max-w-md text-body text-muted-foreground">
            {{ confirming ? t.confirmBody : fill(t.breakBody, { done: number(props.completed ?? props.cycle) }) }}
          </DialogDescription>

          <div v-if="confirming" data-slot="break-lock-confirm" class="flex flex-col gap-2 sm:flex-row">
            <NqButton variant="primary" size="lg" autofocus @click="confirming = false">
              <Coffee aria-hidden="true" />
              {{ t.confirmKeep }}
            </NqButton>
            <NqButton variant="secondary" size="lg" @click="emit('skip')">
              <SkipForward aria-hidden="true" class="rtl:-scale-x-100" />
              {{ t.confirmSkip }}
            </NqButton>
          </div>
          <template v-else>
            <NqTimerRing :fraction="shown.fraction" :tone="tone" :paused="props.paused" :size="260" :thickness="14">
              <NqTimerReadout :seconds="shown.seconds" :label="breakName" size="lg" />
              <span :class="cn('text-label', timerToneText[tone])">{{ breakName }}</span>
            </NqTimerRing>
            <NqCycleDots :total="props.cycles" :done="props.cycle" />

            <div data-slot="break-suggestion" :aria-label="t.suggestionLabel" role="group" class="flex w-full max-w-md items-center gap-3 rounded-card border border-border bg-card p-4 text-start">
              <span class="grid size-10 shrink-0 place-items-center rounded-full bg-nq-success-soft text-nq-success-text motion-safe:animate-pulse">
                <component :is="SuggestionIcon" aria-hidden="true" class="size-5" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="text-label text-foreground">{{ suggestion.title }}</span>
                <span v-if="suggestion.description" class="text-body-sm text-muted-foreground">{{ suggestion.description }}</span>
              </span>
              <NqButton v-if="list.length > 1" variant="ghost" size="icon-sm" :aria-label="t.anotherIdea" :title="t.anotherIdea" @click="offset += 1">
                <RefreshCw aria-hidden="true" />
              </NqButton>
            </div>

            <p v-if="props.nextTask" class="text-body-sm text-muted-foreground">{{ fill(t.breakNext, { task: props.nextTask }) }}</p>

            <div class="flex flex-col gap-2 sm:flex-row">
              <NqButton v-if="props.postpone" variant="secondary" size="lg" @click="emit('postponed', props.postponeMinutes)">
                {{ fill(t.postpone, { minutes: number(props.postponeMinutes) }) }}
              </NqButton>
              <NqButton ref="skipBtn" variant="ghost" size="lg" @click="skip">
                <SkipForward aria-hidden="true" class="rtl:-scale-x-100" />
                {{ t.skipBreak }}
              </NqButton>
            </div>
          </template>
        </DialogContent>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>

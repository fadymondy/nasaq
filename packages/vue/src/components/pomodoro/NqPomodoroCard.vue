<script setup lang="ts">
import { Armchair, Brain, Coffee, Pause, Play, SkipForward, Square, Timer } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCycleDots, NqTimerReadout, NqTimerRing, timerToneText } from "../countdown";
import { useFormatNumber } from "../numeric";
import { NqProgress } from "../progress";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { dailyProgress } from "./pomodoro-model";
import { fill, phaseTone, usePomodoroStrings, type PomodoroLabels } from "./strings";
import type { PomodoroController } from "./use-pomodoro";

// The pomodoro timer as a card: cycle dots, the timer ring with the phase inside, a linked task, start,
// pause, skip and stop, and today's progress against a goal. It reads the controller from `usePomodoro`.
export interface PomodoroTask {
  id: string;
  title: string;
  /** Shown small next to the title, for example the project. */
  project?: string;
}

interface Props {
  /** From `usePomodoro`. Share the same controller with `NqBreakLockScreen`. */
  pomodoro: PomodoroController;
  /** Daily goal in focus sessions. Default 8. Set 0 to hide the day counter. */
  dailyTarget?: number;
  /** The task this session is for. */
  task?: PomodoroTask | null;
  /** Tasks to pick from. With this, the task line becomes a picker. */
  tasks?: readonly PomodoroTask[];
  /** Minutes focused today, when your data has it. Falls back to sessions x focus length. */
  focusMinutesToday?: number;
  /** Heading. Default "Pomodoro". */
  title?: string;
  labels?: PomodoroLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { dailyTarget: 8, task: null, tasks: undefined, focusMinutesToday: undefined, title: undefined, labels: undefined });
const emit = defineEmits<{ taskChange: [task: PomodoroTask | null] }>();

const NO_TASK = "__none__";
const t = usePomodoroStrings(() => props.labels);
const number = useFormatNumber();
const p = props.pomodoro;
const tone = computed(() => phaseTone[p.phase.value]);
const Icon = computed(() => ({ focus: Brain, shortBreak: Coffee, longBreak: Armchair })[p.phase.value]);
const phaseName = computed(() => t.value[p.phase.value]);
const idle = computed(() => p.status.value === "idle");
const paused = computed(() => p.status.value === "paused");
const minutes = computed(() => props.focusMinutesToday ?? Math.round((p.completed.value * p.config.value.focusMs) / 60000));
const items = computed(() => [{ value: NO_TASK, label: t.value.noTask }, ...(props.tasks ?? []).map((x) => ({ value: x.id, label: x.title }))]);
const stateWord = computed(() => (paused.value ? `${phaseName.value} · ${t.value.paused}` : idle.value ? `${phaseName.value} · ${t.value.ready}` : phaseName.value));
const pick = (v: string | number | null) => emit("taskChange", v && v !== NO_TASK ? (props.tasks?.find((x) => x.id === v) ?? null) : null);
</script>

<template>
  <NqCard data-slot="pomodoro-card" :data-phase="p.phase.value" :data-status="p.status.value" :class="cn('w-full max-w-md', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2" class="flex items-center gap-2">
        <Timer aria-hidden="true" class="size-4 text-muted-foreground" />
        {{ props.title ?? t.title }}
      </NqCardTitle>
    </NqCardHeader>
    <NqCardContent class="flex flex-col items-center gap-5">
      <NqCycleDots :total="p.cycles.value" :done="p.cycle.value" :active="p.phase.value === 'focus' && !idle" />
      <NqTimerRing :fraction="p.fraction.value" :tone="tone" :paused="paused" :size="224">
        <component :is="Icon" aria-hidden="true" :class="cn('size-6', timerToneText[tone])" />
        <NqTimerReadout :seconds="p.seconds.value" :label="phaseName" />
        <span :class="cn('text-label', timerToneText[tone])">{{ stateWord }}</span>
      </NqTimerRing>

      <div class="flex flex-wrap items-center justify-center gap-2">
        <NqButton v-if="idle || paused" variant="primary" size="lg" @click="p.toggle()">
          <Play aria-hidden="true" class="rtl:-scale-x-100" />
          {{ paused ? t.resume : p.phase.value === "focus" ? t.startFocus : t.startBreak }}
        </NqButton>
        <NqButton v-else variant="secondary" size="lg" @click="p.toggle()">
          <Pause aria-hidden="true" />
          {{ t.pause }}
        </NqButton>
        <NqButton variant="ghost" size="lg" @click="p.skip()">
          <SkipForward aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.skip }}
        </NqButton>
        <NqButton v-if="!idle || p.cycle.value > 0" variant="ghost" size="lg" @click="p.stop()">
          <Square aria-hidden="true" />
          {{ t.stop }}
        </NqButton>
      </div>

      <div v-if="props.tasks" data-slot="pomodoro-task" class="flex w-full flex-col gap-1.5">
        <span class="text-caption text-muted-foreground">{{ t.task }}</span>
        <NqSelect :model-value="props.task?.id ?? NO_TASK" @update:model-value="pick">
          <NqSelectTrigger :aria-label="t.pickTask"><NqSelectValue :placeholder="t.pickTask" /></NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="x in items" :key="x.value" :value="x.value">{{ x.label }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
      </div>
      <p v-else-if="props.task" data-slot="pomodoro-task" class="flex w-full min-w-0 items-baseline gap-2 text-body-sm">
        <span class="shrink-0 text-muted-foreground">{{ t.task }}</span>
        <span class="truncate text-foreground">{{ props.task.title }}</span>
        <NqBadge v-if="props.task.project" variant="outline">{{ props.task.project }}</NqBadge>
      </p>

      <div v-if="props.dailyTarget > 0" data-slot="pomodoro-today" class="flex w-full flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-3 text-body-sm">
          <span class="text-label text-foreground">{{ t.today }}</span>
          <span class="text-muted-foreground tabular-nums">{{ fill(t.sessionsToday, { done: number(p.completed.value), target: number(props.dailyTarget) }) }}</span>
        </div>
        <NqProgress :value="Math.round(dailyProgress(p.completed.value, props.dailyTarget) * 100)" tone="success" :aria-label="t.today" size="sm" />
        <span class="text-caption text-muted-foreground tabular-nums">{{ fill(t.focusToday, { minutes: number(minutes) }) }}</span>
      </div>
      <p role="status" class="sr-only">{{ idle ? "" : p.phase.value === "focus" ? t.announceFocus : t.announceBreak }}</p>
    </NqCardContent>
  </NqCard>
</template>

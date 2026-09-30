"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Armchair, Brain, Coffee, Droplets, Eye, Footprints, Pause, Play, RefreshCw, SkipForward, Sparkles, Square, Timer } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { CycleDots, TimerReadout, TimerRing, type TimerRingTone, timerToneText } from "../countdown/countdown";
import { displaySeconds, nextTickDelay, remainingAt, scaledClock } from "../countdown/countdown-math";
import { useTickLoop } from "../countdown/use-tick-loop";
import { useFormatNumber } from "../numeric";
import { Progress } from "../progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import {
  DEFAULT_POMODORO,
  dailyProgress,
  initialPomodoro,
  isBreak,
  type PomodoroConfig,
  type PomodoroEvent,
  type PomodoroPhase,
  type PomodoroState,
  pausePomodoro,
  phaseDuration,
  postponeBreak,
  resumePomodoro,
  skipPomodoro,
  startPomodoro,
  stopPomodoro,
  tickPomodoro,
} from "./pomodoro-model";

const STRINGS = {
  en: {
    title: "Pomodoro",
    focus: "Focus",
    shortBreak: "Short break",
    longBreak: "Long break",
    startFocus: "Start focus",
    startBreak: "Start break",
    pause: "Pause",
    resume: "Resume",
    skip: "Skip",
    stop: "Stop",
    paused: "Paused",
    ready: "Ready",
    task: "Working on",
    noTask: "No task linked",
    pickTask: "Link a task",
    today: "Today",
    sessionsToday: "{done} of {target} sessions",
    focusToday: "{minutes} min focused",
    announceFocus: "Focus started",
    announceBreak: "Break started",
    breakTitleShort: "Time for a short break",
    breakTitleLong: "Time for a long break",
    breakBody: "Focus sessions finished today: {done}. Step away from the screen and let your mind rest.",
    breakNext: "Next up: {task}",
    breakLeft: "left",
    anotherIdea: "Another idea",
    postpone: "Postpone {minutes} min",
    skipBreak: "Skip break",
    confirmTitle: "Skip this break?",
    confirmBody: "Rest is what keeps the next session sharp. Skipping starts focus again right away.",
    confirmSkip: "Skip anyway",
    confirmKeep: "Keep resting",
    breakScreen: "Break",
    suggestionLabel: "A suggestion for this break",
    stretchTitle: "Stand up and stretch",
    stretchBody: "Roll your shoulders and reach overhead for thirty seconds.",
    waterTitle: "Drink a glass of water",
    waterBody: "Hydrate now, before the next session begins.",
    eyesTitle: "Rest your eyes",
    eyesBody: "Look at something far away for twenty seconds.",
    walkTitle: "Take a short walk",
    walkBody: "Even a minute on your feet resets your back and neck.",
  },
  ar: {
    title: "بومودورو",
    focus: "تركيز",
    shortBreak: "استراحة قصيرة",
    longBreak: "استراحة طويلة",
    startFocus: "ابدأ التركيز",
    startBreak: "ابدأ الاستراحة",
    pause: "إيقاف مؤقت",
    resume: "متابعة",
    skip: "تخطَّ",
    stop: "إنهاء",
    paused: "متوقف مؤقتًا",
    ready: "جاهز",
    task: "أعمل على",
    noTask: "لا توجد مهمة مرتبطة",
    pickTask: "اربط مهمة",
    today: "اليوم",
    sessionsToday: "{done} من {target} جلسات",
    focusToday: "{minutes} دقيقة تركيز",
    announceFocus: "بدأ التركيز",
    announceBreak: "بدأت الاستراحة",
    breakTitleShort: "حان وقت استراحة قصيرة",
    breakTitleLong: "حان وقت استراحة طويلة",
    breakBody: "جلسات التركيز المنتهية اليوم: {done}. ابتعد عن الشاشة ودع ذهنك يرتاح.",
    breakNext: "التالي: {task}",
    breakLeft: "متبقٍ",
    anotherIdea: "فكرة أخرى",
    postpone: "أجّل {minutes} دقائق",
    skipBreak: "تخطَّ الاستراحة",
    confirmTitle: "تخطي هذه الاستراحة؟",
    confirmBody: "الراحة هي ما يُبقي الجلسة التالية حادّة. التخطي يبدأ التركيز فورًا.",
    confirmSkip: "تخطَّ على أي حال",
    confirmKeep: "واصل الراحة",
    breakScreen: "استراحة",
    suggestionLabel: "اقتراح لهذه الاستراحة",
    stretchTitle: "قف وتمطَّ",
    stretchBody: "حرّك كتفيك وارفع ذراعيك فوق رأسك ثلاثين ثانية.",
    waterTitle: "اشرب كوب ماء",
    waterBody: "اشرب الآن قبل أن تبدأ الجلسة التالية.",
    eyesTitle: "أرِح عينيك",
    eyesBody: "انظر إلى شيء بعيد لمدة عشرين ثانية.",
    walkTitle: "امشِ قليلًا",
    walkBody: "حتى دقيقة واحدة على قدميك تريح ظهرك ورقبتك.",
  },
};

export type PomodoroLabels = Partial<(typeof STRINGS)["en"]>;

function useStrings(labels?: PomodoroLabels) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  return { ar, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

const phaseTone: Record<PomodoroPhase, TimerRingTone> = { focus: "primary", shortBreak: "success", longBreak: "info" };
const phaseIcon = { focus: Brain, shortBreak: Coffee, longBreak: Armchair } as const;

/* ------------------------------------------------------------------ hook */

export interface UsePomodoroOptions {
  /** Durations and rules. Anything left out uses the classic 25 / 5 / 15 with a long break after 4. */
  config?: Partial<PomodoroConfig>;
  /** Focus sessions already finished today, for the counter. */
  initialCompleted?: number;
  /** Restore a saved state (from `onStateChange`). Only valid at `speed` 1: it holds real timestamps. */
  initialState?: PomodoroState;
  /** Runs `speed` times faster than real time. For demos and tests only. */
  speed?: number;
  /** A phase finished, was skipped, stopped or postponed. Save the session here. */
  onEvent?: (event: PomodoroEvent) => void;
  /** Every state change, so it can be persisted and restored after a reload. */
  onStateChange?: (state: PomodoroState) => void;
}

export interface PomodoroController {
  state: PomodoroState;
  config: PomodoroConfig;
  phase: PomodoroPhase;
  status: PomodoroState["timer"]["status"];
  /** Focus sessions finished in this set. */
  cycle: number;
  /** Sessions in a set before the long break. */
  cycles: number;
  /** Sessions finished today. */
  completed: number;
  remainingMs: number;
  /** Whole seconds to display. */
  seconds: number;
  /** Share of the phase left, 1 at the start and 0 at the end. */
  fraction: number;
  /** True while a break is under way: the moment to show the lock screen. */
  onBreak: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Start, pause or resume, whichever fits the state. */
  toggle: () => void;
  skip: () => void;
  stop: () => void;
  /** Turns the current break into `ms` more focus time. */
  postpone: (ms: number) => void;
}

/**
 * Runs the pomodoro cycle: focus, short break, focus, ... and a long break after every set. Drift-free: it
 * re-syncs from the wall clock on every tick and when the tab becomes visible, and chained phases start at
 * the previous phase's end, so nothing accumulates.
 */
export function usePomodoro({ config: configProp, initialCompleted = 0, initialState, speed = 1, onEvent, onStateChange }: UsePomodoroOptions = {}): PomodoroController {
  const { focusMs, shortBreakMs, longBreakMs, cyclesBeforeLongBreak, autoStartBreaks, autoStartFocus } = { ...DEFAULT_POMODORO, ...configProp };
  const config = useMemo<PomodoroConfig>(
    () => ({ focusMs, shortBreakMs, longBreakMs, cyclesBeforeLongBreak, autoStartBreaks, autoStartFocus }),
    [focusMs, shortBreakMs, longBreakMs, cyclesBeforeLongBreak, autoStartBreaks, autoStartFocus],
  );
  const clock = useMemo(() => scaledClock(speed), [speed]);
  const stateRef = useRef<PomodoroState | null>(null);
  if (stateRef.current === null) stateRef.current = initialState ?? initialPomodoro(config, initialCompleted);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [now, setNow] = useState(() => clock());
  const configRef = useRef(config);
  configRef.current = config;
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;
  const changeRef = useRef(onStateChange);
  changeRef.current = onStateChange;

  const apply = useCallback(
    (next: PomodoroState, events: readonly PomodoroEvent[], at: number) => {
      const changed = next !== stateRef.current;
      stateRef.current = next;
      setNow(at);
      if (changed) {
        rerender();
        changeRef.current?.(next);
      }
      for (const event of events) eventRef.current?.(event);
    },
    [],
  );

  const wake = useTickLoop(() => {
    const at = clock();
    const { state, events } = tickPomodoro(stateRef.current as PomodoroState, configRef.current, at);
    apply(state, events, at);
    const timer = (stateRef.current as PomodoroState).timer;
    return timer.status === "running" ? nextTickDelay(timer, at) / speed : null;
  });

  // A new duration applies to a phase that has not started.
  useEffect(() => {
    const s = stateRef.current as PomodoroState;
    const ms = phaseDuration(config, s.phase);
    if (s.timer.status === "idle" && s.timer.durationMs !== ms) apply({ ...s, timer: { ...s.timer, durationMs: ms, remainingMs: ms } }, [], clock());
  }, [config, apply, clock]);

  const run = (fn: (state: PomodoroState, at: number) => PomodoroState | { state: PomodoroState; events: PomodoroEvent[] }) => {
    const at = clock();
    const result = fn(stateRef.current as PomodoroState, at);
    if ("events" in result) apply(result.state, result.events, at);
    else apply(result, [], at);
    wake();
  };

  const state = stateRef.current;
  const remainingMs = remainingAt(state.timer, now);
  const controller: PomodoroController = {
    state,
    config,
    phase: state.phase,
    status: state.timer.status,
    cycle: state.cycle,
    cycles: config.cyclesBeforeLongBreak,
    completed: state.completed,
    remainingMs,
    seconds: displaySeconds(remainingMs),
    fraction: state.timer.durationMs > 0 ? Math.min(1, remainingMs / state.timer.durationMs) : 0,
    onBreak: isBreak(state.phase) && (state.timer.status === "running" || state.timer.status === "paused"),
    start: () => run((s, at) => startPomodoro(s, at)),
    pause: () => run((s, at) => pausePomodoro(s, at)),
    resume: () => run((s, at) => resumePomodoro(s, at)),
    toggle: () => run((s, at) => (s.timer.status === "idle" ? startPomodoro(s, at) : s.timer.status === "running" ? pausePomodoro(s, at) : resumePomodoro(s, at))),
    skip: () => run((s, at) => skipPomodoro(s, configRef.current, at)),
    stop: () => run((s, at) => stopPomodoro(s, configRef.current, at)),
    postpone: (ms) => run((s, at) => postponeBreak(s, configRef.current, ms, at)),
  };
  return controller;
}

/* ------------------------------------------------------------------ card */

export interface PomodoroTask {
  id: string;
  title: string;
  /** Shown small next to the title, for example the project. */
  project?: string;
}

export interface PomodoroCardProps extends Omit<ComponentProps<typeof Card>, "children" | "title"> {
  /** From `usePomodoro`. Share the same controller with `BreakLockScreen` and `FocusStatusChip`. */
  pomodoro: PomodoroController;
  /** Daily goal in focus sessions. Default 8. Set 0 to hide the day counter. */
  dailyTarget?: number;
  /** The task this session is for. */
  task?: PomodoroTask | null;
  /** Tasks to pick from. With this, the task line becomes a picker. */
  tasks?: readonly PomodoroTask[];
  onTaskChange?: (task: PomodoroTask | null) => void;
  /** Minutes focused today, when your data has it. Falls back to sessions x focus length. */
  focusMinutesToday?: number;
  /** Heading. Default "Pomodoro". */
  title?: ReactNode;
  labels?: PomodoroLabels;
}

const NO_TASK = "__none__";

/**
 * The pomodoro timer as a card: cycle dots, the timer ring with the phase inside, a linked task, start,
 * pause, skip and stop, and today's progress against a goal. It draws nothing on its own clock: it reads
 * the controller from `usePomodoro`.
 */
export function PomodoroCard({ pomodoro, dailyTarget = 8, task, tasks, onTaskChange, focusMinutesToday, title, labels, className, ...props }: PomodoroCardProps) {
  const { t } = useStrings(labels);
  const number = useFormatNumber();
  const { phase, status } = pomodoro;
  const tone = phaseTone[phase];
  const Icon = phaseIcon[phase];
  const phaseName = t[phase];
  const idle = status === "idle";
  const paused = status === "paused";
  const minutes = focusMinutesToday ?? Math.round((pomodoro.completed * pomodoro.config.focusMs) / 60000);
  const items = useMemo(() => [{ value: NO_TASK, label: t.noTask }, ...(tasks ?? []).map((x) => ({ value: x.id, label: x.title }))], [tasks, t.noTask]);

  return (
    <Card data-slot="pomodoro-card" data-phase={phase} data-status={status} className={cn("w-full max-w-md", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Timer aria-hidden="true" className="size-4 text-muted-foreground" />
          {title ?? t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5">
        <CycleDots total={pomodoro.cycles} done={pomodoro.cycle} active={phase === "focus" && !idle} />
        <TimerRing fraction={pomodoro.fraction} tone={tone} paused={paused} size={224}>
          <Icon aria-hidden="true" className={cn("size-6", timerToneText[tone])} />
          <TimerReadout seconds={pomodoro.seconds} label={phaseName} />
          <span className={cn("text-label", timerToneText[tone])}>{paused ? `${phaseName} · ${t.paused}` : idle ? `${phaseName} · ${t.ready}` : phaseName}</span>
        </TimerRing>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {idle || paused ? (
            <Button variant="primary" size="lg" onClick={pomodoro.toggle}>
              <Play aria-hidden="true" className="rtl:-scale-x-100" />
              {paused ? t.resume : phase === "focus" ? t.startFocus : t.startBreak}
            </Button>
          ) : (
            <Button variant="secondary" size="lg" onClick={pomodoro.toggle}>
              <Pause aria-hidden="true" />
              {t.pause}
            </Button>
          )}
          <Button variant="ghost" size="lg" onClick={pomodoro.skip}>
            <SkipForward aria-hidden="true" className="rtl:-scale-x-100" />
            {t.skip}
          </Button>
          {!idle || pomodoro.cycle > 0 ? (
            <Button variant="ghost" size="lg" onClick={pomodoro.stop}>
              <Square aria-hidden="true" />
              {t.stop}
            </Button>
          ) : null}
        </div>

        {tasks ? (
          <div data-slot="pomodoro-task" className="flex w-full flex-col gap-1.5">
            <span className="text-caption text-muted-foreground">{t.task}</span>
            <Select
              items={items}
              value={task?.id ?? NO_TASK}
              onValueChange={(v) => onTaskChange?.(v && v !== NO_TASK ? ((tasks.find((x) => x.id === v) ?? null) as PomodoroTask | null) : null)}
            >
              <SelectTrigger aria-label={t.pickTask}>
                <SelectValue placeholder={t.pickTask} />
              </SelectTrigger>
              <SelectContent>
                {items.map((x) => (
                  <SelectItem key={x.value} value={x.value}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : task ? (
          <p data-slot="pomodoro-task" className="flex w-full min-w-0 items-baseline gap-2 text-body-sm">
            <span className="shrink-0 text-muted-foreground">{t.task}</span>
            <span className="truncate text-foreground">{task.title}</span>
            {task.project ? <Badge variant="outline">{task.project}</Badge> : null}
          </p>
        ) : null}

        {dailyTarget > 0 ? (
          <div data-slot="pomodoro-today" className="flex w-full flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="text-label text-foreground">{t.today}</span>
              <span className="text-muted-foreground tabular-nums">{fill(t.sessionsToday, { done: number(pomodoro.completed), target: number(dailyTarget) })}</span>
            </div>
            <Progress value={Math.round(dailyProgress(pomodoro.completed, dailyTarget) * 100)} tone="success" aria-label={t.today} size="sm" />
            <span className="text-caption text-muted-foreground tabular-nums">{fill(t.focusToday, { minutes: number(minutes) })}</span>
          </div>
        ) : null}
        <p role="status" className="sr-only">
          {idle ? "" : phase === "focus" ? t.announceFocus : t.announceBreak}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ break lock screen */

export type BreakSuggestionKind = "stretch" | "water" | "eyes" | "walk";

export interface BreakSuggestion {
  id: string;
  kind: BreakSuggestionKind;
  title: string;
  description?: string;
}

const suggestionIcon = { stretch: Sparkles, water: Droplets, eyes: Eye, walk: Footprints } as const;

export interface BreakLockScreenProps {
  /** Show the screen. Usually `pomodoro.onBreak`. */
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
  onPostpone?: (minutes: number) => void;
  /** Called once the person confirms skipping. */
  onSkip: () => void;
  /** Ask before skipping. Default true. */
  confirmSkip?: boolean;
  /** The task waiting after the break. */
  nextTask?: string;
  paused?: boolean;
  labels?: PomodoroLabels;
  className?: string;
}

/**
 * The full-screen break. It covers the page, traps focus and ignores clicks outside. Escape does not close
 * it: it opens "Skip this break?", and only confirming skips. Motion stops under `prefers-reduced-motion`.
 */
export function BreakLockScreen({
  open,
  phase: livePhase,
  seconds: liveSeconds,
  fraction: liveFraction,
  cycle = 0,
  cycles = 4,
  completed,
  suggestions,
  postponeMinutes = 5,
  onPostpone,
  onSkip,
  confirmSkip = true,
  nextTask,
  paused = false,
  labels,
  className,
}: BreakLockScreenProps) {
  const { t } = useStrings(labels);
  const number = useFormatNumber();
  const [confirming, setConfirming] = useState(false);
  const [offset, setOffset] = useState(0);
  const skipRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  // While the screen fades out the controller has already moved on, so keep showing the break that just ended.
  const shown = useRef({ phase: livePhase, seconds: liveSeconds, fraction: liveFraction });
  if (open) shown.current = { phase: livePhase, seconds: liveSeconds, fraction: liveFraction };
  const { phase, seconds, fraction } = shown.current;

  const defaults = useMemo<BreakSuggestion[]>(
    () => [
      { id: "stretch", kind: "stretch", title: t.stretchTitle, description: t.stretchBody },
      { id: "water", kind: "water", title: t.waterTitle, description: t.waterBody },
      { id: "eyes", kind: "eyes", title: t.eyesTitle, description: t.eyesBody },
      { id: "walk", kind: "walk", title: t.walkTitle, description: t.walkBody },
    ],
    [t.stretchTitle, t.stretchBody, t.waterTitle, t.waterBody, t.eyesTitle, t.eyesBody, t.walkTitle, t.walkBody],
  );
  const list = suggestions && suggestions.length > 0 ? suggestions : defaults;
  const suggestion = list[(cycle + offset) % list.length] as BreakSuggestion;
  const SuggestionIcon = suggestionIcon[suggestion.kind];
  const tone = phaseTone[phase];

  // A new break starts on a clean screen.
  useEffect(() => {
    if (!open) {
      setConfirming(false);
      setOffset(0);
    }
  }, [open]);
  // Focus returns to Skip when the person decides to keep resting.
  useEffect(() => {
    if (wasConfirming.current && !confirming) skipRef.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  const skip = () => {
    if (confirmSkip) setConfirming(true);
    else onSkip();
  };

  return (
    <BaseDialog.Root
      open={open}
      modal
      disablePointerDismissal
      onOpenChange={(next, details) => {
        if (next) return;
        // Nothing closes this screen but the parent. Escape asks about skipping instead.
        details.cancel();
        if (details.reason === "escape-key") {
          if (confirming) setConfirming(false);
          else skip();
        }
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Popup
          data-slot="break-lock-screen"
          data-phase={phase}
          data-confirming={confirming || undefined}
          className={cn(
            "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 overflow-y-auto bg-background p-6 text-center text-foreground outline-none",
            "transition-opacity duration-300 ease-nq motion-reduce:transition-none data-starting-style:opacity-0 data-ending-style:opacity-0",
            className,
          )}
        >
          <BaseDialog.Title className="text-h1 text-foreground">{confirming ? t.confirmTitle : phase === "longBreak" ? t.breakTitleLong : t.breakTitleShort}</BaseDialog.Title>
          <BaseDialog.Description className="max-w-md text-body text-muted-foreground">
            {confirming ? t.confirmBody : fill(t.breakBody, { done: number(completed ?? cycle) })}
          </BaseDialog.Description>

          {confirming ? (
            <div data-slot="break-lock-confirm" className="flex flex-col gap-2 sm:flex-row">
              <Button variant="primary" size="lg" autoFocus onClick={() => setConfirming(false)}>
                <Coffee aria-hidden="true" />
                {t.confirmKeep}
              </Button>
              <Button variant="secondary" size="lg" onClick={onSkip}>
                <SkipForward aria-hidden="true" className="rtl:-scale-x-100" />
                {t.confirmSkip}
              </Button>
            </div>
          ) : (
            <>
              <TimerRing fraction={fraction} tone={tone} paused={paused} size={260} thickness={14}>
                <TimerReadout seconds={seconds} label={phase === "longBreak" ? t.longBreak : t.shortBreak} size="lg" />
                <span className={cn("text-label", timerToneText[tone])}>{phase === "longBreak" ? t.longBreak : t.shortBreak}</span>
              </TimerRing>
              <CycleDots total={cycles} done={cycle} />

              <div data-slot="break-suggestion" aria-label={t.suggestionLabel} role="group" className="flex w-full max-w-md items-center gap-3 rounded-card border border-border bg-card p-4 text-start">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nq-success-soft text-nq-success-text motion-safe:animate-pulse">
                  <SuggestionIcon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-label text-foreground">{suggestion.title}</span>
                  {suggestion.description ? <span className="text-body-sm text-muted-foreground">{suggestion.description}</span> : null}
                </span>
                {list.length > 1 ? (
                  <Button variant="ghost" size="icon-sm" aria-label={t.anotherIdea} title={t.anotherIdea} onClick={() => setOffset((o) => o + 1)}>
                    <RefreshCw aria-hidden="true" />
                  </Button>
                ) : null}
              </div>

              {nextTask ? <p className="text-body-sm text-muted-foreground">{fill(t.breakNext, { task: nextTask })}</p> : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                {onPostpone ? (
                  <Button variant="secondary" size="lg" onClick={() => onPostpone(postponeMinutes)}>
                    {fill(t.postpone, { minutes: number(postponeMinutes) })}
                  </Button>
                ) : null}
                <Button ref={skipRef} variant="ghost" size="lg" onClick={skip}>
                  <SkipForward aria-hidden="true" className="rtl:-scale-x-100" />
                  {t.skipBreak}
                </Button>
              </div>
            </>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

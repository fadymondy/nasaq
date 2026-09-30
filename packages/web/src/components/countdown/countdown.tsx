"use client";

import { Coffee, TimerOff } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Button } from "../button";
import { useFormatDate } from "../numeric";
import {
  type CountdownState,
  type CountdownStatus,
  displaySeconds,
  elapsedFraction,
  formatTimer,
  idleCountdown,
  idleMinutes,
  nextTickDelay,
  pauseCountdown,
  remainingAt,
  resumeCountdown,
  scaledClock,
  startCountdown,
  tickCountdown,
} from "./countdown-math";
import { useTickLoop } from "./use-tick-loop";

const STRINGS = {
  en: {
    timer: "Timer",
    cycles: "{done} of {total} focus sessions done in this set",
    idleTitle: "You were away",
    idleDescription: "The timer kept running while you were idle for {minutes} min, since {time}. What should happen to that time?",
    idleKeep: "Keep the time",
    idleDiscard: "Discard {minutes} min",
    idleStop: "Discard and stop",
  },
  ar: {
    timer: "المؤقّت",
    cycles: "{done} من {total} جلسات تركيز أُنجزت في هذه الدورة",
    idleTitle: "كنت بعيدًا",
    idleDescription: "استمر المؤقّت أثناء غيابك {minutes} دقيقة منذ {time}. ماذا نفعل بهذا الوقت؟",
    idleKeep: "احتفظ بالوقت",
    idleDiscard: "احذف {minutes} دقيقة",
    idleStop: "احذف وأوقف",
  },
};

export type CountdownLabels = Partial<(typeof STRINGS)["en"]>;

function useStrings(labels?: CountdownLabels) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  return { ar, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/* ------------------------------------------------------------------ hook */

export interface UseCountdownTimerOptions {
  /** Length of the countdown in milliseconds. */
  durationMs: number;
  /** Start as soon as it mounts. Default false. */
  autoStart?: boolean;
  /** Runs `speed` times faster than real time. For demos and tests only, default 1. */
  speed?: number;
  /** Called once when the countdown reaches zero. */
  onComplete?: () => void;
}

export interface CountdownTimer {
  status: CountdownStatus;
  remainingMs: number;
  /** Whole seconds to display, rounded up. */
  seconds: number;
  /** 0 at the start, 1 when finished. */
  elapsed: number;
  durationMs: number;
  /** Starts from the full duration (or `durationMs` when given). */
  start: (durationMs?: number) => void;
  pause: () => void;
  resume: () => void;
  /** Back to idle at the full duration (or `durationMs` when given). */
  reset: (durationMs?: number) => void;
}

/**
 * A drift-free countdown. It keeps the moment it ends, not a counter, and re-syncs on every tick and when
 * the tab becomes visible again, so throttled background tabs and sleeping laptops stay correct.
 */
export function useCountdownTimer({ durationMs, autoStart = false, speed = 1, onComplete }: UseCountdownTimerOptions): CountdownTimer {
  const clock = useMemo(() => scaledClock(speed), [speed]);
  const stateRef = useRef<CountdownState | null>(null);
  if (stateRef.current === null) stateRef.current = autoStart ? startCountdown(durationMs, clock()) : idleCountdown(durationMs);
  const [now, setNow] = useState(() => clock());
  const [, setState] = useState<CountdownState>(stateRef.current);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const wake = useTickLoop(() => {
    const at = clock();
    const before = stateRef.current as CountdownState;
    const after = tickCountdown(before, at);
    stateRef.current = after;
    setNow(at);
    setState(after);
    if (before.status !== "done" && after.status === "done") completeRef.current?.();
    return after.status === "running" ? nextTickDelay(after, at) / speed : null;
  });

  const commit = useCallback(
    (next: CountdownState) => {
      stateRef.current = next;
      setState(next);
      setNow(clock());
      wake();
    },
    [clock, wake],
  );

  const state = stateRef.current;
  const remainingMs = remainingAt(state, now);
  return {
    status: state.status,
    remainingMs,
    seconds: displaySeconds(remainingMs),
    elapsed: elapsedFraction(state, now),
    durationMs: state.durationMs,
    start: (ms) => commit(startCountdown(ms ?? (stateRef.current as CountdownState).durationMs, clock())),
    pause: () => commit(pauseCountdown(stateRef.current as CountdownState, clock())),
    resume: () => commit(resumeCountdown(stateRef.current as CountdownState, clock())),
    reset: (ms) => commit(idleCountdown(ms ?? (stateRef.current as CountdownState).durationMs)),
  };
}

/* ------------------------------------------------------------------ ring */

export type TimerRingTone = "primary" | "success" | "info" | "warning" | "neutral";

const strokeTone: Record<TimerRingTone, string> = {
  primary: "stroke-primary",
  success: "stroke-nq-success",
  info: "stroke-nq-info",
  warning: "stroke-nq-warning",
  neutral: "stroke-muted-foreground",
};

/** Text colour that matches each ring tone, for the phase word or icon inside the ring. */
export const timerToneText: Record<TimerRingTone, string> = {
  primary: "text-primary",
  success: "text-nq-success-text",
  info: "text-nq-info-text",
  warning: "text-nq-warning-text",
  neutral: "text-muted-foreground",
};

export interface TimerRingProps extends Omit<ComponentProps<"div">, "children"> {
  /** How much of the ring is filled, 0 to 1. Pass the time remaining to make it drain. */
  fraction: number;
  /** Phase colour. Pair it with a word or icon inside the ring; colour alone is never the signal. */
  tone?: TimerRingTone;
  /** Diameter in pixels. Default 224. */
  size?: number;
  /** Stroke width in pixels. Default 12. */
  thickness?: number;
  /** Dashes the arc while paused, so the state does not rely on colour. */
  paused?: boolean;
  /** Content in the middle: the readout, a phase icon and label. */
  children?: ReactNode;
}

/** A circular progress ring with room in the middle. The arc starts at the top and runs clockwise. */
export function TimerRing({ fraction, tone = "primary", size = 224, thickness = 12, paused = false, className, style, children, ...props }: TimerRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const dashed = paused && value > 0;
  return (
    <div
      data-slot="timer-ring"
      data-tone={tone}
      data-paused={paused || undefined}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size, maxWidth: "100%", ...style }}
      {...props}
    >
      <svg aria-hidden="true" viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={thickness} className="stroke-nq-line" />
        <circle
          data-slot="timer-ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={dashed ? `${Math.max(1, (circumference * value) / 24)} ${Math.max(1, (circumference * value) / 24)}` : circumference}
          strokeDashoffset={dashed ? 0 : circumference * (1 - value)}
          className={cn(strokeTone[tone], "transition-[stroke-dashoffset,stroke] duration-500 ease-linear motion-reduce:transition-none", value <= 0 && "opacity-0")}
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center gap-1 text-center">{children}</div>
    </div>
  );
}

export interface TimerReadoutProps extends Omit<ComponentProps<"time">, "children"> {
  seconds: number;
  /** Accessible name, for example "Focus". */
  label?: string;
  /** Larger figures for a full-screen readout. */
  size?: "md" | "lg";
}

/** The mm:ss figure. Always left-to-right with tabular digits, so it does not jitter or flip in Arabic. */
export function TimerReadout({ seconds, label, size = "md", className, ...props }: TimerReadoutProps) {
  const { t } = useStrings();
  const whole = Math.max(0, Math.floor(seconds));
  return (
    <time
      data-slot="timer-readout"
      role="timer"
      aria-label={label ?? t.timer}
      aria-live="off"
      dateTime={`PT${Math.floor(whole / 60)}M${whole % 60}S`}
      dir="ltr"
      className={cn("font-medium leading-none tabular-nums text-foreground", size === "lg" ? "text-[clamp(3rem,14vw,5.5rem)]" : "text-[clamp(2rem,9vw,3rem)]", className)}
      {...props}
    >
      {formatTimer(whole)}
    </time>
  );
}

/* ------------------------------------------------------------------ cycle dots */

export interface CycleDotsProps extends Omit<ComponentProps<"div">, "children"> {
  /** Sessions in one set, for example 4. */
  total: number;
  /** Finished sessions in this set. */
  done: number;
  /** Rings the session under way (the dot after the finished ones). */
  active?: boolean;
  labels?: CountdownLabels;
}

/** One dot per focus session in the set. Filled dots are done; the next one is ringed while a session runs. */
export function CycleDots({ total, done, active = false, labels, className, ...props }: CycleDotsProps) {
  const { t } = useStrings(labels);
  const count = Math.max(0, Math.floor(total));
  const finished = Math.min(count, Math.max(0, Math.floor(done)));
  return (
    <div data-slot="cycle-dots" role="img" aria-label={fill(t.cycles, { done: finished, total: count })} className={cn("inline-flex items-center gap-2", className)} {...props}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          data-state={i < finished ? "done" : active && i === finished ? "current" : "todo"}
          className={cn(
            "size-2.5 rounded-full border transition-colors duration-200 ease-nq motion-reduce:transition-none",
            i < finished ? "border-primary bg-primary" : active && i === finished ? "border-primary bg-transparent ring-2 ring-primary/30" : "border-nq-line-strong bg-transparent",
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ idle time */

export interface UseIdleTimeOptions {
  /** Idle longer than this counts as being away. Default 5 minutes. */
  thresholdMs?: number;
  /** Do not watch (nothing is running, so there is nothing to ask about). */
  disabled?: boolean;
}

export interface IdleTime {
  /** How long the person was away. */
  idleMs: number;
  /** When they went idle (epoch ms). */
  since: number;
}

const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Notices the person coming back after `thresholdMs` without any input, for example a laptop that slept.
 * `idle` is set on that first input; call `dismiss` once the prompt is answered. It compares wall-clock
 * time, so it also catches a sleeping machine that never fired a timer.
 */
export function useIdleTime({ thresholdMs = 5 * 60_000, disabled = false }: UseIdleTimeOptions = {}) {
  const [idle, setIdle] = useState<IdleTime | null>(null);
  const last = useRef(0);
  const prompted = useRef(false);

  useEffect(() => {
    if (disabled) return;
    last.current = Date.now();
    prompted.current = false;
    const onActivity = () => {
      const at = Date.now();
      const gap = at - last.current;
      if (!prompted.current && idleMinutes(gap, thresholdMs) !== null) {
        prompted.current = true;
        setIdle({ idleMs: gap, since: last.current });
      }
      if (!prompted.current) last.current = at;
    };
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true, capture: true });
    return () => {
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity, { capture: true });
    };
  }, [disabled, thresholdMs]);

  const dismiss = useCallback(() => {
    prompted.current = false;
    last.current = Date.now();
    setIdle(null);
  }, []);
  return { idle, dismiss };
}

export interface IdleTimePromptProps {
  /** The idle period to ask about, or null to hide the prompt. From `useIdleTime`. */
  idle: IdleTime | null;
  /** Keep the idle time in the tracked total. */
  onKeep: () => void;
  /** Remove the idle time from the tracked total and keep the timer running. */
  onDiscard: (idle: IdleTime) => void;
  /** Remove the idle time and stop the timer. Omit to hide the third button. */
  onDiscardAndStop?: (idle: IdleTime) => void;
  labels?: CountdownLabels;
}

/** "You were away for N min. Keep it or discard it?" Only its buttons close it, so the answer is never skipped. */
export function IdleTimePrompt({ idle, onKeep, onDiscard, onDiscardAndStop, labels }: IdleTimePromptProps) {
  const { t } = useStrings(labels);
  const format = useFormatDate();
  const shown = useRef<IdleTime | null>(null);
  if (idle) shown.current = idle;
  const value = idle ?? shown.current;
  const minutes = value ? Math.max(1, Math.floor(value.idleMs / 60000)) : 0;
  const time = value ? format.date(value.since, { hour: "numeric", minute: "2-digit" }) : "";
  return (
    <AlertDialog open={idle !== null}>
      <AlertDialogContent data-slot="idle-time-prompt">
        <AlertDialogHeader>
          <AlertDialogTitle className="inline-flex items-center gap-2">
            <TimerOff aria-hidden="true" className="size-5 text-nq-warning-text" />
            {t.idleTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>{fill(t.idleDescription, { minutes, time: `⁦${time}⁩` })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {onDiscardAndStop ? (
            <Button variant="ghost" onClick={() => value && onDiscardAndStop(value)}>
              {t.idleStop}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => value && onDiscard(value)}>
            {fill(t.idleDiscard, { minutes })}
          </Button>
          <Button variant="primary" autoFocus onClick={onKeep}>
            <Coffee aria-hidden="true" />
            {t.idleKeep}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

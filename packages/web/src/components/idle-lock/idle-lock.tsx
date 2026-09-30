"use client";

import { LockKeyhole, TimerReset } from "lucide-react";
import { type ComponentProps, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { formatCountdown, useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { type IdlePhase, idleState, nextIdleCheck } from "../lock-screen/lock-model";
import { Progress } from "../progress";

const STRINGS = {
  en: {
    title: "Still there?",
    description: "You have been inactive, so the app will lock in {time} to protect your data.",
    remaining: "Time left",
    stay: "Stay signed in",
    lockNow: "Lock now",
  },
  ar: {
    title: "هل ما زلت هنا؟",
    description: "لم تكن نشطًا، لذلك سيُقفل التطبيق بعد {time} لحماية بياناتك.",
    remaining: "الوقت المتبقي",
    stay: "ابقَ متصلًا",
    lockNow: "اقفل الآن",
  },
};

export type IdleLockLabels = (typeof STRINGS)["en"];

/** Events that count as being active. Movement is cheap to handle: it only stamps a timestamp. */
const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

export type IdleLockReason = "idle" | "manual";

export interface UseIdleLockOptions {
  /** Idle seconds before the lock. Default 300. */
  timeoutSeconds?: number;
  /** Seconds before the lock that the warning shows. Default 30. `0` locks with no warning. */
  warningSeconds?: number;
  /** Pause the timer (no session, or a page that must not lock, like a video call). */
  disabled?: boolean;
  /** Called once when the idle timer runs out. */
  onIdle?: () => void;
}

export interface IdleLockControls {
  phase: IdlePhase;
  /** Whole seconds until the lock while `warning`. */
  secondsLeft: number;
  /** Counts as activity now and closes the warning. */
  stayActive: () => void;
  /** Starts counting again from zero, after unlocking. */
  reset: () => void;
}

/**
 * The idle timer. It tracks the last input (pointer, keys, scroll, touch), moves `active` to `warning` to
 * `locked`, and re-checks when the tab becomes visible again so a sleeping laptop locks on wake. Input during
 * the warning does not cancel it: the person has to say they are still there.
 */
export function useIdleLock({ timeoutSeconds = 300, warningSeconds = 30, disabled = false, onIdle }: UseIdleLockOptions = {}): IdleLockControls {
  const timeoutMs = timeoutSeconds * 1000;
  const warningMs = warningSeconds * 1000;
  const last = useRef(Date.now());
  const phaseRef = useRef<IdlePhase>("active");
  const [state, setState] = useState<{ phase: IdlePhase; secondsLeft: number }>({ phase: "active", secondsLeft: warningSeconds });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const check = useCallback(() => {
    clearTimeout(timer.current);
    const idle = Date.now() - last.current;
    const next = idleState(idle, timeoutMs, warningMs);
    const prev = phaseRef.current;
    phaseRef.current = next.phase;
    setState((s) => (s.phase === next.phase && s.secondsLeft === next.secondsLeft ? s : next));
    if (next.phase === "locked") {
      if (prev !== "locked") onIdleRef.current?.();
      return;
    }
    timer.current = setTimeout(check, Math.max(nextIdleCheck(idle, timeoutMs, warningMs), 50));
  }, [timeoutMs, warningMs]);

  const reset = useCallback(() => {
    last.current = Date.now();
    phaseRef.current = "active";
    check();
  }, [check]);

  useEffect(() => {
    if (disabled) {
      clearTimeout(timer.current);
      return;
    }
    reset();
    const onActivity = () => {
      // The warning is answered by the button, not by a stray mouse move.
      if (phaseRef.current === "active") last.current = Date.now();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer.current);
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity, { capture: true });
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [disabled, reset, check]);

  return { phase: state.phase, secondsLeft: state.secondsLeft, stayActive: reset, reset };
}

export interface IdleWarningDialogProps {
  open: boolean;
  /** Seconds until the lock. */
  secondsLeft: number;
  /** The whole warning window, for the bar. */
  warningSeconds: number;
  onStay: () => void;
  onLockNow: () => void;
  labels?: Partial<IdleLockLabels>;
}

/** The "Still there?" dialog with a live countdown. Only its two buttons close it. */
export function IdleWarningDialog({ open, secondsLeft, warningSeconds, onStay, onLockNow, labels }: IdleWarningDialogProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labels };
  const time = formatCountdown(secondsLeft);
  // Announce every ten seconds and in the last five, not each tick.
  const announce = secondsLeft % 10 === 0 || secondsLeft <= 5;
  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-slot="idle-warning">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TimerReset aria-hidden="true" className="size-5 text-nq-warning-text" />
            {t.title}
          </AlertDialogTitle>
          <AlertDialogDescription>{t.description.replace("{time}", time)}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <p dir="ltr" role="timer" aria-live={announce ? "polite" : "off"} aria-label={t.remaining} className="text-center text-h2 text-foreground tabular-nums">
            {time}
          </p>
          <Progress value={warningSeconds > 0 ? (secondsLeft / warningSeconds) * 100 : 0} tone="warning" size="sm" aria-label={t.remaining} />
        </div>
        <AlertDialogFooter>
          <Button variant="secondary" onClick={onLockNow}>
            <LockKeyhole aria-hidden="true" />
            {t.lockNow}
          </Button>
          <Button variant="primary" autoFocus onClick={onStay}>
            {t.stay}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface IdleLockContext {
  /** Call once the person has really unlocked (after your `onUnlock` verified). */
  unlock: () => void;
}

export interface IdleLockProps extends Omit<ComponentProps<"div">, "children"> {
  /** The app. It stays mounted but inert and hidden from assistive tech while locked; pass `unmountWhenLocked` when its content is sensitive. */
  children: ReactNode;
  /** What covers the app when locked: a `LockScreen`, or a function that gets `unlock` to call after verifying. */
  lockScreen: ReactNode | ((context: IdleLockContext) => ReactNode);
  /** Idle seconds before the lock. Default 300. */
  timeoutSeconds?: number;
  /** Seconds before the lock that the warning shows. Default 30. `0` skips the warning. */
  warningSeconds?: number;
  /** Controlled lock state, so the app can also lock on demand (a "Lock" menu item). */
  locked?: boolean;
  defaultLocked?: boolean;
  /** Called with `true` and why when it locks, and `false` when it unlocks. */
  onLockedChange?: (locked: boolean, reason: IdleLockReason) => void;
  /** Pause the timer, for example while signed out. */
  disabled?: boolean;
  /** Remove the app from the DOM while locked instead of hiding it. */
  unmountWhenLocked?: boolean;
  labels?: Partial<IdleLockLabels>;
}

/**
 * Wraps the app so it locks itself after a period of inactivity. Shows the "Still there?" countdown first, then
 * covers the app with your `lockScreen`. The timer is a courtesy: expire the session on the server as well.
 */
export function IdleLock({
  children,
  lockScreen,
  timeoutSeconds = 300,
  warningSeconds = 30,
  locked: lockedProp,
  defaultLocked = false,
  onLockedChange,
  disabled = false,
  unmountWhenLocked = false,
  labels,
  className,
  ...props
}: IdleLockProps) {
  const [inner, setInner] = useState(defaultLocked);
  const locked = lockedProp ?? inner;
  const setLocked = (next: boolean, reason: IdleLockReason) => {
    if (lockedProp === undefined) setInner(next);
    onLockedChange?.(next, reason);
  };
  const idle = useIdleLock({ timeoutSeconds, warningSeconds, disabled: disabled || locked, onIdle: () => setLocked(true, "idle") });

  const unlock = () => {
    setLocked(false, "manual");
    idle.reset();
  };
  const warning = !locked && !disabled && idle.phase === "warning";

  return (
    <div data-slot="idle-lock" data-locked={locked || undefined} className={cn("contents", className)} {...props}>
      {unmountWhenLocked && locked ? null : (
        <div data-slot="idle-lock-app" className="contents" inert={locked || undefined} aria-hidden={locked || undefined}>
          {children}
        </div>
      )}
      <IdleWarningDialog open={warning} secondsLeft={idle.secondsLeft} warningSeconds={warningSeconds} onStay={idle.stayActive} onLockNow={() => setLocked(true, "manual")} labels={labels} />
      {locked ? (
        <div data-slot="idle-lock-screen" className="fixed inset-0 z-[60] overflow-y-auto bg-background">
          {typeof lockScreen === "function" ? lockScreen({ unlock }) : lockScreen}
        </div>
      ) : null}
    </div>
  );
}

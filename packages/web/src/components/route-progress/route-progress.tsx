"use client";

import { type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { nextTrickle } from "./route-progress-math";

const STRINGS = {
  en: { label: "Loading" },
  ar: { label: "جارٍ التحميل" },
};

export type RouteProgressLabels = (typeof STRINGS)["en"];

export type RouteProgressTone = "default" | "info" | "success" | "warning" | "danger";

const tones: Record<RouteProgressTone, string> = {
  default: "bg-primary",
  info: "bg-nq-info",
  success: "bg-nq-success",
  warning: "bg-nq-warning",
  danger: "bg-nq-danger",
};

export interface RouteProgressProps extends Omit<ComponentProps<"div">, "children"> {
  /** Work is running. The bar starts, creeps toward 94% and jumps to 100% when this turns false. */
  active?: boolean;
  /** Pin the bar to an exact percentage (0 to 100). Overrides `active`; the bar hides itself at 100. */
  value?: number;
  tone?: RouteProgressTone;
  /** `fixed` sits on the top of the screen, `absolute` on the top of a `relative` parent. Default `fixed`. */
  placement?: "fixed" | "absolute";
  /** Milliseconds between creeps. Default 250. */
  interval?: number;
  labels?: Partial<RouteProgressLabels>;
}

/**
 * A thin bar along the top edge for navigation and background work. It is decoration for sighted people and a
 * `progressbar` role for everyone else. The fill grows from the inline start, so in Arabic it grows from the right.
 * Drive it with `active` (see `useRouteProgress`), or pin it with `value`.
 */
export function RouteProgress({
  active = false,
  value,
  tone = "default",
  placement = "fixed",
  interval = 250,
  labels,
  className,
  ...props
}: RouteProgressProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [auto, setAuto] = useState(0);
  const [visible, setVisible] = useState(false);
  const pinned = value !== undefined;

  useEffect(() => {
    if (pinned) return;
    if (active) {
      setVisible(true);
      setAuto((v) => (v === 0 || v === 100 ? 6 : v));
      const id = setInterval(() => setAuto((v) => nextTrickle(v)), interval);
      return () => clearInterval(id);
    }
    setAuto((v) => (v > 0 ? 100 : 0));
    const id = setTimeout(() => {
      setVisible(false);
      setAuto(0);
    }, 300);
    return () => clearTimeout(id);
  }, [active, pinned, interval]);

  const shown = pinned ? Math.max(0, Math.min(100, value)) : auto;
  const show = pinned ? shown > 0 && shown < 100 : visible;

  return (
    <div
      role="progressbar"
      aria-label={t.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown)}
      aria-hidden={show ? undefined : true}
      data-slot="route-progress"
      data-state={show ? "active" : "idle"}
      className={cn(
        "pointer-events-none inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200 ease-nq motion-reduce:transition-none",
        placement,
        show ? "opacity-100" : "opacity-0",
        className,
      )}
      {...props}
    >
      <div
        data-slot="route-progress-bar"
        className={cn("h-full rounded-e-full transition-[inline-size] duration-200 ease-nq motion-reduce:transition-none", tones[tone])}
        style={{ inlineSize: `${shown}%` }}
      />
    </div>
  );
}

/**
 * Counts running jobs so several can share one bar: `active` stays true until every `start()` has been
 * finished. `run(promise)` wraps a promise. The finisher returned by `start` is safe to call twice.
 */
export function useRouteProgress() {
  const [count, setCount] = useState(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const start = useCallback(() => {
    let finished = false;
    setCount((n) => n + 1);
    return () => {
      if (finished) return;
      finished = true;
      if (mounted.current) setCount((n) => Math.max(0, n - 1));
    };
  }, []);
  const run = useCallback(
    async <T,>(work: Promise<T> | (() => Promise<T>)): Promise<T> => {
      const done = start();
      try {
        return await (typeof work === "function" ? work() : work);
      } finally {
        done();
      }
    },
    [start],
  );
  return { active: count > 0, count, start, run };
}

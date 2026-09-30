"use client";

import { RefreshCw } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "../auth-layout/auth-utils";
import { Button } from "../button";
import { CopyButton } from "../copy-button";
import { Num } from "../numeric";
import { ProductMark } from "../product-mark";
import { BRAILLE_FRAMES, clampPercent, dotMatrixLevels, ringArc } from "./loader-frames";

const STRINGS = {
  en: {
    loading: "Loading",
    starting: "Getting things ready",
    slow: "This is taking longer than usual. Still trying.",
    failedTitle: "Could not start",
    failedBody: "We could not finish starting. Try again. If it keeps failing, send the details below to support.",
    retry: "Try again",
    details: "Details",
    copyDetails: "Copy details",
  },
  ar: {
    loading: "جارٍ التحميل",
    starting: "جارٍ تجهيز كل شيء",
    slow: "يستغرق هذا وقتًا أطول من المعتاد. ما زلنا نحاول.",
    failedTitle: "تعذّر البدء",
    failedBody: "لم نتمكن من إكمال التشغيل. حاول مرة أخرى، وإن استمر الفشل أرسل التفاصيل أدناه إلى الدعم.",
    retry: "حاول مرة أخرى",
    details: "التفاصيل",
    copyDetails: "نسخ التفاصيل",
  },
};

export type BrandLoadersLabels = (typeof STRINGS)["en"];

const REDUCED = "(prefers-reduced-motion: reduce)";

/** A frame counter that stands still under `prefers-reduced-motion` (and until mounted, so SSR matches). */
function useTick(interval: number, enabled = true) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled || window.matchMedia(REDUCED).matches) return;
    const id = setInterval(() => setTick((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
  return tick;
}

/* ------------------------------------------------------------------ braille */

export interface BrailleLoaderProps extends Omit<ComponentProps<"span">, "children"> {
  /** Announced to screen readers. Default "Loading" / "جارٍ التحميل". */
  label?: string;
  /** Custom frames, one character each. Default: the ten-frame braille spinner. */
  frames?: readonly string[];
  /** Milliseconds per frame. Default 80. */
  interval?: number;
}

/** A one-character text spinner made of braille dots. Inherits the text colour and size. */
export function BrailleLoader({ label, frames = BRAILLE_FRAMES, interval = 80, className, ...props }: BrailleLoaderProps) {
  const t = STRINGS[useAuthLocale()];
  const tick = useTick(interval);
  return (
    <span data-slot="braille-loader" role="status" className={cn("inline-flex", className)} {...props}>
      <span aria-hidden="true" dir="ltr" className="inline-block w-[1ch] text-center font-mono leading-none">
        {frames[tick % frames.length]}
      </span>
      <span className="sr-only">{label ?? t.loading}</span>
    </span>
  );
}

/* ------------------------------------------------------------- dot matrix */

export interface DotMatrixFillProps extends Omit<ComponentProps<"div">, "children"> {
  /** 0..100 progress, or `null` for an indeterminate sweep. */
  value: number | null;
  cols?: number;
  rows?: number;
  /** Dot pitch in px. Default 10. */
  pitch?: number;
  /** Announced name. Default "Loading". */
  label?: string;
}

/**
 * A benday-dot matrix that fills from the left as `value` grows. Dots swell from a small grey point to
 * a full brand dot; `value={null}` sweeps a wave across instead. It always runs left to right, so it
 * stays a picture of progress the same way in RTL.
 */
export function DotMatrixFill({ value, cols = 24, rows = 5, pitch = 10, label, className, style, ...props }: DotMatrixFillProps) {
  const t = STRINGS[useAuthLocale()];
  const tick = useTick(90, value === null);
  const levels = dotMatrixLevels({ cols, rows, value, tick });
  const determinate = value !== null;
  return (
    <div
      data-slot="dot-matrix-fill"
      role="progressbar"
      aria-label={label ?? t.loading}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? Math.round(clampPercent(value)) : undefined}
      dir="ltr"
      className={cn("inline-grid", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, ${pitch}px)`, gridAutoRows: `${pitch}px`, ...style }}
      {...props}
    >
      {levels.map((level, i) => (
        <span key={i} aria-hidden="true" className="flex items-center justify-center">
          <span
            className={cn("block rounded-full transition-[transform,opacity] duration-150 ease-nq motion-reduce:transition-none", level > 0 ? "bg-primary" : "bg-border")}
            style={{ width: pitch * 0.62, height: pitch * 0.62, transform: `scale(${(0.35 + 0.65 * level).toFixed(3)})`, opacity: level > 0 ? 0.35 + 0.65 * level : 1 }}
          />
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ logo loader */

export interface LogoLoaderProps extends Omit<ComponentProps<"div">, "children"> {
  /**
   * The mark to animate around. Pass the host's official mark (a `ProductMark`, or the brand's own
   * component). Default: the provider brand's `ProductMark`. It is never redrawn, recoloured or moved.
   */
  mark?: ReactNode;
  /** Rendered size of the mark in px, used for the default mark and to size the ring. Default 56. */
  size?: number;
  /** `pulse` fades the mark's whole box in and out. `ring` runs an arc around it. Default `ring`. */
  variant?: "pulse" | "ring";
  /** 0..100 to make the ring a progress ring. `null` or omitted: an endless spinning arc. */
  value?: number | null;
  /** Announced name. Default "Loading". */
  label?: string;
}

/**
 * Motion around a brand mark. Only the wrapper's opacity, or an SVG ring drawn outside the mark,
 * moves; the mark's own shapes are untouched. Motion stops under `prefers-reduced-motion`.
 */
export function LogoLoader({ mark, size = 56, variant = "ring", value, label, className, style, ...props }: LogoLoaderProps) {
  const t = STRINGS[useAuthLocale()];
  const box = Math.round(size * 1.7);
  const determinate = typeof value === "number";
  const { circumference, dashOffset } = ringArc(determinate ? value : 25, 46);
  const name = label ?? t.loading;
  return (
    <div
      data-slot="logo-loader"
      data-variant={variant}
      role={determinate ? "progressbar" : "status"}
      aria-label={name}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={determinate ? Math.round(clampPercent(value)) : undefined}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: box, height: box, ...style }}
      {...props}
    >
      {variant === "ring" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className={cn("absolute inset-0 size-full", determinate ? "-rotate-90" : "motion-safe:animate-spin motion-reduce:hidden")}
        >
          <circle cx="50" cy="50" r="46" fill="none" strokeWidth="2" className="stroke-border" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn("stroke-primary", determinate && "transition-[stroke-dashoffset] duration-300 ease-nq motion-reduce:transition-none")}
          />
        </svg>
      ) : null}
      <span aria-hidden="true" className={cn("inline-flex", variant === "pulse" && "motion-safe:animate-pulse")}>
        {mark ?? <ProductMark size={size} title="" />}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------ boot splash */

export interface BootSplashError {
  /** What went wrong, in words a person can act on. Never a stack trace. */
  message: string;
  /** Technical details for support: a request id, status code, build number. Shown in mono, copyable. */
  detail?: string;
}

export interface BootSplashProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  /** The host's official mark. Default: the provider brand's `ProductMark`. */
  mark?: ReactNode;
  /** Product name under the mark. Omit when the mark speaks for itself. */
  name?: ReactNode;
  /** `loading` (default) or `failed`. */
  state?: "loading" | "failed";
  /** What the app is doing right now: "Loading your workspace". */
  stage?: string;
  /** 0..100 to show a determinate ring and percentage; leave out for an endless ring. */
  progress?: number | null;
  /** After this many ms of loading, show the "taking longer" line. 0 turns it off. Default 8000. */
  slowAfterMs?: number;
  /** Set with `state="failed"`. */
  error?: BootSplashError;
  /** Shown as a "Try again" button when failed. */
  onRetry?: () => void;
  /** Small print at the bottom: version, build, region. */
  footer?: ReactNode;
  labels?: Partial<BrandLoadersLabels>;
}

/**
 * The full-screen screen shown while an app boots. It states what is happening, says so plainly when
 * loading is slow, and when start-up fails it says that too, with a retry and copyable details. It
 * never pretends to progress it does not have.
 */
export function BootSplash({
  mark,
  name,
  state = "loading",
  stage,
  progress = null,
  slowAfterMs = 8000,
  error,
  onRetry,
  footer,
  labels: labelsProp,
  className,
  ...props
}: BootSplashProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (state !== "loading" || slowAfterMs <= 0) return;
    const id = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(id);
  }, [state, slowAfterMs, stage]);

  const failed = state === "failed";
  return (
    <div
      data-slot="boot-splash"
      data-state={state}
      aria-busy={!failed || undefined}
      className={cn("flex min-h-dvh flex-col items-center bg-background p-6 text-foreground", className)}
      {...props}
    >
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 text-center">
        {failed ? (
          <span data-slot="boot-splash-mark" aria-hidden="true" className="inline-flex items-center justify-center" style={{ width: 96, height: 96 }}>
            {mark ?? <ProductMark size={56} title="" />}
          </span>
        ) : (
          <LogoLoader mark={mark} size={56} variant="ring" value={progress} label={stage ?? t.starting} />
        )}
        {name ? <p className="text-h3 text-foreground">{name}</p> : null}
        {failed ? (
          <div role="alert" className="flex w-full flex-col items-center gap-3">
            <h1 className="text-h3 text-foreground">{t.failedTitle}</h1>
            <p className="text-body-sm text-foreground">{error?.message ?? t.failedBody}</p>
            {error?.message ? <p className="text-caption text-muted-foreground">{t.failedBody}</p> : null}
            {error?.detail ? (
              <div className="flex w-full items-center gap-2 rounded-control border border-border bg-muted py-1 ps-3 pe-1">
                <span className="sr-only">{t.details}</span>
                <code dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-caption text-foreground">
                  {error.detail}
                </code>
                <CopyButton value={error.detail} label={t.copyDetails} />
              </div>
            ) : null}
            {onRetry ? (
              <Button variant="primary" onClick={onRetry}>
                <RefreshCw aria-hidden="true" />
                {t.retry}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5" role="status" aria-live="polite">
            <p className="text-body-sm text-foreground">{stage ?? t.starting}</p>
            {typeof progress === "number" ? (
              <p className="text-caption text-muted-foreground tabular-nums">
                <Num value={Math.round(clampPercent(progress))} />%
              </p>
            ) : null}
            {slow ? <p className="text-caption text-muted-foreground">{t.slow}</p> : null}
          </div>
        )}
      </div>
      {footer ? <div className="text-caption text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

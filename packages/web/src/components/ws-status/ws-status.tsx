"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { DateTime } from "../numeric";
import { Spinner } from "../spinner";
import { type DateLike, formatCountdown, formatLatency, type LatencyQuality, latencyQuality, secondsUntil, signalBars, type WsState } from "./ws-status-format";

export {
  backoffDelay,
  FAIR_LATENCY_MS,
  formatCountdown,
  formatLatency,
  GOOD_LATENCY_MS,
  type LatencyQuality,
  latencyQuality,
  signalBars,
  type WsState,
} from "./ws-status-format";

const STRINGS = {
  en: {
    state: { connected: "Live", connecting: "Connecting", reconnecting: "Reconnecting", offline: "Offline" } satisfies Record<WsState, string>,
    describe: {
      connected: "Live updates are on.",
      connecting: "Opening the live connection.",
      reconnecting: "The live connection dropped. Trying again.",
      offline: "You are offline. Live updates are paused.",
    } satisfies Record<WsState, string>,
    reconnectIn: (time: string) => `Retrying in ${time}`,
    reconnectNow: "Retrying now",
    attempt: (n: number) => `Attempt ${n}`,
    retry: "Retry now",
    latency: "Latency",
    latencyQuality: { good: "Fast", fair: "Fair", poor: "Slow" } satisfies Record<LatencyQuality, string>,
    lastConnected: "Last connected",
    stale: "Data may be out of date.",
    label: "Live connection status",
  },
  ar: {
    state: { connected: "مباشر", connecting: "جارٍ الاتصال", reconnecting: "إعادة الاتصال", offline: "غير متصل" } satisfies Record<WsState, string>,
    describe: {
      connected: "التحديثات المباشرة مفعّلة.",
      connecting: "جارٍ فتح الاتصال المباشر.",
      reconnecting: "انقطع الاتصال المباشر. جارٍ المحاولة مجددًا.",
      offline: "أنت غير متصل. التحديثات المباشرة متوقفة.",
    } satisfies Record<WsState, string>,
    reconnectIn: (time: string) => `إعادة المحاولة بعد ${time}`,
    reconnectNow: "جارٍ المحاولة الآن",
    attempt: (n: number) => `المحاولة ${n}`,
    retry: "أعد المحاولة الآن",
    latency: "زمن الاستجابة",
    latencyQuality: { good: "سريع", fair: "متوسط", poor: "بطيء" } satisfies Record<LatencyQuality, string>,
    lastConnected: "آخر اتصال",
    stale: "قد تكون البيانات قديمة.",
    label: "حالة الاتصال المباشر",
  },
};

export type WsStatusLabels = (typeof STRINGS)["en"];

export type WsStatusVariant = "badge" | "inline" | "banner";

export interface WsStatusProps extends Omit<ComponentProps<"div">, "children"> {
  state: WsState;
  /** Round trip time in ms. Shown while connected. */
  latencyMs?: number;
  /** When the next reconnect attempt fires. Shows a live countdown while `reconnecting`. */
  retryAt?: DateLike;
  /** Which attempt this is (1, 2, 3 ...). */
  attempt?: number;
  /** When the connection was last live. Shown in the banner while reconnecting or offline. */
  lastConnectedAt?: DateLike;
  /** `badge` is a compact pill for a toolbar. `inline` is bare text. `banner` is a full row with the details and Retry. Default `badge`. */
  variant?: WsStatusVariant;
  /** Reconnect right now. Shows Retry now on `reconnecting` and `offline`. */
  onRetry?: () => void | Promise<unknown>;
  /** Show the latency. Default true. */
  showLatency?: boolean;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<WsStatusLabels>;
}

/** Whole seconds until `at`, re-rendered each second. `null` when there is no target. */
export function useCountdown(at: DateLike | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === undefined) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [at]);
  return at === undefined ? null : secondsUntil(at, now);
}

const tone: Record<WsState, { text: string; dot: string; box: string }> = {
  connected: { text: "text-nq-success-text", dot: "bg-nq-success", box: "border-nq-success/40 bg-nq-success-soft" },
  connecting: { text: "text-nq-info-text", dot: "bg-nq-info", box: "border-nq-info/40 bg-nq-info-soft" },
  reconnecting: { text: "text-nq-warning-text", dot: "bg-nq-warning", box: "border-nq-warning/40 bg-nq-warning-soft" },
  offline: { text: "text-nq-danger-text", dot: "bg-nq-danger", box: "border-nq-danger/40 bg-nq-danger-soft" },
};

const barTone: Record<LatencyQuality, string> = { good: "bg-nq-success", fair: "bg-nq-warning", poor: "bg-nq-danger" };

/** Three bars, lit by how fast the round trip is. Decorative: the number and word beside it carry the meaning. */
function Signal({ ms }: { ms: number }) {
  const lit = signalBars(ms);
  const q = latencyQuality(ms);
  return (
    <span aria-hidden data-slot="ws-signal" className="inline-flex h-3 items-end gap-0.5">
      {[1, 2, 3].map((n) => (
        <span key={n} className={cn("w-0.5 rounded-full", n <= lit ? barTone[q] : "bg-nq-line-strong")} style={{ height: `${n * 4}px` }} />
      ))}
    </span>
  );
}

function StateIcon({ state, className }: { state: WsState; className?: string }) {
  if (state === "connecting") return <Spinner className={className} />;
  if (state === "reconnecting") return <RefreshCw aria-hidden className={cn("motion-safe:animate-spin", className)} />;
  if (state === "offline") return <WifiOff aria-hidden className={className} />;
  return <Wifi aria-hidden className={className} />;
}

/**
 * The state of a realtime connection (WebSocket, SSE) for a dashboard: live with its latency, connecting,
 * reconnecting with a countdown to the next attempt, or offline, with a Retry now action. Three sizes: a pill
 * for a toolbar, bare text, and a banner with the details. State is text and an icon, never colour alone, and
 * the countdown is kept out of the live region so a screen reader is told about changes, not every second.
 * It is presentational: your socket code drives `state`, `latencyMs` and `retryAt`.
 */
export function WsStatus({
  state,
  latencyMs,
  retryAt,
  attempt,
  lastConnectedAt,
  variant = "badge",
  onRetry,
  showLatency = true,
  labels,
  className,
  ...props
}: WsStatusProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const seconds = useCountdown(state === "reconnecting" ? retryAt : undefined);
  const [retrying, setRetrying] = useState(false);
  const c = tone[state];
  const hasLatency = showLatency && state === "connected" && latencyMs !== undefined && Number.isFinite(latencyMs);
  const quality = hasLatency ? latencyQuality(latencyMs as number) : null;
  const countdown =
    state === "reconnecting" && seconds !== null ? (
      <span data-slot="ws-countdown" className="tabular-nums">
        {seconds > 0 ? t.reconnectIn(formatCountdown(seconds)) : t.reconnectNow}
      </span>
    ) : null;
  const canRetry = onRetry && (state === "reconnecting" || state === "offline");

  async function retry() {
    setRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setRetrying(false);
    }
  }

  const latency = hasLatency ? (
    <span data-slot="ws-latency" title={`${t.latency}: ${t.latencyQuality[quality as LatencyQuality]}`} className="inline-flex items-center gap-1.5">
      <Signal ms={latencyMs as number} />
      <bdi dir="ltr" className="tabular-nums">
        {formatLatency(latencyMs as number)}
      </bdi>
    </span>
  ) : null;

  if (variant === "banner") {
    return (
      <div
        data-slot="ws-status"
        data-state={state}
        data-variant="banner"
        className={cn("flex flex-col gap-3 rounded-card border p-3 sm:flex-row sm:items-center sm:justify-between", c.box, className)}
        {...props}
      >
        <div className="flex min-w-0 items-start gap-3">
          <StateIcon state={state} className={cn("mt-0.5 size-4 shrink-0", c.text)} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p role="status" aria-label={t.label} className="text-label text-foreground">
              {t.state[state]}
            </p>
            <p className="text-body-sm text-muted-foreground">{t.describe[state]}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
              {countdown}
              {state === "reconnecting" && attempt ? <span>{t.attempt(attempt)}</span> : null}
              {latency}
              {(state === "reconnecting" || state === "offline") && lastConnectedAt !== undefined ? (
                <span className="inline-flex gap-1">
                  {t.lastConnected}
                  <DateTime value={lastConnectedAt} relative />
                </span>
              ) : null}
            </div>
            {state === "offline" || state === "reconnecting" ? <p className="text-caption text-muted-foreground">{t.stale}</p> : null}
          </div>
        </div>
        {canRetry ? (
          <Button type="button" size="sm" variant="secondary" loading={retrying} onClick={retry} className="shrink-0">
            <RefreshCw aria-hidden />
            {t.retry}
          </Button>
        ) : null}
      </div>
    );
  }

  const body = (
    <>
      <span aria-hidden className={cn("relative flex size-2 shrink-0")}>
        {state === "connected" ? <span className={cn("absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping", c.dot)} /> : null}
        <span className={cn("relative inline-flex size-2 rounded-full", c.dot)} />
      </span>
      <span role="status" aria-label={t.label} className="text-body-sm text-foreground">
        {t.state[state]}
      </span>
      {countdown ? <span className="text-caption text-muted-foreground">{countdown}</span> : null}
      {latency ? <span className="text-caption text-muted-foreground">{latency}</span> : null}
    </>
  );

  if (variant === "inline") {
    return (
      <div data-slot="ws-status" data-state={state} data-variant="inline" className={cn("inline-flex flex-wrap items-center gap-2", className)} {...props}>
        {body}
        {canRetry ? (
          <Button type="button" size="sm" variant="link" loading={retrying} onClick={retry}>
            {t.retry}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-slot="ws-status"
      data-state={state}
      data-variant="badge"
      className={cn("inline-flex h-7 max-w-full items-center gap-2 rounded-full border border-border bg-card ps-2.5 text-body-sm", canRetry ? "pe-1" : "pe-3", className)}
      {...props}
    >
      {body}
      {canRetry ? (
        <Button type="button" size="sm" variant="ghost" loading={retrying} onClick={retry} className="h-5 rounded-full px-2 text-caption">
          {t.retry}
        </Button>
      ) : null}
    </div>
  );
}

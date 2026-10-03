// nqWsStatus: the live part of the realtime status indicator. The markup is the React WsStatus's (the Blade component
// renders it), the state, the reconnect countdown and the Retry now action live here.
//
//   <div x-data="nqWsStatus({ state: 'reconnecting', retryAt: Date.now() + 7000 })" x-modelable="state" x-bind="root" data-slot="ws-status">
//     <span x-text="countdownText()"></span>
//     <button x-bind="retryButton" x-show="canRetry()">Retry now</button>
//   </div>
//
// Drive it from your socket code: `$dispatch('nq-ws-status', { state: 'offline', latencyMs: 80 })` on the element, or
// x-model the state. Retry fires a `retry` event with `{ wait(promise) }`: @retry="$event.detail.wait(reconnect())".
// Self-contained: the format helpers below are the ones of ws-status-format.ts in @fadymondy/nasaq.

import type { Register } from "./types";

type WsState = "connected" | "connecting" | "reconnecting" | "offline";
type Quality = "good" | "fair" | "poor";
type DateLike = Date | number | string | null | undefined;

const toMs = (v: DateLike): number | null => {
  if (v === null || v === undefined) return null;
  const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(n) ? n : null;
};
const quality = (ms: number): Quality => (ms <= 150 ? "good" : ms <= 400 ? "fair" : "poor");
const formatLatency = (ms: number) => (!Number.isFinite(ms) || ms < 0 ? "-" : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1).replace(/\.0$/, "")} s`);
const formatCountdown = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const BAR_TONE: Record<Quality, string> = { good: "bg-nq-success", fair: "bg-nq-warning", poor: "bg-nq-danger" };
const TEXT: Record<WsState, string> = { connected: "text-nq-success-text", connecting: "text-nq-info-text", reconnecting: "text-nq-warning-text", offline: "text-nq-danger-text" };
const DOT: Record<WsState, string> = { connected: "bg-nq-success", connecting: "bg-nq-info", reconnecting: "bg-nq-warning", offline: "bg-nq-danger" };
const BOX: Record<WsState, string> = {
  connected: "border-nq-success/40 bg-nq-success-soft",
  connecting: "border-nq-info/40 bg-nq-info-soft",
  reconnecting: "border-nq-warning/40 bg-nq-warning-soft",
  offline: "border-nq-danger/40 bg-nq-danger-soft",
};

interface WsInit {
  state?: WsState;
  latencyMs?: number | null;
  retryAt?: DateLike;
  attempt?: number | null;
  showLatency?: boolean;
}

interface WsScope {
  state: WsState;
  latencyMs: number | null;
  retryAt: number | null;
  attempt: number | null;
  showLatency: boolean;
  now: number;
  retrying: boolean;
  timer: ReturnType<typeof setInterval> | undefined;
  $nq: { t(en: string, ar: string): string };
  $watch<T>(key: string, fn: (value: T) => void): void;
  $dispatch(event: string, detail?: unknown): void;
  tick(): void;
  update(patch: WsInit): void;
  seconds(): number | null;
  hasLatency(): boolean;
  canRetry(): boolean;
  retry(): Promise<void>;
}

export const wsStatus: Register = (Alpine) => {
  Alpine.data("nqWsStatus", (init: WsInit = {}) => ({
    state: (init.state ?? "connected") as WsState,
    latencyMs: init.latencyMs ?? null,
    retryAt: toMs(init.retryAt),
    attempt: init.attempt ?? null,
    showLatency: init.showLatency ?? true,
    now: Date.now(),
    retrying: false,
    timer: undefined as ReturnType<typeof setInterval> | undefined,

    init(this: WsScope) {
      this.tick();
      this.$watch("state", () => this.tick());
      this.$watch("retryAt", () => this.tick());
    },
    destroy(this: WsScope) {
      if (this.timer) clearInterval(this.timer);
    },
    /** (Re)starts the one-second clock while there is a reconnect to count down to. */
    tick(this: WsScope) {
      if (this.timer) clearInterval(this.timer);
      this.timer = undefined;
      if (this.state === "reconnecting" && this.retryAt !== null) {
        this.now = Date.now();
        this.timer = setInterval(() => (this.now = Date.now()), 1000);
      }
    },
    /** Push new values: `update({ state: "offline", latencyMs: null })`. */
    update(this: WsScope, patch: WsInit) {
      if (patch.state !== undefined) this.state = patch.state;
      if (patch.latencyMs !== undefined) this.latencyMs = patch.latencyMs;
      if (patch.retryAt !== undefined) this.retryAt = toMs(patch.retryAt);
      if (patch.attempt !== undefined) this.attempt = patch.attempt;
    },
    seconds(this: WsScope) {
      return this.state === "reconnecting" && this.retryAt !== null ? Math.max(0, Math.ceil((this.retryAt - this.now) / 1000)) : null;
    },
    countdownText(this: WsScope) {
      const s = this.seconds();
      if (s === null) return "";
      return s > 0 ? this.$nq.t(`Retrying in ${formatCountdown(s)}`, `إعادة المحاولة بعد ${formatCountdown(s)}`) : this.$nq.t("Retrying now", "جارٍ المحاولة الآن");
    },
    attemptText(this: WsScope) {
      return this.attempt ? this.$nq.t(`Attempt ${this.attempt}`, `المحاولة ${this.attempt}`) : "";
    },
    hasLatency(this: WsScope) {
      return this.showLatency && this.state === "connected" && this.latencyMs !== null && Number.isFinite(this.latencyMs);
    },
    latencyText(this: WsScope) {
      return this.latencyMs === null ? "-" : formatLatency(this.latencyMs);
    },
    latencyTitle(this: WsScope) {
      if (this.latencyMs === null) return "";
      const word = { good: ["Fast", "سريع"], fair: ["Fair", "متوسط"], poor: ["Slow", "بطيء"] }[quality(this.latencyMs)] as [string, string];
      return `${this.$nq.t("Latency", "زمن الاستجابة")}: ${this.$nq.t(word[0], word[1])}`;
    },
    /** Class for signal bar n (1 to 3). */
    barClass(this: WsScope, n: number) {
      if (this.latencyMs === null) return "bg-nq-line-strong";
      const q = quality(this.latencyMs);
      const lit = q === "good" ? 3 : q === "fair" ? 2 : 1;
      return n <= lit ? BAR_TONE[q] : "bg-nq-line-strong";
    },
    textClass(this: WsScope) {
      return TEXT[this.state];
    },
    dotClass(this: WsScope) {
      return DOT[this.state];
    },
    boxClass(this: WsScope) {
      return BOX[this.state];
    },
    canRetry(this: WsScope) {
      return this.state === "reconnecting" || this.state === "offline";
    },
    async retry(this: WsScope) {
      if (this.retrying) return;
      this.retrying = true;
      let pending: Promise<unknown> | undefined;
      this.$dispatch("retry", {
        wait: (p: unknown) => {
          pending = Promise.resolve(p);
        },
      });
      try {
        await pending;
      } finally {
        this.retrying = false;
      }
    },
    /** Bind on the root: `nq-ws-status` events update it. */
    root: {
      ":data-state"(this: WsScope) {
        return this.state;
      },
      "x-on:nq-ws-status"(this: WsScope, e: CustomEvent<WsInit>) {
        this.update(e.detail ?? {});
      },
    },
    /** Bind on the Retry now button. */
    retryButton: {
      ":aria-busy"(this: WsScope) {
        return this.retrying ? "true" : undefined;
      },
      ":data-disabled"(this: WsScope) {
        return this.retrying ? "" : undefined;
      },
      "x-on:click"(this: WsScope) {
        void this.retry();
      },
    },
  }));
};

// nqRouteProgress: a thin bar along the top edge for navigation and background work. The markup is the React
// RouteProgress', the state lives here.
//
//   <div x-data="nqRouteProgress(false)" x-bind="root" class="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden …">
//     <div x-bind="bar" class="h-full rounded-e-full bg-primary …"></div>
//   </div>
//
// Drive it three ways: set `active` (x-model, or $data), pin it with a `value` of 0 to 100, or let jobs share
// the bar by dispatching window events (the bar stays on until every start has a matching end):
//
//   window.dispatchEvent(new CustomEvent("nq-progress-start"));  …  window.dispatchEvent(new CustomEvent("nq-progress-end"));
//
// While active the bar creeps toward 94% (fast first, slower later) and jumps to 100% when work ends. The fill
// grows from the inline start, so in Arabic it grows from the right.

import type { Magics, Register } from "./types";

/** The next value of a bar that creeps forward while it waits. Moves fast at first, slows near 94. */
export function nextTrickle(value: number): number {
  if (value >= 94) return value;
  const step = value < 20 ? 10 : value < 50 ? 4 : value < 80 ? 2 : 0.5;
  return Math.min(94, value + step);
}

interface RouteProgressState extends Magics {
  active: boolean;
  value: number | null;
  jobs: number;
  auto: number;
  visible: boolean;
  readonly running: boolean;
  readonly shown: number;
  readonly show: boolean;
  sync(): void;
  start(): () => void;
}

export const routeProgress: Register = (Alpine) => {
  Alpine.data("nqRouteProgress", (initialActive = false, initialValue: number | null = null, interval = 250) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      clearInterval(timer);
      clearTimeout(hideTimer);
    };
    const onStart = { fn: () => {} };
    const onEnd = { fn: () => {} };
    return {
      active: Boolean(initialActive),
      value: initialValue,
      jobs: 0,
      auto: 0,
      visible: false,
      /** Work is running: `active`, or at least one job started through the window events or start(). */
      get running() {
        const self = this as unknown as RouteProgressState;
        return self.active || self.jobs > 0;
      },
      get shown() {
        const self = this as unknown as RouteProgressState;
        return self.value !== null && self.value !== undefined ? Math.max(0, Math.min(100, Number(self.value))) : self.auto;
      },
      get show() {
        const self = this as unknown as RouteProgressState;
        const pinned = self.value !== null && self.value !== undefined;
        return pinned ? self.shown > 0 && self.shown < 100 : self.visible;
      },
      init(this: RouteProgressState) {
        onStart.fn = () => {
          this.jobs += 1;
        };
        onEnd.fn = () => {
          this.jobs = Math.max(0, this.jobs - 1);
        };
        window.addEventListener("nq-progress-start", onStart.fn);
        window.addEventListener("nq-progress-end", onEnd.fn);
        this.$watch("running", () => this.sync());
        this.$watch("value", () => this.sync());
        this.sync();
      },
      destroy() {
        clear();
        window.removeEventListener("nq-progress-start", onStart.fn);
        window.removeEventListener("nq-progress-end", onEnd.fn);
      },
      /** Counts one running job; call the returned function once it ends (safe to call twice). */
      start(this: RouteProgressState) {
        let finished = false;
        this.jobs += 1;
        return () => {
          if (finished) return;
          finished = true;
          this.jobs = Math.max(0, this.jobs - 1);
        };
      },
      sync(this: RouteProgressState) {
        clear();
        if (this.value !== null && this.value !== undefined) return;
        if (this.running) {
          this.visible = true;
          if (this.auto === 0 || this.auto === 100) this.auto = 6;
          timer = setInterval(() => {
            this.auto = nextTrickle(this.auto);
          }, interval);
          return;
        }
        if (this.auto > 0) this.auto = 100;
        hideTimer = setTimeout(() => {
          this.visible = false;
          this.auto = 0;
        }, 300);
      },
      /** Bind on the root: the progressbar role, its numbers and the idle or active state. */
      root: {
        role: "progressbar",
        ":aria-valuenow"(this: RouteProgressState) {
          return String(Math.round(this.shown));
        },
        ":aria-hidden"(this: RouteProgressState) {
          return this.show ? undefined : "true";
        },
        ":data-state"(this: RouteProgressState) {
          return this.show ? "active" : "idle";
        },
        ":class"(this: RouteProgressState) {
          return { "opacity-100": this.show, "opacity-0": !this.show };
        },
      },
      /** Bind on the fill: its inline size is the percentage. */
      bar: {
        ":style"(this: RouteProgressState) {
          return `inline-size: ${this.shown}%`;
        },
      },
    };
  });
};

// nqQueueLive and nqWaitingScreen: the "Updated 12 s ago" clock of the live indicator and the "it is your turn" vibration. The markup is the
// React WaitingScreen's, rendered by <x-nq::waiting-screen>.
//
//   <span data-slot="queue-live" x-data="nqQueueLive({ updatedAt: 1790672388000, serverNow: 1790672400000, justNow: 'Updated just now', ago: 'Updated :n s ago' })">
//     <span x-text="text">Updated 12 s ago</span>
//   </span>
//
//   <div data-slot="waiting-screen" data-status="waiting" x-data="nqWaitingScreen"> ... </div>
//
// The age is the server's age at render time plus the time since the page rendered, so a wrong clock on the phone changes nothing. When
// data-status turns to "called" (a Livewire morph, htmx swap or your own script) the phone vibrates once, where it can. Leave the line is
// the confirm button's own click: the markup dispatches a bubbling `nq-leave`.

import type { Magics, Register } from "./types";

export interface QueueLiveConfig {
  updatedAt: number;
  /** The server's clock (epoch ms) when it rendered the age. */
  serverNow: number;
  justNow: string;
  /** A sentence with :n for the seconds. */
  ago: string;
}

interface QueueLiveState extends Magics {
  updatedAt: number;
  serverNow: number;
  justNow: string;
  ago: string;
  mountedAt: number;
  tick: number;
  timer: ReturnType<typeof setInterval> | undefined;
  seconds: number;
  text: string;
}

interface WaitingState extends Magics {
  status: string | null;
  vibrate(): void;
}

// MutationObservers refuse to live behind Alpine's reactive proxy, so they are kept outside the component state.
const observers = new WeakMap<HTMLElement, MutationObserver>();

export const waitingScreen: Register = (Alpine) => {
  Alpine.data("nqQueueLive", (config: QueueLiveConfig) => ({
    updatedAt: config.updatedAt,
    serverNow: config.serverNow,
    justNow: config.justNow,
    ago: config.ago,
    mountedAt: 0,
    tick: 0,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    init(this: QueueLiveState) {
      this.mountedAt = Date.now();
      this.timer = setInterval(() => (this.tick = Date.now()), 1000);
    },
    destroy(this: QueueLiveState) {
      if (this.timer !== undefined) clearInterval(this.timer);
    },
    get seconds() {
      const self = this as unknown as QueueLiveState;
      const elapsed = (self.tick || self.mountedAt) - self.mountedAt;
      return Math.max(0, Math.round((self.serverNow - self.updatedAt + elapsed) / 1000));
    },
    get text() {
      const self = this as unknown as QueueLiveState;
      return self.seconds < 5 ? self.justNow : self.ago.replace(":n", String(self.seconds));
    },
  }));

  Alpine.data("nqWaitingScreen", () => ({
    status: null as string | null,
    init(this: WaitingState) {
      const root = this.$el;
      this.status = root.getAttribute("data-status");
      if (typeof MutationObserver === "undefined") return;
      const observer = new MutationObserver(() => {
        const next = root.getAttribute("data-status");
        if (this.status !== "called" && next === "called") this.vibrate();
        this.status = next;
      });
      observers.set(root, observer);
      observer.observe(root, { attributes: true, attributeFilter: ["data-status"] });
    },
    destroy(this: WaitingState) {
      observers.get(this.$el)?.disconnect();
    },
    vibrate() {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    },
  }));
};

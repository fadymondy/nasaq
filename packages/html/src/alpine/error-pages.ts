// nqErrorPage: the buttons and the connection state of an error page. The markup is the React ErrorPage's, rendered by <x-nq::error-pages>.
//
//   <main data-slot="error-page" x-data="nqErrorPage(false, true)">
//     <button x-bind="busyBtn('retry')" x-on:click="run('retry')">Try again</button>
//   </main>
//
// run(which) marks the button busy and dispatches a bubbling, cancelable "nq-error-retry" | "nq-error-access" | "nq-error-notify" event
// with { wait(promise) }. A listener hands wait() a promise: the button stays busy until it settles (a notify that resolves shows the
// confirmation). With no listener, retry reloads the page and the others do nothing. Call event.preventDefault() to stop the reload.
// The offline kind follows navigator.onLine and the online/offline events, and turns into "back online, reload" by itself.

import type { Magics, Register } from "./types";

type Which = "retry" | "access" | "notify";

interface ErrorPageState extends Magics {
  online: boolean;
  busy: Which | null;
  notified: boolean;
  root: HTMLElement | null;
  run(which: Which): Promise<void>;
  back(): void;
  busyBtn(which: Which): Record<string, unknown>;
}

export const errorPages: Register = (Alpine) => {
  Alpine.data("nqErrorPage", (online = false, track = false) => ({
    online,
    busy: null as Which | null,
    notified: false,
    root: null as HTMLElement | null,
    init(this: ErrorPageState) {
      this.root = this.$el;
      if (!track || typeof window === "undefined") return;
      this.online = navigator.onLine;
      const up = () => (this.online = true);
      const down = () => (this.online = false);
      window.addEventListener("online", up);
      window.addEventListener("offline", down);
    },
    back(this: ErrorPageState) {
      history.back();
    },
    async run(this: ErrorPageState, which: Which) {
      if (this.busy) return;
      const waits: Promise<unknown>[] = [];
      const event = new CustomEvent(`nq-error-${which}`, {
        bubbles: true,
        cancelable: true,
        detail: { wait: (p: Promise<unknown>) => void waits.push(p) },
      });
      this.busy = which;
      (this.root ?? this.$el).dispatchEvent(event);
      try {
        if (!waits.length && which === "retry" && !event.defaultPrevented) {
          location.reload();
          return;
        }
        await Promise.all(waits);
        if (which === "notify") this.notified = true;
      } finally {
        this.busy = null;
      }
    },
    /** Bind on a button that can be pending: carries aria-busy and data-disabled (the button stays focusable, as in React). */
    busyBtn(this: ErrorPageState, which: Which) {
      return {
        ":aria-busy"(this: ErrorPageState) {
          return this.busy === which ? "true" : null;
        },
        ":data-disabled"(this: ErrorPageState) {
          return this.busy === which ? "" : null;
        },
      };
    },
  }));
};

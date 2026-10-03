// nqImpersonationBanner: the exit button of the impersonation banner. The markup is the React ImpersonationBanner's,
// the busy / failed state lives here.
//
//   <div x-data="nqImpersonationBanner('/impersonate/stop')" role="status" data-slot="impersonation-banner">
//     <span x-show="failed" role="alert">Could not exit. Try again.</span>
//     <button x-bind="exitButton">Exit impersonation</button>
//   </div>
//
// Click fires an `exit` event with detail `{ wait(promise) }`. Hand it the work: @exit="$event.detail.wait(fetch(...))".
// A rejected promise keeps the banner and sets `failed`. With an exitUrl and no listener, the page navigates there.

import type { Register } from "./types";

interface BannerState {
  busy: boolean;
  failed: boolean;
  exitUrl: string | null;
  alive: boolean;
  $dispatch(event: string, detail?: unknown): void;
  exit(): Promise<void>;
}

export const impersonationBanner: Register = (Alpine) => {
  Alpine.data("nqImpersonationBanner", (exitUrl: string | null = null) => ({
    busy: false,
    failed: false,
    exitUrl,
    alive: true,
    destroy(this: BannerState) {
      this.alive = false;
    },
    async exit(this: BannerState) {
      if (this.busy) return;
      this.busy = true;
      this.failed = false;
      let pending: Promise<unknown> | undefined;
      this.$dispatch("exit", {
        wait: (p: unknown) => {
          pending = Promise.resolve(p);
        },
      });
      if (!pending && this.exitUrl) {
        window.location.assign(this.exitUrl);
        return;
      }
      try {
        await pending;
      } catch {
        if (this.alive) this.failed = true;
      } finally {
        if (this.alive) this.busy = false;
      }
    },
    /** Bind on the exit button. */
    exitButton: {
      ":aria-busy"(this: BannerState) {
        return this.busy ? "true" : undefined;
      },
      ":data-disabled"(this: BannerState) {
        return this.busy ? "" : undefined;
      },
      "x-on:click"(this: BannerState) {
        void this.exit();
      },
    },
  }));
};

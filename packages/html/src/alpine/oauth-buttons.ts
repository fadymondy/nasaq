// nqOAuthButtons: which provider is loading. Clicking a button dispatches `nq-oauth-select` (bubbles) with
// detail { id, wait(promise) }: pass a promise to wait() and that provider shows its spinner until it settles,
// while the other providers are disabled. `pending` keeps one provider loading from outside (redirect flows).
//
//   <div data-slot="oauth-buttons" x-data="nqOAuthButtons(null, false)" x-modelable="pending"
//        @nq-oauth-select="$event.detail.wait(startOAuth($event.detail.id))"> …buttons call select('google')… </div>

import type { Magics, Register } from "./types";

interface OAuthState extends Magics {
  pending: string | null;
  own: string | null;
  disabled: boolean;
  active: string | null;
}

export const oauthButtons: Register = (Alpine) => {
  Alpine.data("nqOAuthButtons", (pending: string | null = null, disabled = false) => ({
    pending,
    own: null as string | null,
    disabled,
    /** The provider showing its loading state. */
    get active(): string | null {
      return (this as unknown as OAuthState).pending ?? (this as unknown as OAuthState).own;
    },
    isBusy(this: OAuthState, id: string) {
      return this.active === id;
    },
    isDisabled(this: OAuthState, id: string) {
      return this.disabled || (this.active !== null && this.active !== id);
    },
    select(this: OAuthState, id: string) {
      if (this.active || this.disabled) return;
      let waiting: Promise<unknown> | undefined;
      this.$dispatch("nq-oauth-select", {
        id,
        wait: (promise: Promise<unknown> | void) => {
          if (promise && typeof promise.then === "function") waiting = promise;
        },
      });
      if (!waiting) return;
      this.own = id;
      const clear = () => {
        this.own = null;
      };
      waiting.then(clear, clear);
    },
  }));
};

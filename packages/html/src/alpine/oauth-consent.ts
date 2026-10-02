// nqOAuthConsent: the Allow / Deny handling behind the "App X wants to access your account" screen. The markup is the React
// OAuthConsent's (see the Blade oauth-consent component); the shared plumbing is login-form-logic.ts.
//
//   <section data-slot="oauth-consent" x-data="nqOAuthConsent()" x-on:nq-oauth-allow="$event.detail.waitUntil(allow())">
//
// Events (bubble from the root, each with detail.waitUntil(promise)): nq-oauth-allow, nq-oauth-deny. Resolve nothing for
// success, or { error } to show a failure. emit("nq-oauth-switch-account") fires the plain switch-account event.

import { authBase, authLang, failure, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const FAILED = { en: "Something went wrong. Try again.", ar: "حدث خطأ ما. حاول مرة أخرى." };

type Kind = "allow" | "deny";
interface ConsentState extends AuthState {
  pendingKind: "" | Kind;
}

export const oauthConsent: Register = (Alpine) => {
  Alpine.data("nqOAuthConsent", (config: AuthConfig = {}) => {
    const failed = config.failed ?? FAILED[authLang()];
    return {
      ...authBase({ failed, ...config }),
      pendingKind: "" as "" | Kind,
      init(this: ConsentState) {
        this.authInit(this.$el);
      },
      destroy(this: ConsentState) {
        this.authDestroy();
      },
      off(this: ConsentState, kind: Kind) {
        return this.pendingKind !== "" && this.pendingKind !== kind;
      },
      emit(this: ConsentState, event: string) {
        this.dispatch(event, {});
      },
      async run(this: ConsentState, kind: Kind) {
        if (this.pendingKind) return;
        this.pendingKind = kind;
        this.error = "";
        try {
          const { waits } = this.dispatch(kind === "allow" ? "nq-oauth-allow" : "nq-oauth-deny", {});
          const results = await Promise.all(waits);
          const bad = results.map(failure).find((r) => r?.error);
          if (bad) this.error = bad.error as string;
        } catch {
          this.error = failed;
        } finally {
          this.pendingKind = "";
        }
      },
    };
  });
};

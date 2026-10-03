// nqSessionExpired: re-authentication after a session ended. The same person, one password (and an optional authenticator
// code) or a passkey away from continuing. The markup is the React SessionExpired's (see the Blade session-expired component);
// the shared plumbing is login-form-logic.ts. It verifies nothing itself: your listener does.
//
//   <form data-slot="session-expired" x-data="nqSessionExpired({ requireCode: false, passkey: true })"
//         x-on:nq-session-expired="$event.detail.waitUntil(reauth($event.detail))">
//
// Events (bubble from the form; the first has detail.waitUntil(promise)):
//   nq-session-expired { password, code } resolve nothing once the session is back, or { error, fieldErrors } to show a failure.
//   nq-passkey {} the passkey button (shown when the browser supports WebAuthn; detail.waitUntil keeps it busy).
//   nq-session-switch-account {} and nq-session-sign-out {}.

import { authBase, authLang, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const STRINGS = {
  en: { passwordRequired: "Enter your password.", codeRequired: "Enter all 6 digits of the code.", failed: "Something went wrong. Try again." },
  ar: { passwordRequired: "أدخل كلمة المرور.", codeRequired: "أدخل الأرقام الـ 6 كاملة للرمز.", failed: "حدث خطأ ما. حاول مرة أخرى." },
};

interface Config extends AuthConfig {
  requireCode?: boolean;
  passkey?: boolean;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}

interface SessionState extends AuthState {
  passkeyPending: boolean;
  passkeyOn: boolean;
}

export const sessionExpired: Register = (Alpine) => {
  Alpine.data("nqSessionExpired", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    return {
      ...authBase({ names: ["password", "code"], ...config, failed: t.failed }),
      passkeyPending: false,
      passkeyOn: false,
      init(this: SessionState) {
        this.authInit(this.$el);
        this.passkeyOn = Boolean(config.passkey) && typeof PublicKeyCredential !== "undefined";
      },
      destroy(this: SessionState) {
        this.authDestroy();
      },
      /** Link buttons are off while any call runs. */
      busyAny(this: SessionState) {
        return this.pending || this.passkeyPending;
      },
      async onSubmit(this: SessionState) {
        const password = this.read("password");
        const code = config.requireCode ? this.read("code") : undefined;
        const local = {
          password: password ? undefined : t.passwordRequired,
          code: config.requireCode && (code ?? "").length !== 6 ? t.codeRequired : undefined,
        };
        await this.submitWith("nq-session-expired", { password, code }, local, { native: false });
      },
      async passkey(this: SessionState) {
        this.passkeyPending = true;
        try {
          const { waits } = this.dispatch("nq-passkey", {});
          await Promise.all(waits);
        } catch {
          // The listener owns passkey errors.
        } finally {
          this.passkeyPending = false;
        }
      },
      switchAccount(this: SessionState) {
        this.dispatch("nq-session-switch-account", {});
      },
      signOut(this: SessionState) {
        this.dispatch("nq-session-sign-out", {});
      },
    };
  });
};

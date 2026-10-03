// nqLoginForm: email sign-in with a password, a magic link or both, plus remember me, an optional passkey button,
// provider buttons and a dev-only shortcut. The markup is the React LoginForm's (see the Blade login-form component);
// the state lives here, the shared submit plumbing is login-form-logic.ts.
//
//   <form data-slot="login-form" novalidate x-data="nqLoginForm({ password: true, magicLink: true, names: ['email','password'] })"
//         x-on:nq-login="$event.detail.waitUntil(signIn($event.detail))" x-on:nq-magic-link="$event.detail.waitUntil(sendLink($event.detail))">
//
// Events, all bubbling from the root, each with detail.waitUntil(promise):
//   nq-login { email, password, remember }, nq-magic-link { email }, nq-passkey {}, nq-passkey-autofill { signal },
//   nq-dev-login {}. Resolve nothing for success, or { error, fieldErrors } to show a failure.
// With no nq-login listener and an action attribute the password form submits natively.

import { authBase, authLang, formatCountdown, isEmail, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const STRINGS = {
  en: { emailRequired: "Enter your email address.", emailInvalid: "Enter a valid email address.", passwordRequired: "Enter your password.", failed: "Something went wrong. Try again.", devFailed: "Dev login failed.", resendIn: "Send again in {time}", resend: "Send the link again" },
  ar: { emailRequired: "أدخل بريدك الإلكتروني.", emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.", passwordRequired: "أدخل كلمة المرور.", failed: "حدث خطأ ما. حاول مرة أخرى.", devFailed: "فشل دخول المطوّر.", resendIn: "أعد الإرسال بعد {time}", resend: "أرسل الرابط مرة أخرى" },
};

type Intent = "password" | "magic-link";
interface Config extends AuthConfig {
  password?: boolean;
  magicLink?: boolean;
  magicLinkSeconds?: number;
  oauth?: boolean;
  passkey?: boolean;
  passkeyAutofill?: boolean;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface LoginState extends AuthState {
  intent: Intent;
  remember: boolean;
  sentTo: string;
  passkeyPending: boolean;
  devPending: boolean;
  resendPending: boolean;
  resendError: string;
  resendDone: boolean;
  passkeyOn: boolean;
  controller: AbortController | undefined;
  send(how: Intent): Promise<void>;
  loadingFor(how: Intent): boolean;
  offFor(how: Intent): boolean;
  anyBusy(): boolean;
}

export const loginForm: Register = (Alpine) => {
  Alpine.data("nqLoginForm", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const seconds = config.magicLinkSeconds ?? 30;
    return {
      ...authBase({ names: ["email", "password"], failed: t.failed, ...config }),
      intent: "password" as Intent,
      remember: false,
      sentTo: "",
      passkeyPending: false,
      devPending: false,
      resendPending: false,
      resendError: "",
      resendDone: false,
      passkeyOn: false,
      controller: undefined as AbortController | undefined,
      init(this: LoginState) {
        this.authInit(this.$el);
        this.$watch("sentTo", (v: string) => {
          if (v) this.$nextTick(() => this.$el.querySelector<HTMLElement>('[data-slot="login-form-sent-title"]')?.focus());
        });
        if (!config.passkey || typeof PublicKeyCredential === "undefined") return;
        this.passkeyOn = true;
        if (config.passkeyAutofill) {
          this.controller = new AbortController();
          const signal = this.controller.signal;
          void (async () => {
            try {
              const available = await PublicKeyCredential.isConditionalMediationAvailable?.();
              if (available && !signal.aborted) {
                const { waits } = this.dispatch("nq-passkey-autofill", { signal });
                await Promise.all(waits);
              }
            } catch {
              // Autofill is a bonus: a cancelled or failed prompt must never break the form.
            }
          })();
        }
      },
      destroy(this: LoginState) {
        this.controller?.abort();
        this.authDestroy();
      },
      anyBusy(this: LoginState) {
        return this.pending || this.passkeyPending || this.devPending;
      },
      loadingFor(this: LoginState, how: Intent) {
        return this.pending && this.intent === how;
      },
      offFor(this: LoginState, how: Intent) {
        return (this.anyBusy() && !this.pending) || (this.pending && this.intent !== how);
      },
      resendOff(this: LoginState) {
        return this.cooldown > 0 || this.resendPending;
      },
      dividerOn(this: LoginState) {
        return Boolean(config.oauth) || this.passkeyOn;
      },
      resendLabel(this: LoginState) {
        return this.cooldown > 0 ? t.resendIn.replace("{time}", formatCountdown(this.cooldown)) : t.resend;
      },
      onSubmit(this: LoginState) {
        return this.send(config.password === false ? "magic-link" : "password");
      },
      async send(this: LoginState, how: Intent) {
        this.intent = how;
        const email = this.read("email").trim();
        const password = this.read("password");
        const local = {
          email: email ? (isEmail(email) ? undefined : t.emailInvalid) : t.emailRequired,
          password: how === "password" && config.password !== false && !password ? t.passwordRequired : undefined,
        };
        if (how === "password") {
          await this.submitWith("nq-login", { email, password, remember: this.remember }, local);
        } else {
          await this.submitWith("nq-magic-link", { email }, local, {
            native: false,
            onOk: () => {
              this.sentTo = email;
              this.resendError = "";
              this.resendDone = false;
              this.startCooldown(seconds);
            },
          });
        }
      },
      async passkey(this: LoginState) {
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
      async devLogin(this: LoginState) {
        if (this.anyBusy()) return;
        this.devPending = true;
        this.error = "";
        try {
          const { waits } = this.dispatch("nq-dev-login", {});
          const results = (await Promise.all(waits)) as { error?: string }[];
          const bad = results.find((r) => r?.error);
          if (bad) this.error = bad.error as string;
        } catch {
          this.error = t.devFailed;
        } finally {
          this.devPending = false;
        }
      },
      async resend(this: LoginState) {
        if (!this.sentTo || this.cooldown > 0 || this.resendPending) return;
        this.resendPending = true;
        this.resendError = "";
        try {
          const { waits } = this.dispatch("nq-magic-link", { email: this.sentTo });
          const results = (await Promise.all(waits)) as { error?: string }[];
          const bad = results.find((r) => r?.error);
          if (bad) this.resendError = bad.error as string;
          else {
            this.resendDone = true;
            this.startCooldown(seconds);
          }
        } catch {
          this.resendError = t.failed;
        } finally {
          this.resendPending = false;
        }
      },
      changeEmail(this: LoginState) {
        this.sentTo = "";
        this.resendError = "";
        this.resendDone = false;
      },
    };
  });
};

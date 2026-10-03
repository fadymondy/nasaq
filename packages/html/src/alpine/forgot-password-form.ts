// nqForgotPasswordForm: ask for an email, then show "Check your inbox" with a resend button on a cooldown.
// The markup is the React ForgotPasswordForm's (see the Blade forgot-password-form component); the shared submit
// plumbing is login-form-logic.ts.
//
//   <div data-slot="forgot-password-form" x-data="nqForgotPasswordForm({ names: ['email'] })"
//        x-on:nq-forgot-password="$event.detail.waitUntil(sendReset($event.detail.email))">
//
// Events (bubble from the root, each with detail.waitUntil(promise)): nq-forgot-password { email } and
// nq-forgot-password-resend { email }; with no resend listener the resend fires nq-forgot-password again.
// Resolve nothing for success, or { error, fieldErrors } to show a failure.

import { authBase, authLang, failure, formatCountdown, isEmail, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const STRINGS = {
  en: { emailRequired: "Enter your email address.", emailInvalid: "Enter a valid email address.", failed: "Something went wrong. Try again.", resend: "Resend email", resendIn: "Resend in {time}" },
  ar: { emailRequired: "أدخل بريدك الإلكتروني.", emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.", failed: "حدث خطأ ما. حاول مرة أخرى.", resend: "إعادة إرسال الرسالة", resendIn: "إعادة الإرسال بعد {time}" },
};

interface Config extends AuthConfig {
  resendSeconds?: number;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface ForgotState extends AuthState {
  sentTo: string;
  resendPending: boolean;
  resendError: string;
  resendDone: boolean;
}

export const forgotPasswordForm: Register = (Alpine) => {
  Alpine.data("nqForgotPasswordForm", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const seconds = config.resendSeconds ?? 30;
    return {
      ...authBase({ names: ["email"], failed: t.failed, ...config }),
      sentTo: "",
      resendPending: false,
      resendError: "",
      resendDone: false,
      init(this: ForgotState) {
        this.authInit(this.$el);
        this.$watch("sentTo", (v: string) => {
          if (v) this.$nextTick(() => this.$el.querySelector<HTMLElement>('[data-slot="forgot-password-sent-title"]')?.focus());
        });
      },
      destroy(this: ForgotState) {
        this.authDestroy();
      },
      resendOff(this: ForgotState) {
        return this.cooldown > 0 || this.resendPending;
      },
      resendLabel(this: ForgotState) {
        return this.cooldown > 0 ? t.resendIn.replace("{time}", formatCountdown(this.cooldown)) : t.resend;
      },
      async onSubmit(this: ForgotState) {
        const email = this.read("email").trim();
        const local = { email: email ? (isEmail(email) ? undefined : t.emailInvalid) : t.emailRequired };
        await this.submitWith("nq-forgot-password", { email }, local, {
          onOk: () => {
            this.sentTo = email;
            this.resendError = "";
            this.resendDone = false;
            this.startCooldown(seconds);
          },
        });
      },
      async resend(this: ForgotState) {
        if (!this.sentTo || this.cooldown > 0 || this.resendPending) return;
        this.resendPending = true;
        this.resendError = "";
        try {
          let { waits } = this.dispatch("nq-forgot-password-resend", { email: this.sentTo });
          if (!waits.length) ({ waits } = this.dispatch("nq-forgot-password", { email: this.sentTo }));
          const results = await Promise.all(waits);
          const bad = results.map(failure).find((r) => r?.error);
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
      changeEmail(this: ForgotState) {
        this.sentTo = "";
        this.resendError = "";
        this.resendDone = false;
      },
    };
  });
};

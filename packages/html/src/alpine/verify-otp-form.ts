// nqVerifyOtpForm: verify an emailed or texted one-time code. A masked destination, an OTP input that submits when the last
// digit lands (or on paste), boxes that clear and refocus on a wrong code, and a resend button on a countdown. The markup is
// the React VerifyOtpForm's (see the Blade verify-otp-form component); the shared plumbing is login-form-logic.ts.
//
//   <form data-slot="verify-otp-form" x-data="nqVerifyOtpForm({ length: 6, resend: true })"
//         x-on:nq-verify-otp="$event.detail.waitUntil(verify($event.detail.code))"
//         x-on:nq-verify-otp-resend="$event.detail.waitUntil(resend())">
//
// Events (bubble from the form, each with detail.waitUntil(promise)): nq-verify-otp { code } and nq-verify-otp-resend {}.
// Resolve nothing for success, or { error } for a wrong or expired code (the boxes clear and refocus).

import { authBase, authLang, failure, formatCountdown, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const STRINGS = {
  en: { incomplete: "Enter all {length} digits.", failed: "Something went wrong. Try again.", resend: "Resend code", resendIn: "Resend in {time}" },
  ar: { incomplete: "أدخل الأرقام الـ {length} كاملة.", failed: "حدث خطأ ما. حاول مرة أخرى.", resend: "إعادة إرسال الرمز", resendIn: "إعادة الإرسال بعد {time}" },
};

interface Config extends AuthConfig {
  length?: number;
  autoSubmit?: boolean;
  /** Show the resend button (and wait resendSeconds before the first one). */
  resend?: boolean;
  resendSeconds?: number;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface OtpFormState extends AuthState {
  code: string;
  resendPending: boolean;
  resendError: string;
  resendSent: boolean;
  message(): string;
  focusFirst(): void;
  send(value?: string): Promise<void>;
  onChange(): void;
}

export const verifyOtpForm: Register = (Alpine) => {
  Alpine.data("nqVerifyOtpForm", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const length = config.length ?? 6;
    const seconds = config.resendSeconds ?? 30;
    return {
      ...authBase({ names: ["code"], failed: t.failed, ...config }),
      code: "",
      resendPending: false,
      resendError: "",
      resendSent: false,
      init(this: OtpFormState) {
        this.authInit(this.$el);
        if (config.resend) this.startCooldown(seconds);
        this.$watch("code", (v: string) => {
          if (v) this.onChange();
        });
      },
      destroy(this: OtpFormState) {
        this.authDestroy();
      },
      /** The text under the boxes: the server error, the field error or a resend failure. */
      message(this: OtpFormState) {
        return this.error || this.fe.code || this.resendError;
      },
      /** Keeps the boxes' invalid state in step with the message (the OTP input renders it statically). */
      markInvalid(this: OtpFormState, group: HTMLElement | undefined) {
        const on = Boolean(this.message());
        group?.querySelectorAll<HTMLElement>('[data-slot="otp-input-box"]').forEach((box) => {
          if (on) {
            box.setAttribute("aria-invalid", "true");
            box.setAttribute("data-invalid", "");
          } else {
            box.removeAttribute("aria-invalid");
            box.removeAttribute("data-invalid");
          }
        });
      },
      focusFirst(this: OtpFormState) {
        this.$nextTick(() => this.authRoot?.querySelector<HTMLElement>('[data-slot="otp-input-box"]')?.focus());
      },
      resendOff(this: OtpFormState) {
        return this.cooldown > 0 || this.resendPending;
      },
      resendLabel(this: OtpFormState) {
        return this.cooldown > 0 ? t.resendIn.replace("{time}", formatCountdown(this.cooldown)) : t.resend;
      },
      onChange(this: OtpFormState) {
        this.clear("code");
        this.error = "";
        this.resendError = "";
      },
      onComplete(this: OtpFormState, value: string) {
        if (config.autoSubmit !== false) void this.send(value);
      },
      async onSubmit(this: OtpFormState) {
        await this.send(this.code);
      },
      async send(this: OtpFormState, value: string = this.code) {
        const local = { code: value.length === length ? undefined : t.incomplete.replace("{length}", String(length)) };
        const outcome = await this.submitWith("nq-verify-otp", { code: value }, local);
        if (outcome === "fail") this.code = "";
        if (outcome === "fail" || outcome === "invalid") this.focusFirst();
      },
      async resend(this: OtpFormState) {
        if (!config.resend || this.cooldown > 0 || this.resendPending) return;
        this.resendPending = true;
        this.resendError = "";
        try {
          const { waits } = this.dispatch("nq-verify-otp-resend", {});
          const results = await Promise.all(waits);
          const bad = results.map(failure).find((r) => r?.error);
          if (bad) this.resendError = bad.error as string;
          else {
            this.resendSent = true;
            this.startCooldown(seconds);
            this.code = "";
            this.focusFirst();
          }
        } catch {
          this.resendError = t.failed;
        } finally {
          this.resendPending = false;
        }
      },
    };
  });
};

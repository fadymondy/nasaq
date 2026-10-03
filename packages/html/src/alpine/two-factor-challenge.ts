// nqTwoFactorChallenge: the second step of sign-in. An authenticator code (submits on the last digit), a switch to a one-time
// recovery code, a "trust this device" checkbox and an optional passkey alternative. The markup is the React TwoFactorChallenge's
// (see the Blade two-factor-challenge component); the shared plumbing is login-form-logic.ts.
//
//   <form data-slot="two-factor-challenge" x-data="nqTwoFactorChallenge({ length: 6 })"
//         x-on:nq-two-factor="$event.detail.waitUntil(check($event.detail))">
//
// Events (bubble from the form, each with detail.waitUntil(promise)): nq-two-factor { code, method, trustDevice } and
// nq-two-factor-passkey {}. Resolve nothing for success, or { error } for a wrong code (the input clears and refocuses).

import { authBase, authLang, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const STRINGS = {
  en: { incomplete: "Enter all {length} digits.", recoveryRequired: "Enter a recovery code.", failed: "Something went wrong. Try again." },
  ar: { incomplete: "أدخل الأرقام الـ {length} كاملة.", recoveryRequired: "أدخل رمز استرداد.", failed: "حدث خطأ ما. حاول مرة أخرى." },
};

type Method = "totp" | "recovery";
interface Config extends AuthConfig {
  length?: number;
  defaultMethod?: Method;
  /** Show the passkey button (when the browser supports WebAuthn). */
  passkey?: boolean;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface TwoFactorState extends AuthState {
  onChange(): void;
  method: Method;
  code: string;
  trust: boolean;
  inv: boolean;
  passkeyOn: boolean;
  passkeyPending: boolean;
  message(): string;
  focusFirst(): void;
  send(value?: string): Promise<void>;
}

export const twoFactorChallenge: Register = (Alpine) => {
  Alpine.data("nqTwoFactorChallenge", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const length = config.length ?? 6;
    return {
      ...authBase({ names: ["code"], failed: t.failed, ...config }),
      method: (config.defaultMethod ?? "totp") as Method,
      code: "",
      trust: false,
      inv: false,
      passkeyOn: false,
      passkeyPending: false,
      init(this: TwoFactorState) {
        this.authInit(this.$el);
        this.passkeyOn = Boolean(config.passkey) && typeof PublicKeyCredential !== "undefined";
        this.$watch("code", (v: string) => {
          if (v) this.onChange();
        });
      },
      destroy(this: TwoFactorState) {
        this.authDestroy();
      },
      message(this: TwoFactorState) {
        return this.error || this.fe.code;
      },
      /** Keeps the boxes' invalid state in step with the message (the OTP input renders it statically). */
      markInvalid(this: TwoFactorState, group: HTMLElement | undefined) {
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
      focusFirst(this: TwoFactorState) {
        this.$nextTick(() => this.authRoot?.querySelector<HTMLElement>('[data-slot="otp-input-box"], input[name="code"]:not([type="hidden"])')?.focus());
      },
      anyBusy(this: TwoFactorState) {
        return this.pending || this.passkeyPending;
      },
      onChange(this: TwoFactorState) {
        this.clear("code");
        this.error = "";
      },
      onComplete(this: TwoFactorState, value: string) {
        void this.send(value);
      },
      onSubmit(this: TwoFactorState) {
        return this.send(this.code);
      },
      async send(this: TwoFactorState, value: string = this.code) {
        const v = value.trim();
        const local = {
          code: this.method === "totp" ? (v.length === length ? undefined : t.incomplete.replace("{length}", String(length))) : v ? undefined : t.recoveryRequired,
        };
        const outcome = await this.submitWith("nq-two-factor", { code: v, method: this.method, trustDevice: this.trust }, local);
        if (outcome === "fail") this.code = "";
        if (outcome === "fail" || outcome === "invalid") this.focusFirst();
      },
      switchMethod(this: TwoFactorState) {
        this.method = this.method === "totp" ? "recovery" : "totp";
        this.code = "";
        this.error = "";
        this.setErrors({});
        this.focusFirst();
      },
      async passkey(this: TwoFactorState) {
        this.passkeyPending = true;
        try {
          const { waits } = this.dispatch("nq-two-factor-passkey", {});
          await Promise.all(waits);
        } catch {
          // The listener owns passkey errors.
        } finally {
          this.passkeyPending = false;
        }
      },
    };
  });
};

// nqResetPasswordForm: choose a new password after following a reset link. New and confirm fields, a strength meter and an
// optional requirement checklist; after submit it shows "Password changed" or "This link has expired". The markup is the
// React ResetPasswordForm's (see the Blade reset-password-form component); the shared plumbing is login-form-logic.ts.
//
//   <div data-slot="reset-password-form" x-data="nqResetPasswordForm({ minLength: 8 })"
//        x-on:nq-reset-password="$event.detail.waitUntil(reset($event.detail.password))">
//
// Events (bubble from the root, each with detail.waitUntil(promise)): nq-reset-password { password } (resolve nothing for
// success, { expired: true } for a used or old link, or { error, fieldErrors }), nq-reset-sign-in and nq-reset-request-link
// (the two buttons, when they are not links). state: "idle" | "success" | "expired"; it is also readable and writable from outside.

import { authBase, authLang, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const STRINGS = {
  en: { passwordShort: "Use at least {min} characters.", passwordWeak: "Meet every requirement below.", confirmMismatch: "The passwords do not match.", failed: "Something went wrong. Try again." },
  ar: { passwordShort: "استخدم {min} أحرف على الأقل.", passwordWeak: "استوفِ كل المتطلبات أدناه.", confirmMismatch: "كلمتا المرور غير متطابقتين.", failed: "حدث خطأ ما. حاول مرة أخرى." },
};

type ClassId = "upper" | "lower" | "digit" | "symbol";
const CLASS_TESTS: Record<ClassId, RegExp> = { upper: /\p{Lu}/u, lower: /\p{Ll}/u, digit: /\p{Nd}/u, symbol: /[^\p{L}\p{Nd}]/u };

interface Config extends AuthConfig {
  minLength?: number;
  /** The requirement policy when the checklist is on; every rule must pass. */
  policy?: { minLength?: number; require?: ClassId[] } | null;
  state?: "idle" | "success" | "expired";
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface ResetState extends AuthState {
  state: "idle" | "success" | "expired";
  go(which: "sign-in" | "request-link"): void;
}

export const resetPasswordForm: Register = (Alpine) => {
  Alpine.data("nqResetPasswordForm", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const min = config.minLength ?? (config.policy ? (config.policy.minLength ?? 12) : 8);
    return {
      ...authBase({ names: ["password", "confirm"], failed: t.failed, ...config }),
      state: config.state ?? "idle",
      init(this: ResetState) {
        this.authInit(this.$el);
        this.$watch("state", (v: string) => {
          if (v !== "idle") this.$nextTick(() => this.$el.querySelector<HTMLElement>('[data-slot="reset-password-title"]')?.focus());
        });
      },
      destroy(this: ResetState) {
        this.authDestroy();
      },
      weak(password: string) {
        const need = config.policy?.require ?? ["upper", "lower", "digit", "symbol"];
        return Boolean(config.policy) && (Array.from(password).length < min || need.some((id) => !CLASS_TESTS[id].test(password)));
      },
      go(this: ResetState, which: "sign-in" | "request-link") {
        this.dispatch(`nq-reset-${which}`, {});
      },
      async onSubmit(this: ResetState & { weak(p: string): boolean }) {
        const password = this.read("password");
        const confirm = this.read("confirm");
        const local = {
          password: password.length < min ? t.passwordShort.replace("{min}", String(min)) : this.weak(password) ? t.passwordWeak : undefined,
          confirm: confirm === password ? undefined : t.confirmMismatch,
        };
        await this.submitWith("nq-reset-password", { password }, local, {
          onOk: (results) => {
            const expired = results.some((r) => r && typeof r === "object" && (r as { expired?: boolean }).expired);
            this.state = expired ? "expired" : "success";
          },
        });
      },
    };
  });
};

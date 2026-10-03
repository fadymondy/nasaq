// nqRegisterForm: sign-up with name, email, a password (strength meter), confirmation and a terms checkbox. The markup is
// the React RegisterForm's (see the Blade register-form component); the shared submit plumbing is login-form-logic.ts.
//
//   <form data-slot="register-form" x-data="nqRegisterForm({ minLength: 8, requireTerms: true })"
//         x-on:nq-register="$event.detail.waitUntil(createAccount($event.detail))">
//
// nq-register { name, email, password, acceptTerms, waitUntil(promise) } bubbles from the form. Resolve nothing for success or
// { error, fieldErrors } (keys: name, email, password, confirm, terms). The fields are read by name on submit.

import { authBase, authLang, isEmail, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

const STRINGS = {
  en: {
    nameRequired: "Enter your name.",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordShort: "Use at least {min} characters.",
    confirmMismatch: "The passwords do not match.",
    termsRequired: "Accept the terms to continue.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    nameRequired: "أدخل اسمك.",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordShort: "استخدم {min} أحرف على الأقل.",
    confirmMismatch: "كلمتا المرور غير متطابقتين.",
    termsRequired: "وافق على الشروط للمتابعة.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

interface Config extends AuthConfig {
  minLength?: number;
  requireTerms?: boolean;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface RegisterState extends AuthState {
  accepted: boolean;
}

export const registerForm: Register = (Alpine) => {
  Alpine.data("nqRegisterForm", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const min = config.minLength ?? 8;
    const requireTerms = config.requireTerms ?? true;
    return {
      ...authBase({ names: ["name", "email", "password", "confirm", "terms"], failed: t.failed, ...config }),
      accepted: false,
      init(this: RegisterState) {
        this.authInit(this.$el);
        this.$watch("accepted", () => this.clear("terms"));
      },
      destroy(this: RegisterState) {
        this.authDestroy();
      },
      async onSubmit(this: RegisterState) {
        const name = this.read("name").trim();
        const email = this.read("email").trim();
        const password = this.read("password");
        const confirm = this.read("confirm");
        await this.submitWith(
          "nq-register",
          { name, email, password, acceptTerms: this.accepted },
          {
            name: name ? undefined : t.nameRequired,
            email: email ? (isEmail(email) ? undefined : t.emailInvalid) : t.emailRequired,
            password: Array.from(password).length >= min ? undefined : t.passwordShort.replace("{min}", String(min)),
            confirm: confirm === password ? undefined : t.confirmMismatch,
            terms: !requireTerms || this.accepted ? undefined : t.termsRequired,
          },
        );
      },
    };
  });
};

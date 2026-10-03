// nqSignInFlow: identifier-first sign-in. The first screen is only an email field, the provider buttons and (when supported) a
// passkey; your listener then picks the next step for that address: a password, a one-time code, a sign-in link, the
// organisation's SSO, sign-up or a "can't sign in here" notice. The markup is the React SignInFlow's (see the Blade sign-in-flow
// component); the shared plumbing is login-form-logic.ts. The root holds the step, the address and the movement between steps;
// each step form is its own nested component (nqSignInFlowEmail, nqSignInFlowPassword, nqSignInFlowSso, nqSignInFlowLinkSent),
// so each keeps its own errors and busy state, and reads the address through the parent scope.
//
//   <div data-slot="sign-in-flow" x-data="nqSignInFlow({ password: true, magicLink: true, forgotPassword: true })"
//        x-on:nq-sign-in-identify="$event.detail.waitUntil(lookup($event.detail.email))"
//        x-on:nq-sign-in-password="$event.detail.waitUntil(signIn($event.detail))">
//
// Events, all bubbling from the flow, each with detail.waitUntil(promise). Resolve nothing for success, or { error, fieldErrors }:
//   nq-sign-in-identify { email }            resolve a next step { step: "password" | "code" | "sso" | "register" | "link-sent" | "blocked", ... }
//                                            or nothing for the default step.
//   nq-sign-in-password { email, password, remember }   also { twoFactor: true } to ask for a second factor.
//   nq-sign-in-two-factor { email, code, method, trustDevice }, nq-two-factor-passkey {}
//   nq-sign-in-magic-link { email }, nq-sign-in-request-code { email }, nq-sign-in-code { email, code }
//   nq-sign-in-forgot { email } (also the resend), nq-sign-in-sso { email }, nq-sign-in-register { email }
//   nq-sign-in-step { step, email }, nq-passkey {}, nq-passkey-autofill { signal }, nq-oauth-select { id, wait }.

import { authBase, authLang, failure, formatCountdown, isEmail, type AuthConfig, type AuthFailure, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

type Step = "email" | "password" | "code" | "sso" | "register" | "link-sent" | "blocked" | "two-factor" | "forgot";
type Alternative = "code" | "magic-link";
interface Next {
  step: Exclude<Step, "email" | "two-factor" | "forgot">;
  alternatives?: Alternative[];
  connection?: string;
  message?: string;
  length?: number;
}

const STRINGS = {
  en: {
    email: "Email",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Enter your password.",
    failed: "Something went wrong. Try again.",
    errorTitle: "Fix these to continue",
    password: "Password",
    ssoWith: "Continue with {connection}",
    ssoContinue: "Continue with SSO",
    blockedBody: "Contact your administrator, or try another address.",
    resend: "Send the link again",
    resendIn: "Send again in {time}",
  },
  ar: {
    email: "البريد الإلكتروني",
    emailRequired: "أدخل بريدك الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    passwordRequired: "أدخل كلمة المرور.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    errorTitle: "صحّح ما يلي للمتابعة",
    password: "كلمة المرور",
    ssoWith: "المتابعة باستخدام {connection}",
    ssoContinue: "المتابعة بالدخول الموحّد",
    blockedBody: "تواصل مع المسؤول، أو جرّب بريدًا آخر.",
    resend: "أرسل الرابط مرة أخرى",
    resendIn: "أعد الإرسال بعد {time}",
  },
};
type Labels = Record<keyof typeof STRINGS.en, string>;

interface Config {
  /** The password step is the default step (an nq-sign-in-password listener exists). */
  password?: boolean;
  magicLink?: boolean;
  requestCode?: boolean;
  forgotPassword?: boolean;
  passkey?: boolean;
  passkeyAutofill?: boolean;
  oauth?: boolean;
  resendSeconds?: number;
  defaultEmail?: string;
  /** Digits of the emailed code and of the second factor (a length from the listener wins). */
  codeLength?: number;
  twoFactorLength?: number;
  labels?: Partial<Labels>;
}

interface FlowState {
  step: Step;
  next: Next | null;
  email: string;
  moved: boolean;
  config: Config;
  labels: Labels;
  $el: HTMLElement;
  $dispatch(name: string, detail?: unknown): void;
  allowed(alt: Alternative): boolean;
  go(to: Next | null, address?: string): void;
  move(to: Step, address?: string): void;
  emitWait(name: string, detail: Record<string, unknown>): Promise<AuthFailure | undefined>;
}

const masked = (value: string) => {
  const at = value.lastIndexOf("@");
  if (at < 0) return value;
  const local = value.slice(0, at);
  const domain = value.slice(at);
  return local.length <= 2 ? local.slice(0, 1) + "•••" + domain : local.slice(0, 1) + "•••" + local.slice(-1) + domain;
};

export const signInFlow: Register = (Alpine) => {
  // ---- the root: the step, the address, the movement
  Alpine.data("nqSignInFlow", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels } as Labels;
    return {
      step: "email" as Step,
      next: null as Next | null,
      email: config.defaultEmail ?? "",
      moved: false,
      twoFactorLength: undefined as number | undefined,
      /** Boxes of the code step: the listener's length, else code-length. */
      get codeLen(): number {
        const l = (this as unknown as FlowState).next?.step === "code" ? (this as unknown as FlowState).next?.length : undefined;
        return l && l > 0 ? Math.floor(l) : config.codeLength || 6;
      },
      /** Boxes of the second factor: the password result's length, else two-factor-length. */
      get twoLen(): number {
        const l = (this as unknown as { twoFactorLength?: number }).twoFactorLength;
        const dflt = config.twoFactorLength || 6;
        // The Blade side builds the challenge for the default and for 4 to 8 digits.
        return l && Number.isInteger(l) && l >= 4 && l <= 8 ? l : dflt;
      },
      move(this: FlowState, to: Step, address?: string) {
        this.moved = true;
        this.step = to;
        if (address !== undefined) this.email = address;
        this.$dispatch("nq-sign-in-step", { step: to, email: this.email });
      },
      go(this: FlowState, to: Next | null, address?: string) {
        this.next = to;
        this.move(to ? to.step : "email", address);
      },
      /** Is this other way in offered for the chosen address? */
      allowed(this: FlowState, alt: Alternative) {
        return this.next?.step !== "password" || !this.next.alternatives || this.next.alternatives.includes(alt);
      },
      showLink(this: FlowState) {
        return Boolean(config.magicLink) && this.allowed("magic-link");
      },
      showCode(this: FlowState) {
        return Boolean(config.requestCode) && this.allowed("code");
      },
      showForgot() {
        return Boolean(config.forgotPassword);
      },
      showIdentity(this: FlowState) {
        return this.step !== "email" && this.step !== "forgot";
      },
      masked(this: FlowState) {
        return masked(this.email);
      },
      ssoLabel(this: FlowState) {
        return this.next?.connection ? t.ssoWith.replace("{connection}", this.next.connection) : t.ssoContinue;
      },
      blockedBody(this: FlowState) {
        return (this.next?.step === "blocked" && this.next.message) || t.blockedBody;
      },
      toTwoFactor(this: FlowState & { twoFactorLength?: number }, length?: number) {
        this.twoFactorLength = length;
        this.move("two-factor");
      },
      /** Dispatches a flow event from the root and waits for the listeners. Resolves the first failure, or nothing. */
      async emitWait(this: FlowState, name: string, detail: Record<string, unknown>) {
        const waits: unknown[] = [];
        this.$el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
        return (await Promise.all(waits)).map(failure).find(Boolean);
      },
      /** The step for an address when nq-sign-in-identify has no listener or resolves nothing. */
      async fallback(this: FlowState, address: string): Promise<Next | AuthFailure | undefined> {
        if (config.password || (!config.requestCode && !config.magicLink)) return { step: "password" };
        if (config.requestCode) return (await this.emitWait("nq-sign-in-request-code", { email: address })) ?? { step: "code" };
        return (await this.emitWait("nq-sign-in-magic-link", { email: address })) ?? { step: "link-sent" };
      },
      /** Forwards a nested form's event as a flow event carrying the address; the nested form waits for the listeners too. */
      relay(this: FlowState, event: CustomEvent, name: string, extra: Record<string, unknown> = {}) {
        const waits: unknown[] = [];
        this.$el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...extra, email: this.email, waitUntil: (p: unknown) => void waits.push(p) } }));
        if (waits.length) event.detail.waitUntil(Promise.all(waits).then((results) => results.find(Boolean)));
      },
      /** Fills the forgot-password form with the address (its default email is rendered once, on the server). */
      fillEmail(this: FlowState, root: HTMLElement) {
        const input = root.querySelector<HTMLInputElement>('input[name="email"]');
        if (input) input.value = this.email;
      },
      register(this: FlowState) {
        this.$dispatch("nq-sign-in-register", { email: this.email });
      },
    };
  });

  // ---- the email step: the field, the providers, a passkey
  Alpine.data("nqSignInFlowEmail", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels } as Labels;
    return {
      ...authBase({ names: ["email"], fieldLabels: { email: t.email }, errorTitle: t.errorTitle, failed: t.failed }),
      passkeyPending: false,
      passkeyOn: false,
      controller: undefined as AbortController | undefined,
      init(this: AuthState & FlowState & { passkeyOn: boolean; controller?: AbortController }) {
        this.authInit(this.$el);
        const input = this.$el.querySelector<HTMLInputElement>('input[name="email"]');
        if (input) {
          input.value = this.email;
          input.focus();
        }
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
      destroy(this: AuthState & { controller?: AbortController }) {
        this.controller?.abort();
        this.authDestroy();
      },
      anyBusy(this: AuthState & { passkeyPending: boolean }) {
        return this.pending || this.passkeyPending;
      },
      dividerOn(this: { passkeyOn: boolean }) {
        return Boolean(config.oauth) || this.passkeyOn;
      },
      async onSubmit(this: AuthState & FlowState & { fallback(address: string): Promise<Next | AuthFailure | undefined> }) {
        if (this.busy) return;
        const email = this.read("email").trim();
        const local = { email: email ? (isEmail(email) ? undefined : t.emailInvalid) : t.emailRequired };
        this.error = "";
        if (local.email) {
          this.setErrors(local);
          this.focusProblem();
          return;
        }
        this.setErrors({});
        const { waits } = this.dispatch("nq-sign-in-identify", { email });
        this.busy = true;
        this.pending = true;
        try {
          const results = await Promise.all(waits);
          const result = (results.find(Boolean) as Next | AuthFailure | undefined) ?? (await this.fallback(email));
          if (result && typeof result === "object" && "step" in result) {
            this.go(result as Next, email);
            return;
          }
          const failed = failure(result);
          if (failed) {
            this.setErrors(failed.fieldErrors ?? {});
            this.error = failed.error ?? "";
            this.focusProblem();
          }
        } catch {
          this.fail();
        } finally {
          this.busy = false;
          this.pending = false;
        }
      },
      async passkey(this: AuthState & { passkeyPending: boolean }) {
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
    };
  });

  // ---- the password step
  Alpine.data("nqSignInFlowPassword", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels } as Labels;
    return {
      ...authBase({ names: ["password"], fieldLabels: { password: t.password }, errorTitle: t.errorTitle, failed: t.failed }),
      remember: false,
      caps: false,
      codePending: false,
      linkPending: false,
      init(this: AuthState) {
        this.authInit(this.$el);
        this.$nextTick(() => this.$el.querySelector<HTMLInputElement>('input[name="password"]')?.focus());
      },
      destroy(this: AuthState) {
        this.authDestroy();
      },
      readCaps(this: { caps: boolean }, event: KeyboardEvent) {
        this.caps = Boolean(event.getModifierState?.("CapsLock"));
      },
      altBusy(this: { codePending: boolean; linkPending: boolean }) {
        return this.codePending || this.linkPending;
      },
      async onSubmit(this: AuthState & FlowState & { remember: boolean; toTwoFactor(length?: number): void }) {
        const password = this.read("password");
        await this.submitWith("nq-sign-in-password", { email: this.email, password, remember: this.remember }, { password: password ? undefined : t.passwordRequired }, {
          native: false,
          onOk: (results) => {
            const challenge = results.find((r) => r && typeof r === "object" && "twoFactor" in (r as object)) as { length?: number } | undefined;
            if (challenge) this.toTwoFactor(challenge.length);
          },
        });
      },
      /** "Email me a sign-in link" / "Email me a code instead": on success the flow moves on; a failure shows in the summary. */
      async alt(this: AuthState & FlowState & Record<string, unknown>, kind: "link" | "code") {
        const pendingKey = kind === "link" ? "linkPending" : "codePending";
        this[pendingKey] = true;
        try {
          const failed = await this.emitWait(kind === "link" ? "nq-sign-in-magic-link" : "nq-sign-in-request-code", { email: this.email });
          if (failed) this.fail(failed.error ?? t.failed);
          else this.go({ step: kind === "link" ? "link-sent" : "code" });
        } catch {
          this.fail();
        } finally {
          this[pendingKey] = false;
        }
      },
    };
  });

  // ---- the single sign-on step
  Alpine.data("nqSignInFlowSso", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels } as Labels;
    return {
      ...authBase({ names: [], errorTitle: t.errorTitle, failed: t.failed }),
      init(this: AuthState) {
        this.authInit(this.$el);
        this.$nextTick(() => this.$el.querySelector<HTMLElement>('button[type="submit"]')?.focus());
      },
      destroy(this: AuthState) {
        this.authDestroy();
      },
      async onSubmit(this: AuthState & FlowState) {
        await this.submitWith("nq-sign-in-sso", { email: this.email }, {}, { native: false });
      },
    };
  });

  // ---- "check your email", with a resend on a cooldown
  Alpine.data("nqSignInFlowLinkSent", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels } as Labels;
    const seconds = config.resendSeconds ?? 30;
    return {
      ...authBase({ names: [], failed: t.failed }),
      resendPending: false,
      resendError: "",
      resendDone: false,
      init(this: AuthState) {
        this.authInit(this.$el);
        this.startCooldown(seconds);
        this.$nextTick(() => this.$el.querySelector<HTMLElement>('[data-slot="sign-in-flow-link-heading"]')?.focus());
      },
      destroy(this: AuthState) {
        this.authDestroy();
      },
      resendOff(this: AuthState & { resendPending: boolean }) {
        return this.cooldown > 0 || this.resendPending;
      },
      resendLabel(this: AuthState) {
        return this.cooldown > 0 ? t.resendIn.replace("{time}", formatCountdown(this.cooldown)) : t.resend;
      },
      async resend(this: AuthState & FlowState & { resendPending: boolean; resendError: string; resendDone: boolean }) {
        if (!config.magicLink || this.cooldown > 0 || this.resendPending) return;
        this.resendPending = true;
        this.resendError = "";
        try {
          const failed = await this.emitWait("nq-sign-in-magic-link", { email: this.email });
          if (failed?.error) this.resendError = failed.error;
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
    };
  });
};

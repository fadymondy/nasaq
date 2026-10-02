// nqLockScreen: the behaviour of an OS-style lock screen. One way to unlock at a time (PIN keypad, password with an optional
// authenticator code, biometrics, passkey), a wrong-attempt counter with a timed lockout, a ticking (or frozen) clock and the
// "Switch account" menu. The markup is the React LockScreen's (see the Blade lock-screen component); the shared plumbing is
// login-form-logic.ts. It verifies nothing itself: your listener does.
//
//   <div data-slot="lock-screen" x-data="nqLockScreen({ methods: ['pin', 'password'] })"
//        x-on:nq-lock-unlock="$event.detail.waitUntil(check($event.detail))">
//
// Events (bubble from the root; the first has detail.waitUntil(promise)):
//   nq-lock-unlock { method, secret, code } resolve nothing to unlock, or { error } / { fieldErrors } for a wrong secret.
//   nq-lock-switch-account { account } the chosen account, or null for "Sign in to another account".
//   nq-lock-sign-out {}.

import { authBase, authLang, formatCountdown, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

type Method = "pin" | "password" | "biometric" | "passkey";
interface Account {
  name: string;
  email?: string;
  avatar?: string;
}

const STRINGS = {
  en: {
    passwordRequired: "Enter your password.",
    codeRequired: "Enter all {length} digits of the code.",
    wrongPin: "That PIN is not right. {left} tries left.",
    lockout: "Too many attempts. Try again in {time}.",
    entered: "{count} of {length} digits entered",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    passwordRequired: "أدخل كلمة المرور.",
    codeRequired: "أدخل الأرقام الـ {length} كاملة للرمز.",
    wrongPin: "الرقم السري غير صحيح. تبقّت {left} محاولات.",
    lockout: "محاولات كثيرة. حاول مرة أخرى بعد {time}.",
    entered: "أُدخل {count} من {length} أرقام",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

// Like the React LockScreen: an object with error or fieldErrors (even an empty one) is a wrong secret.
const wrong = (r: unknown): { error?: string; fieldErrors?: Record<string, string> } | undefined => {
  if (!r || typeof r !== "object") return undefined;
  const f = r as { error?: string; fieldErrors?: Record<string, string> };
  return f.error || f.fieldErrors ? f : undefined;
};

interface Config extends AuthConfig {
  methods?: Method[];
  defaultMethod?: Method;
  pinLength?: number;
  requireCode?: boolean;
  maxAttempts?: number;
  lockoutSeconds?: number;
  /** Freeze the clock at this time (docs, tests): a timestamp or a local date-time string. Default: now, ticking. */
  now?: string | number;
  locale?: string;
  accounts?: Account[];
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}

interface LockState extends AuthState {
  method: Method;
  pin: string;
  password: string;
  code: string;
  failures: number;
  time: string;
  date: string;
  tickTimer: ReturnType<typeof setInterval> | undefined;
  locked(): boolean;
  message(): string;
  off(): boolean;
  attempt(method: Method, secret: string, code?: string): Promise<void>;
  paint(ms: number): void;
  focusPad(): void;
  pressKey(key: string): void;
  backspace(): void;
}

export const lockScreen: Register = (Alpine) => {
  Alpine.data("nqLockScreen", (config: Config = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const methods = config.methods?.length ? config.methods : (["pin"] as Method[]);
    const first: Method = config.defaultMethod && methods.includes(config.defaultMethod) ? config.defaultMethod : (methods[0] as Method);
    const pinLength = config.pinLength ?? 6;
    const maxAttempts = config.maxAttempts ?? 5;
    const lockoutSeconds = config.lockoutSeconds ?? 30;
    const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
    return {
      ...authBase({ names: ["secret", "code"], failed: t.failed, ...config }),
      method: first as Method,
      pin: "",
      password: "",
      code: "",
      failures: 0,
      time: "",
      date: "",
      tickTimer: undefined as ReturnType<typeof setInterval> | undefined,
      init(this: LockState) {
        this.authInit(this.$el);
        const lang = config.locale || document.documentElement.lang || "en";
        const frozen = config.now === undefined || config.now === null || config.now === "" ? null : new Date(config.now).getTime();
        const paint = (ms: number) => {
          this.time = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", hour12: false, numberingSystem: "latn" }).format(ms);
          this.date = new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric", numberingSystem: "latn" }).format(ms);
        };
        if (frozen !== null) paint(frozen);
        else {
          paint(Date.now());
          this.tickTimer = setInterval(() => paint(Date.now()), 1000);
        }
        if (first === "pin") this.focusPad();
      },
      destroy(this: LockState) {
        this.authDestroy();
        clearInterval(this.tickTimer);
      },
      locked(this: LockState) {
        return this.cooldown > 0;
      },
      /** The keypad, the form and the method buttons are off while a call runs or the screen is locked out. */
      off(this: LockState) {
        return this.pending || this.cooldown > 0;
      },
      message(this: LockState) {
        return this.cooldown > 0 ? fill(t.lockout, { time: formatCountdown(this.cooldown) }) : this.error || this.fe.secret || this.fe.code;
      },
      showPlain(this: LockState) {
        return Boolean(this.message()) && this.method !== "password";
      },
      showAlert(this: LockState) {
        return Boolean(this.message()) && this.method === "password";
      },
      hasMessage(this: LockState) {
        return Boolean(this.message());
      },
      filled(this: LockState, index: number) {
        return index < this.pin.length;
      },
      count(this: LockState) {
        return fill(t.entered, { count: this.pin.length, length: pinLength });
      },
      focusPad(this: LockState) {
        this.$nextTick(() => this.authRoot?.querySelector<HTMLElement>('[data-slot="lock-screen-pad"]')?.focus({ preventScroll: true }));
      },
      pressKey(this: LockState, key: string) {
        if (this.pending || this.cooldown > 0) return;
        if (this.error) this.error = "";
        if (!/^\d$/.test(key) || this.pin.length >= pinLength) return;
        this.pin += key;
        if (this.pin.length === pinLength) void this.attempt("pin", this.pin);
      },
      backspace(this: LockState) {
        if (this.pending || this.cooldown > 0) return;
        this.pin = this.pin.slice(0, -1);
      },
      onKey(this: LockState, event: KeyboardEvent) {
        if (this.method !== "pin" || event.metaKey || event.ctrlKey || event.altKey) return;
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          this.pressKey(event.key);
        } else if (event.key === "Backspace") {
          event.preventDefault();
          this.backspace();
        }
      },
      switchMethod(this: LockState, next: Method) {
        this.method = next;
        this.pin = "";
        this.password = "";
        this.code = "";
        this.error = "";
        this.setErrors({});
        if (next === "pin") this.focusPad();
      },
      /** The password form's submit. */
      submitPassword(this: LockState) {
        return this.attempt("password", this.password, config.requireCode ? this.code : undefined);
      },
      async attempt(this: LockState, method: Method, secret: string, code?: string) {
        if (this.busy) return;
        this.error = "";
        const local: Record<string, string | undefined> = {
          secret: method === "password" && !secret ? t.passwordRequired : undefined,
          code: method === "password" && config.requireCode && (code ?? "").length !== 6 ? fill(t.codeRequired, { length: 6 }) : undefined,
        };
        if (local.secret || local.code) {
          this.setErrors(local);
          this.focusProblem();
          return;
        }
        this.setErrors({});
        const { waits } = this.dispatch("nq-lock-unlock", { method, secret, code });
        this.busy = true;
        this.pending = true;
        try {
          const results = await Promise.all(waits);
          const bad = results.map(wrong).find(Boolean);
          if (!bad) return;
          this.pin = "";
          this.password = "";
          this.code = "";
          this.setErrors(bad.fieldErrors ?? {});
          this.error = bad.error ?? "";
          if (method !== "biometric") {
            const next = this.failures + 1;
            if (next >= maxAttempts) {
              this.failures = 0;
              this.setErrors({});
              this.error = "";
              this.startCooldown(lockoutSeconds);
            } else {
              this.failures = next;
              if (method === "pin" && !bad.error) this.error = fill(t.wrongPin, { left: maxAttempts - next });
            }
          }
          this.focusProblem();
        } catch {
          this.pin = "";
          this.fail();
        } finally {
          this.busy = false;
          this.pending = false;
        }
      },
      switchTo(this: LockState, index: number) {
        const account = index >= 0 ? (config.accounts?.[index] ?? null) : null;
        this.dispatch("nq-lock-switch-account", { account });
      },
      signOut(this: LockState) {
        this.dispatch("nq-lock-sign-out", {});
      },
    };
  });
};

// Shared by the auth forms (login, register, forgot/reset password, verify OTP, two-factor, invite, consent, lock, pairing):
// the submit state, the field errors, the "waitUntil" hand-off, the error summary and the resend timer. It has no
// Register export, so the generated index skips it; each form module spreads authBase() into its Alpine.data.
//
// Pattern: the form reads its inputs by name, validates, dispatches a CustomEvent from the root with
// { ...values, waitUntil(promise) }, then shows what the promise resolves to ({ error, fieldErrors } is a failure, a
// rejection shows the generic message). With no listener and an action attribute the form submits natively.

import type { Magics } from "./types";

export interface AuthFailure {
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
}

export const authLang = (): "en" | "ar" => ((document.documentElement.lang || "en").startsWith("ar") ? "ar" : "en");
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
export const failure = (r: unknown): AuthFailure | undefined => {
  if (!r || typeof r !== "object") return undefined;
  const f = r as AuthFailure;
  return f.error || (f.fieldErrors && Object.keys(f.fieldErrors).length) ? f : undefined;
};

export interface AuthConfig {
  /** Field names the form validates (the keys of fe / bad). */
  names?: string[];
  /** Field name to the label shown in the error summary. */
  fieldLabels?: Record<string, string>;
  errorTitle?: string;
  failed?: string;
}

type Outcome = "ok" | "invalid" | "fail" | "native" | "busy";

export interface AuthState extends Magics {
  fe: Record<string, string>;
  bad: Record<string, boolean>;
  error: string;
  pending: boolean;
  busy: boolean;
  cooldown: number;
  authRoot: HTMLElement | undefined;
  timer: ReturnType<typeof setInterval> | undefined;
  authInit(el: HTMLElement): void;
  authDestroy(): void;
  formEl(): HTMLFormElement | undefined;
  read(name: string): string;
  setErrors(found: Record<string, string | undefined>): void;
  clear(name: string): void;
  problems(): boolean;
  entries(): { name: string; label: string; message: string }[];
  summaryTitle(): string;
  focusField(name: string): void;
  focusProblem(): void;
  fail(message?: string): void;
  dispatch(event: string, detail: Record<string, unknown>): { waits: unknown[] };
  settle(waits: unknown[], onOk: (results: unknown[]) => void): Promise<boolean>;
  submitWith(event: string, values: Record<string, unknown>, local?: Record<string, string | undefined>, opts?: { native?: boolean; onOk?: (results: unknown[]) => void }): Promise<Outcome>;
  startCooldown(seconds: number): void;
  clock(): string;
}

/** The state and methods every auth form shares. Spread it first: `{ ...authBase(config), ... }`, and call `this.authInit(el)` from init(). */
export function authBase(config: AuthConfig = {}) {
  const names = config.names ?? [];
  return {
    fe: Object.fromEntries(names.map((n) => [n, ""])) as Record<string, string>,
    bad: Object.fromEntries(names.map((n) => [n, false])) as Record<string, boolean>,
    error: "",
    pending: false,
    busy: false,
    cooldown: 0,
    authRoot: undefined as HTMLElement | undefined,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    authInit(this: AuthState, el: HTMLElement) {
      this.authRoot = el;
    },
    authDestroy(this: AuthState) {
      clearInterval(this.timer);
    },
    formEl(this: AuthState) {
      const r = this.authRoot;
      if (!r) return undefined;
      return r instanceof HTMLFormElement ? r : (r.querySelector("form") ?? undefined);
    },
    read(this: AuthState, name: string) {
      const el = this.formEl()?.elements.namedItem(name);
      if (el && "value" in el) return String((el as unknown as HTMLInputElement).value ?? "");
      return "";
    },
    setErrors(this: AuthState, found: Record<string, string | undefined>) {
      for (const n of names) {
        this.fe[n] = found[n] ?? "";
        this.bad[n] = Boolean(found[n]);
      }
    },
    clear(this: AuthState, name: string) {
      if (!name || !this.fe[name]) return;
      this.fe[name] = "";
      this.bad[name] = false;
    },
    problems(this: AuthState) {
      return Boolean(this.error || names.some((n) => this.fe[n]));
    },
    entries(this: AuthState) {
      return names.filter((n) => this.fe[n]).map((n) => ({ name: n, label: config.fieldLabels?.[n] ?? "", message: this.fe[n] as string }));
    },
    summaryTitle(this: AuthState) {
      return this.error || config.errorTitle || "";
    },
    focusField(this: AuthState, name: string) {
      this.formEl()?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
    },
    /** After a failed submit: the first invalid control, or the summary when there is none. */
    focusProblem(this: AuthState) {
      this.$nextTick(() => {
        const root = this.authRoot;
        const invalid = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
        (invalid ?? root?.querySelector<HTMLElement>('[data-slot="auth-error-summary"]'))?.focus();
      });
    },
    fail(this: AuthState, message?: string) {
      this.error = message ?? config.failed ?? "";
      this.focusProblem();
    },
    dispatch(this: AuthState, event: string, detail: Record<string, unknown>) {
      const waits: unknown[] = [];
      (this.authRoot ?? this.$el).dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
      return { waits };
    },
    /** Waits for what the listeners handed to waitUntil. Returns true when it went well (and runs onOk). */
    async settle(this: AuthState, waits: unknown[], onOk: (results: unknown[]) => void) {
      try {
        const results = await Promise.all(waits);
        const failed = results.map(failure).find(Boolean);
        if (failed) {
          this.setErrors(failed.fieldErrors ?? {});
          this.error = failed.error ?? "";
          this.focusProblem();
          return false;
        }
        onOk(results);
        return true;
      } catch {
        this.fail();
        return false;
      }
    },
    /** Validate, dispatch `event` and wait. "native": no listener and the form has an action, so it was submitted for real. */
    async submitWith(this: AuthState, event: string, values: Record<string, unknown>, local: Record<string, string | undefined> = {}, opts: { native?: boolean; onOk?: (results: unknown[]) => void } = {}): Promise<Outcome> {
      if (this.busy) return "busy";
      this.error = "";
      if (Object.values(local).some(Boolean)) {
        this.setErrors(local);
        this.focusProblem();
        return "invalid";
      }
      this.setErrors({});
      const { waits } = this.dispatch(event, values);
      const form = this.formEl();
      if (!waits.length && opts.native !== false && form?.getAttribute("action")) {
        form.submit();
        return "native";
      }
      this.busy = true;
      this.pending = true;
      try {
        return (await this.settle(waits, opts.onOk ?? (() => {}))) ? "ok" : "fail";
      } finally {
        this.busy = false;
        this.pending = false;
      }
    },
    startCooldown(this: AuthState, seconds: number) {
      clearInterval(this.timer);
      this.cooldown = seconds;
      if (seconds <= 0) return;
      this.timer = setInterval(() => {
        this.cooldown = Math.max(0, this.cooldown - 1);
        if (this.cooldown <= 0) clearInterval(this.timer);
      }, 1000);
    },
    clock(this: AuthState) {
      return formatCountdown(this.cooldown);
    },
  };
}

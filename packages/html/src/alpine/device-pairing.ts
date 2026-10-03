// nqDeviceCodeEntry, nqDeviceApproval, nqDeviceCodeDisplay: the behaviour of the device-pairing screens (see the Blade
// device-pairing component). The markup is the React DeviceCodeEntry / DeviceApproval / DeviceCodeDisplay; the shared plumbing is
// login-form-logic.ts. DeviceHandoff has no behaviour (a deep link and two plain events), so it has no module.
//
//   <form data-slot="device-code-entry" x-data="nqDeviceCodeEntry({ length: 8 })"
//         x-on:nq-device-code="$event.detail.waitUntil(check($event.detail.code))">
//   <div x-data="nqDeviceApproval({ expiresAt })" x-on:nq-device-approve="$event.detail.waitUntil(approve())">
//
// Events (bubble from the root; the ones with waitUntil take a promise: resolve nothing for success, or { error } to fail):
//   nq-device-code { code }            DeviceCodeEntry: the normalised code, e.g. WDJBMJHT.
//   nq-device-approve {}, nq-device-deny {}   DeviceApproval.
//   nq-device-enter-another {}         DeviceApproval, on the expired screen.
//   nq-device-refresh {}               DeviceCodeDisplay, "Get a new code" (plain, fired with $dispatch from the button).

import { authBase, authLang, failure, formatCountdown, type AuthConfig, type AuthState } from "./login-form-logic";
import type { Register } from "./types";

type Status = "pending" | "approved" | "denied" | "expired";
type Kind = "approve" | "deny";

const STRINGS = {
  en: { incomplete: "Enter all {length} characters.", failed: "Something went wrong. Try again.", expiresIn: "Expires in {time}" },
  ar: { incomplete: "أدخل الأحرف الـ {length} كاملة.", failed: "حدث خطأ ما. حاول مرة أخرى.", expiresIn: "ينتهي خلال {time}" },
};
type Labels = Partial<Record<keyof typeof STRINGS.en, string>>;

const normalize = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, "");

interface ClockConfig {
  /** When the code stops working: a timestamp or a date-time string. */
  expiresAt?: string | number;
  /** Freeze the clock at this time (docs, tests). Default: now, ticking. */
  now?: string | number;
}
interface ClockState {
  status: Status;
  now: number;
  tickTimer: ReturnType<typeof setInterval> | undefined;
}

const ms = (value: string | number) => new Date(value).getTime();
const hasValue = (value: unknown): value is string | number => value !== undefined && value !== null && value !== "";

/** Starts the countdown clock: frozen at `now` when given, otherwise ticking each second while there is an expiry. */
function startClock(self: ClockState, config: ClockConfig) {
  if (hasValue(config.now)) {
    self.now = ms(config.now);
    return;
  }
  self.now = Date.now();
  if (!hasValue(config.expiresAt)) return;
  self.tickTimer = setInterval(() => (self.now = Date.now()), 1000);
}

const secondsLeft = (config: ClockConfig, now: number) => (hasValue(config.expiresAt) ? Math.max(0, Math.ceil((ms(config.expiresAt) - now) / 1000)) : undefined);
/** A pending code past its expiry reads as expired even if the host has not said so yet. */
const shownStatus = (status: Status, config: ClockConfig, now: number): Status => (status === "pending" && secondsLeft(config, now) === 0 ? "expired" : status);

interface EntryConfig extends AuthConfig {
  length?: number;
  /** A code from the link, pre-filled. */
  defaultCode?: string;
  labels?: Labels;
}
interface EntryState extends AuthState {
  code: string;
  message(): string;
  focusFirst(): void;
  send(value?: string): Promise<void>;
}

export const devicePairing: Register = (Alpine) => {
  Alpine.data("nqDeviceCodeEntry", (config: EntryConfig = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    const length = config.length ?? 8;
    return {
      ...authBase({ names: ["code"], failed: t.failed, ...config }),
      code: normalize(config.defaultCode ?? "").slice(0, length),
      init(this: EntryState) {
        this.authInit(this.$el);
        this.$watch("code", (v: string) => {
          const clean = normalize(v ?? "");
          if (clean !== v) this.code = clean;
          if (v) {
            this.clear("code");
            this.error = "";
          }
        });
      },
      destroy(this: EntryState) {
        this.authDestroy();
      },
      message(this: EntryState) {
        return this.error || this.fe.code;
      },
      /** Keeps the boxes' invalid state in step with the message (the OTP input renders it statically). */
      markInvalid(this: EntryState, group: HTMLElement | undefined) {
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
      focusFirst(this: EntryState) {
        this.$nextTick(() => this.authRoot?.querySelector<HTMLElement>('[data-slot="otp-input-box"]')?.focus());
      },
      onComplete(this: EntryState, value: string) {
        void this.send(value);
      },
      async onSubmit(this: EntryState) {
        await this.send(this.code);
      },
      async send(this: EntryState, value: string = this.code) {
        const clean = normalize(value);
        const local = { code: clean.length === length ? undefined : t.incomplete.replace("{length}", String(length)) };
        const outcome = await this.submitWith("nq-device-code", { code: clean }, local);
        if (outcome === "fail") this.code = "";
        if (outcome === "fail" || outcome === "invalid") this.focusFirst();
      },
    };
  });

  interface ApprovalConfig extends AuthConfig, ClockConfig {
    status?: Status;
    labels?: Labels;
  }
  interface ApprovalState extends AuthState, ClockState {
    pendingKind: "" | Kind;
  }
  Alpine.data("nqDeviceApproval", (config: ApprovalConfig = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    return {
      ...authBase({ failed: t.failed, ...config }),
      status: (config.status ?? "pending") as Status,
      now: 0,
      tickTimer: undefined as ReturnType<typeof setInterval> | undefined,
      pendingKind: "" as "" | Kind,
      init(this: ApprovalState) {
        this.authInit(this.$el);
        startClock(this, config);
      },
      destroy(this: ApprovalState) {
        this.authDestroy();
        clearInterval(this.tickTimer);
      },
      shown(this: ApprovalState): Status {
        return shownStatus(this.status, config, this.now);
      },
      is(this: ApprovalState, status: Status) {
        return shownStatus(this.status, config, this.now) === status;
      },
      expiresLabel(this: ApprovalState) {
        const left = secondsLeft(config, this.now);
        return left === undefined ? "" : t.expiresIn.replace("{time}", formatCountdown(left));
      },
      hasExpiry() {
        return hasValue(config.expiresAt);
      },
      off(this: ApprovalState, kind: Kind) {
        return this.pendingKind !== "" && this.pendingKind !== kind;
      },
      enterAnother(this: ApprovalState) {
        this.dispatch("nq-device-enter-another", {});
      },
      async decide(this: ApprovalState, kind: Kind) {
        if (this.pendingKind) return;
        this.pendingKind = kind;
        this.error = "";
        try {
          const { waits } = this.dispatch(kind === "approve" ? "nq-device-approve" : "nq-device-deny", {});
          const results = await Promise.all(waits);
          const bad = results.map(failure).find((r) => r?.error);
          if (bad) this.error = bad.error as string;
        } catch {
          this.error = t.failed;
        } finally {
          this.pendingKind = "";
        }
      },
    };
  });

  interface DisplayConfig extends ClockConfig {
    status?: Status;
    labels?: Labels;
  }
  Alpine.data("nqDeviceCodeDisplay", (config: DisplayConfig = {}) => {
    const t = { ...STRINGS[authLang()], ...config.labels };
    return {
      status: (config.status ?? "pending") as Status,
      now: 0,
      tickTimer: undefined as ReturnType<typeof setInterval> | undefined,
      init(this: ClockState) {
        startClock(this, config);
      },
      destroy(this: ClockState) {
        clearInterval(this.tickTimer);
      },
      shown(this: ClockState): Status {
        return shownStatus(this.status, config, this.now);
      },
      is(this: ClockState, status: Status) {
        return shownStatus(this.status, config, this.now) === status;
      },
      expiresLabel(this: ClockState) {
        const left = secondsLeft(config, this.now);
        return left === undefined ? "" : t.expiresIn.replace("{time}", formatCountdown(left));
      },
    };
  });
};

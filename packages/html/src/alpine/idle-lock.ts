// nqIdleLock: locks the app after a period of inactivity. A "Still there?" countdown first, then your lock screen over the inert app.
// The markup is the React IdleLock's (see the Blade idle-lock component). The timer is a courtesy: expire the session on the server too.
//
//   <div data-slot="idle-lock" x-data="nqIdleLock({ timeoutSeconds: 600, warningSeconds: 30 })"> app … </div>
//
// State: isLocked (x-modelable), phase (active | warning | locked), secondsLeft. Methods for your own buttons: lock(), unlock(), stay().
// Event on the root: nq-idle-lock-change { locked, reason } where reason is "idle" or "manual".
// Input during the warning does not cancel it: the person has to say they are still there.

import { formatCountdown } from "./login-form-logic";
import { type IdlePhase, idleState, nextIdleCheck } from "./idle-lock-logic";
import type { Register } from "./types";

const ACTIVITY = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

interface Config {
  timeoutSeconds?: number;
  warningSeconds?: number;
  disabled?: boolean;
  locked?: boolean;
  /** Description template with {time}. */
  description?: string;
}

interface IdleLockState {
  isLocked: boolean;
  phase: IdlePhase;
  secondsLeft: number;
  disabled: boolean;
  root: HTMLElement | undefined;
  last: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  attached: boolean;
  onActivity: () => void;
  onVisible: () => void;
  check(): void;
  start(): void;
  stay(): void;
  stop(): void;
  setLocked(next: boolean, reason: "idle" | "manual"): void;
  $el: HTMLElement;
  $watch(key: string, fn: () => void): void;
}

export const idleLock: Register = (Alpine) => {
  Alpine.data("nqIdleLock", (config: Config = {}) => {
    const timeoutMs = (config.timeoutSeconds ?? 300) * 1000;
    const warningMs = (config.warningSeconds ?? 30) * 1000;
    return {
      isLocked: Boolean(config.locked),
      phase: "active" as IdlePhase,
      secondsLeft: Math.ceil(warningMs / 1000),
      disabled: Boolean(config.disabled),
      root: undefined as HTMLElement | undefined,
      last: Date.now(),
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      attached: false,
      init(this: IdleLockState) {
        this.root = this.$el;
        this.onActivity = () => {
          if (this.phase === "active") this.last = Date.now();
        };
        this.onVisible = () => {
          if (document.visibilityState === "visible") this.check();
        };
        this.$watch("isLocked", () => (this.isLocked ? this.stop() : this.start()));
        if (!this.isLocked) this.start();
      },
      destroy(this: IdleLockState) {
        this.stop();
      },
      /** Counts as activity now and closes the warning. */
      stay(this: IdleLockState) {
        this.last = Date.now();
        this.phase = "active";
        this.check();
      },
      lock(this: IdleLockState) {
        this.setLocked(true, "manual");
      },
      /** Call once the person has really unlocked (after your listener verified). */
      unlock(this: IdleLockState) {
        this.setLocked(false, "manual");
      },
      setLocked(this: IdleLockState, next: boolean, reason: "idle" | "manual") {
        if (this.isLocked === next) return;
        this.isLocked = next;
        this.root?.dispatchEvent(new CustomEvent("nq-idle-lock-change", { bubbles: true, detail: { locked: next, reason } }));
      },
      start(this: IdleLockState) {
        if (this.disabled || this.isLocked) return;
        if (!this.attached) {
          this.attached = true;
          for (const type of ACTIVITY) window.addEventListener(type, this.onActivity, { passive: true, capture: true });
          document.addEventListener("visibilitychange", this.onVisible);
        }
        this.stay();
      },
      stop(this: IdleLockState) {
        clearTimeout(this.timer);
        this.phase = "active";
        if (!this.attached) return;
        this.attached = false;
        for (const type of ACTIVITY) window.removeEventListener(type, this.onActivity, { capture: true });
        document.removeEventListener("visibilitychange", this.onVisible);
      },
      check(this: IdleLockState) {
        clearTimeout(this.timer);
        const idle = Date.now() - this.last;
        const next = idleState(idle, timeoutMs, warningMs);
        this.phase = next.phase;
        this.secondsLeft = next.secondsLeft;
        if (next.phase === "locked") {
          this.setLocked(true, "idle");
          return;
        }
        this.timer = setTimeout(() => this.check(), Math.max(nextIdleCheck(idle, timeoutMs, warningMs), 50));
      },
      get warning(): boolean {
        return !(this as unknown as IdleLockState).isLocked && !(this as unknown as IdleLockState).disabled && (this as unknown as IdleLockState).phase === "warning";
      },
      get clock(): string {
        return formatCountdown((this as unknown as IdleLockState).secondsLeft);
      },
      get description(): string {
        return (config.description ?? "").replace("{time}", formatCountdown((this as unknown as IdleLockState).secondsLeft));
      },
      get percent(): number {
        const s = this as unknown as IdleLockState;
        return warningMs > 0 ? (s.secondsLeft / (warningMs / 1000)) * 100 : 0;
      },
      /** Announce every ten seconds and in the last five, not each tick. */
      get live(): string {
        const s = (this as unknown as IdleLockState).secondsLeft;
        return s % 10 === 0 || s <= 5 ? "polite" : "off";
      },
    };
  });
};

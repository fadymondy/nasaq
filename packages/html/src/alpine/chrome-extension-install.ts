// nqExtensionInstall: the install flow of a Chrome extension (add, pin, sign in). The markup is the React ChromeExtensionInstall's,
// rendered by <x-nq::chrome-extension-install>.
//
//   <div data-slot="chrome-extension-install" x-data="nqExtensionInstall({ installed: false, signedIn: false, pinned: false, ... })"
//        x-bind:data-state="rootState"> <li x-bind:data-state="state(0)">...</li> </div>
//
// The page reports what it detected through events, each bubbling with { wait(promise) }:
//   nq-extension-check    the "Check again" button. Hand wait() a promise; it may resolve { installed, version } to update the card.
//   nq-extension-signin   the "Sign in" button. The promise may resolve { error } (shown) or { signedIn: true }.
//   nq-extension-pinned   fired when the person confirms or undoes the pin, with { pinned }. Pinning cannot be detected.
// A promise that rejects while signing in shows the generic "could not sign in" message.

import type { Magics, Register } from "./types";

type StepState = "done" | "current" | "todo";

interface Config {
  installed?: boolean;
  signedIn?: boolean;
  pinned?: boolean;
  version?: string;
  canCheck?: boolean;
  canSignIn?: boolean;
  detected?: string;
  detectedVersion?: string;
  signInFailed?: string;
}

interface InstallState extends Magics {
  installed: boolean;
  signedIn: boolean;
  pinned: boolean;
  version: string;
  checking: boolean;
  signing: boolean;
  error: string | null;
  canCheck: boolean;
  canSignIn: boolean;
  strings: { detected: string; detectedVersion: string; signInFailed: string };
  readonly flags: boolean[];
  readonly allDone: boolean;
  readonly rootState: string;
  readonly detectedText: string;
  state(i: number): StepState;
  showActions(i: number): boolean;
  setPinned(next: boolean): void;
  check(): Promise<void>;
  signIn(): Promise<void>;
}

type Wait = (p: Promise<unknown>) => void;

export const chromeExtensionInstall: Register = (Alpine) => {
  Alpine.data("nqExtensionInstall", (cfg: Config = {}) => ({
    installed: !!cfg.installed,
    signedIn: !!cfg.signedIn,
    pinned: !!cfg.pinned,
    version: cfg.version ?? "",
    checking: false,
    signing: false,
    error: null as string | null,
    canCheck: !!cfg.canCheck,
    canSignIn: !!cfg.canSignIn,
    strings: {
      detected: cfg.detected ?? "Extension detected",
      detectedVersion: cfg.detectedVersion ?? "Extension detected, version {version}",
      signInFailed: cfg.signInFailed ?? "Could not sign in. Try again.",
    },
    get flags() {
      const self = this as unknown as InstallState;
      return [self.installed, self.installed && self.pinned, self.installed && self.signedIn];
    },
    get allDone() {
      const self = this as unknown as InstallState;
      return self.flags.every(Boolean);
    },
    get rootState() {
      const self = this as unknown as InstallState;
      return self.allDone ? "ready" : self.installed ? "installed" : "missing";
    },
    get detectedText() {
      const self = this as unknown as InstallState;
      return self.version ? self.strings.detectedVersion.replace("{version}", self.version) : self.strings.detected;
    },
    state(this: InstallState, i: number): StepState {
      const current = this.flags.findIndex((d) => !d);
      return this.flags[i] ? "done" : i === current ? "current" : "todo";
    },
    showActions(this: InstallState, i: number) {
      return this.state(i) === "current" || (i === 1 && this.installed) || (i === 2 && this.installed && !this.signedIn);
    },
    setPinned(this: InstallState, next: boolean) {
      this.pinned = next;
      this.$dispatch("nq-extension-pinned", { pinned: next });
    },
    async check(this: InstallState) {
      if (this.checking) return;
      const waits: Promise<unknown>[] = [];
      const wait: Wait = (p) => void waits.push(p);
      this.checking = true;
      this.$dispatch("nq-extension-check", { wait });
      try {
        const results = await Promise.all(waits);
        for (const r of results) {
          if (r && typeof r === "object") {
            const res = r as { installed?: boolean; version?: string };
            if (typeof res.installed === "boolean") this.installed = res.installed;
            if (typeof res.version === "string") this.version = res.version;
          }
        }
      } finally {
        this.checking = false;
      }
    },
    async signIn(this: InstallState) {
      if (this.signing) return;
      const waits: Promise<unknown>[] = [];
      const wait: Wait = (p) => void waits.push(p);
      this.signing = true;
      this.error = null;
      this.$dispatch("nq-extension-signin", { wait });
      try {
        const results = await Promise.all(waits);
        for (const r of results) {
          if (r && typeof r === "object") {
            const res = r as { error?: string; signedIn?: boolean };
            if (res.error) this.error = res.error;
            else if (res.signedIn) this.signedIn = true;
          }
        }
      } catch {
        this.error = this.strings.signInFailed;
      } finally {
        this.signing = false;
      }
    },
  }));
};

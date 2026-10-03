// nqTwoFactorSetup: turn on TOTP two-factor authentication in three steps (scan, verify a 6-digit code, save recovery codes),
// then show the enabled state with regenerate and disable. The markup is the React TwoFactorSetup's, the state lives here.
// It is presentational: your handlers talk to the server. Each dispatches a bubbling event with `wait(promise)`:
//
//   nq-2fa-verify      { code }        resolve { error?, recoveryCodes? }; with no codes the setup finishes after the code
//   nq-2fa-regenerate  { credential }  resolve the new codes (array) or { error }
//   nq-2fa-disable     { credential }  resolve nothing or { error }
//   nq-2fa-complete    {}              fired when the user finishes (no wait)
//
// `enabled` is x-modelable. The QR code is drawn here with `uqr`, as one SVG path, dark on light in both themes.
//
//   <div data-slot="two-factor-setup" x-data="nqTwoFactorSetup({ uri, enabled: false, codes: [], messages })" x-modelable="enabled"
//        @nq-2fa-verify="$event.detail.wait(verify($event.detail.code))"> … </div>

import { encode } from "uqr";
import type { Magics, Register } from "./types";

type Pending = Promise<unknown> | null;

interface Messages {
  genericError: string;
  fileHeader: string;
}

interface TwoFactorState extends Magics {
  uri: string;
  enabled: boolean;
  step: 1 | 2 | 3;
  code: string;
  error: string | null;
  pending: boolean;
  codes: string[];
  saved: boolean;
  fresh: string[] | null;
  remaining: number | null;
  mode: "password" | "code";
  cred: string;
  credError: string | null;
  credPending: boolean;
  credReady: boolean;
  messages: Messages;
  qr: { path: string; size: number };
  root: HTMLElement;
  ask(event: string, detail: Record<string, unknown>): Pending;
  finish(): void;
}

interface Init {
  uri?: string;
  enabled?: boolean;
  codes?: string[];
  remaining?: number | null;
  mode?: "password" | "code";
  messages?: Partial<Messages>;
}

const QUIET = 4;

/** One SVG path of every dark module, plus the side of the viewBox. */
function drawQr(value: string): { path: string; size: number } {
  if (!value) return { path: "", size: 0 };
  const code = encode(value, { ecc: "M", border: 0 });
  let d = "";
  code.data.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      d += `M${start + QUIET} ${y + QUIET}h${x - start}v1h-${x - start}z`;
    }
  });
  return { path: d, size: code.size + QUIET * 2 };
}

export const twoFactorSetup: Register = (Alpine) => {
  Alpine.data("nqTwoFactorSetup", (init: Init = {}) => ({
    uri: init.uri ?? "",
    enabled: Boolean(init.enabled),
    step: 1 as 1 | 2 | 3,
    code: "",
    error: null as string | null,
    pending: false,
    codes: [...(init.codes ?? [])] as string[],
    saved: false,
    fresh: null as string[] | null,
    remaining: (init.remaining ?? null) as number | null,
    mode: (init.mode ?? "password") as "password" | "code",
    cred: "",
    credError: null as string | null,
    credPending: false,
    messages: { genericError: "Something went wrong. Try again.", fileHeader: "Recovery codes", ...(init.messages ?? {}) } as Messages,
    qr: { path: "", size: 0 },
    root: null as unknown as HTMLElement,
    init(this: TwoFactorState) {
      this.root = this.$el;
      try {
        this.qr = drawQr(this.uri);
      } catch {
        this.qr = { path: "", size: 0 };
      }
    },
    /** The credential field is filled: a password, or a full 6-digit code. */
    get credReady(): boolean {
      const s = this as unknown as TwoFactorState;
      return s.mode === "code" ? s.cred.length === 6 : s.cred.length > 0;
    },
    ask(this: TwoFactorState, event: string, detail: Record<string, unknown>): Pending {
      let waiting: Pending = null;
      this.root.dispatchEvent(
        new CustomEvent(event, {
          bubbles: true,
          detail: {
            ...detail,
            wait: (promise: Promise<unknown> | void) => {
              if (promise && typeof (promise as Promise<unknown>).then === "function") waiting = promise as Promise<unknown>;
            },
          },
        }),
      );
      return waiting;
    },
    finish(this: TwoFactorState) {
      this.enabled = true;
      this.step = 1;
      this.code = "";
      this.saved = false;
      this.root.dispatchEvent(new CustomEvent("nq-2fa-complete", { bubbles: true, detail: {} }));
    },
    async verify(this: TwoFactorState, value: string) {
      if (this.pending || value.length !== 6 || this.step !== 2) return;
      const waiting = this.ask("nq-2fa-verify", { code: value });
      if (!waiting) return;
      this.pending = true;
      this.error = null;
      try {
        const result = ((await waiting) ?? {}) as { error?: string; recoveryCodes?: string[] };
        if (result.error) {
          this.error = result.error;
          return;
        }
        if (result.recoveryCodes?.length) this.codes = [...result.recoveryCodes];
        // Recovery codes are optional: with none to show, setup is done.
        if (!this.codes.length) this.finish();
        else this.step = 3;
      } catch {
        this.error = this.messages.genericError;
      } finally {
        this.pending = false;
      }
    },
    next(this: TwoFactorState & { $nextTick: (fn: () => void) => void }) {
      this.step = 2;
      this.$nextTick(() => {
        this.root.querySelector<HTMLElement>('[data-slot="two-factor-verify"] [data-slot="otp-input-box"]')?.focus();
      });
    },
    back(this: TwoFactorState) {
      this.error = null;
      this.step = 1;
    },
    /** Open a credential dialog with an empty field. */
    resetCred(this: TwoFactorState) {
      this.cred = "";
      this.credError = null;
    },
    /** Regenerate the codes or disable two-factor after the credential. Resolves true when the dialog may close. */
    async submitCred(this: TwoFactorState, action: "regenerate" | "disable"): Promise<boolean> {
      if (!this.credReady || this.credPending) return false;
      const waiting = this.ask(action === "regenerate" ? "nq-2fa-regenerate" : "nq-2fa-disable", { credential: this.cred });
      if (!waiting) return false;
      this.credPending = true;
      this.credError = null;
      try {
        const result = (await waiting) as string[] | { error?: string } | void;
        if (Array.isArray(result)) {
          this.fresh = [...result];
          this.remaining = result.length;
          return true;
        }
        if (result && result.error) {
          this.credError = result.error;
          return false;
        }
        if (action === "disable") this.enabled = false;
        return true;
      } catch {
        this.credError = this.messages.genericError;
        return false;
      } finally {
        this.credPending = false;
      }
    },
    /** Mark the code boxes invalid while there is an error (the boxes are rendered by the otp-input part). */
    markInvalid(this: TwoFactorState, el: HTMLElement) {
      const bad = this.error !== null;
      el.querySelectorAll<HTMLElement>('[data-slot="otp-input-box"]').forEach((box) => {
        if (bad) {
          box.setAttribute("aria-invalid", "true");
          box.setAttribute("data-invalid", "");
        } else {
          box.removeAttribute("aria-invalid");
          box.removeAttribute("data-invalid");
        }
      });
    },
    download(this: TwoFactorState, name = "recovery-codes.txt") {
      const list = this.fresh ?? this.codes;
      const blob = new Blob([`${this.messages.fileHeader}\n\n${list.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 0);
    },
  }));
};

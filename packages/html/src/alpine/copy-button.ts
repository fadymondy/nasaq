// nqCopyButton: copies text and shows a check for a moment. The markup is the React CopyButton's.
//
//   <span class="contents" x-data="nqCopyButton('sk_live_…', 1500)">
//     <button data-slot="copy-button" x-on:click="copy()" x-bind:data-copied="state === 'copied' ? '' : null">
//       <svg x-show="state !== 'copied'">…</svg><svg x-show="state === 'copied'">…</svg>
//     </button>
//     <span role="status" aria-live="polite" class="sr-only" x-text="…"></span>
//   </span>
//
// Uses the async Clipboard API, then a hidden textarea when it is unavailable (insecure origins, old browsers).
// Fires `nq:copy` ({ text }) on success and `nq:copy-error` on failure.

import type { Magics, Register } from "./types";

type State = "idle" | "copied" | "failed";

interface CopyState extends Magics {
  value: string;
  resetAfter: number;
  state: State;
  timer: ReturnType<typeof setTimeout> | undefined;
  copy(): Promise<void>;
}

/** Writes text to the clipboard, with the hidden-textarea fallback. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not focused: try the fallback below.
  }
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;inset-block-start:0;inset-inline-start:0;opacity:0;pointer-events:none";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  active?.focus?.();
  return ok;
}

export const copyButton: Register = (Alpine) => {
  Alpine.data("nqCopyButton", (value = "", resetAfter = 1500) => ({
    value,
    resetAfter,
    state: "idle" as State,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    async copy(this: CopyState) {
      const ok = await copyText(this.value);
      clearTimeout(this.timer);
      this.state = ok ? "copied" : "failed";
      this.timer = setTimeout(() => (this.state = "idle"), this.resetAfter);
      if (ok) this.$dispatch("nq:copy", { text: this.value });
      else this.$dispatch("nq:copy-error");
    },
  }));
};

// The Alpine parts of the voice call overlay (the markup is in the Blade components voice-call-overlay and voice-call-overlay.visualizer).
//
//   nqVoiceVisualizer  the bars: keeps a short level history, repaints heights and classes; reduced motion = coarse steps, no transitions, no pulse
//   nqVoiceCall        the call: state, level, muted (x-modelable), captions, timer text, the buttons and their events
//                      nq-voice-mute { muted }, nq-voice-captions { show }, nq-voice-retry, nq-voice-interrupt, nq-voice-end { wait(promise) }
//
// Live values come in through sync({ state, level, muted, elapsed, captions, error }), called from a root x-effect built from the *-expr props.

import type { Register } from "./types";
import { barClass, barHeights, clampLevel, formatCallTime, pushLevel, quantizeLevel, type VoiceCallState } from "./voice-call-overlay-logic";

const reducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Caption = { id?: string | number; role?: string; text?: string };
type Words = {
  label: string;
  states: Record<string, string>;
  muted: string;
  mute: string;
  unmute: string;
  captionsOn: string;
  captionsOff: string;
  end: string;
  ending: string;
  you: string;
  noCaptions: string;
};
type Viz = { vizState: VoiceCallState; vizLevel: number; vizMuted: boolean; target(): number; paint(): void; push(): void };

export const voiceCallOverlay: Register = (Alpine) => {
  Alpine.data("nqVoiceVisualizer", (config: { state?: VoiceCallState; level?: number; bars?: number; muted?: boolean } = {}) => {
    let root: HTMLElement;
    let history: number[] = [];
    let reduced = false;
    let timer: number | undefined;
    const bars = Math.max(1, Math.floor(config.bars ?? 31));
    const half = Math.ceil(bars / 2);
    return {
      vizState: (config.state ?? "listening") as VoiceCallState,
      vizLevel: config.level ?? 0,
      vizMuted: !!config.muted,
      init(this: Viz & { $el: HTMLElement; $watch(k: string, cb: () => void): void }) {
        root = this.$el;
        reduced = reducedMotion();
        this.push();
        this.paint();
        for (const key of ["vizState", "vizLevel", "vizMuted"]) {
          this.$watch(key, () => {
            this.push();
            this.paint();
          });
        }
        // Thinking: the bars breathe on their own.
        timer = window.setInterval(() => {
          if (this.vizState === "thinking" && !reduced) this.paint();
        }, 400);
      },
      sync(this: Viz, next: { state?: VoiceCallState; level?: number; muted?: boolean } = {}) {
        if (next.state !== undefined && next.state !== this.vizState) this.vizState = next.state;
        if (next.level !== undefined && next.level !== this.vizLevel) this.vizLevel = next.level;
        if (next.muted !== undefined && !!next.muted !== this.vizMuted) this.vizMuted = !!next.muted;
      },
      target(this: Viz) {
        const quiet = this.vizMuted && this.vizState === "listening";
        const live = (this.vizState === "listening" && !quiet) || this.vizState === "speaking";
        const level = live ? clampLevel(this.vizLevel) : 0;
        return reduced ? quantizeLevel(level) : level;
      },
      meter(this: Viz) {
        return Math.round(this.target() * 100);
      },
      push(this: Viz) {
        history = pushLevel(history, this.target(), half);
      },
      paint(this: Viz) {
        if (!root) return;
        const quiet = this.vizMuted && this.vizState === "listening";
        const heights = barHeights(history, bars, this.vizState === "thinking" ? 0.16 : 0.06);
        const cls = barClass(this.vizState, quiet, reduced);
        root.querySelectorAll<HTMLElement>(":scope > span").forEach((span, i) => {
          span.className = cls;
          span.style.height = `${Math.round((heights[i] ?? 0.06) * 100000) / 1000}%`;
        });
      },
      destroy() {
        window.clearInterval(timer);
      },
    };
  });

  Alpine.data(
    "nqVoiceCall",
    (config: {
      state?: VoiceCallState;
      level?: number;
      muted?: boolean;
      elapsed?: number | null;
      captions?: Caption[];
      captionLines?: number;
      showCaptions?: boolean;
      error?: string | null;
      contained?: boolean;
      words: Words;
    }) => {
      let root: HTMLElement;
      type Call = { state: string; muted: boolean; showCaptions: boolean; ending: boolean; words: Words; elapsed: number | null; captions: Caption[]; captionLines: number; emit(n: string, d?: unknown): void };
      return {
        state: (config.state ?? "listening") as VoiceCallState,
        level: config.level ?? 0,
        muted: !!config.muted,
        elapsed: (config.elapsed ?? null) as number | null,
        captions: (config.captions ?? []) as Caption[],
        captionLines: config.captionLines ?? 3,
        showCaptions: config.showCaptions !== false,
        error: (config.error ?? null) as string | null,
        ending: false,
        words: config.words,
        init(this: { $el: HTMLElement }) {
          root = this.$el;
          if (!config.contained) root.focus?.({ preventScroll: true });
        },
        sync(this: Record<string, unknown>, next: Record<string, unknown> = {}) {
          for (const key of ["state", "level", "elapsed", "captions", "error"]) {
            if (!(key in next)) continue;
            const value = next[key] === undefined && (key === "elapsed" || key === "error") ? null : next[key];
            if (value !== undefined && value !== this[key]) this[key] = value;
          }
          if ("muted" in next && next.muted !== undefined && !!next.muted !== this.muted) this.muted = !!next.muted;
        },
        time(this: Call) {
          return this.elapsed === null || this.elapsed === undefined ? "" : formatCallTime(this.elapsed);
        },
        plain(this: Call) {
          return this.state === "listening" || this.state === "speaking";
        },
        statusText(this: Call) {
          return this.state === "listening" && this.muted ? this.words.muted : (this.words.states[this.state] ?? "");
        },
        muteLabel(this: Call) {
          return this.muted ? this.words.unmute : this.words.mute;
        },
        captionsLabel(this: Call) {
          return this.showCaptions ? this.words.captionsOff : this.words.captionsOn;
        },
        endLabel(this: Call) {
          return this.ending ? this.words.ending : this.words.end;
        },
        emit(name: string, detail?: unknown) {
          root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
        },
        toggleMute(this: Call) {
          this.muted = !this.muted;
          this.emit("nq-voice-mute", { muted: this.muted });
        },
        toggleCaptions(this: Call) {
          this.showCaptions = !this.showCaptions;
          this.emit("nq-voice-captions", { show: this.showCaptions });
        },
        retry(this: Call) {
          this.emit("nq-voice-retry");
        },
        interrupt(this: Call) {
          this.emit("nq-voice-interrupt");
        },
        async end(this: Call) {
          if (this.ending) return;
          this.ending = true;
          const waits: Promise<unknown>[] = [];
          root.dispatchEvent(new CustomEvent("nq-voice-end", { detail: { wait: (p: Promise<unknown>) => waits.push(Promise.resolve(p)) }, bubbles: true }));
          try {
            await Promise.allSettled(waits);
          } finally {
            this.ending = false;
          }
        },
        paintCaptions(this: Call) {
          const box = root?.querySelector<HTMLElement>("[data-captions]");
          if (!box) return;
          const lines = (this.captions ?? []).slice(-Math.max(0, this.captionLines));
          const words = this.words;
          box.replaceChildren();
          if (lines.length === 0) {
            const p = document.createElement("p");
            p.className = "text-body-sm text-muted-foreground";
            p.textContent = words.noCaptions;
            box.append(p);
            return;
          }
          lines.forEach((line, i) => {
            const p = document.createElement("p");
            p.setAttribute("dir", "auto");
            p.className = ["text-body", (line.role ?? "agent") === "agent" ? "text-foreground" : "text-muted-foreground", i < lines.length - 1 ? "opacity-70" : ""].filter(Boolean).join(" ");
            if (line.role === "user") {
              const who = document.createElement("span");
              who.className = "me-1.5 text-caption text-muted-foreground";
              who.textContent = words.you;
              p.append(who);
            }
            p.append(document.createTextNode(line.text ?? ""));
            box.append(p);
          });
        },
      };
    },
  );
};

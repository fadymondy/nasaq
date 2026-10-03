// nqTypingTerminal: a terminal that types commands and prints their output, step by step. The markup is the React TypingTerminal's
// (see <x-nq::typing-terminal>); the server renders the finished transcript, this takes over on load and replays it.
//
//   <div data-slot="typing-terminal" x-data="nqTypingTerminal({ steps: [{ cmd: 'npm i', out: ['done'] }], prompt: '❯', typeMs: 28, lineMs: 110, loop: false, play: true })">…</div>
//
// Options: steps, prompt, typeMs (28), lineMs (110), loop, play. Reduced motion (and webdriver) shows the finished transcript at once.
// Events (bubbling from the host): "complete" when the playback ends. Call `replay()` or dispatch "nq-typing-play" { play: true|false } on the host.

import { type AnsiSpan, parseAnsiRows } from "./terminal-ansi";
import type { Magics, Register } from "./types";

interface Step {
  cmd: string;
  out?: string[];
}
interface Progress {
  step: number;
  typed: number;
  lines: number;
  end: boolean;
}
interface Row {
  key: string;
  kind: "command" | "output";
  cmd: string;
  typing: boolean;
  /** Output rows (one per newline of the line), each a list of coloured spans. */
  rows: AnsiSpan[][];
}
interface Config {
  steps?: Step[];
  prompt?: string;
  typeMs?: number;
  lineMs?: number;
  loop?: boolean;
  play?: boolean;
}
interface State extends Magics {
  steps: Step[];
  prompt: string;
  typeMs: number;
  lineMs: number;
  loop: boolean;
  play: boolean;
  progress: Progress;
  playing: boolean;
  root: HTMLElement;
  halt: (() => void) | undefined;
  readonly rows: Row[];
  readonly showReplay: boolean;
  full(): Progress;
  start(): void;
  stopPlayback(): void;
}

const staticFrame = () => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || navigator.webdriver === true);

export const typingTerminal: Register = (Alpine) => {
  Alpine.data("nqTypingTerminal", (cfg: Config = {}) => ({
    steps: cfg.steps ?? [],
    prompt: cfg.prompt ?? "❯",
    typeMs: cfg.typeMs ?? 28,
    lineMs: cfg.lineMs ?? 110,
    loop: cfg.loop ?? false,
    play: cfg.play ?? true,
    progress: { step: (cfg.steps ?? []).length, typed: 0, lines: 0, end: true } as Progress,
    playing: false,
    root: null as unknown as HTMLElement,
    halt: undefined as (() => void) | undefined,
    init(this: State) {
      this.root = this.$el;
      // The server-rendered transcript hands over to the reactive rows.
      this.$refs.ssr?.remove();
      this.root.addEventListener("nq-typing-play", (e) => {
        this.play = (e as CustomEvent<{ play?: boolean }>).detail?.play !== false;
        this.start();
      });
      this.$watch("progress", () => {
        void this.$nextTick(() => {
          const body = this.$refs.body;
          if (body) body.scrollTop = body.scrollHeight;
        });
      });
      this.start();
    },
    destroy(this: State) {
      this.stopPlayback();
    },
    full(this: State): Progress {
      return { step: this.steps.length, typed: 0, lines: 0, end: true };
    },
    stopPlayback(this: State) {
      this.halt?.();
      this.halt = undefined;
    },
    replay(this: State) {
      this.start();
    },
    start(this: State) {
      this.stopPlayback();
      if (!this.play) {
        this.progress = this.full();
        this.playing = false;
        return;
      }
      if (staticFrame()) {
        this.progress = this.full();
        this.root.dispatchEvent(new CustomEvent("complete", { bubbles: true }));
        return;
      }
      let alive = true;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const wait = (ms: number) => new Promise<void>((resolve) => timers.push(setTimeout(resolve, ms)));
      this.halt = () => {
        alive = false;
        for (const id of timers) clearTimeout(id);
      };
      void (async () => {
        this.playing = true;
        do {
          for (let s = 0; s < this.steps.length && alive; s++) {
            const step = this.steps[s];
            if (!step) continue;
            for (let c = 0; c <= step.cmd.length && alive; c++) {
              this.progress = { step: s, typed: c, lines: 0, end: false };
              await wait(this.typeMs);
            }
            await wait(240);
            for (let l = 1; l <= (step.out?.length ?? 0) && alive; l++) {
              this.progress = { step: s, typed: step.cmd.length, lines: l, end: false };
              await wait(this.lineMs);
            }
          }
          if (!alive) return;
          this.progress = this.full();
          if (!this.loop) break;
          await wait(4000);
        } while (alive);
        if (!alive) return;
        this.playing = false;
        this.root.dispatchEvent(new CustomEvent("complete", { bubbles: true }));
      })();
    },
    get rows(): Row[] {
      const self = this as unknown as State;
      const out: Row[] = [];
      self.steps.forEach((step, s) => {
        if (s > self.progress.step) return;
        const current = s === self.progress.step && !self.progress.end;
        const typing = current && self.progress.typed <= step.cmd.length && self.progress.lines === 0;
        out.push({ key: `c${s}`, kind: "command", cmd: current ? step.cmd.slice(0, self.progress.typed) : step.cmd, typing, rows: [] });
        const lines = step.out ?? [];
        lines.slice(0, current ? self.progress.lines : lines.length).forEach((line, l) => {
          out.push({ key: `o${s}-${l}`, kind: "output", cmd: "", typing: false, rows: parseAnsiRows(line) });
        });
      });
      return out;
    },
    get showReplay(): boolean {
      const self = this as unknown as State;
      return !self.loop && !self.playing && self.play;
    },
    spanStyle(s: AnsiSpan["style"]) {
      const fg = s.inverse ? (s.bg ?? "var(--nq-surface-soft)") : s.fg;
      const bg = s.inverse ? (s.fg ?? "var(--nq-fg)") : s.bg;
      if (!fg && !bg && !s.dim) return undefined;
      return { ...(fg ? { color: fg } : {}), ...(bg ? { backgroundColor: bg } : {}), ...(s.dim ? { opacity: "0.65" } : {}) };
    },
    spanClass(s: AnsiSpan["style"]) {
      return [s.bold && "font-bold", s.italic && "italic", (s.underline || s.strike) && "underline", s.strike && "line-through"].filter(Boolean).join(" ");
    },
  }));
};

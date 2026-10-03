// nqAskAi: the "Ask AI" pill and panel behind <x-nq::ask-ai>. Select text inside the wrapped content and a pill appears by the selection;
// press it (or Ctrl/Cmd+Shift+Space) for a panel with quick actions and a question box, then read the answer in place. Selections inside
// inputs, editors and [data-ask-ai-ignore] areas are ignored. The popup is teleported to <body> and placed by hand from the selection rect
// (a virtual anchor), flipped and clamped to the viewport.
//
//   <div x-data="nqAskAi(config)" @ask-ai="$event.detail.wait(…)" @ask-ai-replace="…"> content … </div>
//
// It is presentational: asking fires "ask-ai" on the root with detail { prompt, selection, actionId?, wait(promise) }. Resolve the promise with the
// answer text, { text } or { error }; a rejection, or nobody listening, shows the generic failure with Try again. The answer is plain text here
// (no Markdown parser in the browser). With on-replace, "Replace selection" fires "ask-ai-replace" { answer, selection }; you change the text.

import { hotkeyMatches, isIgnoredTarget, normalizeSelection, placePopup, readOutcome, type AskAiOutcome } from "./ask-ai-logic";
import type { Magics, Register } from "./types";

interface Config {
  min: number;
  max: number;
  hotkey: string | null;
  disabled: boolean;
  actions: { id: string; label: string }[];
  failed: string;
}

type Status = "idle" | "loading" | "done" | "error";

interface State extends Magics {
  config: Config;
  shown: boolean;
  phase: "pill" | "panel";
  status: Status;
  selection: string;
  truncated: boolean;
  answerText: string;
  errorText: string;
  question: string;
  popStyle: Record<string, string>;
  popupEl: HTMLElement | null;
  root: HTMLElement | null;
  ask(prompt: string, actionId?: string): Promise<void>;
  place(): void;
  reset(): void;
  close(): void;
  openPanel(): void;
  submit(): void;
}

export const askAi: Register = (Alpine) => {
  Alpine.data("nqAskAi", (config: Config) => {
    // Not reactive state: a Range and the bookkeeping of listeners must not go through Alpine's proxy.
    let range: Range | null = null;
    let pointerDown = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestId = 0;
    let last: { prompt: string; actionId?: string } | null = null;
    let cleanup: (() => void) | null = null;

    return {
      config,
      shown: false,
      phase: "pill" as "pill" | "panel",
      status: "idle" as Status,
      selection: "",
      truncated: false,
      answerText: "",
      errorText: "",
      question: "",
      popStyle: { position: "fixed", top: "0px", left: "0px", visibility: "hidden" } as Record<string, string>,
      popupEl: null as HTMLElement | null,
      root: null as HTMLElement | null,

      get busy(): boolean {
        return (this as unknown as State).status === "loading";
      },

      init(this: State) {
        this.root = this.$el;
        const evaluate = () => {
          if (this.config.disabled || this.phase === "panel") return;
          const sel = window.getSelection();
          if (!this.root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
            this.shown = false;
            return;
          }
          const r = sel.getRangeAt(0);
          const anchor = r.commonAncestorContainer;
          const el = anchor instanceof Element ? anchor : anchor.parentElement;
          if (!this.root.contains(anchor) || isIgnoredTarget(el)) {
            this.shown = false;
            return;
          }
          const n = normalizeSelection(sel.toString(), this.config.min, this.config.max);
          if (n.text === "") {
            this.shown = false;
            return;
          }
          range = r.cloneRange();
          if (!this.shown || this.selection !== n.text) {
            this.selection = n.text;
            this.truncated = n.truncated;
            this.shown = true;
          }
          this.place();
        };
        const onChange = () => {
          clearTimeout(timer);
          // Wait for the pointer to lift, and for keyboard selection to settle, before showing the pill.
          timer = setTimeout(() => {
            if (!pointerDown) evaluate();
          }, 220);
        };
        const onDown = (e: Event) => {
          if (this.root?.contains(e.target as Node)) pointerDown = true;
          // A press outside the open panel closes it (a press elsewhere only collapses the selection, which hides the pill).
          else if (this.phase === "panel" && !this.popupEl?.contains(e.target as Node)) this.close();
        };
        const onUp = () => {
          if (!pointerDown) return;
          pointerDown = false;
          setTimeout(evaluate, 0);
        };
        const onKey = (e: KeyboardEvent) => {
          if (e.key === "Escape" && this.shown) {
            this.close();
            return;
          }
          if (this.config.disabled || !this.config.hotkey || !this.shown || this.phase !== "pill") return;
          if (hotkeyMatches(this.config.hotkey, e)) {
            e.preventDefault();
            this.openPanel();
          }
        };
        const onMove = () => {
          if (this.shown) this.place();
        };
        document.addEventListener("selectionchange", onChange);
        window.addEventListener("pointerdown", onDown, true);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        window.addEventListener("keydown", onKey);
        window.addEventListener("resize", onMove);
        window.addEventListener("scroll", onMove, true);
        cleanup = () => {
          document.removeEventListener("selectionchange", onChange);
          window.removeEventListener("pointerdown", onDown, true);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          window.removeEventListener("keydown", onKey);
          window.removeEventListener("resize", onMove);
          window.removeEventListener("scroll", onMove, true);
          clearTimeout(timer);
        };
        for (const key of ["phase", "status", "shown"]) this.$watch(key, () => void this.$nextTick(() => this.place()));
      },
      destroy() {
        cleanup?.();
        requestId++;
      },

      /** Puts the popup next to the selection: above it for the pill, below it for the panel. */
      place(this: State) {
        if (!range || !this.popupEl || !this.shown) return;
        const a = range.getBoundingClientRect();
        const size = { width: this.popupEl.offsetWidth, height: this.popupEl.offsetHeight };
        const p = placePopup(a, size, { width: window.innerWidth, height: window.innerHeight }, this.phase === "pill" ? "top" : "bottom");
        this.popStyle = { position: "fixed", top: `${Math.round(p.top)}px`, left: `${Math.round(p.left)}px`, "--available-width": "calc(100vw - 16px)" };
      },

      openPanel(this: State) {
        this.phase = "panel";
        void this.$nextTick(() => this.popupEl?.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true }));
      },
      reset(this: State) {
        requestId++;
        this.shown = false;
        this.phase = "pill";
        this.status = "idle";
        this.answerText = "";
        this.errorText = "";
        this.question = "";
        last = null;
      },
      close(this: State) {
        this.reset();
        window.getSelection()?.removeAllRanges();
      },

      async ask(this: State, prompt: string, actionId?: string) {
        const id = ++requestId;
        last = actionId ? { prompt, actionId } : { prompt };
        this.status = "loading";
        let result: { text: string } | { error: string };
        try {
          let pending: Promise<AskAiOutcome> | undefined;
          const detail = { prompt, selection: this.selection, ...(actionId ? { actionId } : {}), wait: (x: Promise<AskAiOutcome>) => (pending = Promise.resolve(x)) };
          (this.root ?? this.$el).dispatchEvent(new CustomEvent("ask-ai", { bubbles: true, detail }));
          if (!pending) throw new Error("no listener");
          result = readOutcome(await pending);
        } catch (e) {
          result = { error: e instanceof Error && e.message !== "no listener" ? e.message : "" };
        }
        if (id !== requestId) return;
        if ("text" in result) {
          this.answerText = result.text;
          this.status = "done";
        } else {
          this.errorText = result.error || this.config.failed;
          this.status = "error";
        }
      },
      submit(this: State) {
        const prompt = this.question.trim();
        if (prompt === "" || this.status === "loading") return;
        void this.ask(prompt);
      },
      enter(this: State, e: KeyboardEvent) {
        if (e.shiftKey || e.isComposing) return;
        e.preventDefault();
        this.submit();
      },
      quick(this: State, id: string) {
        const a = this.config.actions.find((x) => x.id === id);
        if (a) void this.ask(a.label, a.id);
      },
      retry(this: State) {
        if (last) void this.ask(last.prompt, last.actionId);
      },
      another(this: State) {
        requestId++;
        this.status = "idle";
        last = null;
      },
      replace(this: State) {
        (this.root ?? this.$el).dispatchEvent(new CustomEvent("ask-ai-replace", { bubbles: true, detail: { answer: this.answerText, selection: this.selection } }));
      },
    };
  });
};

// The Alpine parts of the AI states (the markup is in the Blade components ai-states.*; the state lives here).
//
//   nqAiKeys            a span of kbds with data-key; swaps the Ctrl / Shift / Alt words for the Command glyphs on Apple
//   nqAiSplit           the split button: nq-ai-run (main half), nq-ai-action { id } (menu item)
//   nqAiActionMenu      the Cmd+J / Ctrl+J action dialog (rows, options { hotkey, open, words }); open is x-modelable
//   nqAiThinking        steps that advance on their own (interval) or follow an Alpine expression (x-effect="sync(expr)")
//   nqAiShimmer         starts the light sweep, not under reduced motion
//   nqAiStreamingText   plain streaming text revealed smoothly (x-effect="sync(text, streaming)"), caret, polite "ready" status, nq-ai-revealed
//   nqAiStream          Stop / Regenerate by state (x-modelable "state", or x-effect="sync(expr)"): nq-ai-stop, nq-ai-regenerate
//   nqAiFeedback        thumbs (x-modelable "value"): nq-ai-feedback { value }
//   nqAiSummary         the summary card: the copied text (TL;DR, key points, the long version while open) and the toggle words

import { cycleIndex, groupAiActions, nextRevealLength, stepState, summaryToText, type AiActionLike } from "./ai-states-logic";
import { aiKeyGlyph, aiShortcutKeys } from "./ai-states-keys";
import { isApplePlatform } from "./command-palette-logic";
import type { Magics, Register } from "./types";

interface AiRow extends AiActionLike {
  icon?: string;
  iconHtml?: string;
  shortcut?: string;
  disabled?: boolean;
}
interface ActionMenuOptions {
  hotkey?: boolean;
  open?: boolean;
  words?: { recommended: string; allActions: string; actionsTitle: string };
}
interface Section {
  id: string;
  label: string;
  items: { a: AiRow; i: number }[];
}
interface MenuView {
  sections: Section[];
  flat: AiRow[];
}

const reducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const aiStates: Register = (Alpine) => {
  Alpine.data("nqAiKeys", () => ({
    init(this: Magics) {
      if (!isApplePlatform()) return;
      this.$el.querySelectorAll<HTMLElement>("[data-key]").forEach((kbd) => {
        const glyph = aiKeyGlyph(kbd.dataset.key ?? "", true);
        if (glyph) kbd.textContent = glyph;
      });
    },
  }));

  Alpine.data("nqAiSplit", () => ({
    root: null as unknown as HTMLElement,
    init(this: Magics & { root: HTMLElement }) {
      this.root = this.$el;
    },
    run(this: { root: HTMLElement }) {
      this.root.dispatchEvent(new CustomEvent("nq-ai-run", { bubbles: true }));
    },
    pick(this: { root: HTMLElement }, id: string | undefined) {
      if (id === undefined) return;
      this.root.dispatchEvent(new CustomEvent("nq-ai-action", { bubbles: true, detail: { id } }));
    },
  }));

  Alpine.data("nqAiActionMenu", (rows: AiRow[] = [], options: ActionMenuOptions = {}) => {
    let cacheKey = "";
    let cache: MenuView = { sections: [], flat: [] };
    const words = options.words ?? { recommended: "Recommended", allActions: "All actions", actionsTitle: "AI actions" };

    return {
      rows,
      hotkey: options.hotkey !== false,
      open: Boolean(options.open),
      query: "",
      highlighted: 0,
      apple: false,
      root: null as unknown as HTMLElement,

      init(this: Magics & { root: HTMLElement; open: boolean; query: string; apple: boolean; highlighted: number; view(): MenuView }) {
        this.root = this.$el;
        this.apple = isApplePlatform();
        this.$watch("open", (isOpen: boolean) => {
          this.root.dispatchEvent(new CustomEvent("nq-open-change", { bubbles: true, detail: { open: isOpen } }));
          if (isOpen) this.$nextTick(() => document.querySelector<HTMLInputElement>('[data-slot="ai-action-menu"] input[role="combobox"]')?.focus());
          else this.query = "";
        });
        this.$watch("listKey", () => {
          this.highlighted = Math.max(
            0,
            this.view().flat.findIndex((a) => !a.disabled),
          );
        });
      },

      show(this: { open: boolean }) {
        this.open = true;
      },
      close(this: { open: boolean }) {
        this.open = false;
      },
      toggle(this: { open: boolean }) {
        this.open = !this.open;
      },
      onHotkey(this: { hotkey: boolean; open: boolean }, event: KeyboardEvent) {
        if (!this.hotkey) return;
        const mod = isApplePlatform() ? event.metaKey : event.ctrlKey;
        if (!mod || event.altKey || event.shiftKey) return;
        if (event.code !== "KeyJ" && event.key.toLowerCase() !== "j") return;
        event.preventDefault();
        this.open = !this.open;
      },
      optionId: (i: number) => `nq-ai-opt-${i}`,
      get listKey(): string {
        const flat = (this as unknown as { view(): MenuView }).view().flat;
        return flat.length + "|" + flat.map((a) => a.id).join(",");
      },
      view(this: { rows: AiRow[]; query: string }): MenuView {
        const key = this.query + "|" + this.rows.length;
        if (key === cacheKey) return cache;
        const g = groupAiActions(this.rows, this.query);
        const groups: { id: string; label: string; items: AiRow[] }[] = [];
        if (g.recommended.length) groups.push({ id: "recommended", label: words.recommended, items: g.recommended });
        if (g.others.length) groups.push({ id: "all", label: g.recommended.length ? words.allActions : this.query.trim() ? words.actionsTitle : words.allActions, items: g.others });
        const flat: AiRow[] = [];
        const sections: Section[] = groups.map((s) => ({ id: s.id, label: s.label, items: s.items.map((a) => ({ a, i: flat.push(a) - 1 })) }));
        cacheKey = key;
        cache = { sections, flat };
        return cache;
      },
      keys(this: { apple: boolean }, shortcut: string): string[] {
        return aiShortcutKeys(shortcut, this.apple);
      },
      run(this: { open: boolean; root: HTMLElement }, a: AiRow) {
        if (a.disabled) return;
        this.open = false;
        this.root.dispatchEvent(new CustomEvent("nq-ai-action", { bubbles: true, detail: { id: a.id } }));
      },
      move(this: Magics & { highlighted: number; view(): MenuView }, delta: number) {
        const flat = this.view().flat;
        const n = flat.length;
        if (!n) return;
        let i = this.highlighted;
        for (let tries = 0; tries < n; tries++) {
          i = (i + delta + n) % n;
          if (!flat[i]!.disabled) break;
        }
        this.highlighted = i;
        this.$nextTick(() => document.getElementById(`nq-ai-opt-${i}`)?.scrollIntoView?.({ block: "nearest" }));
      },
      onKey(this: { move(d: number): void; run(a: AiRow): void; highlighted: number; view(): MenuView }, e: KeyboardEvent) {
        if (e.isComposing) return;
        if (e.key === "ArrowDown") (e.preventDefault(), this.move(1));
        else if (e.key === "ArrowUp") (e.preventDefault(), this.move(-1));
        else if (e.key === "Enter") {
          const a = this.view().flat[this.highlighted];
          if (a) (e.preventDefault(), this.run(a));
        }
      },
    };
  });

  Alpine.data("nqAiThinking", (cfg: { count: number; interval: number; current: number | null; steps: string[]; label: string; words: Record<string, string> }) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    return {
      words: cfg.words,
      steps: cfg.steps,
      label: cfg.label,
      current: cfg.current as number | null,
      auto: 0,
      init(this: { current: number | null; auto: number; $el: HTMLElement }) {
        if (cfg.count < 2) return;
        // The timer must write through the reactive scope: a closure over the raw object would not re-render.
        const state = (this as unknown as { $data: { current: number | null; auto: number } }).$data;
        timer = setInterval(() => {
          if (state.current === null) state.auto = cycleIndex(state.auto, cfg.count);
        }, cfg.interval);
      },
      destroy() {
        clearInterval(timer);
      },
      /** Called from x-effect with the live index; reads nothing of its own state. */
      sync(this: { current: number | null }, value: unknown) {
        this.current = typeof value === "number" && Number.isFinite(value) ? value : null;
      },
      active(this: { current: number | null; auto: number }): number {
        return this.current ?? this.auto;
      },
      state(this: { active(): number }, i: number) {
        return stepState(i, this.active());
      },
      headline(this: { active(): number; steps: string[]; label: string }): string {
        return this.steps[Math.min(this.active(), this.steps.length - 1)] ?? this.label;
      },
    };
  });

  Alpine.data("nqAiShimmer", () => {
    let anim: Animation | undefined;
    return {
      init(this: Magics) {
        const sweep = this.$el.querySelector<HTMLElement>("[data-sweep]");
        if (!sweep) return;
        if (reducedMotion()) {
          sweep.remove();
          return;
        }
        if (typeof sweep.animate !== "function") return;
        const rtl = getComputedStyle(sweep).direction === "rtl";
        anim = sweep.animate(
          { transform: rtl ? ["translateX(100%)", "translateX(-100%)"] : ["translateX(-100%)", "translateX(100%)"] },
          { duration: 1500, iterations: Number.POSITIVE_INFINITY, easing: "ease-in-out" },
        );
      },
      destroy() {
        anim?.finished?.catch(() => {});
        anim?.cancel();
        anim = undefined;
      },
    };
  });

  Alpine.data("nqAiStreamingText", (cfg: { text: string; streaming: boolean; reveal: boolean; cps: number; caret: boolean; ready: string; caretClass: string }) => {
    let frame = 0;
    let announced = false;
    let last = 0;
    const smooth = cfg.reveal && !reducedMotion();
    return {
      text: cfg.text,
      streaming: cfg.streaming,
      caretClass: cfg.caretClass,
      // The text the server sent shows at once; only later growth is typed out.
      shown: cfg.text.length,
      root: null as unknown as HTMLElement,

      init(this: Magics & { root: HTMLElement; announce(): void }) {
        this.root = this.$el;
        this.$watch("finished", () => this.announce());
        this.announce();
      },
      destroy() {
        if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
        frame = 0;
      },
      /** Called from x-effect with the live text and streaming flag. */
      sync(this: { text: string; streaming: boolean; shown: number; kick(): void }, text: unknown, streaming: unknown) {
        const next = text == null ? "" : String(text);
        // A shorter text (regenerate, a new answer) starts over.
        if (this.shown > next.length) this.shown = smooth ? 0 : next.length;
        this.text = next;
        this.streaming = Boolean(streaming);
        if (this.streaming) announced = false;
        if (smooth) this.kick();
        else this.shown = next.length;
      },
      kick(this: { text: string; shown: number }) {
        if (frame || this.shown >= this.text.length) return;
        if (typeof requestAnimationFrame !== "function") {
          this.shown = this.text.length;
          return;
        }
        last = performance.now();
        const tick = (now: number) => {
          frame = 0;
          const target = this.text;
          this.shown = nextRevealLength(Math.min(this.shown, target.length), target.length, now - last, target, cfg.cps);
          last = now;
          if (this.shown < target.length) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      get visible(): string {
        const s = this as unknown as { text: string; shown: number };
        return smooth ? s.text.slice(0, Math.min(s.shown, s.text.length)) : s.text;
      },
      get finished(): boolean {
        const s = this as unknown as { streaming: boolean; visible: string; text: string };
        return !s.streaming && s.visible.length >= s.text.length;
      },
      get showCaret(): boolean {
        return cfg.caret && !(this as unknown as { finished: boolean }).finished;
      },
      get status(): string {
        const s = this as unknown as { finished: boolean; text: string };
        return s.finished && s.text ? cfg.ready : "";
      },
      announce(this: { finished: boolean; text: string; root: HTMLElement }) {
        if (this.finished && this.text && !announced) {
          announced = true;
          this.root.dispatchEvent(new CustomEvent("nq-ai-revealed", { bubbles: true }));
        }
      },
    };
  });

  Alpine.data("nqAiStream", (cfg: { state: string; regenerate: boolean; words: Record<string, string> }) => ({
    state: cfg.state,
    root: null as unknown as HTMLElement,
    init(this: Magics & { root: HTMLElement }) {
      this.root = this.$el;
    },
    /** Called from x-effect with the live state. */
    sync(this: { state: string }, value: unknown) {
      if (typeof value === "string" && value) this.state = value;
    },
    isStreaming(this: { state: string }) {
      return this.state === "streaming";
    },
    canRegenerate(this: { state: string }) {
      return cfg.regenerate && this.state !== "idle" && this.state !== "streaming";
    },
    status(this: { state: string }) {
      return cfg.words[this.state] ?? "";
    },
    stop(this: { root: HTMLElement }) {
      this.root.dispatchEvent(new CustomEvent("nq-ai-stop", { bubbles: true }));
    },
    again(this: { root: HTMLElement }) {
      this.root.dispatchEvent(new CustomEvent("nq-ai-regenerate", { bubbles: true }));
    },
  }));

  Alpine.data("nqAiFeedback", (initial: string | null = null) => ({
    value: initial,
    root: null as unknown as HTMLElement,
    init(this: Magics & { root: HTMLElement }) {
      this.root = this.$el;
    },
    pressed(this: { value: string | null }, v: string | undefined) {
      return this.value === v ? "true" : "false";
    },
    rate(this: { value: string | null; root: HTMLElement }, v: string | undefined) {
      if (!v) return;
      this.value = v;
      this.root.dispatchEvent(new CustomEvent("nq-ai-feedback", { bubbles: true, detail: { value: v } }));
    },
  }));

  Alpine.data("nqAiSummary", (cfg: { tldr: string; points: string[]; full: string; expanded: boolean; show: string; hide: string }) => ({
    tldr: cfg.tldr,
    points: cfg.points,
    full: cfg.full,
    expanded: cfg.expanded,
    show: cfg.show,
    hide: cfg.hide,
    text(this: { tldr: string; points: string[]; full: string; expanded: boolean }): string {
      return summaryToText({ tldr: this.tldr, points: this.points, full: this.full }, { includeFull: this.expanded });
    },
  }));
};

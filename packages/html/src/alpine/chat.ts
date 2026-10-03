// nqChatThread / nqChatComposer: the behaviour of the React ChatThread and ChatComposer.
//
//   <div data-slot="chat-thread" x-data="nqChatThread">
//     <div x-ref="scroller" x-on:scroll="onScroll()" role="log">  <div x-ref="content">…messages…</div> </div>
//     <button x-show="away" x-on:click="jump()">
//   </div>
//
//   <div data-slot="chat-composer" x-data="nqChatComposer('', { streaming, stoppable, disabled, maxRows })" x-modelable="text"
//        x-on:nq-chat-streaming="streaming = $event.detail.streaming">
//     <textarea x-ref="field" x-model="text" x-on:keydown="key($event)"> … <button x-on:click="send()" x-bind:disabled="! canSend()">
//   </div>
//
// The thread follows new content (also a message that grows while streaming) while the reader is at the bottom. The composer
// sends on Enter (not Shift+Enter, not during IME composition), grows with its text up to maxRows and fires nq-send / nq-stop.

import type { Magics, Register } from "./types";

/** How close to the end, in px, still counts as "at the bottom". */
const STICK_THRESHOLD = 48;

interface ThreadState extends Magics {
  away: boolean;
  stuck: boolean;
  observer: ResizeObserver | null;
  toBottom(smooth?: boolean): void;
  onScroll(): void;
  jump(): void;
}

interface ComposerOptions {
  streaming?: boolean;
  stoppable?: boolean;
  disabled?: boolean;
  maxRows?: number;
}

interface ComposerState extends Magics {
  text: string;
  streaming: boolean;
  stoppable: boolean;
  disabled: boolean;
  maxRows: number;
  root: HTMLElement;
  canSend(): boolean;
  stopping(): boolean;
  send(): void;
  stop(): void;
  key(e: KeyboardEvent): void;
  resize(): void;
}

export const chat: Register = (Alpine) => {
  Alpine.data("nqChatThread", () => ({
    away: false,
    stuck: true,
    observer: null as ResizeObserver | null,

    init(this: ThreadState) {
      this.$nextTick(() => {
        this.toBottom();
        const inner = this.$refs.content;
        if (inner && typeof ResizeObserver !== "undefined") {
          this.observer = new ResizeObserver(() => {
            if (this.stuck) this.toBottom();
          });
          this.observer.observe(inner);
        }
      });
    },

    destroy(this: ThreadState) {
      this.observer?.disconnect();
    },

    toBottom(this: ThreadState, smooth = false) {
      const el = this.$refs.scroller;
      if (!el) return;
      if (typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "instant" });
      else el.scrollTop = el.scrollHeight;
    },

    onScroll(this: ThreadState) {
      const el = this.$refs.scroller;
      if (!el) return;
      const near = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_THRESHOLD;
      this.stuck = near;
      this.away = !near;
    },

    jump(this: ThreadState) {
      this.stuck = true;
      this.toBottom(true);
    },
  }));

  Alpine.data("nqChatComposer", (initial = "", options: ComposerOptions = {}) => ({
    text: initial,
    streaming: options.streaming ?? false,
    stoppable: options.stoppable ?? false,
    disabled: options.disabled ?? false,
    maxRows: options.maxRows ?? 8,
    root: null as unknown as HTMLElement,

    init(this: ComposerState) {
      // $el inside a handler is the element that fired the event, so keep the root.
      this.root = this.$el;
      this.$watch("text", () => this.$nextTick(() => this.resize()));
      this.$nextTick(() => this.resize());
    },

    canSend(this: ComposerState) {
      return !this.disabled && !this.streaming && this.text.trim().length > 0;
    },

    stopping(this: ComposerState) {
      return this.streaming && this.stoppable;
    },

    send(this: ComposerState) {
      if (!this.canSend()) return;
      const text = this.text.trim();
      this.text = "";
      this.root.dispatchEvent(new CustomEvent("nq-send", { detail: { text }, bubbles: true }));
    },

    stop(this: ComposerState) {
      this.root.dispatchEvent(new CustomEvent("nq-stop", { bubbles: true }));
    },

    key(this: ComposerState, e: KeyboardEvent) {
      if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      this.send();
    },

    /** Autosize: reset, then grow to the content, capped at maxRows lines. */
    resize(this: ComposerState) {
      const el = this.$refs.field as HTMLTextAreaElement | undefined;
      if (!el) return;
      el.style.height = "auto";
      const style = getComputedStyle(el);
      const line = Number.parseFloat(style.lineHeight) || 20;
      const chrome = el.offsetHeight - el.clientHeight;
      const max = line * this.maxRows + (Number.parseFloat(style.paddingBlock || "0") || 0) * 2;
      el.style.height = `${Math.min(el.scrollHeight + chrome, max)}px`;
      el.style.overflowY = el.scrollHeight + chrome > max ? "auto" : "hidden";
    },
  }));
};

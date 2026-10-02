// nqCopilotProvider: the state of an assistant conversation. The markup is the Blade component copilot-provider (it renders only its slot) and copilot-provider.launcher.
//
//   <div x-data="nqCopilotProvider(config)" x-modelable="isOpen" x-on:nq-copilot-open.window="open($event.detail)" ...>slot</div>
//
// config: open, greeting, messages, words { open, close }. isOpen is x-modelable. The provider owns open, messages, draft, streaming and sessionId, and the scope is inherited by everything inside it.
//
// There is no transport here (the server owns the backend). Sending dispatches nq-copilot-send; your handler streams the answer by calling push() with events:
//   <div x-on:nq-copilot-send="stream($event.detail)">
//   async function stream({ push, signal, text, history, sessionId, data }) { ...; push({ type: "delta", text }); ...; push({ type: "done" }); }
// Events: nq-copilot-change { open }, nq-copilot-send { text, meta, data, history, sessionId, answerId, signal, push }, nq-copilot-stop, nq-copilot-new, nq-copilot-feedback { message, value }.
// Global requests: window events nq-copilot-open { message, autoSend, context }, nq-copilot-close and nq-copilot-toggle.
// Limit: the Blade copilot chat is rendered on the server, so live messages are for your own x-for or for a Livewire round trip, not painted by the provider itself.

import { finishAnswer, reduceStream, retryPoint, startAnswer, type CopilotEvent, type CopilotMessage, type StreamState } from "./copilot-provider-logic";
import type { Register } from "./types";

interface OpenOptions {
  message?: string;
  autoSend?: boolean;
  context?: { id: string }[];
}
interface Config {
  open?: boolean;
  greeting?: string | null;
  messages?: CopilotMessage[];
  words?: { open: string; close: string };
}

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const copilotProvider: Register = (Alpine) => {
  Alpine.data("nqCopilotProvider", (config: Config = {}) => {
    let root: HTMLElement;
    let ctrl: AbortController | null = null;
    let state: StreamState | null = null;
    const greet = (): CopilotMessage[] => (config.greeting ? [{ id: uid("greeting"), role: "assistant", text: config.greeting }] : []);
    type Self = {
      isOpen: boolean;
      messages: CopilotMessage[];
      draft: string;
      context: { id: string }[];
      sessionId: string | null;
      streaming: boolean;
      sync(): void;
      setOpen(open: boolean): void;
      run(history: CopilotMessage[], user: CopilotMessage, meta: Record<string, unknown>, data?: unknown): void;
      send(text: string, meta?: Record<string, unknown>, options?: { hidden?: boolean; data?: unknown }): void;
      stop(): void;
    };
    return {
      isOpen: !!config.open,
      messages: (config.messages ?? greet()) as CopilotMessage[],
      draft: "",
      context: [] as { id: string }[],
      sessionId: null as string | null,
      streaming: false,
      words: config.words ?? { open: "Open assistant", close: "Close assistant" },
      init(this: { $el: HTMLElement }) {
        root = this.$el;
      },
      destroy() {
        ctrl?.abort();
      },
      emit(name: string, detail?: unknown) {
        root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
      },
      setOpen(this: Self & { emit(n: string, d?: unknown): void }, open: boolean) {
        if (this.isOpen === open) return;
        this.isOpen = open;
        this.emit("nq-copilot-change", { open });
      },
      open(this: Self, options: OpenOptions | undefined = {}) {
        const o = options && typeof options === "object" ? options : {};
        this.setOpen(true);
        if (o.context?.length) this.context = [...this.context, ...o.context.filter((c) => !this.context.some((p) => p.id === c.id))];
        if (o.message === undefined) return;
        if (o.autoSend) this.send(o.message);
        else this.draft = o.message;
      },
      close(this: Self) {
        this.setOpen(false);
      },
      toggle(this: Self) {
        this.setOpen(!this.isOpen);
      },
      launch(this: Self & { open(o?: OpenOptions): void; close(): void }, options?: OpenOptions) {
        if (this.isOpen) this.close();
        else this.open(options);
      },
      send(this: Self, text: string, meta: Record<string, unknown> = {}, options: { hidden?: boolean; data?: unknown } = {}) {
        const user: CopilotMessage = { id: uid("user"), role: "user", text, at: Date.now(), ...(options.hidden ? { hidden: true } : {}) };
        this.draft = "";
        this.run(this.messages, user, meta, options.data);
      },
      run(this: Self & { emit(n: string, d?: unknown): void }, history: CopilotMessage[], user: CopilotMessage, meta: Record<string, unknown>, data?: unknown) {
        ctrl?.abort();
        const abort = new AbortController();
        ctrl = abort;
        state = startAnswer(uid("answer"));
        const answerId = state.message.id;
        this.messages = [...history, user, state.message];
        this.streaming = true;
        const push = (event: CopilotEvent) => {
          if (abort.signal.aborted || !state) return;
          if (event.type === "session") {
            this.sessionId = event.id;
            return;
          }
          state = reduceStream(state, event);
          const m = state.message;
          this.messages = this.messages.map((x) => (x.id === answerId ? m : x));
          if (event.type === "done" || event.type === "error") {
            this.streaming = false;
            if (ctrl === abort) ctrl = null;
          }
        };
        this.emit("nq-copilot-send", { text: user.text, meta, data, history, sessionId: this.sessionId, answerId, signal: abort.signal, push });
      },
      stop(this: Self & { emit(n: string, d?: unknown): void }) {
        if (!ctrl) return;
        ctrl.abort();
        ctrl = null;
        if (state) {
          state = finishAnswer(state);
          const m = state.message;
          this.messages = this.messages.map((x) => (x.id === m.id ? m : x));
        }
        this.streaming = false;
        this.emit("nq-copilot-stop");
      },
      /** Feeds one event into the answer that is streaming (for handlers that did not get the push of nq-copilot-send). */
      push(this: Self, event: CopilotEvent) {
        if (!state || !ctrl) return;
        const answerId = state.message.id;
        state = reduceStream(state, event);
        const m = state.message;
        this.messages = this.messages.map((x) => (x.id === answerId ? m : x));
        if (event.type === "done" || event.type === "error") {
          this.streaming = false;
          ctrl = null;
        }
      },
      retry(this: Self, answerId?: string) {
        const point = retryPoint(this.messages, answerId);
        if (point) this.run(point.history, point.user, {});
      },
      newChat(this: Self & { emit(n: string, d?: unknown): void }) {
        ctrl?.abort();
        ctrl = null;
        state = null;
        this.messages = greet();
        this.sessionId = null;
        this.draft = "";
        this.streaming = false;
        this.emit("nq-copilot-new");
      },
      feedback(this: Self & { emit(n: string, d?: unknown): void }, id: string, value: "up" | "down") {
        const target = this.messages.find((m) => m.id === id);
        if (!target) return;
        const next = target.feedback === value ? null : value;
        this.messages = this.messages.map((m) => (m.id === id ? { ...m, feedback: next } : m));
        if (next) this.emit("nq-copilot-feedback", { message: target, value: next });
      },
    };
  });
};

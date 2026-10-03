// nqChatWidget: the behaviour of the React ChatWidget (the floating customer chat). The server renders the launcher, the panel, the
// greeting and the messages it knows; this adds the open state, the visitor's draft, attached files, the optimistic "outbox" of just-sent
// messages, the quick questions and the offline leave-a-message form.
//
//   <div data-slot="chat-widget" x-data="nqChatWidget({ open: false, maxFileMb: 5, visitor: 0, labels: {...} })" x-modelable="open">
//     <section x-show="open"> … <x-nq::chat.composer x-model="draft" x-on:nq-send.stop="submit($event.detail.text)"> … </section>
//     <button x-ref="launcher" x-on:click="toggle()">
//
// Events, all bubbling from the widget root. Each carries detail.waitUntil(promise): resolve it with `{ error: "message" }` to keep the
// visitor's text and show the message; with no listener (or any other value) the send counts as done.
//   nq-send           { text, files, waitUntil }        the visitor sent a message or tapped a quick question
//   nq-retry          { id }                            Retry on a failed message (the server-rendered message carries data-id)
//   nq-offline-submit { name, email, message, waitUntil }
//   nq-open-change    { open }
// x-model works on the open state (x-modelable). Escape closes the panel and gives focus back to the launcher.

import { chatWidgetErrorOf, chatWidgetFill, chatWidgetOfflineErrors, chatWidgetSplitFiles, type ChatWidgetOfflineForm } from "./chat-widget-logic";
import type { Magics, Register } from "./types";

interface Labels {
  launcher: string;
  close: string;
  sendFailed: string;
  /** "{name} is larger than {mb} MB" */
  fileTooBig: string;
  /** "Remove {name}" */
  removeFile: string;
  formRequired: string;
  formInvalidEmail: string;
}

interface Options {
  open?: boolean;
  maxFileMb?: number;
  /** How many visitor messages the server already rendered; the quick questions hide once there is one. */
  visitor?: number;
  labels?: Partial<Labels>;
}

interface Outgoing {
  id: string;
  text: string;
  files: string[];
  status: "sending" | "sent";
}

interface State extends Magics {
  host: HTMLElement;
  open: boolean;
  maxFileMb: number;
  visitor: number;
  labels: Labels;
  draft: string;
  files: File[];
  error: string;
  outbox: Outgoing[];
  seq: number;
  form: ChatWidgetOfflineForm;
  touched: boolean;
  nameBad: boolean;
  emailBad: boolean;
  messageBad: boolean;
  busy: boolean;
  sent: boolean;
  offlineError: string;
  setOpen(next: boolean): void;
  emit(event: string, detail?: Record<string, unknown>): unknown[];
  validate(): boolean;
}

const DEFAULTS: Labels = {
  launcher: "Open chat",
  close: "Close chat",
  sendFailed: "Could not send. Try again.",
  fileTooBig: "{name} is larger than {mb} MB",
  removeFile: "Remove {name}",
  formRequired: "Required",
  formInvalidEmail: "Enter a valid email address",
};

export const chatWidget: Register = (Alpine) => {
  Alpine.data("nqChatWidget", (options: Options = {}) => ({
    host: null as unknown as HTMLElement,
    open: options.open ?? false,
    maxFileMb: options.maxFileMb ?? 5,
    visitor: options.visitor ?? 0,
    labels: { ...DEFAULTS, ...options.labels } as Labels,
    draft: "",
    files: [] as File[],
    error: "",
    outbox: [] as Outgoing[],
    seq: 0,
    form: { name: "", email: "", message: "" } as ChatWidgetOfflineForm,
    touched: false,
    nameBad: false,
    emailBad: false,
    messageBad: false,
    busy: false,
    sent: false,
    offlineError: "",

    init(this: State) {
      // $el inside a handler is the element that fired the event, so keep the root. It is named `host`: the composer inside has its own `root`, and nested scopes merge by name.
      this.host = this.$el;
    },

    launcherLabel(this: State): string {
      return this.open ? this.labels.close : this.labels.launcher;
    },

    /** Dispatches a bubbling event from the root with a waitUntil collector; returns the collected promises. */
    emit(this: State, event: string, detail: Record<string, unknown> = {}): unknown[] {
      const waits: unknown[] = [];
      this.host.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
      return waits;
    },

    setOpen(this: State, next: boolean) {
      if (next === this.open) return;
      const was = this.open;
      this.open = next;
      this.emit("nq-open-change", { open: next });
      if (was && !next) this.$nextTick(() => this.$refs.launcher?.focus());
    },

    toggle(this: State) {
      this.setOpen(!this.open);
    },

    close(this: State) {
      this.setOpen(false);
    },

    onKey(this: State, e: KeyboardEvent) {
      if (e.key === "Escape" && this.open && !e.defaultPrevented) this.setOpen(false);
    },

    /** The quick questions show until the visitor has written something. */
    hasVisitor(this: State): boolean {
      return this.visitor > 0 || this.outbox.length > 0;
    },

    pick(this: State) {
      this.host.querySelector<HTMLInputElement>('input[type="file"]')?.click();
    },

    addFiles(this: State, e: Event) {
      const input = e.target as HTMLInputElement;
      const { ok, tooBig } = chatWidgetSplitFiles(Array.from(input.files ?? []), this.maxFileMb);
      for (const f of tooBig) this.error = chatWidgetFill(this.labels.fileTooBig, { name: f.name, mb: String(this.maxFileMb) });
      if (ok.length) this.files = [...this.files, ...ok];
      input.value = "";
    },

    removeFile(this: State, index: number) {
      this.files = this.files.filter((_, i) => i !== index);
    },

    removeLabel(this: State, name: string): string {
      return chatWidgetFill(this.labels.removeFile, { name });
    },

    /** Sends the visitor's text (and attached files) to the host. The message shows at once and stays unless the host refuses it. */
    async submit(this: State, text: string) {
      const body = text.trim();
      if (!body) return;
      const attached = this.files;
      this.error = "";
      this.files = [];
      const item: Outgoing = { id: `out-${++this.seq}`, text: body, files: attached.map((f) => f.name), status: "sending" };
      this.outbox = [...this.outbox, item];
      try {
        const failure = chatWidgetErrorOf(await Promise.all(this.emit("nq-send", { text: body, files: attached })));
        if (failure) throw new Error(failure);
        this.outbox = this.outbox.map((o) => (o.id === item.id ? { ...o, status: "sent" as const } : o));
      } catch (e) {
        this.outbox = this.outbox.filter((o) => o.id !== item.id);
        this.error = e instanceof Error && e.message ? e.message : this.labels.sendFailed;
        this.draft = body;
        this.files = attached;
      }
    },

    /** Retry on a server-rendered failed message: the host re-sends the message with this id. */
    retry(this: State, e: Event) {
      const id = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-id]")?.dataset.id ?? "";
      this.emit("nq-retry", { id });
    },

    validate(this: State): boolean {
      const errors = chatWidgetOfflineErrors(this.form, this.labels);
      this.nameBad = !!errors.name;
      this.emailBad = !!errors.email;
      this.messageBad = !!errors.message;
      return !(errors.name || errors.email || errors.message);
    },

    /** The error text under the email field (required or malformed). */
    emailError(this: State): string {
      return chatWidgetOfflineErrors(this.form, this.labels).email;
    },

    /** Re-checks as the visitor types, once they have tried to send. */
    touch(this: State) {
      if (this.touched) this.validate();
    },

    async submitOffline(this: State) {
      this.touched = true;
      if (!this.validate() || this.busy) return;
      this.busy = true;
      this.offlineError = "";
      try {
        const detail = { name: this.form.name.trim(), email: this.form.email.trim(), message: this.form.message.trim() };
        const failure = chatWidgetErrorOf(await Promise.all(this.emit("nq-offline-submit", detail)));
        if (failure) this.offlineError = failure;
        else this.sent = true;
      } catch {
        this.offlineError = this.labels.sendFailed;
      } finally {
        this.busy = false;
      }
    },

    again(this: State) {
      this.form = { name: "", email: "", message: "" };
      this.touched = false;
      this.nameBad = this.emailBad = this.messageBad = false;
      this.sent = false;
    },
  }));
};

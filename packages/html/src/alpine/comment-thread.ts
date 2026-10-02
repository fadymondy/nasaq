// nqCommentThread: the behaviour of the React CommentThread. The comments themselves are rendered by the server; this adds the
// reply composer, inline edit, delete confirmation, approve and the main composer, and tells the host through events.
//
//   <section data-slot="comment-thread" x-data="nqCommentThread({ bodies: { c1: "…" }, labels: { failed: "…" } })">
//     … <x-nq::mention-textarea x-model="drafts.main"> … <form x-on:submit.prevent="submit('main')">
//
// Every action fires an event on the root with detail `{ …, wait(promise) }`; resolve the promise, or resolve `{ error }` to keep
// the text and show the message (a rejected promise shows a generic error). Without a listener the action fails with that message.
//   nq-comment-submit   { body, mentions: [{ id, name }], parentId?, wait }
//   nq-comment-edit     { id, body, mentions, wait }
//   nq-comment-delete   { id, wait }
//   nq-comment-approve  { id, wait }
//   nq-comment-signin   {}

import type { Magics, Register } from "./types";

type Kind = "main" | "reply" | "edit";
type Outcome = void | { error?: string } | undefined;
interface Mention {
  id: string;
  name: string;
}

interface Config {
  /** Each comment's Markdown source, by id: the starting text of an edit. */
  bodies?: Record<string, string>;
  labels?: { failed?: string };
}

interface ThreadState extends Magics {
  config: Config;
  root: HTMLElement;
  alive: boolean;
  replyTo: string | null;
  editId: string | null;
  confirmId: string | null;
  drafts: Record<Kind, string>;
  mentions: Record<Kind, Mention[]>;
  busy: string;
  err: Record<string, string | null>;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(key: string, name: string, detail: Record<string, unknown>): Promise<boolean>;
  empty(kind: Kind): boolean;
  submit(kind: Kind, id?: string): Promise<void>;
}

const strip = (list: Mention[]) => list.map(({ id, name }) => ({ id, name }));

export const commentThread: Register = (Alpine) => {
  Alpine.data("nqCommentThread", (config: Config = {}) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    replyTo: null as string | null,
    editId: null as string | null,
    confirmId: null as string | null,
    drafts: { main: "", reply: "", edit: "" } as Record<Kind, string>,
    mentions: { main: [], reply: [], edit: [] } as Record<Kind, Mention[]>,
    busy: "",
    err: {} as Record<string, string | null>,

    init(this: ThreadState) {
      // $el inside a handler is the element that fired the event, so keep the root.
      this.root = this.$el;
    },
    destroy(this: ThreadState) {
      this.alive = false;
    },

    /** True while the draft of this composer is blank (the send button is disabled). */
    empty(this: ThreadState, kind: Kind) {
      return this.drafts[kind].trim() === "";
    },

    startReply(this: ThreadState, id: string) {
      this.editId = null;
      this.confirmId = null;
      this.replyTo = id;
      this.drafts.reply = "";
      this.mentions.reply = [];
      this.err.reply = null;
      this.$nextTick(() => this.root.querySelector<HTMLTextAreaElement>(`[data-composer="reply"][data-for="${CSS.escape(id)}"] textarea`)?.focus());
    },
    cancelReply(this: ThreadState) {
      this.replyTo = null;
    },
    startEdit(this: ThreadState, id: string) {
      this.replyTo = null;
      this.confirmId = null;
      this.editId = id;
      this.drafts.edit = this.config.bodies?.[id] ?? "";
      this.mentions.edit = [];
      this.err.edit = null;
      this.$nextTick(() => this.root.querySelector<HTMLTextAreaElement>(`[data-composer="edit"][data-for="${CSS.escape(id)}"] textarea`)?.focus());
    },
    cancelEdit(this: ThreadState) {
      this.editId = null;
    },
    askDelete(this: ThreadState, id: string) {
      this.confirmId = id;
      this.err[`c:${id}`] = null;
    },
    cancelDelete(this: ThreadState) {
      this.confirmId = null;
    },

    /** Ctrl or Cmd + Enter sends from a composer. */
    key(this: ThreadState, e: KeyboardEvent, kind: Kind, id?: string) {
      if (!((e.ctrlKey || e.metaKey) && e.key === "Enter")) return;
      e.preventDefault();
      void this.submit(kind, id);
    },

    async submit(this: ThreadState, kind: Kind, id?: string) {
      if (this.busy || this.empty(kind)) return;
      const body = this.drafts[kind].trim();
      const mentions = strip(this.mentions[kind]);
      this.err[kind] = null;
      const ok =
        kind === "edit"
          ? await this.run("edit", "nq-comment-edit", { id: this.editId, body, mentions })
          : await this.run(kind, "nq-comment-submit", { body, mentions, ...(kind === "reply" ? { parentId: id ?? this.replyTo } : {}) });
      if (!ok || !this.alive) return;
      if (kind === "edit") this.editId = null;
      else if (kind === "reply") this.replyTo = null;
      else {
        this.drafts.main = "";
        this.mentions.main = [];
      }
    },
    async remove(this: ThreadState, id: string) {
      if (await this.run(`c:${id}`, "nq-comment-delete", { id })) this.confirmId = null;
    },
    async approve(this: ThreadState, id: string) {
      await this.run(`c:${id}`, "nq-comment-approve", { id });
    },
    /** Mention chips are not links: do not follow them. */
    mentionClick(e: Event) {
      if ((e.target as HTMLElement).closest?.("a[href^='#mention-']")) e.preventDefault();
    },
    signIn(this: ThreadState) {
      this.root.dispatchEvent(new CustomEvent("nq-comment-signin", { bubbles: true }));
    },

    async ask(this: ThreadState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      this.root.dispatchEvent(
        new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }),
      );
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** Run an action; true on success. Errors land in err[key]. */
    async run(this: ThreadState, key: string, name: string, detail: Record<string, unknown>) {
      this.busy = key;
      this.err[key] = null;
      let ok = false;
      try {
        const result = await this.ask(name, detail);
        if (!this.alive) return false;
        if (result && "error" in result && result.error) this.err[key] = result.error;
        else ok = true;
      } catch {
        if (this.alive) this.err[key] = this.config.labels?.failed ?? "That did not work. Try again.";
      } finally {
        if (this.alive) this.busy = "";
      }
      return ok;
    },
  }));
};

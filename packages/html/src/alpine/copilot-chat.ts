// nqCopilotChat: the behaviour of the React CopilotChat. The server renders the header, the messages and what belongs to them (steps,
// sources, artifacts, the action buttons); this adds the composer: the draft and @mentions, "/" commands, context chips, attached files,
// toggles, the model, drag and drop, the history popover and add-context menu (the shared popover and dropdown-menu), and an outbox that shows the person's message at once.
//
//   <section data-slot="copilot-chat" x-data="nqCopilotChat({ commands, context, contextOptions, toggles, model, feedback, busy, transcript, words })">
//
// Names are chosen so they never clash with the scopes inside (mention-textarea owns text, mentions, caret, dismissed, root; select owns
// value, open, labels, query; chat owns away): nested x-data scopes merge by name.
//
// Events, all bubbling from the root. The ones that can fail carry detail.waitUntil(promise); resolve { error: "message" } to keep the text.
//   nq-send            { text, mentions, context, model, attachments, commands, toggles, waitUntil }
//   nq-stop            {}                          nq-new-chat {}              nq-close {}
//   nq-regenerate      { id }                      nq-feedback { id, value: up | down }
//   nq-context-change  { items }                   nq-model-change { id }      nq-toggles-change { ids }
//   nq-attach          { files, waitUntil }        nq-attachments-change { items }
//   nq-session-select  { id }                      nq-session-delete { id }

import {
  copilotAttachmentOf,
  copilotAvailableContext,
  copilotErrorOf,
  copilotFill,
  copilotFilterCommands,
  copilotFormatBytes,
  copilotIsPreviewUrl,
  copilotSlashQuery,
  copilotWithoutSlash,
  type CopilotAttachment,
  type CopilotCommand,
  type CopilotContextItem,
} from "./copilot-chat-logic";
import type { Magics, Register } from "./types";

interface Words {
  commands: string;
  noCommands: string;
  removeContext: string;
  removeCommand: string;
  removeAttachment: string;
  copied: string;
  copy: string;
  copyChat: string;
  sendFailed: string;
  locale: string;
}

interface Options {
  commands?: CopilotCommand[];
  context?: CopilotContextItem[];
  contextOptions?: CopilotContextItem[];
  /** Ids of the toggles that start on. */
  toggles?: string[];
  model?: string | null;
  /** Feedback already given: { messageId: "up" | "down" }. */
  feedback?: Record<string, "up" | "down">;
  /** The last answer is still streaming: Send is off. */
  busy?: boolean;
  /** A Stop button replaces Send while busy. */
  stoppable?: boolean;
  /** How many messages the server rendered. */
  count?: number;
  /** The whole conversation as Markdown, for the copy button of the header. */
  transcript?: string;
  words?: Partial<Words>;
}

interface Outgoing {
  id: string;
  text: string;
  files: CopilotAttachment[];
}

interface Found {
  id: string;
  name: string;
  start: number;
  end: number;
}

const WORDS: Words = {
  commands: "Tools and skills",
  noCommands: "No matching tools",
  removeContext: "Remove {name}",
  removeCommand: "Stop using {name}",
  removeAttachment: "Remove {name}",
  copied: "Copied",
  copy: "Copy answer",
  copyChat: "Copy conversation",
  sendFailed: "Could not send. Try again.",
  locale: "en",
};

interface State extends Magics {
  host: HTMLElement;
  draft: string;
  found: Found[];
  cursor: number;
  ctx: CopilotContextItem[];
  ctxOptions: CopilotContextItem[];
  cmds: CopilotCommand[];
  chosen: string[];
  toggleOn: string[];
  modelId: string | null;
  fb: Record<string, "up" | "down">;
  busy: boolean;
  stoppable: boolean;
  count: number;
  files: CopilotAttachment[];
  rawFiles: Map<string, File>;
  outbox: Outgoing[];
  slashIndex: number;
  slashDismissed: number | null;
  dragging: boolean;
  copiedKey: string;
  error: string;
  transcript: string;
  words: Words;
  seq: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  emit(event: string, detail?: Record<string, unknown>): unknown[];
  matches(): CopilotCommand[];
  slashQuery(): { query: string; start: number } | null;
  activeIndex(): number;
  choose(c: CopilotCommand): void;
  available(): CopilotContextItem[];
  uploading(): boolean;
  copyText(key: string, text: string): Promise<void>;
  slashOpen(): boolean;
  send(): Promise<void>;
  take(files: File[]): void;
}

export const copilotChat: Register = (Alpine) => {
  Alpine.data("nqCopilotChat", (options: Options = {}) => ({
    host: null as unknown as HTMLElement,
    draft: "",
    found: [] as Found[],
    cursor: 0,
    ctx: [...(options.context ?? [])] as CopilotContextItem[],
    ctxOptions: options.contextOptions ?? [],
    cmds: options.commands ?? [],
    chosen: [] as string[],
    toggleOn: [...(options.toggles ?? [])],
    modelId: options.model ?? null,
    fb: { ...(options.feedback ?? {}) } as Record<string, "up" | "down">,
    busy: options.busy ?? false,
    stoppable: options.stoppable ?? false,
    count: options.count ?? 0,
    files: [] as CopilotAttachment[],
    rawFiles: new Map<string, File>(),
    outbox: [] as Outgoing[],
    slashIndex: 0,
    slashDismissed: null as number | null,
    dragging: false,
    copiedKey: "",
    error: "",
    transcript: options.transcript ?? "",
    words: { ...WORDS, ...options.words } as Words,
    seq: 0,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,

    init(this: State) {
      // Stored: $el inside a handler is the element that fired it, and nested scopes merge by name, so it is called `host`.
      this.host = this.$el;
      this.$watch("modelId", (id: string | null) => {
        if (id) this.emit("nq-model-change", { id });
      });
    },

    emit(this: State, event: string, detail: Record<string, unknown> = {}): unknown[] {
      const waits: unknown[] = [];
      this.host.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
      return waits;
    },

    started(this: State): boolean {
      return this.outbox.length > 0;
    },
    /** The thread shows once there is a message, from the server or just sent. */
    threadShown(this: State): boolean {
      return this.count > 0 || this.outbox.length > 0;
    },
    sendShown(this: State): boolean {
      return !(this.stoppable && this.busy);
    },
    canShare(): boolean {
      return typeof navigator !== "undefined" && typeof navigator.share === "function";
    },
    shareAnswer(this: State, el: HTMLElement) {
      void navigator.share({ text: el.dataset.copy ?? "" }).catch(() => undefined);
    },

    // Mentions found in the draft (bubbled by the mention textarea).
    setFound(this: State, e: CustomEvent<{ mentions: Found[] }>) {
      this.found = e.detail?.mentions ?? [];
    },

    // "/" commands.
    slashQuery(this: State) {
      return this.cmds.length ? copilotSlashQuery(this.draft, Math.min(this.cursor, this.draft.length)) : null;
    },
    slashOpen(this: State): boolean {
      const s = this.slashQuery();
      return !!s && this.slashDismissed !== s.start;
    },
    matches(this: State): CopilotCommand[] {
      const s = this.slashQuery();
      return this.slashOpen() && s ? copilotFilterCommands(this.cmds, s.query, this.chosen) : [];
    },
    activeIndex(this: State): number {
      const n = this.matches().length;
      return n ? Math.min(this.slashIndex, n - 1) : -1;
    },
    announce(this: State): string {
      if (!this.slashOpen()) return "";
      const hit = this.matches()[this.activeIndex()];
      return `${this.words.commands}: ${this.matches().length}${hit ? `. ${hit.label}` : ""}`;
    },
    chosenCommands(this: State): CopilotCommand[] {
      return this.chosen.map((id) => this.cmds.find((c) => c.id === id)).filter((c): c is CopilotCommand => !!c);
    },
    choose(this: State, c: CopilotCommand) {
      this.chosen = [...this.chosen, c.id];
      this.draft = copilotWithoutSlash(this.draft, Math.min(this.cursor, this.draft.length));
      this.slashIndex = 0;
      this.$nextTick(() => this.host.querySelector<HTMLTextAreaElement>("textarea")?.focus());
    },
    unchoose(this: State, id: string) {
      this.chosen = this.chosen.filter((x) => x !== id);
    },
    removeCommandLabel(this: State, c: CopilotCommand): string {
      return copilotFill(this.words.removeCommand, { name: c.label });
    },

    onCaret(this: State, e: Event) {
      this.cursor = (e.target as HTMLTextAreaElement).selectionStart;
    },

    onKey(this: State, e: KeyboardEvent) {
      if (this.slashOpen() && !e.isComposing) {
        const n = this.matches().length;
        const at = this.activeIndex();
        if (e.key === "ArrowDown" && n) {
          e.preventDefault();
          this.slashIndex = (at + 1) % n;
          return;
        }
        if (e.key === "ArrowUp" && n) {
          e.preventDefault();
          this.slashIndex = (at - 1 + n) % n;
          return;
        }
        if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && this.matches()[at]) {
          e.preventDefault();
          this.choose(this.matches()[at] as CopilotCommand);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          this.slashDismissed = this.slashQuery()?.start ?? null;
          return;
        }
      }
      // The mention list owns Enter while it is open (the textarea reports aria-expanded).
      if ((e.target as HTMLElement).getAttribute("aria-expanded") === "true") return;
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !e.defaultPrevented) {
        e.preventDefault();
        void this.send();
      }
    },

    // Context chips.
    available(this: State): CopilotContextItem[] {
      return copilotAvailableContext(this.ctxOptions, this.ctx);
    },
    showContext(this: State): boolean {
      return this.ctx.length > 0 || this.available().length > 0;
    },
    removeContextLabel(this: State, i: CopilotContextItem): string {
      return copilotFill(this.words.removeContext, { name: i.label });
    },
    dropContext(this: State, id: string) {
      this.ctx = this.ctx.filter((i) => i.id !== id);
      this.emit("nq-context-change", { items: this.ctx });
    },
    addContext(this: State, item: CopilotContextItem) {
      this.ctx = [...this.ctx, item];
      this.emit("nq-context-change", { items: this.ctx });
    },

    // History: the popover (the shared x-nq::popover) closes itself; the add-context menu is the shared x-nq::dropdown-menu.
    pickSession(this: State, id: string) {
      this.emit("nq-session-select", { id });
    },
    dropSession(this: State, id: string) {
      this.emit("nq-session-delete", { id });
    },

    // Toggles and the model.
    isOn(this: State, id: string): string {
      return this.toggleOn.includes(id) ? "true" : "false";
    },
    flip(this: State, id: string) {
      this.toggleOn = this.toggleOn.includes(id) ? this.toggleOn.filter((x) => x !== id) : [...this.toggleOn, id];
      this.emit("nq-toggles-change", { ids: this.toggleOn });
    },

    // Files: the button, paste and drag and drop.
    pick(this: State) {
      this.host.querySelector<HTMLInputElement>('input[type="file"]')?.click();
    },
    onPick(this: State, e: Event) {
      const input = e.target as HTMLInputElement;
      this.take(Array.from(input.files ?? []));
      input.value = "";
    },
    take(this: State, list: File[]) {
      if (!list.length) return;
      const items = list.map((f) => {
        const a = copilotAttachmentOf(f, `att-${++this.seq}`);
        this.rawFiles.set(a.id, f);
        return a;
      });
      this.files = [...this.files, ...items];
      this.emit("nq-attach", { files: list });
      this.emit("nq-attachments-change", { items: this.files });
    },
    removeFile(this: State, id: string) {
      this.rawFiles.delete(id);
      this.files = this.files.filter((f) => f.id !== id);
      this.emit("nq-attachments-change", { items: this.files });
    },
    removeFileLabel(this: State, f: CopilotAttachment): string {
      return copilotFill(this.words.removeAttachment, { name: f.name });
    },
    fileDetail(this: State, f: CopilotAttachment): string {
      if (f.error) return f.error;
      if (f.progress !== undefined && f.progress < 1) return `${Math.round(f.progress * 100)}%`;
      return copilotFormatBytes(f.size, this.words.locale);
    },
    isImage(this: State, f: CopilotAttachment): boolean {
      return !!f.type?.startsWith("image/") && copilotIsPreviewUrl(f.url);
    },
    uploading(this: State): boolean {
      return this.files.some((f) => f.progress !== undefined && f.progress < 1 && !f.error);
    },
    onDragOver(this: State, e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      this.dragging = true;
    },
    onDragLeave(this: State, e: DragEvent) {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) this.dragging = false;
    },
    onDrop(this: State, e: DragEvent) {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      this.dragging = false;
      this.take(Array.from(e.dataTransfer.files));
    },
    onPaste(this: State, e: ClipboardEvent) {
      if (!e.clipboardData || e.clipboardData.files.length === 0) return;
      if (!e.clipboardData.getData("text/plain")) e.preventDefault();
      this.take(Array.from(e.clipboardData.files));
    },

    canSend(this: State): boolean {
      return !this.busy && !this.uploading() && (this.draft.trim() !== "" || this.files.length > 0);
    },

    /** Sends the draft (or a starter or follow-up). The message shows at once and stays unless the host refuses it. */
    async send(this: State, text?: string) {
      const typed = text === undefined;
      const body = (typed ? this.draft : text).trim();
      const attached = typed ? this.files : [];
      if ((!body && attached.length === 0) || this.busy || (typed && this.uploading())) return;
      const detail = {
        text: body,
        mentions: typed ? this.found : [],
        context: [...this.ctx],
        model: this.modelId,
        attachments: attached.map((a) => this.rawFiles.get(a.id) ?? a),
        commands: typed ? [...this.chosen] : [],
        toggles: [...this.toggleOn],
      };
      const keep = { draft: this.draft, found: this.found, chosen: this.chosen, files: this.files };
      const item: Outgoing = { id: `out-${++this.seq}`, text: body, files: attached };
      this.error = "";
      if (typed) {
        this.draft = "";
        this.found = [];
        this.chosen = [];
        this.files = [];
        this.slashDismissed = null;
        if (attached.length) this.emit("nq-attachments-change", { items: [] });
      }
      this.outbox = [...this.outbox, item];
      try {
        const failure = copilotErrorOf(await Promise.all(this.emit("nq-send", detail)));
        if (failure) throw new Error(failure);
      } catch (e) {
        this.outbox = this.outbox.filter((o) => o.id !== item.id);
        this.error = e instanceof Error && e.message ? e.message : this.words.sendFailed;
        if (typed) {
          this.draft = keep.draft;
          this.found = keep.found;
          this.chosen = keep.chosen;
          this.files = keep.files;
        }
      }
    },

    // Buttons of the server-rendered messages.
    regenerate(this: State, id: string) {
      this.emit("nq-regenerate", { id });
    },
    rate(this: State, id: string, value: "up" | "down") {
      this.fb = { ...this.fb, [id]: value };
      this.emit("nq-feedback", { id, value });
    },
    pressed(this: State, id: string, value: string): string {
      return this.fb[id] === value ? "true" : "false";
    },
    stop(this: State) {
      this.emit("nq-stop");
    },

    // Clipboard.
    async copyText(this: State, key: string, text: string) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return;
      }
      this.copiedKey = key;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => (this.copiedKey = ""), 1500);
    },
    copyAnswer(this: State, el: HTMLElement) {
      void this.copyText(el.dataset.id ?? "", el.dataset.copy ?? "");
    },
    copyAll(this: State) {
      void this.copyText("all", this.transcript);
    },
    isCopied(this: State, key: string): boolean {
      return this.copiedKey === key;
    },
    copyLabel(this: State, key: string, idle: string): string {
      return this.copiedKey === key ? this.words.copied : idle;
    },
  }));
};

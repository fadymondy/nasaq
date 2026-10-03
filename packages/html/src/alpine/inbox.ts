// nqInbox: the behaviour of the React Inbox (chat, email and WhatsApp conversations): the filterable list, the thread with find, the composer, the
// contact panel and new-message toasts. The markup is <x-nq::inbox>; the lists are rendered here from the conversations in the config.
//
//   <div data-slot="inbox" x-data="nqInbox({ conversations: [...], agents: [...], me: 'u1', snippets: [...], t: { ...words }, locale: 'en' })" x-modelable="conversations">
//
// Nothing is stored. Each change fires an event on the root; the page saves it. The UI applies the change at once and puts it back
// when the page answers `{ error }` (or rejects) through detail.wait(promise).
//   nq-inbox-update  { conversationId, patch, wait }   pin, archive, mute, colour, status, assignee, snooze, unread ({ unread: false } when a thread is opened)
//   nq-inbox-send    { draft, wait }                   a reply or note. Without a listener the send fails. After a good save the message is added to the thread.
//   nq-inbox-react   { conversationId, messageId, emoji }
//   nq-inbox-retry   { conversationId, message }
//   nq-inbox-popout  { conversationId }                the pop-out button shows when `popOut` is on
//   nq-inbox-select  { conversationId | null }
// Cuts from the React component: no voice recorder and no location picker (voice notes and locations in a thread still show), plain-text email
// (sent as simple HTML), email HTML bodies show as text.

import { currentLocale } from "../core/locale";
import {
  applySnippet,
  collectMedia,
  countViews,
  fakeWaveform,
  fill,
  filterConversations,
  filterSnippets,
  findMatches,
  formatBytes,
  formatCoords,
  formatDuration,
  hostOf,
  initialsOf,
  lastMessage,
  mapsUrl,
  messageHtml,
  messageText,
  previewOf,
  snoozePresets,
  toTime,
  type CannedSnippet,
  type ConversationPatch,
  type InboxAgent,
  type InboxConversation,
  type InboxMessage,
} from "./inbox-logic";
import type { Magics, Register } from "./types";

type Outcome = void | { error?: string } | undefined;

/** Fires an event whose listener answers with `detail.wait(promise)`. Returns undefined when nobody listens. */
function ask(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<Outcome> | undefined {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  return pending;
}

type Words = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Config {
  conversations: InboxConversation[];
  agents: InboxAgent[];
  me: string;
  snippets?: CannedSnippet[];
  selected?: string | null;
  toasts?: boolean;
  compactBelow?: number;
  contextMenu?: boolean;
  popOut?: boolean;
  loading?: boolean;
  /** The server clock (ms), so relative times match what was rendered. */
  now?: number;
  locale?: string;
  t: Words;
}

interface Toast {
  key: string;
  conversationId: string;
  message: InboxMessage;
}

interface State extends Magics {
  cfg: Config;
  t: Words;
  locale: string;
  conversations: InboxConversation[];
  agents: InboxAgent[];
  selId: string | null;
  searchText: string;
  chan: string;
  scopeSel: string;
  view: string;
  compact: boolean;
  contactOpen: boolean;
  mediaTab: string;
  lightbox: { name: string; url?: string } | null;
  finding: boolean;
  findQuery: string;
  findIndex: number;
  replyTo: InboxMessage | null;
  toastList: Toast[];
  notice: string;
  // composer
  mode: "reply" | "note";
  draftText: string;
  subject: string;
  ccText: string;
  showCc: boolean;
  files: File[];
  sending: boolean;
  sendError: string;
  snipOpen: boolean;
  snipQuery: string;
  snipActive: number;
  // snooze dialog
  snoozeDialog: boolean;
  snoozeValue: string;
  // internals
  root: HTMLElement;
  alive: boolean;
  skew: number;
  seen: Map<string, string | undefined> | null;
  timers: Map<string, ReturnType<typeof setTimeout>>;
  observer: ResizeObserver | undefined;
  playing: Record<string, boolean>;
  audios: Record<string, HTMLAudioElement>;
  copied: string;
  // getters
  rows: InboxConversation[];
  counts: ReturnType<typeof countViews>;
  conv: InboxConversation | null;
  assignee: InboxAgent | null;
  meAgent: InboxAgent;
  matches: { messageId: string; nth: number }[];
  safeIndex: number;
  thread: ThreadRow[];
  snoozeOptions: { id: string; label: string; at: number; hint: string }[];
  snippetList: CannedSnippet[];
  media: ReturnType<typeof collectMedia>;
  isEmail: boolean;
  richMode: boolean;
  noteMode: boolean;
  canSend: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface ThreadRow {
  key: string;
  m: InboxMessage;
  day: string;
  html: string;
  current: number;
  who: string;
  out: boolean;
}

export const inbox: Register = (Alpine) => {
  Alpine.data("nqInbox", (cfg: Config) => ({
    cfg,
    t: cfg.t,
    locale: cfg.locale ?? "",
    conversations: cfg.conversations ?? [],
    agents: cfg.agents ?? [],
    selId: cfg.selected ?? null,
    searchText: "",
    chan: "all",
    scopeSel: "all",
    view: "active",
    compact: false,
    contactOpen: false,
    mediaTab: "media",
    lightbox: null as { name: string; url?: string } | null,
    finding: false,
    findQuery: "",
    findIndex: 0,
    replyTo: null as InboxMessage | null,
    toastList: [] as Toast[],
    notice: "",
    mode: "reply" as "reply" | "note",
    draftText: "",
    subject: "",
    ccText: "",
    showCc: false,
    files: [] as File[],
    sending: false,
    sendError: "",
    snipOpen: false,
    snipQuery: "",
    snipActive: 0,
    snoozeDialog: false,
    snoozeValue: "",
    root: null as unknown as HTMLElement,
    alive: true,
    skew: 0,
    seen: null as Map<string, string | undefined> | null,
    timers: new Map<string, ReturnType<typeof setTimeout>>(),
    observer: undefined as ResizeObserver | undefined,
    playing: {} as Record<string, boolean>,
    audios: {} as Record<string, HTMLAudioElement>,
    copied: "",
    quick: ["👍", "❤️", "😂", "😮", "🙏", "🎉"],
    mentionIds: [] as string[],
    mentionActive: 0,

    init(this: State) {
      // $el inside a handler is the element that fired the event, so keep the root.
      this.root = this.$el;
      if (!this.locale) this.locale = currentLocale();
      if (cfg.now) this.skew = cfg.now - Date.now();
      this.resetComposer();
      this.sync();
      if (typeof ResizeObserver !== "undefined") {
        this.observer = new ResizeObserver((entries) => {
          this.compact = (entries[0]?.contentRect.width ?? 9999) < (cfg.compactBelow ?? 820);
        });
        this.observer.observe(this.root);
      }
      this.$watch("selId", () => {
        this.replyTo = null;
        this.finding = false;
        this.findQuery = "";
        this.findIndex = 0;
        this.resetComposer();
        this.sync();
      });
      this.$watch("conversations", () => this.sync());
      this.$watch("findIndex", () => this.scrollToMatch());
      this.$watch("findQuery", () => this.scrollToMatch());
    },
    destroy(this: State) {
      this.alive = false;
      this.observer?.disconnect();
      for (const t of this.timers.values()) clearTimeout(t);
      for (const a of Object.values(this.audios)) a.pause();
    },

    // ---- Time and numbers ------------------------------------------------------------------------------------
    clock(this: State): number {
      return Date.now() + this.skew;
    },
    num(this: State, n: number): string {
      return new Intl.NumberFormat(this.locale).format(n);
    },
    when(this: State, at: InboxMessage["at"], style: Intl.DateTimeFormatOptions): string {
      return new Intl.DateTimeFormat(this.locale, style).format(toTime(at));
    },
    /** "2 hr. ago" style, relative to the server clock. */
    relative(this: State, at: InboxMessage["at"]): string {
      const diff = toTime(at) - this.clock();
      const abs = Math.abs(diff);
      const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto", style: "short" });
      if (abs < 60_000) return rtf.format(0, "second");
      if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
      if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
      if (abs < 30 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), "day");
      return new Intl.DateTimeFormat(this.locale, { dateStyle: "medium" }).format(toTime(at));
    },
    say(this: State, key: string, vars: Record<string, string | number> = {}): string {
      return fill(String(this.t[key] ?? key), vars);
    },
    initials: initialsOf,
    bytes: formatBytes,
    duration: formatDuration,
    host: hostOf,
    coords: formatCoords,
    mapsLink: mapsUrl,
    bars(m: InboxMessage): number[] {
      return m.voice?.waveform ?? fakeWaveform(m.voice?.duration ?? 0);
    },
    channelLabel(this: State, c: string): string {
      return c === "chat" ? String(this.t.channelChat) : c === "email" ? String(this.t.channelEmail) : String(this.t.channelWhatsapp);
    },
    colorName(this: State, hue: string): string {
      return String((this.t.colors as Record<string, string>)[hue] ?? hue);
    },

    // ---- Derived lists ---------------------------------------------------------------------------------------
    get rows(): InboxConversation[] {
      const self = this as unknown as State;
      const base = filterConversations(self.conversations, {
        channel: self.chan as never,
        scope: self.scopeSel as never,
        query: self.searchText,
        me: self.cfg.me,
        view: (self.view === "unread" ? "active" : self.view) as never,
      });
      return self.view === "unread" ? base.filter((c) => (c.unread ?? 0) > 0 && !c.muted) : base;
    },
    get counts() {
      return countViews((this as unknown as State).conversations);
    },
    get conv(): InboxConversation | null {
      const self = this as unknown as State;
      return self.conversations.find((c) => c.id === self.selId) ?? null;
    },
    get assignee(): InboxAgent | null {
      const self = this as unknown as State;
      const id = self.conv?.assigneeId;
      return id ? (self.agents.find((a) => a.id === id) ?? null) : null;
    },
    get meAgent(): InboxAgent {
      const self = this as unknown as State;
      return self.agents.find((a) => a.id === self.cfg.me) ?? { id: self.cfg.me, name: String(self.t.you) };
    },
    get showList(): boolean {
      const self = this as unknown as State;
      return !self.compact || !self.conv;
    },
    get showThread(): boolean {
      const self = this as unknown as State;
      return !self.compact || !!self.conv;
    },
    get matches() {
      const self = this as unknown as State;
      return self.conv && self.finding && self.findQuery ? findMatches(self.conv.messages, self.findQuery) : [];
    },
    get safeIndex(): number {
      const self = this as unknown as State;
      return self.matches.length ? Math.min(self.findIndex, self.matches.length - 1) : 0;
    },
    get findLabel(): string {
      const self = this as unknown as State;
      if (!self.findQuery.trim()) return "";
      return self.matches.length ? self.say("findCount", { i: self.num(self.safeIndex + 1), n: self.num(self.matches.length) }) : String(self.t.findNone);
    },
    get thread(): ThreadRow[] {
      const self = this as unknown as State;
      const c = self.conv;
      if (!c) return [];
      const cur = self.matches[self.safeIndex];
      return c.messages.map((m, i) => {
        const prev = c.messages[i - 1];
        const newDay = !prev || new Date(toTime(prev.at)).toDateString() !== new Date(toTime(m.at)).toDateString();
        const out = m.direction === "out";
        return {
          key: m.id,
          m,
          day: newDay ? self.when(m.at, { dateStyle: "medium" }) : "",
          html: messageHtml(messageText(m), self.finding ? self.findQuery : "", cur && cur.messageId === m.id ? cur.nth : -1),
          current: cur && cur.messageId === m.id ? cur.nth : -1,
          who: m.author?.name ?? (out ? String(self.t.you) : c.contact.name),
          out,
        };
      });
    },
    get snoozeOptions() {
      const self = this as unknown as State;
      const label: Record<string, string> = { later: "snoozeLater", tomorrow: "snoozeTomorrow", weekend: "snoozeWeekend", nextWeek: "snoozeNextWeek" };
      return snoozePresets(self.clock()).map((p) => ({
        id: p.id,
        at: p.at,
        label: String(self.t[label[p.id] as string]),
        hint: self.when(p.at, p.id === "later" ? { timeStyle: "short" } : { weekday: "short", hour: "numeric", minute: "2-digit" }),
      }));
    },
    get snippetList(): CannedSnippet[] {
      const self = this as unknown as State;
      return filterSnippets(self.cfg.snippets ?? [], self.snipQuery);
    },
    get media() {
      const self = this as unknown as State;
      return self.conv ? collectMedia(self.conv.messages) : [];
    },
    get images() {
      return (this as unknown as State).media.filter((m) => m.kind === "image");
    },
    get fileItems() {
      return (this as unknown as State).media.filter((m) => m.kind === "file");
    },
    get linkItems() {
      return (this as unknown as State).media.filter((m) => m.kind === "link");
    },
    get hasConv(): boolean {
      return (this as unknown as State).conv !== null;
    },
    get wideSend(): boolean {
      const self = this as unknown as State;
      return self.noteMode || self.richMode;
    },
    get lightboxOpen(): boolean {
      return (this as unknown as State).lightbox !== null;
    },
    set lightboxOpen(v: boolean) {
      if (!v) (this as unknown as State).lightbox = null;
    },
    /** The contact panel as a side sheet (narrow) or as a column (wide). */
    get contactSheet(): boolean {
      const self = this as unknown as State;
      return self.contactOpen && self.compact && self.conv !== null;
    },
    set contactSheet(v: boolean) {
      if (!v) (this as unknown as State).contactOpen = false;
    },
    get contactColumn(): boolean {
      const self = this as unknown as State;
      return self.contactOpen && !self.compact && self.conv !== null;
    },
    get hasSnippets(): boolean {
      return (this as unknown as State).cfg.snippets?.length ? true : false;
    },
    get isEmail(): boolean {
      return (this as unknown as State).conv?.channel === "email";
    },
    get noteMode(): boolean {
      return (this as unknown as State).mode === "note";
    },
    get richMode(): boolean {
      const self = this as unknown as State;
      return self.isEmail && !self.noteMode;
    },
    get canSend(): boolean {
      const self = this as unknown as State;
      return !self.sending && (self.draftText.trim() !== "" || self.files.length > 0);
    },
    get placeholder(): string {
      const self = this as unknown as State;
      return String(self.noteMode ? self.t.notePlaceholder : self.isEmail ? self.t.emailPlaceholder : self.t.messagePlaceholder);
    },
    get toWho(): string {
      return (this as unknown as State).conv?.contact.email ?? "";
    },
    preview(this: State, c: InboxConversation): string {
      if (c.typing) return String(this.t.typing);
      return previewOf(lastMessage(c), { voice: String(this.t.voiceMessage), location: String(this.t.locationMessage), attachment: String(this.t.attachmentMessage) });
    },
    lastAt(c: InboxConversation): InboxMessage["at"] {
      return lastMessage(c)?.at ?? 0;
    },
    snoozedText(this: State, c: InboxConversation): string {
      return c.status === "snoozed" && c.snoozedUntil ? this.say("snoozedUntil", { when: this.when(c.snoozedUntil, { dateStyle: "medium", timeStyle: "short" }) }) : "";
    },
    agentOf(this: State, id: string | null | undefined): InboxAgent | null {
      return id ? (this.agents.find((a) => a.id === id) ?? null) : null;
    },

    // ---- Selection and changes -------------------------------------------------------------------------------
    pick(this: State, id: string | null) {
      this.selId = id;
      this.root.dispatchEvent(new CustomEvent("nq-inbox-select", { bubbles: true, detail: { conversationId: id } }));
    },
    /** Applies a patch at once and tells the page; a refusal puts it back. */
    async patch(this: State, id: string, patch: ConversationPatch) {
      const c = this.conversations.find((x) => x.id === id);
      if (!c) return;
      const before: Record<string, unknown> = {};
      const target = c as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(patch)) {
        if (k === "unread") {
          before.unread = c.unread;
          c.unread = v ? Math.max(1, c.unread ?? 0) : 0;
        } else {
          before[k] = target[k];
          target[k] = v;
        }
      }
      const pending = ask(this.root, "nq-inbox-update", { conversationId: id, patch });
      if (!pending) return;
      try {
        const result = await pending;
        if (result && "error" in result && result.error) throw new Error(result.error);
      } catch (e) {
        if (!this.alive) return;
        Object.assign(target, before);
        this.notice = e instanceof Error && e.message ? e.message : String(this.t.failed);
      }
    },
    snoozeTo(this: State, id: string, until: number | null) {
      void this.patch(id, until === null ? { status: "open", snoozedUntil: null } : { status: "snoozed", snoozedUntil: until });
    },
    openSnoozeDialog(this: State) {
      this.snoozeValue = "";
      this.snoozeDialog = true;
    },
    get snoozeAt(): number {
      const v = (this as unknown as State).snoozeValue;
      return v ? new Date(v).getTime() : Number.NaN;
    },
    get snoozeMin(): string {
      const d = new Date((this as unknown as State).clock());
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    },
    confirmSnooze(this: State) {
      const at = this.snoozeAt;
      if (!this.conv || !Number.isFinite(at)) return;
      this.snoozeDialog = false;
      this.snoozeTo(this.conv.id, at);
    },
    popOut(this: State) {
      if (this.conv) this.root.dispatchEvent(new CustomEvent("nq-inbox-popout", { bubbles: true, detail: { conversationId: this.conv.id } }));
    },

    // ---- Read state and toasts -------------------------------------------------------------------------------
    /** Marks the open thread read and raises toasts for messages that arrived elsewhere. */
    sync(this: State) {
      const c = this.conv;
      if (c && (c.unread ?? 0) > 0) void this.patch(c.id, { unread: false });
      const prev = this.seen;
      const next = new Map<string, string | undefined>();
      const fresh: Toast[] = [];
      for (const x of this.conversations) {
        const m = lastMessage(x);
        next.set(x.id, m?.id);
        if (prev && m && prev.get(x.id) !== m.id && m.direction === "in" && m.kind !== "system" && m.kind !== "note" && x.id !== this.selId && !x.muted && !x.archived) {
          fresh.push({ key: `${x.id}:${m.id}`, conversationId: x.id, message: m });
        }
      }
      this.seen = next;
      if (this.cfg.toasts !== false && fresh.length) {
        this.toastList = [...fresh, ...this.toastList].slice(0, 3);
        for (const f of fresh) this.holdToast(f.key, false);
      }
    },
    holdToast(this: State, key: string, hold: boolean) {
      const old = this.timers.get(key);
      if (old) clearTimeout(old);
      this.timers.delete(key);
      if (hold) return;
      this.timers.set(
        key,
        setTimeout(() => this.dismissToast(key), 7000),
      );
    },
    dismissToast(this: State, key: string) {
      const t = this.timers.get(key);
      if (t) clearTimeout(t);
      this.timers.delete(key);
      this.toastList = this.toastList.filter((x) => x.key !== key);
    },
    openToast(this: State, toast: Toast) {
      this.pick(toast.conversationId);
      this.dismissToast(toast.key);
    },
    toastPreview(this: State, toast: Toast): string {
      return previewOf(toast.message, { voice: String(this.t.voiceMessage), location: String(this.t.locationMessage), attachment: String(this.t.attachmentMessage) });
    },
    toastConv(this: State, toast: Toast): InboxConversation | null {
      return this.conversations.find((c) => c.id === toast.conversationId) ?? null;
    },

    // ---- Find in thread ---------------------------------------------------------------------------------------
    toggleFind(this: State) {
      this.finding = !this.finding;
      if (this.finding) this.$nextTick(() => this.root.querySelector<HTMLInputElement>('[data-slot="thread-search"] input')?.focus());
      else this.findQuery = "";
    },
    closeFind(this: State) {
      this.finding = false;
      this.findQuery = "";
    },
    typeFind(this: State, value: string) {
      this.findQuery = value;
      this.findIndex = 0;
    },
    stepFind(this: State, delta: number) {
      const n = this.matches.length;
      if (n > 0) this.findIndex = (this.safeIndex + delta + n) % n;
    },
    onFindKey(this: State, e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.stepFind(e.shiftKey ? -1 : 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.closeFind();
      }
    },
    scrollToMatch(this: State) {
      this.$nextTick(() => this.root.querySelector<HTMLElement>("[data-find-current]")?.scrollIntoView?.({ block: "center", behavior: "smooth" }));
    },
    jump(this: State, id: string) {
      this.root.querySelector<HTMLElement>(`[data-message-id="${id.replace(/["\\]/g, "\\$&")}"]`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    },

    // ---- Messages ---------------------------------------------------------------------------------------------
    react(this: State, m: InboxMessage, emoji: string) {
      const c = this.conv;
      if (!c) return;
      const list = (m.reactions ??= []);
      const hit = list.find((r) => r.emoji === emoji);
      if (!hit) list.push({ emoji, by: [this.cfg.me] });
      else if (hit.by.includes(this.cfg.me)) {
        hit.by = hit.by.filter((x) => x !== this.cfg.me);
        if (hit.by.length === 0) m.reactions = list.filter((r) => r !== hit);
      } else hit.by = [...hit.by, this.cfg.me];
      this.root.dispatchEvent(new CustomEvent("nq-inbox-react", { bubbles: true, detail: { conversationId: c.id, messageId: m.id, emoji } }));
    },
    reacted(this: State, r: { by: string[] }): boolean {
      return r.by.includes(this.cfg.me);
    },
    retry(this: State, m: InboxMessage) {
      if (this.conv) this.root.dispatchEvent(new CustomEvent("nq-inbox-retry", { bubbles: true, detail: { conversationId: this.conv.id, message: m } }));
    },
    startReply(this: State, m: InboxMessage) {
      this.replyTo = m;
      this.$nextTick(() => this.root.querySelector<HTMLElement>('[data-slot="inbox-composer"] textarea')?.focus());
    },
    quoteAuthor(this: State, m: InboxMessage): string {
      const c = this.conv;
      return `${this.t.replyTo} ${m.author?.name ?? (m.direction === "in" ? (c?.contact.name ?? "") : String(this.t.you))}`;
    },
    quoteExcerpt(this: State, m: InboxMessage): string {
      return previewOf(m, { voice: String(this.t.voiceMessage), location: String(this.t.locationMessage), attachment: String(this.t.attachmentMessage) }) || messageText(m);
    },
    /** Play or pause a voice note (an audio element when it has a source, a timer-less toggle otherwise). */
    playVoice(this: State, m: InboxMessage) {
      const src = m.voice?.src;
      const on = !this.playing[m.id];
      this.playing[m.id] = on;
      if (!src) return;
      let a = this.audios[m.id];
      if (!a) {
        a = new Audio(src);
        a.addEventListener("ended", () => (this.playing[m.id] = false));
        this.audios[m.id] = a;
      }
      if (on) void a.play().catch(() => (this.playing[m.id] = false));
      else a.pause();
    },

    isUnread(c: InboxConversation): boolean {
      return (c.unread ?? 0) > 0;
    },

    // ---- Mentions (internal notes) --------------------------------------------------------------------------
    /** The @word being typed at the end of a note. */
    get mentionQuery(): string | null {
      const self = this as unknown as State;
      if (!self.noteMode) return null;
      const m = /(?:^|\s)@(\S*)$/.exec(self.draftText);
      return m ? (m[1] as string) : null;
    },
    get mentionOptions(): InboxAgent[] {
      const self = this as unknown as State;
      const q = self.mentionQuery;
      if (q === null) return [];
      const needle = q.toLowerCase();
      return self.agents.filter((a) => a.name.toLowerCase().includes(needle) || (a.email ?? "").toLowerCase().includes(needle)).slice(0, 6);
    },
    pickMention(this: State, a: InboxAgent) {
      this.draftText = this.draftText.replace(/@\S*$/, `@${a.name} `);
      if (!this.mentionIds.includes(a.id)) this.mentionIds = [...this.mentionIds, a.id];
      this.mentionActive = 0;
    },

    // ---- Composer ---------------------------------------------------------------------------------------------
    resetComposer(this: State) {
      this.mode = "reply";
      this.draftText = "";
      this.files = [];
      this.sendError = "";
      this.showCc = false;
      this.ccText = "";
      this.snipOpen = false;
      this.snipQuery = "";
      this.mentionIds = [];
      const s = this.conv?.subject;
      this.subject = s ? `${/^re:/i.test(s) ? "" : "Re: "}${s}` : "";
    },
    onDraftInput(this: State) {
      if (this.draftText === "/" && this.hasSnippets && !this.noteMode) {
        this.draftText = "";
        this.snipQuery = "";
        this.snipActive = 0;
        this.snipOpen = true;
        this.$nextTick(() => this.root.querySelector<HTMLInputElement>('[data-slot="snippet-search"]')?.focus());
      }
    },
    onDraftKey(this: State, e: KeyboardEvent) {
      const picks = this.mentionOptions;
      if (picks.length) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          this.mentionActive = (this.mentionActive + (e.key === "ArrowDown" ? 1 : -1) + picks.length) % picks.length;
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          this.pickMention(picks[this.mentionActive] ?? (picks[0] as InboxAgent));
          return;
        }
      }
      if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
      if (this.richMode) {
        // Email: Enter writes a new line, Ctrl or Cmd + Enter sends.
        if (!(e.metaKey || e.ctrlKey)) return;
      }
      e.preventDefault();
      void this.send();
    },
    insertEmoji(this: State, emoji: string) {
      this.draftText += emoji;
    },
    pickSnippet(this: State, s: CannedSnippet) {
      const text = applySnippet(s.body, {
        name: this.conv?.contact.name.split(/\s+/)[0],
        fullName: this.conv?.contact.name,
        agent: this.meAgent.name.split(/\s+/)[0],
      });
      this.draftText = this.draftText ? `${this.draftText}${this.draftText.endsWith("\n") ? "" : "\n"}${text}` : text;
      this.snipOpen = false;
    },
    onSnipKey(this: State, e: KeyboardEvent) {
      const n = this.snippetList.length;
      if (e.key === "ArrowDown" && n) {
        e.preventDefault();
        this.snipActive = (this.snipActive + 1) % n;
      } else if (e.key === "ArrowUp" && n) {
        e.preventDefault();
        this.snipActive = (this.snipActive - 1 + n) % n;
      } else if (e.key === "Enter") {
        e.preventDefault();
        const s = this.snippetList[this.snipActive];
        if (s) this.pickSnippet(s);
      } else if (e.key === "Escape") {
        this.snipOpen = false;
      }
    },
    addFiles(this: State, e: Event) {
      const input = e.target as HTMLInputElement;
      this.files = [...this.files, ...Array.from(input.files ?? [])];
      input.value = "";
    },
    removeFile(this: State, i: number) {
      this.files = this.files.filter((_, j) => j !== i);
    },
    async send(this: State) {
      const c = this.conv;
      if (!c || !this.canSend) return;
      const rich = this.richMode;
      const text = this.draftText.trim();
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const draft = {
        conversationId: c.id,
        channel: c.channel,
        mode: this.mode,
        body: rich ? text.split(/\n/).map((l) => `<p>${esc(l)}</p>`).join("") : text,
        format: rich ? "html" : "text",
        ...(rich ? { subject: this.subject } : {}),
        ...(rich && this.ccText.trim() ? { cc: this.ccText.split(/[,;\s]+/).filter(Boolean) } : {}),
        ...(this.replyTo ? { replyToId: this.replyTo.id } : {}),
        ...(this.files.length ? { attachments: this.files } : {}),
        ...(this.noteMode && this.mentionIds.length ? { mentions: this.mentionIds.filter((id: string) => this.agents.some((a) => a.id === id && text.includes(`@${a.name}`))) } : {}),
      };
      this.sending = true;
      this.sendError = "";
      try {
        const pending = ask(this.root, "nq-inbox-send", { draft });
        if (!pending) throw new Error("no listener");
        const result = await pending;
        if (!this.alive) return;
        if (result && "error" in result && result.error) {
          this.sendError = result.error;
          return;
        }
        c.messages.push({
          id: `local-${c.messages.length + 1}`,
          direction: "out",
          kind: this.mode === "note" ? "note" : "text",
          author: { id: this.meAgent.id, name: this.meAgent.name, avatar: this.meAgent.avatar },
          body: rich ? text : text,
          at: this.clock(),
          status: "sent",
          ...(this.replyTo ? { replyTo: { id: this.replyTo.id, author: this.replyTo.author?.name ?? c.contact.name, excerpt: this.quoteExcerpt(this.replyTo) } } : {}),
          ...(this.files.length ? { attachments: this.files.map((f, i) => ({ id: `f${i + 1}`, name: f.name, size: f.size, kind: (f.type.startsWith("image/") ? "image" : "file") as "image" | "file" })) } : {}),
        });
        this.draftText = "";
        this.files = [];
        this.mentionIds = [];
        this.replyTo = null;
      } catch {
        if (this.alive) this.sendError = String(this.t.sendFailed);
      } finally {
        if (this.alive) this.sending = false;
      }
    },

    // ---- Contact panel ----------------------------------------------------------------------------------------
    async copy(this: State, value: string, key: string) {
      try {
        await navigator.clipboard?.writeText(value);
      } catch {
        /* the clipboard is not available */
      }
      this.copied = key;
      setTimeout(() => {
        if (this.alive && this.copied === key) this.copied = "";
      }, 1500);
    },
    openLightbox(this: State, item: { name: string; url?: string }) {
      this.lightbox = item;
    },
    closeLightbox(this: State) {
      this.lightbox = null;
    },
  }));
};

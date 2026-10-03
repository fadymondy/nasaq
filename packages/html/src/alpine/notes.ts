// nqNotes: the behaviour of the React Notes workspace. Notes live in this component (seeded from the server), so the list, the
// filters, the editor and the dialogs update at once; every change is also reported to the host through an event, which can refuse it.
//
//   <div data-slot="notes" x-data="nqNotes({ notes: [...], notebooks: [...], labels: {...}, can: { update: true, … } })">
//
// Each action fires an event on the root with detail `{ …, wait(promise) }`. Resolve the promise (or `{ error }` to keep the
// change out and show the message). Without a listener, an action fails with a generic message.
//   nq-note-update      { id, patch, wait }            pin, archive, colour, tags, move, and the title and body autosave
//   nq-note-create      { wait }                       resolve { id } (and optionally { note }) to open the new note
//   nq-note-delete      { id, wait }
//   nq-note-duplicate   { copy, wait }
//   nq-note-seal        { id, password, wait }         nq-note-unseal { id, password, wait }
//   nq-note-unlock      { id, password, wait }         resolve { body } so the note can be read
//   nq-note-lock        { id }                         (not awaited)
//   nq-notebook-create  { name, parentId, wait }       resolve { id } to choose the id
//   nq-notebook-rename  { id, name, wait }             nq-notebook-delete { id, wait }
//   nq-note-export      { id, format, file }           (not awaited; the browser download still happens unless you call preventDefault)
//
// The rich body is a contenteditable field with a small toolbar (bold, italic, underline, lists); the host can swap in Tiptap.
// A Markdown note previews as plain text with its [[wikilinks]] turned into links.

import {
  applyMarkdownFormat,
  backlinksOf,
  bodyText,
  duplicateNote,
  exportNote,
  filterNotes,
  groupNotes,
  INITIAL_SAVE,
  linksFrom,
  matchNoteShortcut,
  noteExportFormats,
  notebookPath,
  notebookScope,
  notebookTree,
  readingMinutes,
  saveReducer,
  scopeCounts,
  snippetOf,
  sortNotes,
  tagCounts,
  tagScope,
  wordCount,
  type MarkdownFormat,
  type Note,
  type NoteExportFormat,
  type Notebook,
  type NotebookNode,
  type SaveEvent,
  type SaveState,
} from "./notes-logic";
import { isApplePlatform } from "./command-palette-logic";
import type { Magics, Register } from "./types";

type Outcome = void | { error?: string; id?: string; body?: string; note?: Note } | undefined;
type Dialog = "move" | "tags" | "color" | "share" | "export" | "seal" | "unseal" | "delete" | "notebook" | "notebookDelete" | "exportAll";

interface Config {
  notes?: Note[];
  notebooks?: Notebook[];
  unlocked?: string[];
  /** The words (see the Blade `_logic`): sentences carry %s. */
  labels?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  locale?: string;
  autosaveDelay?: number;
  /** Which actions the host handles. An action that is off is left out of the menus. */
  can?: Partial<Record<"update" | "create" | "delete" | "duplicate" | "seal" | "unseal" | "unlock" | "lock" | "share" | "notebooks", boolean>>;
  /** Share link, with {id} for the note id. Without it there is no Share action. */
  shareUrl?: string;
  now?: number;
  scope?: string;
  sort?: "updated" | "created" | "title";
  view?: "list" | "grid";
  activeId?: string | null;
}

interface S extends Magics {
  root: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const sanitize = (html: string): string => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach((el) => el.remove());
  tpl.content.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name) || (/^(href|src|xlink:href)$/i.test(attr.name) && /^\s*javascript:/i.test(attr.value))) el.removeAttribute(attr.name);
    }
  });
  return tpl.innerHTML;
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fill = (tpl: string, ...vals: string[]) => vals.reduce((s, v) => s.replace("%s", v), tpl);
const flatten = (nodes: NotebookNode[], depth = 0): { notebook: Notebook; depth: number }[] =>
  nodes.flatMap((n) => [{ notebook: n.notebook, depth }, ...flatten(n.children, depth + 1)]);
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

function download(name: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const notes: Register = (Alpine) => {
  Alpine.data("nqNotes", (config: Config = {}) => ({
    root: null as unknown as HTMLElement,
    alive: true,
    t: (config.labels ?? {}) as Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    locale: config.locale ?? "en",
    can: config.can ?? {},
    notes: (config.notes ?? []).map((n) => ({ ...n })) as Note[],
    notebooks: (config.notebooks ?? []).map((n) => ({ ...n })) as Notebook[],
    unlocked: [...(config.unlocked ?? [])] as string[],
    scope: config.scope ?? "all",
    query: "",
    sort: config.sort ?? "updated",
    view: config.view ?? "list",
    activeId: (config.activeId ?? null) as string | null,
    // editor
    title: "",
    body: "",
    mode: "write" as "write" | "preview",
    save: INITIAL_SAVE as SaveState,
    savedAt: null as number | null,
    failed: null as string | null,
    timer: null as ReturnType<typeof setTimeout> | null,
    inflight: false,
    touched: false,
    // dialogs
    dlg: {} as Record<string, boolean>,
    dlgNote: null as string | null,
    tagsDraft: [] as string[],
    tagInput: "",
    moveTo: "" as string,
    colorPick: "" as string,
    password: "",
    password2: "",
    exportFormat: "markdown" as NoteExportFormat,
    exportAllFormat: "csv",
    nbKind: "create" as "create" | "rename" | "delete",
    nbName: "",
    nbParent: "",
    nbId: "" as string,
    unlockPassword: "",
    // state of async work
    busy: "",
    err: {} as Record<string, string | null>,
    listError: null as string | null,
    copied: false,

    init(this: S) {
      this.root = this.$el;
      // Notes are plain objects: unwrap them when the host replaces the list.
      if (this.activeId) this.openNote(this.activeId, true);
      this.$watch("activeId", (id: string | null) => {
        if (id !== this.shownId) this.loadDrafts();
      });
    },
    destroy(this: S) {
      this.alive = false;
      if (this.timer) clearTimeout(this.timer);
      void this.flush();
    },

    /* ----------------------------------------------------------- derived */
    get active(): Note | null {
      const self = this as unknown as S;
      return self.notes.find((n: Note) => n.id === self.activeId) ?? null;
    },
    get openList(): Note[] {
      const self = this as unknown as S;
      return self.active ? [self.active] : [];
    },
    get shown(): Note[] {
      const self = this as unknown as S;
      return sortNotes(filterNotes(self.notes, { scope: self.scope, query: self.query, notebooks: self.notebooks, unlocked: self.unlocked }), self.sort, {
        locale: self.locale,
        pinnedFirst: self.scope !== "archive",
      });
    },
    get groups(): { kind: string; label: string; notes: Note[] }[] {
      const self = this as unknown as S;
      return groupNotes(self.shown as Note[], self.sort, config.now).map((g) => ({ kind: g.kind, label: self.t.groups?.[g.kind] ?? g.kind, notes: g.notes }));
    },
    get counts(): Record<string, number> {
      const self = this as unknown as S;
      return scopeCounts(self.notes, self.notebooks);
    },
    get tagList(): { tag: string; count: number }[] {
      const self = this as unknown as S;
      return tagCounts(self.notes);
    },
    get notebookRows(): { notebook: Notebook; depth: number; scope: string }[] {
      const self = this as unknown as S;
      return flatten(notebookTree(self.notebooks)).map((r) => ({ ...r, scope: notebookScope(r.notebook.id) }));
    },
    get chips(): { id: string; label: string }[] {
      const self = this as unknown as S;
      return [
        { id: "all", label: self.t.all },
        { id: "pinned", label: self.t.pinned },
        { id: "sealed", label: self.t.sealed },
        ...self.notebookRows.map((r: { notebook: Notebook; scope: string }) => ({ id: r.scope, label: r.notebook.name })),
        ...self.tagList.map((x: { tag: string }) => ({ id: tagScope(x.tag), label: `#${x.tag}` })),
        { id: "archive", label: self.t.archive },
      ];
    },
    get currentNotebook(): Notebook | null {
      const self = this as unknown as S;
      return self.scope.startsWith("nb:") ? (self.notebooks.find((n: Notebook) => n.id === self.scope.slice(3)) ?? null) : null;
    },
    get emptyState(): { title: string; hint: string; kind: string } {
      const self = this as unknown as S;
      const s = self.t;
      if (self.query.trim()) return { title: s.noMatches, hint: s.noMatchesHint, kind: "search" };
      if (self.scope === "archive") return { title: s.emptyArchive, hint: s.emptyArchiveHint, kind: "" };
      if (self.scope === "sealed") return { title: s.emptySealed, hint: s.emptySealedHint, kind: "" };
      if (self.scope === "pinned") return { title: s.emptyPinned, hint: s.emptyPinnedHint, kind: "" };
      return { title: s.empty, hint: s.emptyHint, kind: "new" };
    },
    get isLockedActive(): boolean {
      const self = this as unknown as S;
      return !!self.active && self.locked(self.active);
    },
    get activeFormat(): string {
      const self = this as unknown as S;
      return self.active?.format ?? "rich";
    },
    get words(): number {
      const self = this as unknown as S;
      const n = self.active as Note | null;
      return n ? wordCount(`${self.title} ${self.locked(n) ? "" : bodyText({ ...n, body: self.body })}`) : 0;
    },
    get readMin(): number {
      const self = this as unknown as S;
      return readingMinutes(self.words);
    },
    get backlinks(): Note[] {
      const self = this as unknown as S;
      return self.active && !self.isLockedActive ? backlinksOf(self.active, self.notes, self.unlocked) : [];
    },
    get links(): Note[] {
      const self = this as unknown as S;
      return self.active && !self.isLockedActive ? linksFrom({ ...self.active, body: self.body }, self.notes) : [];
    },
    get statusText(): string {
      const self = this as unknown as S;
      const s = self.t;
      switch (self.save.status) {
        case "saving":
          return s.saving;
        case "dirty":
          return s.unsaved;
        case "error":
          return self.failed ?? s.saveFailed;
        default:
          return self.savedAt ? fill(s.savedAt, self.rel(self.savedAt)) : s.saved;
      }
    },
    get previewHtml(): string {
      const self = this as unknown as S;
      return esc(self.body).replace(/\[\[([^\]\n]+)\]\]/g, (_m: string, name: string) => {
        const hit = (self.notes as Note[]).find((n) => n.id !== self.activeId && n.title.trim().toLowerCase() === name.trim().toLowerCase());
        return hit ? `<a href="#note-${esc(hit.id)}" data-note="${esc(hit.id)}" class="text-foreground underline decoration-nq-line-strong underline-offset-4">${name.trim()}</a>` : name.trim();
      });
    },
    get exportFormats(): NoteExportFormat[] {
      const self = this as unknown as S;
      return self.dialogNote ? noteExportFormats(self.dialogNote) : [];
    },
    get dialogNote(): Note | null {
      const self = this as unknown as S;
      return self.notes.find((n: Note) => n.id === self.dlgNote) ?? null;
    },
    get shareLink(): string {
      const self = this as unknown as S;
      return self.dialogNote && config.shareUrl ? config.shareUrl.replace("{id}", encodeURIComponent(self.dialogNote.id)) : "";
    },
    get tagSuggestions(): string[] {
      const self = this as unknown as S;
      return self.tagList.map((x: { tag: string }) => x.tag).filter((t: string) => !self.tagsDraft.includes(t));
    },
    get nbParents(): { notebook: Notebook; depth: number }[] {
      const self = this as unknown as S;
      return flatten(notebookTree(self.notebooks));
    },
    get modKey() {
      return isApplePlatform() ? "⌘" : "Ctrl";
    },

    /* ----------------------------------------------------------- helpers */
    fill,
    locked(this: S, note: Note) {
      return !!note.sealed && !this.unlocked.includes(note.id);
    },
    titleOf(this: S, note: Note) {
      return note.title.trim() || this.t.untitled;
    },
    snippet(this: S, note: Note) {
      return snippetOf(note, this.view === "grid" ? 260 : 140);
    },
    pathOf(this: S, note: Note) {
      return notebookPath(this.notebooks, note.notebookId);
    },
    num(this: S, n: number) {
      return new Intl.NumberFormat(this.locale).format(n);
    },
    rel(this: S, ms: number) {
      const diff = (ms - (config.now ?? Date.now())) / 1000;
      const fmt = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });
      const steps: [Intl.RelativeTimeFormatUnit, number][] = [["second", 60], ["minute", 60], ["hour", 24], ["day", 7], ["week", 4.345], ["month", 12], ["year", Infinity]];
      let v = diff;
      for (const [unit, size] of steps) {
        if (Math.abs(v) < size) return fmt.format(Math.round(v), unit);
        v /= size;
      }
      return "";
    },
    tint(note: Note) {
      return note.color ? `background:var(--nq-tag-${note.color}-soft);border-color:color-mix(in oklab, var(--nq-tag-${note.color}) 45%, transparent)` : "";
    },
    stripe(note: Note) {
      return note.color ? `border-inline-start-color:var(--nq-tag-${note.color})` : "";
    },
    clean: sanitize,
    dispatchEvent(this: S, name: string, detail: Record<string, unknown>) {
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },

    /* ----------------------------------------------------------- host calls */
    async ask(this: S, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** Runs a host call. Returns the outcome object on success (possibly {}), or null on failure with `err[key]` set. */
    async run(this: S, key: string, name: string, detail: Record<string, unknown>): Promise<Record<string, any> | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
      this.busy = key;
      this.err[key] = null;
      try {
        const result = await this.ask(name, detail);
        if (!this.alive) return null;
        if (result && result.error) {
          this.err[key] = result.error;
          return null;
        }
        return (result as Record<string, unknown>) ?? {};
      } catch {
        if (this.alive) this.err[key] = this.t.failed;
        return null;
      } finally {
        if (this.alive) this.busy = "";
      }
    },
    apply(this: S, id: string, patch: Partial<Note>) {
      this.notes = this.notes.map((n: Note) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n));
    },
    async update(this: S, id: string, patch: Partial<Note>) {
      const ok = await this.run(`u:${id}`, "nq-note-update", { id, patch });
      if (ok) this.apply(id, patch);
      else this.listError = this.err[`u:${id}`];
      return !!ok;
    },

    /* ----------------------------------------------------------- list */
    setScope(this: S, scope: string) {
      this.scope = scope;
    },
    async create(this: S) {
      if (!this.can.create || this.busy === "create") return;
      this.listError = null;
      const result = await this.run("create", "nq-note-create", {});
      if (!result) {
        this.listError = this.err.create;
        return;
      }
      const id = result.id ?? result.note?.id;
      if (!id) return;
      if (!this.notes.some((n: Note) => n.id === id)) {
        const now = Date.now();
        this.notes = [{ id, title: "", body: "", createdAt: now, updatedAt: now, ...(result.note ?? {}) }, ...this.notes];
      }
      if (this.scope === "archive" || this.scope === "sealed") this.scope = "all";
      this.openNote(id);
    },
    onRowKey(this: S, e: KeyboardEvent, note: Note) {
      const el = e.currentTarget as HTMLElement;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = [...this.root.querySelectorAll<HTMLElement>("[data-slot=notes-list] [data-slot=note-open]")];
        const next = items[items.indexOf(el) + (e.key === "ArrowDown" ? 1 : -1)];
        if (next) {
          next.focus();
          e.preventDefault();
        }
      } else if (e.key === "Delete" && !e.shiftKey && this.has(note, "delete")) {
        e.preventDefault();
        this.openDialog("delete", note);
      }
    },

    /* ----------------------------------------------------------- note actions (menus) */
    has(this: S, note: Note, id: string): boolean {
      const c = this.can;
      switch (id) {
        case "pin":
        case "color":
        case "tags":
        case "move":
        case "archive":
          return !!c.update;
        case "duplicate":
          return !!c.duplicate;
        case "share":
          return !!c.share && !!config.shareUrl;
        case "export":
          return true;
        case "lock":
          return !!note.sealed && !this.locked(note) && !!c.lock;
        case "unseal":
          return !!note.sealed && !!c.unseal;
        case "seal":
          return !note.sealed && !!c.seal;
        case "delete":
          return !!c.delete;
        default:
          return false;
      }
    },
    off(this: S, note: Note, id: string): boolean {
      const locked = this.locked(note);
      return (id === "duplicate" && (locked || !!note.sealed)) || ((id === "share" || id === "export") && locked);
    },
    pick(this: S, note: Note, id: string) {
      if (this.off(note, id)) return;
      switch (id) {
        case "open":
          return this.openNote(note.id);
        case "pin":
          return void this.update(note.id, { pinned: !note.pinned });
        case "archive":
          return void this.update(note.id, { archived: !note.archived });
        case "duplicate":
          return void this.duplicate(note);
        case "lock":
          return this.lock(note.id);
        default:
          return this.openDialog(id as Dialog, note);
      }
    },
    async duplicate(this: S, note: Note) {
      const copy = duplicateNote(note, { id: newId(), suffix: this.t.copySuffix });
      const result = await this.run(`d:${note.id}`, "nq-note-duplicate", { copy });
      if (result) this.notes = [copy, ...this.notes];
      else this.listError = this.err[`d:${note.id}`];
    },
    lock(this: S, id: string) {
      this.unlocked = this.unlocked.filter((x: string) => x !== id);
      this.dispatchEvent("nq-note-lock", { id });
      if (this.activeId === id) {
        this.body = "";
        this.loadDrafts();
      }
    },
    /** Runs a note shortcut (pin, archive, duplicate, seal) for the open note. */
    shortcut(this: S, note: Note, which: "pin" | "archive" | "duplicate" | "seal"): boolean {
      const id = which === "seal" ? (note.sealed ? (this.locked(note) ? "unseal" : "lock") : "seal") : which;
      if (!this.has(note, id) || this.off(note, id)) return false;
      this.pick(note, id);
      return true;
    },
    onKey(this: S, e: KeyboardEvent) {
      const sc = matchNoteShortcut(e, isApplePlatform());
      if (!sc) return;
      if (sc === "new") {
        if (!this.can.create) return;
        e.preventDefault();
        void this.create();
      } else if (sc === "search") {
        e.preventDefault();
        this.root.querySelector<HTMLInputElement>("[data-slot=notes-search]")?.focus();
      } else if (sc === "actions") {
        const trigger = this.root.querySelector<HTMLElement>("[data-slot=note-editor-body] [data-slot=note-actions-trigger]");
        if (trigger) {
          e.preventDefault();
          trigger.click();
        }
      } else if (this.active && this.shortcut(this.active, sc)) e.preventDefault();
    },

    /* ----------------------------------------------------------- editor */
    openNote(this: S, id: string | null, silent = false) {
      if (!silent) void this.flush();
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.activeId = id;
      this.save = INITIAL_SAVE;
      this.failed = null;
      this.mode = "write";
      this.touched = false;
      this.unlockPassword = "";
      this.err.unlock = null;
      this.loadDrafts();
    },
    loadDrafts(this: S) {
      const n = this.active as Note | null;
      this.shownId = n?.id ?? null;
      this.title = n?.title ?? "";
      this.body = n && !this.locked(n) ? n.body : "";
    },
    back(this: S) {
      this.openNote(null);
    },
    dispatchSave(this: S, event: SaveEvent) {
      this.save = saveReducer(this.save, event);
    },
    schedule(this: S) {
      this.dispatchSave({ type: "edit" });
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.flush(), config.autosaveDelay ?? 800);
    },
    async flush(this: S) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      const id = this.activeId as string | null;
      if (!id || !this.can.update || this.inflight) return;
      if (this.save.status !== "dirty" && this.save.status !== "error") return;
      this.inflight = true;
      this.dispatchSave({ type: "start" });
      const patch = { title: this.title, body: this.body };
      const rev = this.save.rev;
      const result = await this.run("save", "nq-note-update", { id, patch });
      this.inflight = false;
      if (this.activeId !== id) {
        if (result) this.apply(id, patch);
        return;
      }
      if (result) {
        this.apply(id, patch);
        this.failed = null;
        this.savedAt = Date.now();
        this.dispatchSave({ type: "done" });
        if (this.save.status === "dirty" && rev !== this.save.rev) this.timer = setTimeout(() => void this.flush(), config.autosaveDelay ?? 800);
      } else {
        this.failed = this.err.save;
        this.dispatchSave({ type: "fail" });
      }
    },
    onTitle(this: S) {
      this.schedule();
    },
    /** The rich body: `input` events on the contenteditable. The first events before any user input are ignored. */
    onRich(this: S, e: Event) {
      if (!this.touched) return;
      const html = sanitize((e.currentTarget as HTMLElement).innerHTML);
      if (html === this.body) return;
      this.body = html;
      this.schedule();
    },
    touch(this: S) {
      this.touched = true;
    },
    richCommand(this: S, cmd: string) {
      this.touched = true;
      document.execCommand(cmd);
      this.root.querySelector<HTMLElement>("[data-slot=note-body][contenteditable]")?.dispatchEvent(new Event("input", { bubbles: true }));
    },
    applyFormat(this: S, fmt: MarkdownFormat) {
      const el = this.root.querySelector<HTMLTextAreaElement>("textarea[data-slot=note-body]");
      if (!el) return;
      const edit = applyMarkdownFormat(this.body, el.selectionStart, el.selectionEnd, fmt);
      this.body = edit.value;
      el.value = edit.value;
      this.schedule();
      this.$nextTick(() => {
        el.focus();
        el.setSelectionRange(edit.start, edit.end);
      });
    },
    onAreaKey(this: S, e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const f = ({ KeyB: "bold", KeyI: "italic", KeyK: "link" } as Record<string, MarkdownFormat>)[e.code];
      if (f) {
        e.preventDefault();
        this.applyFormat(f);
      }
    },
    onEditorKey(this: S, e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === "KeyS") {
        e.preventDefault();
        void this.flush();
      }
    },
    onPreviewClick(this: S, e: MouseEvent) {
      const id = (e.target as HTMLElement).closest<HTMLElement>("a[data-note]")?.dataset.note;
      if (id) {
        e.preventDefault();
        this.openNote(id);
      }
    },
    async unlock(this: S) {
      const id = this.activeId as string | null;
      if (!id || !this.unlockPassword || !this.can.unlock) return;
      const result = await this.run("unlock", "nq-note-unlock", { id, password: this.unlockPassword });
      if (!result) return;
      this.notes = this.notes.map((n: Note) => (n.id === id && typeof result.body === "string" ? { ...n, body: result.body, updatedAt: n.updatedAt } : n));
      this.unlocked = [...this.unlocked, id];
      this.unlockPassword = "";
      this.loadDrafts();
    },

    /* ----------------------------------------------------------- dialogs */
    openDialog(this: S, kind: Dialog, note?: Note) {
      this.err.dialog = null;
      if (note) {
        this.dlgNote = note.id;
        this.tagsDraft = [...(note.tags ?? [])];
        this.tagInput = "";
        this.moveTo = note.notebookId ?? "";
        this.colorPick = note.color ?? "";
        this.exportFormat = noteExportFormats(note)[0]!;
      }
      this.password = "";
      this.password2 = "";
      this.copied = false;
      this.dlg[kind] = true;
    },
    closeDialog(this: S, kind: Dialog) {
      this.dlg[kind] = false;
    },
    addTag(this: S) {
      const tag = this.tagInput.trim().replace(/^#/, "");
      if (tag && !this.tagsDraft.includes(tag)) this.tagsDraft = [...this.tagsDraft, tag];
      this.tagInput = "";
    },
    removeTag(this: S, tag: string) {
      this.tagsDraft = this.tagsDraft.filter((t: string) => t !== tag);
    },
    onTagKey(this: S, e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        this.addTag();
      } else if (e.key === "Backspace" && !this.tagInput) this.tagsDraft = this.tagsDraft.slice(0, -1);
    },
    async saveTags(this: S) {
      this.addTag();
      const id = this.dlgNote;
      if (id && (await this.update(id, { tags: [...this.tagsDraft] }))) this.dlg.tags = false;
      else this.err.dialog = this.err[`u:${id}`];
    },
    async saveMove(this: S) {
      const id = this.dlgNote;
      if (id && (await this.update(id, { notebookId: this.moveTo || null }))) this.dlg.move = false;
      else this.err.dialog = this.err[`u:${id}`];
    },
    async saveColor(this: S, color: string) {
      const id = this.dlgNote;
      this.colorPick = color;
      if (id && (await this.update(id, { color: (color || null) as Note["color"] }))) this.dlg.color = false;
      else this.err.dialog = this.err[`u:${id}`];
    },
    async confirmDelete(this: S) {
      const id = this.dlgNote;
      if (!id) return;
      const result = await this.run("delete", "nq-note-delete", { id });
      if (!result) {
        this.err.dialog = this.err.delete;
        return;
      }
      this.notes = this.notes.filter((n: Note) => n.id !== id);
      this.dlg.delete = false;
      if (this.activeId === id) this.openNote(null, true);
    },
    get passwordProblem(): string {
      const self = this as unknown as S;
      if (self.password.length < 4) return self.t.passwordShort;
      if (self.dlg.seal && self.password !== self.password2) return self.t.passwordMismatch;
      return "";
    },
    async confirmSeal(this: S) {
      const id = this.dlgNote;
      if (!id || this.passwordProblem) return;
      const result = await this.run("seal", "nq-note-seal", { id, password: this.password });
      if (!result) {
        this.err.dialog = this.err.seal;
        return;
      }
      this.notes = this.notes.map((n: Note) => (n.id === id ? { ...n, sealed: true } : n));
      if (!this.unlocked.includes(id)) this.unlocked = [...this.unlocked, id];
      this.dlg.seal = false;
    },
    async confirmUnseal(this: S) {
      const id = this.dlgNote;
      if (!id || !this.password) return;
      const result = await this.run("unseal", "nq-note-unseal", { id, password: this.password });
      if (!result) {
        this.err.dialog = this.err.unseal;
        return;
      }
      this.notes = this.notes.map((n: Note) => (n.id === id ? { ...n, sealed: false, ...(typeof result.body === "string" ? { body: result.body } : {}) } : n));
      this.unlocked = this.unlocked.filter((x: string) => x !== id);
      this.dlg.unseal = false;
      if (this.activeId === id) this.loadDrafts();
    },
    doExport(this: S) {
      const note = this.dialogNote as Note | null;
      if (!note) return;
      const file = exportNote({ ...note, body: this.activeId === note.id ? this.body : note.body }, this.exportFormat);
      const ev = new CustomEvent("nq-note-export", { bubbles: true, cancelable: true, detail: { id: note.id, format: this.exportFormat, file } });
      this.root.dispatchEvent(ev);
      if (!ev.defaultPrevented) download(file.filename, file.mime, file.content);
      this.dlg.export = false;
    },
    async copyLink(this: S) {
      try {
        await navigator.clipboard.writeText(this.shareLink);
        this.copied = true;
      } catch {
        this.err.dialog = this.t.failed;
      }
    },
    doExportAll(this: S) {
      const rows = this.shown as Note[];
      const cols = this.t.exportColumns as Record<string, string>;
      const x = (k: string): string => cols[k] ?? k;
      const text = (n: Note) => (n.sealed && !this.unlocked.includes(n.id) ? "" : bodyText(n));
      const record = (n: Note) => ({
        [x("title")]: n.title,
        [x("notebook")]: notebookPath(this.notebooks, n.notebookId).join(" / "),
        [x("tags")]: (n.tags ?? []).join(", "),
        [x("pinned")]: n.pinned ? "1" : "0",
        [x("created")]: new Date(n.createdAt).toISOString(),
        [x("updated")]: new Date(n.updatedAt).toISOString(),
        [x("text")]: text(n),
      });
      if (this.exportAllFormat === "json") download("notes.json", "application/json;charset=utf-8", JSON.stringify(rows.map(record), null, 2));
      else {
        const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
        const head = Object.keys(record(rows[0] ?? ({ title: "", createdAt: 0, updatedAt: 0, id: "", body: "" } as Note)));
        const lines = [head, ...rows.map((n) => Object.values(record(n)))].map((r) => r.map((v) => cell(String(v))).join(","));
        download("notes.csv", "text/csv;charset=utf-8", `﻿${lines.join("\r\n")}`);
      }
      this.dlg.exportAll = false;
    },

    /* ----------------------------------------------------------- notebooks */
    openNotebook(this: S, kind: "create" | "rename" | "delete", notebook?: Notebook | null, parentId: string | null = null) {
      this.nbKind = kind;
      this.nbId = notebook?.id ?? "";
      this.nbName = kind === "rename" ? (notebook?.name ?? "") : "";
      this.nbParent = parentId ?? "";
      this.err.dialog = null;
      this.dlg[kind === "delete" ? "notebookDelete" : "notebook"] = true;
    },
    async saveNotebook(this: S) {
      const name = this.nbName.trim();
      if (!name) return;
      if (this.nbKind === "create") {
        const result = await this.run("nb", "nq-notebook-create", { name, parentId: this.nbParent || null });
        if (!result) return void (this.err.dialog = this.err.nb);
        this.notebooks = [...this.notebooks, { id: result.id ?? newId(), name, parentId: this.nbParent || null }];
      } else {
        const result = await this.run("nb", "nq-notebook-rename", { id: this.nbId, name });
        if (!result) return void (this.err.dialog = this.err.nb);
        this.notebooks = this.notebooks.map((n: Notebook) => (n.id === this.nbId ? { ...n, name } : n));
      }
      this.dlg.notebook = false;
    },
    async deleteNotebook(this: S) {
      const id = this.nbId;
      const result = await this.run("nb", "nq-notebook-delete", { id });
      if (!result) return void (this.err.dialog = this.err.nb);
      this.notebooks = this.notebooks.filter((n: Notebook) => n.id !== id);
      this.notes = this.notes.map((n: Note) => (n.notebookId === id ? { ...n, notebookId: null } : n));
      this.dlg.notebookDelete = false;
      if (this.scope === notebookScope(id)) this.scope = "all";
    },
  }));
};

import type { ReactNode } from "react";
/* Pure logic of the notes components: the data model, filtering, sorting, grouping, backlinks, export, the
   Markdown formatting commands and the autosave state machine. No React, no DOM, so it runs under `node --test`. */

export const NOTE_COLORS = ["gray", "red", "orange", "amber", "green", "teal", "blue", "violet", "pink"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

/** `rich` keeps the body as HTML (the RichTextEditor), `markdown` keeps it as Markdown source. */
export type NoteFormat = "rich" | "markdown";

export interface Note {
  id: string;
  title: string;
  /** HTML for `rich` notes, Markdown for `markdown` notes. */
  body: string;
  /** Default `rich`. */
  format?: NoteFormat;
  notebookId?: string | null;
  tags?: string[];
  color?: NoteColor | null;
  pinned?: boolean;
  archived?: boolean;
  /** Password-protected: the title and tags stay visible, the body stays hidden until it is unlocked. */
  sealed?: boolean;
  /** A preview image URL, shown on the trailing edge of the note's row. */
  thumbnail?: string | null;
  /** A leading icon or tile for the row, e.g. the note's category icon on its colour. */
  icon?: ReactNode;
  /** Milliseconds since the epoch. */
  createdAt: number;
  updatedAt: number;
}

export interface Notebook {
  id: string;
  name: string;
  parentId?: string | null;
}

/** What `onUpdate` receives: only the fields that changed. */
export type NotePatch = Partial<Pick<Note, "title" | "body" | "format" | "notebookId" | "tags" | "color" | "pinned" | "archived">>;

export type NoteSort = "updated" | "created" | "title";
export type NoteViewMode = "list" | "grid";

/**
 * Which notes a view shows: `all`, `pinned`, `archive`, `sealed`, `nb:<notebook id>` (with its sub-notebooks) or
 * `tag:<tag>`.
 */
export type NotesScope = string;

export const notebookScope = (id: string) => `nb:${id}`;
export const tagScope = (tag: string) => `tag:${tag}`;

/* ------------------------------------------------------------------ text */

const DIACRITICS = /[ً-ٰٟـ]/g;

/** Lower-cases and folds Arabic diacritics, tatweel and letter variants, so search ignores them. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The text of an HTML body: block ends become spaces, tags and entities are removed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr)>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** The text of a Markdown body: markers, links and code fences are dropped, the words stay. */
export function markdownToText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/gm, "")
    .replace(/[*_~`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function bodyText(note: Pick<Note, "body" | "format">): string {
  return note.format === "markdown" ? markdownToText(note.body) : htmlToText(note.body);
}

/** Words in a text. Arabic and Latin words count alike; punctuation does not. */
export function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

/** Minutes to read, at 200 words a minute, never below 1 for a non-empty text. */
export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / 200));
}

export function snippetOf(note: Pick<Note, "body" | "format">, max = 140): string {
  const text = bodyText(note);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** A file-name-safe slug that keeps Arabic letters. */
export function slugify(text: string, fallback = "note"): string {
  const slug = text
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

/* ------------------------------------------------------------------ notebooks */

/** The ids of a notebook and everything below it. */
export function notebookIds(notebooks: readonly Notebook[], id: string): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) {
    for (const nb of notebooks) if (nb.parentId === out[i] && !out.includes(nb.id)) out.push(nb.id);
  }
  return out;
}

export interface NotebookNode {
  notebook: Notebook;
  children: NotebookNode[];
}

/** Notebooks as a forest. A notebook whose parent is missing becomes a root. */
export function notebookTree(notebooks: readonly Notebook[]): NotebookNode[] {
  const known = new Set(notebooks.map((n) => n.id));
  const build = (parentId: string | null): NotebookNode[] =>
    notebooks
      .filter((n) => (parentId === null ? !n.parentId || !known.has(n.parentId) : n.parentId === parentId))
      .map((notebook) => ({ notebook, children: build(notebook.id) }));
  return build(null);
}

/** The names from the root down to the notebook. */
export function notebookPath(notebooks: readonly Notebook[], id: string | null | undefined): string[] {
  const path: string[] = [];
  let current = notebooks.find((n) => n.id === id);
  while (current && path.length < 20) {
    path.unshift(current.name);
    const parent: string | null | undefined = current.parentId;
    current = parent ? notebooks.find((n) => n.id === parent) : undefined;
  }
  return path;
}

/* ------------------------------------------------------------------ filtering and sorting */

export function inScope(note: Note, scope: NotesScope, notebooks: readonly Notebook[]): boolean {
  if (scope === "archive") return !!note.archived;
  if (note.archived) return false;
  if (scope === "all") return true;
  if (scope === "pinned") return !!note.pinned;
  if (scope === "sealed") return !!note.sealed;
  if (scope.startsWith("nb:")) return !!note.notebookId && notebookIds(notebooks, scope.slice(3)).includes(note.notebookId);
  if (scope.startsWith("tag:")) return !!note.tags?.includes(scope.slice(4));
  return true;
}

export interface FilterOptions {
  scope?: NotesScope;
  query?: string;
  notebooks?: readonly Notebook[];
  /** Ids of sealed notes that are open right now. A locked sealed note matches on title and tags only. */
  unlocked?: readonly string[];
}

export function filterNotes(notes: readonly Note[], { scope = "all", query = "", notebooks = [], unlocked = [] }: FilterOptions = {}): Note[] {
  const q = normalizeText(query.trim());
  return notes.filter((note) => {
    if (!inScope(note, scope, notebooks)) return false;
    if (!q) return true;
    const open = !note.sealed || unlocked.includes(note.id);
    const hay = normalizeText([note.title, ...(note.tags ?? []), open ? bodyText(note) : ""].join(" "));
    return hay.includes(q);
  });
}

/** Pinned notes first (unless `pinnedFirst` is false), then by the chosen key. `title` sorts A to Z by locale. */
export function sortNotes<N extends Pick<Note, "title" | "pinned" | "createdAt" | "updatedAt">>(
  notes: readonly N[],
  sort: NoteSort,
  { pinnedFirst = true, locale }: { pinnedFirst?: boolean; locale?: string } = {},
): N[] {
  const cmp = (a: N, b: N) =>
    sort === "title" ? a.title.localeCompare(b.title, locale, { sensitivity: "base", numeric: true }) : sort === "created" ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt;
  return [...notes].sort((a, b) => (pinnedFirst && !!a.pinned !== !!b.pinned ? (a.pinned ? -1 : 1) : cmp(a, b)));
}

export type NoteGroupKind = "pinned" | "today" | "yesterday" | "week" | "earlier" | "all";
export interface NoteGroup<N> {
  kind: NoteGroupKind;
  notes: N[];
}

const DAY = 86_400_000;
const dayStart = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Sections of the list: Pinned, Today, Yesterday, the last 7 days, earlier. Sorting by title is one section. */
export function groupNotes<N extends Pick<Note, "pinned" | "createdAt" | "updatedAt">>(
  notes: readonly N[],
  sort: NoteSort,
  now: number = Date.now(),
): NoteGroup<N>[] {
  if (!notes.length) return [];
  if (sort === "title") return [{ kind: "all", notes: [...notes] }];
  const out: NoteGroup<N>[] = [];
  const push = (kind: NoteGroupKind, note: N) => {
    let group = out.find((g) => g.kind === kind);
    if (!group) out.push((group = { kind, notes: [] }));
    group.notes.push(note);
  };
  const today = dayStart(now);
  for (const note of notes) {
    if (note.pinned) push("pinned", note);
    else {
      const days = Math.round((today - dayStart(sort === "created" ? note.createdAt : note.updatedAt)) / DAY);
      push(days <= 0 ? "today" : days === 1 ? "yesterday" : days < 7 ? "week" : "earlier", note);
    }
  }
  const order: NoteGroupKind[] = ["pinned", "today", "yesterday", "week", "earlier"];
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/** Note counts for the sidebar: `all`, `pinned`, `sealed`, `archive`, every `nb:<id>` (with sub-notebooks) and `tag:<tag>`. */
export function scopeCounts(notes: readonly Note[], notebooks: readonly Notebook[]): Record<string, number> {
  const counts: Record<string, number> = { all: 0, pinned: 0, sealed: 0, archive: 0 };
  const bump = (key: string) => void (counts[key] = (counts[key] ?? 0) + 1);
  for (const nb of notebooks) counts[notebookScope(nb.id)] = 0;
  for (const note of notes) {
    if (note.archived) {
      bump("archive");
      continue;
    }
    bump("all");
    if (note.pinned) bump("pinned");
    if (note.sealed) bump("sealed");
    for (const tag of note.tags ?? []) counts[tagScope(tag)] = (counts[tagScope(tag)] ?? 0) + 1;
  }
  for (const nb of notebooks) {
    const ids = notebookIds(notebooks, nb.id);
    counts[notebookScope(nb.id)] = notes.filter((n) => !n.archived && n.notebookId && ids.includes(n.notebookId)).length;
  }
  return counts;
}

/** Tags with their note counts, most used first, then A to Z. Archived notes do not count. */
export function tagCounts(notes: readonly Note[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const note of notes) if (!note.archived) for (const tag of note.tags ?? []) map.set(tag, (map.get(tag) ?? 0) + 1);
  return [...map].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/* ------------------------------------------------------------------ links */

const WIKILINK = /\[\[([^\]\n]+)\]\]/g;

/** Titles written as `[[Title]]` in a note. */
export function wikilinks(text: string): string[] {
  return [...text.matchAll(WIKILINK)].map((m) => (m[1] ?? "").trim()).filter(Boolean);
}

/** Notes that link to `note` with `[[its title]]`. Sealed notes count only when they are unlocked. */
export function backlinksOf(note: Note, notes: readonly Note[], unlocked: readonly string[] = []): Note[] {
  const title = normalizeText(note.title.trim());
  if (!title) return [];
  return notes.filter(
    (other) =>
      other.id !== note.id &&
      !other.archived &&
      (!other.sealed || unlocked.includes(other.id)) &&
      wikilinks(other.format === "markdown" ? other.body : htmlToText(other.body)).some((t) => normalizeText(t) === title),
  );
}

/** The notes a note links to with `[[Title]]`. */
export function linksFrom(note: Note, notes: readonly Note[]): Note[] {
  const titles = wikilinks(note.format === "markdown" ? note.body : htmlToText(note.body)).map(normalizeText);
  return notes.filter((n) => n.id !== note.id && !n.archived && titles.includes(normalizeText(n.title.trim())));
}

/* ------------------------------------------------------------------ duplicate and export */

/** A copy with a new id: not pinned, not archived, titled "<title> (<suffix>)". */
export function duplicateNote(note: Note, { id, now = Date.now(), suffix = "copy" }: { id: string; now?: number; suffix?: string }): Note {
  return { ...note, id, title: `${note.title || ""} (${suffix})`.trim(), pinned: false, archived: false, sealed: false, createdAt: now, updatedAt: now };
}

export type NoteExportFormat = "markdown" | "html" | "text";

export function noteExportFormats(note: Pick<Note, "format">): NoteExportFormat[] {
  return note.format === "markdown" ? ["markdown", "text"] : ["html", "markdown", "text"];
}

/** A small HTML to Markdown converter for the tags the RichTextEditor produces. */
export function htmlToMarkdown(html: string): string {
  let out = html;
  const inline = (s: string) =>
    s
      .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
      .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*")
      .replace(/<(s|del|strike)>([\s\S]*?)<\/\1>/gi, "~~$2~~")
      .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "");
  out = out.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items: string) => {
    let i = 0;
    return `${items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, li: string) => `${++i}. ${inline(li)}\n`)}\n`;
  });
  out = out.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items: string) => `${items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, li: string) => `- ${inline(li)}\n`)}\n`);
  out = out.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n: string, h: string) => `${"#".repeat(Number(n))} ${inline(h)}\n\n`);
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, q: string) => `${inline(q).trim().replace(/^/gm, "> ")}\n\n`);
  out = out.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, p: string) => `${inline(p)}\n\n`);
  out = inline(out).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export interface NoteFile {
  filename: string;
  mime: string;
  content: string;
}

/** The file for one note: `.md`, `.html` (rich notes) or `.txt`. */
export function exportNote(note: Note, format: NoteExportFormat): NoteFile {
  const title = note.title.trim() || "Untitled";
  const name = slugify(title);
  const isMarkdown = note.format === "markdown";
  if (format === "text") return { filename: `${name}.txt`, mime: "text/plain;charset=utf-8", content: `${title}\n\n${bodyText(note)}\n` };
  if (format === "markdown") return { filename: `${name}.md`, mime: "text/markdown;charset=utf-8", content: `# ${title}\n\n${isMarkdown ? note.body : htmlToMarkdown(note.body)}\n` };
  const body = isMarkdown ? `<pre>${escapeHtml(note.body)}</pre>` : note.body;
  return {
    filename: `${name}.html`,
    mime: "text/html;charset=utf-8",
    content: `<!doctype html>\n<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body dir="auto"><h1>${escapeHtml(title)}</h1>\n${body}\n</body></html>\n`,
  };
}

/* ------------------------------------------------------------------ Markdown formatting */

export type MarkdownFormat = "bold" | "italic" | "strike" | "code" | "link" | "wikilink" | "h1" | "h2" | "h3" | "quote" | "bullet" | "ordered" | "task";

export interface TextEdit {
  value: string;
  start: number;
  end: number;
}

const WRAP: Partial<Record<MarkdownFormat, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
  wikilink: ["[[", "]]"],
};

const LINE_MARK: Record<string, RegExp> = {
  h1: /^# /,
  h2: /^## /,
  h3: /^### /,
  quote: /^> ?/,
  bullet: /^[-*+] (?!\[[ xX]\] )/,
  ordered: /^\d+\. /,
  task: /^[-*+] \[[ xX]\] /,
};
const ANY_LINE_MARK = /^(#{1,6} |> ?|[-*+] \[[ xX]\] |[-*+] |\d+\. )/;
const LIST_KINDS = new Set<MarkdownFormat>(["bullet", "ordered", "task"]);

/**
 * Applies a Markdown command to the selection `[start, end)` of `value`. Inline commands wrap the selection (and
 * unwrap it when it is already wrapped); `link` selects the `url` placeholder; line commands toggle a prefix on
 * every selected line (headings replace one another, list kinds replace one another).
 */
export function applyMarkdownFormat(value: string, start: number, end: number, format: MarkdownFormat): TextEdit {
  const wrap = WRAP[format];
  if (wrap) {
    const [open, close] = wrap;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    if (before.endsWith(open) && after.startsWith(close)) {
      return { value: before.slice(0, -open.length) + selected + after.slice(close.length), start: start - open.length, end: end - open.length };
    }
    if (selected.length >= open.length + close.length && selected.startsWith(open) && selected.endsWith(close)) {
      const inner = selected.slice(open.length, selected.length - close.length);
      return { value: before + inner + after, start, end: start + inner.length };
    }
    return { value: before + open + selected + close + after, start: start + open.length, end: end + open.length };
  }
  if (format === "link") {
    const selected = value.slice(start, end) || "text";
    const text = `[${selected}](url)`;
    const urlStart = start + selected.length + 3;
    return { value: value.slice(0, start) + text + value.slice(end), start: urlStart, end: urlStart + 3 };
  }
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const stop = value.indexOf("\n", Math.max(end, start));
  const to = stop === -1 ? value.length : stop;
  const lines = value.slice(from, to).split("\n");
  const marker = LINE_MARK[format] as RegExp;
  const filled = lines.filter((l) => l.trim());
  const allHave = filled.length > 0 && filled.every((l) => marker.test(l));
  let n = 0;
  const next = lines.map((line) => {
    if (!line.trim() && lines.length > 1) return line;
    const bare = allHave ? line.replace(marker, "") : format.startsWith("h") || LIST_KINDS.has(format) ? line.replace(ANY_LINE_MARK, "") : line.replace(marker, "");
    if (allHave) return bare;
    n++;
    const prefix = format === "h1" ? "# " : format === "h2" ? "## " : format === "h3" ? "### " : format === "quote" ? "> " : format === "bullet" ? "- " : format === "task" ? "- [ ] " : `${n}. `;
    return prefix + bare;
  });
  const block = next.join("\n");
  return { value: value.slice(0, from) + block + value.slice(to), start: from, end: from + block.length };
}

/* ------------------------------------------------------------------ autosave */

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

export interface SaveState {
  status: SaveStatus;
  /** Counts edits, so a save that finishes after a newer edit leaves the note dirty. */
  rev: number;
  saving: number;
}

export type SaveEvent = { type: "edit" } | { type: "start" } | { type: "done" } | { type: "fail" } | { type: "reset" };

export const INITIAL_SAVE: SaveState = { status: "saved", rev: 0, saving: -1 };

export function saveReducer(state: SaveState, event: SaveEvent): SaveState {
  switch (event.type) {
    case "edit":
      return { ...state, status: "dirty", rev: state.rev + 1 };
    case "start":
      return state.status === "dirty" || state.status === "error" ? { ...state, status: "saving", saving: state.rev } : state;
    case "done":
      return state.status === "saving" ? { ...state, status: state.saving === state.rev ? "saved" : "dirty" } : state;
    case "fail":
      return state.status === "saving" ? { ...state, status: "error" } : state;
    case "reset":
      return INITIAL_SAVE;
  }
}

/* ------------------------------------------------------------------ shortcuts */

export type NoteShortcut = "new" | "pin" | "archive" | "duplicate" | "seal" | "search" | "actions";

export interface KeyLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * Note shortcuts, matched on `code` so they work on an Arabic layout. `Mod+N` new note (browsers keep it for a
 * new window, so `Alt+N` does the same), `Mod+Shift+P` pin, `Mod+Shift+A` archive, `Mod+Shift+D` duplicate,
 * `Mod+Shift+L` seal, `Mod+Shift+F` search, `Alt+M` the actions menu.
 */
export function matchNoteShortcut(e: KeyLike, apple: boolean): NoteShortcut | null {
  const mod = apple ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (mod && !e.altKey && !e.shiftKey && e.code === "KeyN") return "new";
  if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    if (e.code === "KeyN") return "new";
    if (e.code === "KeyM") return "actions";
  }
  if (mod && e.shiftKey && !e.altKey) {
    if (e.code === "KeyP") return "pin";
    if (e.code === "KeyA") return "archive";
    if (e.code === "KeyD") return "duplicate";
    if (e.code === "KeyL") return "seal";
    if (e.code === "KeyF") return "search";
  }
  return null;
}

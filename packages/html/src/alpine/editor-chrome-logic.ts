// Copied from packages/web/src/components/editor-chrome/editor-chrome-model.ts (pure logic, no imports).
/* Pure logic for the editor chrome: open-tab bookkeeping, keyboard moves between tabs, cursor and text statistics. No imports besides the word counter. */

type Segmenter = { segment(s: string): Iterable<{ isWordLike?: boolean }> };

/** Words in a text, by the Unicode word rules when the runtime has `Intl.Segmenter` (Arabic and CJK included), else by spaces. */
function countWords(text: string): number {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: object) => Segmenter }).Segmenter;
  if (Seg) {
    let n = 0;
    for (const s of new Seg(undefined, { granularity: "word" }).segment(text)) if (s.isWordLike) n++;
    return n;
  }
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export interface EditorTab {
  id: string;
  title: string;
  /** Unsaved changes: a dot replaces nothing, it sits before the close button. */
  dirty?: boolean;
  /** Pinned tabs sort first and cannot be closed by "close others". */
  pinned?: boolean;
  /** Optional path or breadcrumb, shown as the tooltip. */
  path?: string;
}

/** Closes a tab. When it was the active one the neighbour that takes its place is the next tab, else the previous one. */
export function closeEditorTab(tabs: readonly EditorTab[], activeId: string | null, id: string): { tabs: EditorTab[]; activeId: string | null } {
  const index = tabs.findIndex((t) => t.id === id);
  if (index < 0) return { tabs: [...tabs], activeId };
  const next = tabs.filter((t) => t.id !== id);
  if (activeId !== id) return { tabs: next, activeId };
  return { tabs: next, activeId: (next[index] ?? next[index - 1] ?? null)?.id ?? null };
}

/** Close every tab but `id` (and pinned ones). The kept tab becomes active when the active one was closed. */
export function closeOtherEditorTabs(tabs: readonly EditorTab[], activeId: string | null, id: string): { tabs: EditorTab[]; activeId: string | null } {
  const next = tabs.filter((t) => t.id === id || t.pinned);
  return { tabs: next, activeId: next.some((t) => t.id === activeId) ? activeId : id };
}

/** Where a key moves focus among tabs. `dir` decides which arrow is "next". Wraps around. Returns `null` for other keys. */
export function editorTabKeyTarget(ids: readonly string[], currentId: string | null, key: string, dir: "ltr" | "rtl" = "ltr"): string | null {
  if (!ids.length) return null;
  const i = Math.max(0, ids.indexOf(currentId ?? ""));
  const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const backward = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
  if (key === forward) return ids[(i + 1) % ids.length] ?? null;
  if (key === backward) return ids[(i - 1 + ids.length) % ids.length] ?? null;
  if (key === "Home") return ids[0] ?? null;
  if (key === "End") return ids[ids.length - 1] ?? null;
  return null;
}

/** Pinned tabs first, otherwise the given order. */
export function orderEditorTabs(tabs: readonly EditorTab[]): EditorTab[] {
  return [...tabs.filter((t) => t.pinned), ...tabs.filter((t) => !t.pinned)];
}

export interface EditorCursor {
  line: number;
  column: number;
}

/** 1-based line and column of a caret offset in `text`. */
export function editorCursorAt(text: string, offset: number): EditorCursor {
  const head = text.slice(0, Math.max(0, Math.min(offset, text.length)));
  const line = head.split("\n").length;
  return { line, column: head.length - head.lastIndexOf("\n") };
}

export interface EditorTextStats {
  words: number;
  characters: number;
  lines: number;
}

/** Words (Unicode word rules, so Arabic counts), characters without line breaks, and lines. */
export function editorTextStats(text: string): EditorTextStats {
  return { words: countWords(text), characters: text.replace(/\r?\n/g, "").length, lines: text ? text.split("\n").length : 0 };
}

export type EditorSaveState = "saved" | "saving" | "dirty" | "error" | "offline";

/** Whether the state is worth interrupting for: something is not saved. */
export function editorSaveNeedsAttention(state: EditorSaveState): boolean {
  return state === "error" || state === "offline";
}

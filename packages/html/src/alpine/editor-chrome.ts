// Editor chrome: nqEditorTabs (the strip of open documents) and nqEditorStatus (the cursor, word count and save state).
// The Blade parts are editor-chrome.tabs, editor-chrome.status-bar (and the static editor-chrome.backlinks).
//
//   <div x-data="nqEditorTabs([{ id: 'a', title: 'Trip plan', dirty: true }], 'a', { closable: true })" x-modelable="active">…</div>
//   <div x-data="nqEditorStatus({ saveState: 'saved' }, { source: '#editor' })">…</div>
//
// Tabs: arrow keys (mirrored in RTL) and Home/End move between tabs, Delete or middle-click closes, the active tab scrolls into view.
// Events from the root (bubbling): "nq-editor-tab-select" { id }, "nq-editor-tab-close" { id }, "nq-editor-tab-new". With `closable`
// the strip removes the tab itself (and activates a neighbour); pass `closable: false` to hide the close buttons.
// Status: `source` is a CSS selector for a textarea or input whose text and caret drive the words, characters, line and column.
// Set it by hand with a window event: dispatch "nq-editor-status" with a partial { words, characters, line, column, selection, saveState }.
// Not ported: the per-tab context menu (pin, close others, close all, tabActions); use the events instead.

import { closeEditorTab, editorCursorAt, editorSaveNeedsAttention, editorTabKeyTarget, editorTextStats, type EditorSaveState, type EditorTab } from "./editor-chrome-logic";
import type { Magics, Register } from "./types";

export interface EditorStatusState {
  words?: number;
  characters?: number;
  line?: number;
  column?: number;
  selection?: number;
  saveState?: EditorSaveState;
}

interface Nq {
  t(en: string, ar: string): string;
  locale: string;
  dir: string;
}
interface TabsState extends Magics {
  $nq: Nq;
  tabs: EditorTab[];
  active: string | null;
  closable: boolean;
  root: HTMLElement;
  find(id: string): HTMLElement | null;
  select(id: string): void;
  close(id: string): void;
  title(tab: EditorTab): string;
}
interface StatusState extends Magics {
  $nq: Nq;
  s: EditorStatusState;
  root: HTMLElement;
  sync(el: HTMLInputElement | HTMLTextAreaElement): void;
  n(value: number): string;
}

export const editorChrome: Register = (Alpine) => {
  Alpine.data("nqEditorTabs", (tabs: EditorTab[] = [], active: string | null = null, options: { closable?: boolean } = {}) => ({
    tabs,
    active,
    closable: options.closable !== false,
    root: null as unknown as HTMLElement,
    init(this: TabsState) {
      this.root = this.$el;
      this.$watch("active", () =>
        this.$nextTick(() => {
          if (this.active) this.find(this.active)?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        }),
      );
    },
    find(this: TabsState, id: string) {
      return this.root.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`);
    },
    title(this: TabsState, tab: EditorTab) {
      return tab.title || this.$nq.t("Untitled", "بلا عنوان");
    },
    closeLabel(this: TabsState, tab: EditorTab) {
      return this.$nq.t("Close ", "إغلاق ") + this.title(tab);
    },
    select(this: TabsState, id: string) {
      this.active = id;
      this.root.dispatchEvent(new CustomEvent("nq-editor-tab-select", { bubbles: true, detail: { id } }));
    },
    close(this: TabsState, id: string) {
      const next = closeEditorTab(this.tabs, this.active, id);
      this.tabs = next.tabs;
      const changed = next.activeId !== this.active;
      this.active = next.activeId;
      this.root.dispatchEvent(new CustomEvent("nq-editor-tab-close", { bubbles: true, detail: { id } }));
      if (changed && next.activeId) this.root.dispatchEvent(new CustomEvent("nq-editor-tab-select", { bubbles: true, detail: { id: next.activeId } }));
    },
    add(this: TabsState) {
      this.root.dispatchEvent(new CustomEvent("nq-editor-tab-new", { bubbles: true }));
    },
    onKey(this: TabsState, event: KeyboardEvent, tab: EditorTab) {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Delete" && this.closable) {
        event.preventDefault();
        this.close(tab.id);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.select(tab.id);
        return;
      }
      const target = editorTabKeyTarget(
        this.tabs.map((x) => x.id),
        tab.id,
        event.key,
        this.$nq.dir === "rtl" ? "rtl" : "ltr",
      );
      if (target) {
        event.preventDefault();
        this.select(target);
        this.$nextTick(() => this.find(target)?.focus());
      }
    },
    onAux(this: TabsState, event: MouseEvent, tab: EditorTab) {
      if (event.button === 1 && this.closable) {
        event.preventDefault();
        this.close(tab.id);
      }
    },
  }));

  Alpine.data("nqEditorStatus", (initial: EditorStatusState = {}, options: { source?: string } = {}) => ({
    s: { ...initial } as EditorStatusState,
    root: null as unknown as HTMLElement,
    init(this: StatusState) {
      this.root = this.$el;
      const el = options.source ? document.querySelector<HTMLInputElement | HTMLTextAreaElement>(options.source) : null;
      if (!el) return;
      const run = () => this.sync(el);
      for (const type of ["input", "keyup", "click", "select", "focus"]) el.addEventListener(type, run);
      run();
    },
    sync(this: StatusState, el: HTMLInputElement | HTMLTextAreaElement) {
      const stats = editorTextStats(el.value);
      const start = el.selectionStart ?? 0;
      const cursor = editorCursorAt(el.value, start);
      this.s = { ...this.s, words: stats.words, characters: stats.characters, line: cursor.line, column: cursor.column, selection: Math.abs((el.selectionEnd ?? start) - start) };
    },
    /** Merge a partial status (the "nq-editor-status" window event). */
    set(this: StatusState, patch: EditorStatusState) {
      this.s = { ...this.s, ...patch };
    },
    n(this: StatusState, value: number) {
      return new Intl.NumberFormat(this.$nq.locale).format(value);
    },
    position(this: StatusState) {
      const { line, column } = this.s;
      if (line === undefined) return "";
      const l = this.$nq.t(`Ln ${this.n(line)}`, `سطر ${this.n(line)}`);
      return column === undefined ? l : `${l}, ${this.$nq.t(`Col ${this.n(column)}`, `عمود ${this.n(column)}`)}`;
    },
    selected(this: StatusState) {
      const n = this.s.selection ?? 0;
      return this.$nq.t(`${this.n(n)} selected`, `${this.n(n)} محددة`);
    },
    wordsText(this: StatusState) {
      const n = this.s.words ?? 0;
      return this.$nq.t(`${this.n(n)} words`, `${this.n(n)} كلمة`);
    },
    charsText(this: StatusState) {
      const n = this.s.characters ?? 0;
      return this.$nq.t(`${this.n(n)} characters`, `${this.n(n)} حرف`);
    },
    stateText(this: StatusState) {
      const map: Record<string, [string, string]> = {
        saved: ["Saved", "تم الحفظ"],
        saving: ["Saving", "جارٍ الحفظ"],
        dirty: ["Unsaved changes", "تغييرات غير محفوظة"],
        error: ["Could not save", "تعذر الحفظ"],
        offline: ["Offline, kept on this device", "دون اتصال، محفوظ على هذا الجهاز"],
      };
      const pair = map[this.s.saveState ?? ""];
      return pair ? this.$nq.t(pair[0], pair[1]) : "";
    },
    attention(this: StatusState) {
      return this.s.saveState ? editorSaveNeedsAttention(this.s.saveState) : false;
    },
    retry(this: StatusState) {
      this.root.dispatchEvent(new CustomEvent("nq-editor-retry", { bubbles: true }));
    },
  }));
};

// nqMarkdownEditor: the behaviour of the React MarkdownEditor. The server renders the toolbar, the text area and the preview frame; this
// holds the text, the view (write / preview / split), the toolbar commands, Ctrl/Cmd+B, I and K, and the live preview.
//
//   <div data-slot="markdown-editor" x-data="nqMarkdownEditor({ value: '## Notes', view: 'split', disabled: false })" x-modelable="body">
//     <button x-on:mousedown.prevent x-on:click="apply('bold')" x-bind:disabled="locked()"> …
//     <div x-model="modes"> (the nqToggleGroup: write | preview | split) …
//     <textarea x-ref="field" x-model="body" x-show="showsEditor()" x-on:keydown="onKey($event)">
//     <div data-slot="markdown-editor-preview" x-show="showsPreview()" x-html="previewHtml()">
//
// x-model works on the text (x-modelable="body"). Emits nq-view-change { view } from the root when the view changes.
// The preview is HTML built in the browser from the Markdown by the same parser as the Markdown component; raw HTML in the source is
// dropped and unsafe URLs removed, so it is safe for user text.

import { applyMarkdownEditorFormat, markdownEditorHtml, MARKDOWN_EDITOR_TOOLS, type MarkdownEditorFormat } from "./markdown-editor-logic";
import type { Magics, Register } from "./types";

interface Options {
  value?: string;
  view?: "write" | "preview" | "split";
  disabled?: boolean;
  /** Shown in the preview when there is no text. */
  empty?: string;
}

interface State extends Magics {
  host: HTMLElement;
  body: string;
  mode: "write" | "preview" | "split";
  modes: string[];
  off: boolean;
  emptyHint: string;
  $refs: { field?: HTMLTextAreaElement };
  apply(format: MarkdownEditorFormat): void;
}

const VIEWS = ["write", "preview", "split"];

export const markdownEditor: Register = (Alpine) => {
  Alpine.data("nqMarkdownEditor", (options: Options = {}) => ({
    host: null as unknown as HTMLElement,
    body: options.value ?? "",
    mode: options.view ?? "write",
    modes: [options.view ?? "write"],
    off: Boolean(options.disabled),
    emptyHint: options.empty ?? "Nothing to preview yet.",

    init(this: State) {
      this.host = this.$el;
      // The toggle group may clear itself by pressing the pressed item; the view never goes empty.
      this.$watch("modes", (next: unknown) => {
        const first = (next as string[])[0];
        if (!first) {
          this.modes = [this.mode];
          return;
        }
        if (first !== this.mode && VIEWS.includes(first)) {
          this.mode = first as State["mode"];
          this.host.dispatchEvent(new CustomEvent("nq-view-change", { bubbles: true, detail: { view: first } }));
        }
      });
    },

    locked(this: State) {
      return this.off || this.mode === "preview";
    },
    showsEditor(this: State) {
      return this.mode !== "preview";
    },
    showsPreview(this: State) {
      return this.mode !== "write";
    },
    isSplit(this: State) {
      return this.mode === "split";
    },
    previewHtml(this: State) {
      if (!this.body.trim()) return `<p class="text-body-sm text-muted-foreground">${this.emptyHint.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;
      return markdownEditorHtml(this.body);
    },

    apply(this: State, format: MarkdownEditorFormat) {
      const el = this.$refs.field;
      if (!el || this.off) return;
      const r = applyMarkdownEditorFormat(this.body, el.selectionStart, el.selectionEnd, format);
      this.body = r.value;
      this.$nextTick(() => {
        el.value = r.value;
        el.focus();
        el.setSelectionRange(r.start, r.end);
      });
    },
    onKey(this: State, event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      const tool = MARKDOWN_EDITOR_TOOLS.find((x) => x.shortcut === event.key.toLowerCase());
      if (!tool) return;
      event.preventDefault();
      this.apply(tool.format);
    },
  }));
};

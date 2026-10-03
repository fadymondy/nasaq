// nqRichText: the behaviour behind the Nasaq rich text editor (toolbar state, commands, link form, value sync).
// Tiptap is NOT bundled. The page supplies it through a loader that resolves to { Editor, Extension, StarterKit, Placeholder }
// (from @tiptap/core, @tiptap/starter-kit and @tiptap/extensions), fetched lazily the first time the editor mounts:
//
//   window.NasaqRichText = { load: () => import("/assets/tiptap.js") }      // once, for every editor
//   x-data="nqRichText('<p>Hello</p>', { load: () => import('/assets/tiptap.js') })"   // or per editor
//
// Until it arrives (or when no loader is given) the toolbar buttons are disabled. `value` is x-modelable (HTML, or the
// Tiptap JSON with format: "json"). Events (bubbling): "ready" { editor }, "change" { value }, "blur".
// Markup: see the Blade component. The writing area is the element with x-ref="host".

import type { Magics, Register } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Chain {
  run(): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [command: string]: any;
}

export interface RichTextEditorLike {
  chain(): Chain;
  can(): { undo(): boolean; redo(): boolean };
  isActive(name: string, attributes?: Record<string, unknown>): boolean;
  getAttributes(name: string): Record<string, unknown>;
  getHTML(): string;
  getJSON(): unknown;
  setEditable(editable: boolean): void;
  commands: { setContent(content: unknown, options?: { emitUpdate?: boolean }): unknown };
  destroy(): void;
}

export interface RichTextTiptap {
  Editor: new (options: Record<string, unknown>) => RichTextEditorLike;
  Extension: { create(config: Record<string, unknown>): unknown };
  StarterKit: { configure(options: Record<string, unknown>): unknown };
  Placeholder: { configure(options: Record<string, unknown>): unknown };
}

export interface RichTextOptions {
  load?: () => Promise<RichTextTiptap>;
  format?: "html" | "json";
  readOnly?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

/** Only http(s), mailto, tel and relative links are allowed; a whole-value merge tag such as {{action_url}} too. */
export function isSafeLink(url: string): boolean {
  const u = url.trim();
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u) || /^\{\{\s*[\w.-]+\s*\}\}$/.test(u);
}

const COMMANDS: Record<string, [method: string, args?: Record<string, unknown>]> = {
  bold: ["toggleBold"],
  italic: ["toggleItalic"],
  underline: ["toggleUnderline"],
  strike: ["toggleStrike"],
  code: ["toggleCode"],
  h1: ["toggleHeading", { level: 1 }],
  h2: ["toggleHeading", { level: 2 }],
  h3: ["toggleHeading", { level: 3 }],
  bulletList: ["toggleBulletList"],
  orderedList: ["toggleOrderedList"],
  blockquote: ["toggleBlockquote"],
};

/** Every block gets an HTML `dir` attribute (default "auto") so each paragraph picks its own direction. */
const autoDirection = {
  name: "autoDirection",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote", "bulletList", "orderedList"],
        attributes: {
          dir: {
            default: "auto",
            parseHTML: (element: HTMLElement) => element.getAttribute("dir") || "auto",
            renderHTML: (attributes: { dir?: string }) => ({ dir: attributes.dir || "auto" }),
          },
        },
      },
    ];
  },
};

const same = (a: unknown, b: unknown) => (typeof a === "string" ? a === b : JSON.stringify(a) === JSON.stringify(b));

type Scope = Magics & {
  value: unknown;
  version: number;
  ready: boolean;
  linkOpen: boolean;
  linkUrl: string;
  linkError: boolean;
  $refs: { host?: HTMLElement };
} & Record<string, any>;

export const richTextEditor: Register = (Alpine) => {
  Alpine.data("nqRichText", (initial: unknown = "", options: RichTextOptions = {}) => {
    let editor: RichTextEditorLike | null = null;
    let destroyed = false;
    return {
      value: initial,
      version: 0,
      ready: false,
      linkOpen: false,
      linkUrl: "",
      linkError: false,

      init(this: Scope & { value: unknown }) {
        const load = options.load ?? (window as unknown as { NasaqRichText?: { load?: () => Promise<RichTextTiptap> } }).NasaqRichText?.load;
        if (!load) return;
        void load().then((tiptap) => {
          const host = this.$refs.host;
          if (destroyed || !host) return;
          const json = options.format === "json";
          const label = options.ariaLabel ?? this.$nq.t("Rich text editor", "محرر نص منسق");
          const placeholder = options.placeholder ?? this.$nq.t("Write something…", "اكتب شيئًا…");
          editor = new tiptap.Editor({
            element: host,
            extensions: [
              tiptap.StarterKit.configure({ link: { openOnClick: false, autolink: true, isAllowedUri: (u: string) => isSafeLink(u) } }),
              tiptap.Extension.create(autoDirection),
              tiptap.Placeholder.configure({ placeholder }),
            ],
            content: this.value,
            editable: !options.readOnly,
            editorProps: {
              attributes: {
                role: "textbox",
                "aria-multiline": "true",
                "aria-readonly": options.readOnly ? "true" : "false",
                "aria-label": label,
                "data-slot": "rich-text-editor-content",
              },
            },
            onUpdate: ({ editor: ed }: { editor: RichTextEditorLike }) => {
              this.value = json ? ed.getJSON() : ed.getHTML();
              this.$root.dispatchEvent(new CustomEvent("change", { detail: { value: this.value }, bubbles: true }));
            },
            onBlur: () => this.$root.dispatchEvent(new CustomEvent("blur", { bubbles: true })),
            onTransaction: () => void this.version++,
          });
          this.ready = true;
          this.$root.dispatchEvent(new CustomEvent("ready", { detail: { editor }, bubbles: true }));
        });
        // Controlled value: push outside changes into the document without echoing them back.
        this.$watch("value", (next: unknown) => {
          if (!editor || next === undefined || next === null) return;
          const current = options.format === "json" ? editor.getJSON() : editor.getHTML();
          if (!same(current, next)) editor.commands.setContent(next, { emitUpdate: false });
        });
      },
      destroy() {
        destroyed = true;
        editor?.destroy();
        editor = null;
      },

      /** Is this toolbar item active at the cursor? Reads `version` so the binding refreshes on every transaction. */
      on(this: Scope, item: string): boolean {
        void this.version;
        if (!editor) return false;
        if (item.length === 2 && item[0] === "h") return editor.isActive("heading", { level: Number(item[1]) });
        return editor.isActive(item);
      },
      run(item: string) {
        const entry = COMMANDS[item];
        if (!editor || !entry) return;
        const [method, args] = entry;
        (editor.chain().focus()[method] as (a?: unknown) => Chain)(args).run();
      },
      canUndo(this: Scope): boolean {
        void this.version;
        return !!editor && editor.can().undo();
      },
      canRedo(this: Scope): boolean {
        void this.version;
        return !!editor && editor.can().redo();
      },
      undo() {
        editor?.chain().focus().undo().run();
      },
      redo() {
        editor?.chain().focus().redo().run();
      },

      toggleLink(this: Scope) {
        this.linkOpen = !this.linkOpen;
        if (this.linkOpen && editor) {
          this.linkUrl = (editor.getAttributes("link").href as string | undefined) ?? "";
          this.linkError = false;
        }
      },
      applyLink(this: Scope) {
        if (!editor) return;
        const next = this.linkUrl.trim();
        const chain = editor.chain().focus().extendMarkRange("link");
        if (!next) chain.unsetLink().run();
        else if (isSafeLink(next)) chain.setLink({ href: next }).run();
        else {
          this.linkError = true;
          return;
        }
        this.linkOpen = false;
      },
      removeLink(this: Scope) {
        editor?.chain().focus().extendMarkRange("link").unsetLink().run();
        this.linkOpen = false;
      },
    } satisfies ThisType<Scope>;
  });
};

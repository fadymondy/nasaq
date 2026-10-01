/*
 * Everything in RichTextEditor that does not need Tiptap itself: strings, the toolbar model, the link filter, the
 * command table and the structural types of the Tiptap pieces. Tiptap is not a dependency of @fadymondy/nasaq/vue:
 * the app supplies it through the `load` prop (see RichTextTiptap), so an app that never renders the editor ships none of it.
 */

export const STRINGS = {
  en: {
    toolbar: "Formatting",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    strike: "Strikethrough",
    code: "Code",
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    bulletList: "Bulleted list",
    orderedList: "Numbered list",
    blockquote: "Quote",
    link: "Link",
    undo: "Undo",
    redo: "Redo",
    url: "Link address",
    apply: "Apply",
    remove: "Remove link",
    placeholder: "Write something…",
    editor: "Rich text editor",
  },
  ar: {
    toolbar: "التنسيق",
    bold: "خط عريض",
    italic: "خط مائل",
    underline: "تسطير",
    strike: "يتوسطه خط",
    code: "شيفرة",
    h1: "عنوان 1",
    h2: "عنوان 2",
    h3: "عنوان 3",
    bulletList: "قائمة نقطية",
    orderedList: "قائمة مرقمة",
    blockquote: "اقتباس",
    link: "رابط",
    undo: "تراجع",
    redo: "إعادة",
    url: "عنوان الرابط",
    apply: "تطبيق",
    remove: "إزالة الرابط",
    placeholder: "اكتب شيئًا…",
    editor: "محرر نص منسق",
  },
};

export const richTextStrings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type RichTextFormat = "html" | "json";
export type RichTextToolbarItem =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "code"
  | "h1"
  | "h2"
  | "h3"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "link"
  | "undo"
  | "redo";

export const DEFAULT_TOOLBAR: RichTextToolbarItem[] = [
  "bold", "italic", "underline", "strike", "code",
  "h1", "h2", "h3", "bulletList", "orderedList", "blockquote",
  "link", "undo", "redo",
];

export const MARK_ITEMS = ["bold", "italic", "underline", "strike", "code"] as const;
export const BLOCK_ITEMS = ["h1", "h2", "h3", "bulletList", "orderedList", "blockquote"] as const;

/** A Tiptap JSON document. */
export type RichTextJson = { type?: string; attrs?: Record<string, unknown>; content?: RichTextJson[]; marks?: unknown[]; text?: string; [key: string]: unknown };

/** The chain methods the toolbar calls; a Tiptap `editor.chain()` has them all. */
export interface RichTextChain {
  focus(): RichTextChain;
  run(): boolean;
  [method: string]: (...args: never[]) => unknown;
}

/** The slice of a Tiptap `Editor` the toolbar and frame use. A real `@tiptap/core` Editor satisfies it. */
export interface RichTextEditorLike {
  chain(): RichTextChain;
  can(): { undo(): boolean; redo(): boolean };
  isActive(name: string, attributes?: Record<string, unknown>): boolean;
  getAttributes(name: string): Record<string, unknown>;
  getHTML(): string;
  getJSON(): RichTextJson;
  setEditable(editable: boolean): void;
  commands: { setContent(content: string | RichTextJson, options?: { emitUpdate?: boolean }): unknown };
  on(event: string, handler: (...args: never[]) => void): unknown;
  off(event: string, handler: (...args: never[]) => void): unknown;
  destroy(): void;
}

/** What `load` resolves to: the Tiptap pieces the editor needs. Re-export them from one module in your app. */
export interface RichTextTiptap {
  Editor: new (options: Record<string, unknown>) => RichTextEditorLike;
  Extension: { create(config: Record<string, unknown>): unknown };
  StarterKit: { configure(options: Record<string, unknown>): unknown };
  Placeholder: { configure(options: Record<string, unknown>): unknown };
}

/** Only http(s), mailto, tel and relative links are allowed; anything else (javascript:, data:) is refused. */
export function isSafeLink(url: string): boolean {
  const u = url.trim();
  // A whole-value merge tag such as {{action_url}} is allowed so email templates can link to a variable.
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u) || /^\{\{\s*[\w.-]+\s*\}\}$/.test(u);
}

/**
 * Config of the AutoDirection extension: every block gets an HTML `dir` attribute (default "auto") so each paragraph,
 * heading, quote and list picks its own direction. Build it with `Extension.create(autoDirectionConfig)`.
 */
export const autoDirectionConfig = {
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

/** Runs the toolbar command behind a mark or block item. */
export function runItem(editor: RichTextEditorLike, item: RichTextToolbarItem): boolean {
  const entry = COMMANDS[item];
  if (!entry) return false;
  const chain = editor.chain().focus();
  const [method, args] = entry;
  return ((chain[method] as (a?: Record<string, unknown>) => RichTextChain)(args) as RichTextChain).run();
}

export interface ActiveState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  link: boolean;
  href: string;
  canUndo: boolean;
  canRedo: boolean;
}

export const EMPTY_ACTIVE: ActiveState = {
  bold: false, italic: false, underline: false, strike: false, code: false, h1: false, h2: false, h3: false,
  bulletList: false, orderedList: false, blockquote: false, link: false, href: "", canUndo: false, canRedo: false,
};

export function readActive(e: RichTextEditorLike): ActiveState {
  return {
    bold: e.isActive("bold"),
    italic: e.isActive("italic"),
    underline: e.isActive("underline"),
    strike: e.isActive("strike"),
    code: e.isActive("code"),
    h1: e.isActive("heading", { level: 1 }),
    h2: e.isActive("heading", { level: 2 }),
    h3: e.isActive("heading", { level: 3 }),
    bulletList: e.isActive("bulletList"),
    orderedList: e.isActive("orderedList"),
    blockquote: e.isActive("blockquote"),
    link: e.isActive("link"),
    href: (e.getAttributes("link").href as string | undefined) ?? "",
    canUndo: e.can().undo(),
    canRedo: e.can().redo(),
  };
}

export const isMac = () => typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

/** Shortcut text shown in each button's tooltip. */
export function shortcutKeys(item: RichTextToolbarItem, mac = isMac()): string | undefined {
  const mod = mac ? "⌘" : "Ctrl+";
  const alt = mac ? "⌥" : "Alt+";
  const shift = mac ? "⇧" : "Shift+";
  const keys: Partial<Record<RichTextToolbarItem, string>> = {
    bold: `${mod}B`,
    italic: `${mod}I`,
    underline: `${mod}U`,
    strike: `${mod}${shift}S`,
    code: `${mod}E`,
    h1: `${mod}${alt}1`,
    h2: `${mod}${alt}2`,
    h3: `${mod}${alt}3`,
    bulletList: `${mod}${shift}8`,
    orderedList: `${mod}${shift}7`,
    blockquote: `${mod}${shift}B`,
    link: mac ? "⌘K" : "Ctrl+K",
    undo: `${mod}Z`,
    redo: `${mod}${shift}Z`,
  };
  return keys[item];
}

export const sameDocument = (a: unknown, b: unknown) => (typeof a === "string" ? a === b : JSON.stringify(a) === JSON.stringify(b));

/** The Tiptap extensions the editor uses, built from the pieces `load` returned. */
export function buildExtensions(tiptap: RichTextTiptap, placeholder: string): unknown[] {
  return [
    tiptap.StarterKit.configure({ link: { openOnClick: false, autolink: true, isAllowedUri: (url: string) => isSafeLink(url) } }),
    tiptap.Extension.create(autoDirectionConfig),
    tiptap.Placeholder.configure({ placeholder }),
  ];
}

/** Classes of the writing area (copied from the React component). */
export const contentClass = [
  "[&_.tiptap]:min-h-[inherit] [&_.tiptap]:outline-none [&_.tiptap]:flex [&_.tiptap]:flex-col [&_.tiptap]:gap-3",
  "[&_.tiptap]:text-body [&_.tiptap]:text-nq-fg-body",
  "[&_.tiptap_p]:text-start [&_.tiptap_p]:min-h-[1lh]",
  "[&_.tiptap_h1]:text-h1 [&_.tiptap_h1]:text-foreground [&_.tiptap_h1]:text-start",
  "[&_.tiptap_h2]:text-h2 [&_.tiptap_h2]:text-foreground [&_.tiptap_h2]:text-start",
  "[&_.tiptap_h3]:text-h3 [&_.tiptap_h3]:text-foreground [&_.tiptap_h3]:text-start",
  "[&_.tiptap_ul]:list-disc [&_.tiptap_ol]:list-decimal [&_.tiptap_ul]:ps-6 [&_.tiptap_ol]:ps-6 [&_.tiptap_ul]:space-y-1 [&_.tiptap_ol]:space-y-1",
  "[&_.tiptap_li]:text-start [&_.tiptap_li]:marker:text-muted-foreground",
  "[&_.tiptap_blockquote]:border-s-2 [&_.tiptap_blockquote]:border-nq-line-strong [&_.tiptap_blockquote]:ps-4 [&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_blockquote]:text-start",
  "[&_.tiptap_a]:rounded-[2px] [&_.tiptap_a]:text-foreground [&_.tiptap_a]:underline [&_.tiptap_a]:decoration-nq-line-strong [&_.tiptap_a]:underline-offset-4",
  "[&_.tiptap_strong]:font-semibold [&_.tiptap_strong]:text-foreground",
  "[&_.tiptap_code]:rounded-[4px] [&_.tiptap_code]:bg-secondary [&_.tiptap_code]:px-1 [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-code",
  "[&_.tiptap_pre]:overflow-x-auto [&_.tiptap_pre]:rounded-control [&_.tiptap_pre]:bg-secondary [&_.tiptap_pre]:p-3 [&_.tiptap_pre]:font-mono [&_.tiptap_pre]:text-code [&_.tiptap_pre]:text-start [&_.tiptap_pre]:[direction:ltr]",
  "[&_.tiptap_hr]:border-0 [&_.tiptap_hr]:border-t [&_.tiptap_hr]:border-border",
  // Placeholder text is CSS generated from data-placeholder on the empty first block.
  "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-start [&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
  "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
];

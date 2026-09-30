"use client";

import { Placeholder } from "@tiptap/extensions";
import { type Editor, EditorContent, Extension, type JSONContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Input } from "../field";
import { Icon } from "../icon";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Separator } from "../separator";
import { Kbd } from "../text";
import { Toggle, ToggleGroup } from "../toggle-group";
import { Tooltip } from "../tooltip";

const STRINGS = {
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

/**
 * Gives every block an HTML `dir` attribute (default `"auto"`) so each paragraph, heading, quote and list picks its
 * own direction from its first strong character. The attribute is part of the document, so it survives in HTML and JSON output.
 */
export const AutoDirection = Extension.create({
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
});

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

const DEFAULT_TOOLBAR: RichTextToolbarItem[] = [
  "bold", "italic", "underline", "strike", "code",
  "h1", "h2", "h3", "bulletList", "orderedList", "blockquote",
  "link", "undo", "redo",
];

const isMac = () => typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

interface RichTextEditorBaseProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange" | "children"> {
  /** Shown while the document is empty. Defaults to a localised "Write something…". */
  placeholder?: string;
  /** Render the content without a toolbar and refuse edits. */
  readOnly?: boolean;
  /** Which toolbar buttons to show, in order. Pass `[]` to hide the toolbar. */
  toolbar?: RichTextToolbarItem[];
  /** Fires on focus loss. */
  onBlur?: () => void;
  /** `id` of the label element (a `FieldLabel`) that names the editor. */
  "aria-labelledby"?: string;
  /** Minimum height of the writing area. Default `10rem`. */
  minHeight?: string;
}

export interface RichTextEditorHtmlProps extends RichTextEditorBaseProps {
  /** Output and input format. HTML by default. */
  format?: "html";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface RichTextEditorJsonProps extends RichTextEditorBaseProps {
  format: "json";
  value?: JSONContent;
  defaultValue?: JSONContent;
  onValueChange?: (value: JSONContent) => void;
}

export type RichTextEditorProps = RichTextEditorHtmlProps | RichTextEditorJsonProps;

const contentClass = [
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

function ShortcutTip({ label, keys, children }: { label: string; keys?: string; children: React.ReactElement }) {
  return (
    <Tooltip
      content={
        <span className="flex items-center gap-2">
          {label}
          {keys ? <Kbd className="border-transparent bg-transparent text-inherit">{keys}</Kbd> : null}
        </span>
      }
    >
      {children}
    </Tooltip>
  );
}

function useActive(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
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
    }),
  });
}

function run(editor: Editor, item: RichTextToolbarItem) {
  const c = editor.chain().focus();
  switch (item) {
    case "bold": return c.toggleBold().run();
    case "italic": return c.toggleItalic().run();
    case "underline": return c.toggleUnderline().run();
    case "strike": return c.toggleStrike().run();
    case "code": return c.toggleCode().run();
    case "h1": return c.toggleHeading({ level: 1 }).run();
    case "h2": return c.toggleHeading({ level: 2 }).run();
    case "h3": return c.toggleHeading({ level: 3 }).run();
    case "bulletList": return c.toggleBulletList().run();
    case "orderedList": return c.toggleOrderedList().run();
    case "blockquote": return c.toggleBlockquote().run();
    default: return false;
  }
}

/** Only http(s), mailto, tel and relative links are allowed; anything else (javascript:, data:) is refused. */
export function isSafeLink(url: string): boolean {
  const u = url.trim();
  // A whole-value merge tag such as {{action_url}} is allowed so email templates can link to a variable.
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u) || /^\{\{\s*[\w.-]+\s*\}\}$/.test(u);
}

function LinkButton({ editor, label, t, active, href }: { editor: Editor; label: string; t: (typeof STRINGS)["en"]; active: boolean; href: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = url.trim();
    if (!next) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (isSafeLink(next)) editor.chain().focus().extendMarkRange("link").setLink({ href: next }).run();
    else return setError(true);
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setUrl(href);
          setError(false);
        }
      }}
    >
      <ShortcutTip label={label} keys={isMac() ? "⌘K" : "Ctrl+K"}>
        <PopoverTrigger render={<Button size="icon-sm" variant="ghost" aria-label={label} aria-pressed={active} data-pressed={active || undefined} className="data-pressed:bg-nq-selected" />}>
          <Link2 />
        </PopoverTrigger>
      </ShortcutTip>
      <PopoverContent align="start" className="w-72">
        <form onSubmit={submit} className="flex flex-col gap-2">
          <Input
            ltr
            autoFocus
            type="text"
            inputMode="url"
            placeholder="https://"
            aria-label={t.url}
            aria-invalid={error || undefined}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(false);
            }}
          />
          <div className="flex justify-end gap-2">
            {active ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  setOpen(false);
                }}
              >
                {t.remove}
              </Button>
            ) : null}
            <Button type="submit" size="sm" variant="primary">
              {t.apply}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({ editor, items, t }: { editor: Editor; items: RichTextToolbarItem[]; t: (typeof STRINGS)["en"] }) {
  const s = useActive(editor);
  const mod = isMac() ? "⌘" : "Ctrl+";
  const alt = isMac() ? "⌥" : "Alt+";
  const shift = isMac() ? "⇧" : "Shift+";
  const meta: Record<string, { icon: typeof Bold; label: string; keys?: string }> = {
    bold: { icon: Bold, label: t.bold, keys: `${mod}B` },
    italic: { icon: Italic, label: t.italic, keys: `${mod}I` },
    underline: { icon: UnderlineIcon, label: t.underline, keys: `${mod}U` },
    strike: { icon: Strikethrough, label: t.strike, keys: `${mod}${shift}S` },
    code: { icon: Code, label: t.code, keys: `${mod}E` },
    h1: { icon: Heading1, label: t.h1, keys: `${mod}${alt}1` },
    h2: { icon: Heading2, label: t.h2, keys: `${mod}${alt}2` },
    h3: { icon: Heading3, label: t.h3, keys: `${mod}${alt}3` },
    bulletList: { icon: List, label: t.bulletList, keys: `${mod}${shift}8` },
    orderedList: { icon: ListOrdered, label: t.orderedList, keys: `${mod}${shift}7` },
    blockquote: { icon: Quote, label: t.blockquote, keys: `${mod}${shift}B` },
  };
  const has = (i: RichTextToolbarItem) => items.includes(i);
  const marks = (["bold", "italic", "underline", "strike", "code"] as const).filter(has);
  const blocks = (["h1", "h2", "h3", "bulletList", "orderedList", "blockquote"] as const).filter(has);

  const group = (list: readonly RichTextToolbarItem[], label?: string) => {
    if (list.length === 0) return null;
    return (
      <ToggleGroup
        key={list[0]}
        multiple
        aria-label={label}
        className="bg-transparent p-0"
        value={list.filter((i) => s[i as keyof typeof s] === true)}
        onValueChange={(next: string[]) => {
          // A toggle reports the whole new set; run the one item that changed.
          const changed = list.find((i) => next.includes(i) !== (s[i as keyof typeof s] === true));
          if (changed) run(editor, changed);
        }}
      >
        {list.map((i) => {
          const m = meta[i]!;
          return (
            <ShortcutTip key={i} label={m.label} keys={m.keys}>
              <Toggle value={i} aria-label={m.label} onMouseDown={(e) => e.preventDefault()} className="size-control-sm px-0">
                <m.icon />
              </Toggle>
            </ShortcutTip>
          );
        })}
      </ToggleGroup>
    );
  };

  const parts: ReactNode[] = [];
  if (marks.length) parts.push(group(marks));
  if (blocks.length) parts.push(group(blocks));
  const tail: ReactNode[] = [];
  if (has("link")) tail.push(<LinkButton key="link" editor={editor} label={t.link} t={t} active={s.link} href={s.href} />);
  if (has("undo"))
    tail.push(
      <ShortcutTip key="undo" label={t.undo} keys={`${mod}Z`}>
        <Button size="icon-sm" variant="ghost" aria-label={t.undo} disabled={!s.canUndo} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()}>
          <Icon icon={Undo2} />
        </Button>
      </ShortcutTip>,
    );
  if (has("redo"))
    tail.push(
      <ShortcutTip key="redo" label={t.redo} keys={`${mod}${shift}Z`}>
        <Button size="icon-sm" variant="ghost" aria-label={t.redo} disabled={!s.canRedo} onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()}>
          <Icon icon={Redo2} />
        </Button>
      </ShortcutTip>,
    );
  if (tail.length) parts.push(<div key="tail" className="flex items-center gap-0.5">{tail}</div>);

  return (
    <div role="toolbar" aria-label={t.toolbar} data-slot="rich-text-editor-toolbar" className="flex flex-wrap items-center gap-1 border-b border-border bg-card p-1.5">
      {parts.flatMap((p, i) => (i === 0 ? [p] : [<Separator key={`sep-${i}`} orientation="vertical" />, p]))}
    </div>
  );
}

const same = (a: unknown, b: unknown) => (typeof a === "string" ? a === b : JSON.stringify(a) === JSON.stringify(b));

/**
 * A Tiptap (ProseMirror) rich text editor: bold, italic, underline, strike, code, three heading levels, lists,
 * quote, links, undo and redo, with a Nasaq toolbar. Every block carries `dir="auto"`, so Arabic and English
 * paragraphs align themselves. Heavy: load it with `React.lazy` or a dynamic import.
 *
 * Controlled with `value` + `onValueChange` (HTML by default, `format="json"` for Tiptap JSON), or uncontrolled with `defaultValue`.
 * Name it with `aria-labelledby` pointing at a `FieldLabel`'s `id`.
 */
export function RichTextEditor(props: RichTextEditorProps) {
  const {
    format = "html",
    value,
    defaultValue,
    onValueChange,
    placeholder,
    readOnly = false,
    toolbar = DEFAULT_TOOLBAR,
    onBlur,
    minHeight = "10rem",
    className,
    "aria-labelledby": labelledBy,
    "aria-label": ariaLabel,
    ...rest
  } = props as Omit<RichTextEditorHtmlProps, "format" | "value" | "defaultValue" | "onValueChange"> & { format?: RichTextFormat; value?: string | JSONContent; defaultValue?: string | JSONContent; onValueChange?: (value: never) => void };
  const nq = useOptionalNasaq();
  const t = STRINGS[(nq?.locale ?? "en").startsWith("ar") ? "ar" : "en"];
  const fallbackId = useId();
  const latest = useRef({ onValueChange, onBlur, format });
  latest.current = { onValueChange, onBlur, format };
  const initial = useRef(value ?? defaultValue ?? "");
  const placeholderText = placeholder ?? t.placeholder;

  const extensions = useMemo(
    () => [StarterKit.configure({ link: { openOnClick: false, autolink: true, isAllowedUri: (url: string) => isSafeLink(url) } }), AutoDirection, Placeholder.configure({ placeholder: placeholderText })],
    [placeholderText],
  );

  const editor = useEditor(
    {
      extensions,
      content: initial.current as string,
      editable: !readOnly,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          role: "textbox",
          "aria-multiline": "true",
          "aria-readonly": readOnly ? "true" : "false",
          ...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": ariaLabel ?? t.editor }),
          "data-slot": "rich-text-editor-content",
        },
      },
      onUpdate: ({ editor: e }) => {
        const cb = latest.current.onValueChange as ((v: unknown) => void) | undefined;
        cb?.(latest.current.format === "json" ? e.getJSON() : e.getHTML());
      },
      onBlur: () => latest.current.onBlur?.(),
    },
    [extensions],
  );

  // Controlled value: push external changes into the document without echoing them back through onValueChange.
  useEffect(() => {
    if (!editor || value === undefined) return;
    const current = format === "json" ? editor.getJSON() : editor.getHTML();
    if (!same(current, value)) editor.commands.setContent(value as string, { emitUpdate: false });
  }, [editor, value, format]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const items = readOnly ? [] : toolbar;

  return (
    <div
      data-slot="rich-text-editor"
      data-readonly={readOnly || undefined}
      id={rest.id ?? fallbackId}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-control border border-input bg-card text-foreground transition-colors duration-150 ease-nq",
        "focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus",
        readOnly && "border-transparent bg-transparent",
        className,
      )}
      {...rest}
    >
      {editor && items.length > 0 ? <Toolbar editor={editor} items={items} t={t} /> : null}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={cn("min-w-0 flex-1 cursor-text", readOnly ? "p-0" : "px-3 py-2.5", contentClass)}
      />
    </div>
  );
}
export type RichTextJson = JSONContent;

"use client";
import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  type LucideIcon,
  Pencil,
  Quote,
  SquareCode,
} from "lucide-react";
import { type ComponentProps, type KeyboardEvent, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Markdown } from "../markdown";
import { applyMarkdownFormat, type MarkdownFormat } from "../notes/notes-model";
import { Toggle, ToggleGroup } from "../toggle-group";
import { Tooltip } from "../tooltip";

const STRINGS = {
  en: {
    toolbar: "Formatting",
    view: "View",
    write: "Write",
    preview: "Preview",
    split: "Split",
    placeholder: "Write in Markdown…",
    empty: "Nothing to preview yet.",
    bold: "Bold",
    italic: "Italic",
    h2: "Heading",
    h3: "Subheading",
    bullets: "Bulleted list",
    numbers: "Numbered list",
    tasks: "Task list",
    quote: "Quote",
    link: "Link",
    code: "Inline code",
    codeBlock: "Code block",
  },
  ar: {
    toolbar: "التنسيق",
    view: "طريقة العرض",
    write: "كتابة",
    preview: "معاينة",
    split: "تقسيم",
    placeholder: "اكتب بصيغة ماركداون…",
    empty: "لا شيء للمعاينة بعد.",
    bold: "عريض",
    italic: "مائل",
    h2: "عنوان",
    h3: "عنوان فرعي",
    bullets: "قائمة نقطية",
    numbers: "قائمة مرقّمة",
    tasks: "قائمة مهام",
    quote: "اقتباس",
    link: "رابط",
    code: "كود سطري",
    codeBlock: "كتلة كود",
  },
};

export type MarkdownEditorLabels = (typeof STRINGS)["en"];
export type MarkdownEditorView = "write" | "preview" | "split";

type Format = MarkdownFormat | "codeBlock";

const TOOLS: { key: keyof MarkdownEditorLabels; icon: LucideIcon; format: Format; shortcut?: string }[] = [
  { key: "bold", icon: Bold, format: "bold", shortcut: "b" },
  { key: "italic", icon: Italic, format: "italic", shortcut: "i" },
  { key: "h2", icon: Heading2, format: "h2" },
  { key: "h3", icon: Heading3, format: "h3" },
  { key: "bullets", icon: List, format: "bullet" },
  { key: "numbers", icon: ListOrdered, format: "ordered" },
  { key: "tasks", icon: ListChecks, format: "task" },
  { key: "quote", icon: Quote, format: "quote" },
  { key: "link", icon: Link2, format: "link", shortcut: "k" },
  { key: "code", icon: Code, format: "code" },
  { key: "codeBlock", icon: SquareCode, format: "codeBlock" },
];

const FENCE = "```";

function format(text: string, start: number, end: number, f: Format) {
  if (f !== "codeBlock") return applyMarkdownFormat(text, start, end, f);
  const before = text.slice(0, start);
  const open = (before && !before.endsWith("\n") ? "\n" : "") + FENCE + "\n";
  const selected = text.slice(start, end);
  return { value: before + open + selected + "\n" + FENCE + "\n" + text.slice(end), start: start + open.length, end: start + open.length + selected.length };
}

export interface MarkdownEditorProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  view?: MarkdownEditorView;
  defaultView?: MarkdownEditorView;
  onViewChange?: (view: MarkdownEditorView) => void;
  placeholder?: string;
  /** Rows of the text area. Default 10. */
  rows?: number;
  disabled?: boolean;
  /** Name of a hidden input carrying the value, for plain form posts. */
  name?: string;
  /** Accessible name of the text area when there is no visible label. */
  "aria-label"?: string;
  labels?: Partial<MarkdownEditorLabels>;
}

/**
 * A plain-text Markdown editor: a formatting toolbar, a text area and a Write / Preview / Split view with a live
 * preview in Nasaq typography. No editor engine; Ctrl/⌘+B, I and K work. For rich text use `RichTextEditor`.
 */
export function MarkdownEditor({
  value,
  defaultValue = "",
  onValueChange,
  view,
  defaultView = "write",
  onViewChange,
  placeholder,
  rows = 10,
  disabled = false,
  name,
  "aria-label": ariaLabel,
  labels,
  className,
  ...props
}: MarkdownEditorProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const text = value ?? inner;
  const [innerView, setInnerView] = useState<MarkdownEditorView>(defaultView);
  const current = view ?? innerView;

  const setText = (next: string) => {
    setInner(next);
    onValueChange?.(next);
  };
  const setView = (next: MarkdownEditorView) => {
    setInnerView(next);
    onViewChange?.(next);
  };

  function apply(f: Format) {
    const el = ref.current;
    if (!el || disabled) return;
    const r = format(text, el.selectionStart, el.selectionEnd, f);
    setText(r.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.start, r.end);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const tool = TOOLS.find((x) => x.shortcut === e.key.toLowerCase());
    if (tool) {
      e.preventDefault();
      apply(tool.format);
    }
  }

  const showEditor = current !== "preview";
  const showPreview = current !== "write";

  return (
    <div
      data-slot="markdown-editor"
      data-view={current}
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card", disabled && "opacity-60", className)}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-1.5 py-1">
        <div role="toolbar" aria-label={t.toolbar} aria-controls={id} className="flex flex-wrap items-center gap-0.5">
          {TOOLS.map(({ key, icon: Glyph, format: f, shortcut }) => (
            <Tooltip key={key} content={shortcut ? `${t[key]} (⌘${shortcut.toUpperCase()})` : t[key]}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t[key]}
                disabled={disabled || !showEditor}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(f)}
              >
                <Glyph aria-hidden />
              </Button>
            </Tooltip>
          ))}
        </div>
        <ToggleGroup
          aria-label={t.view}
          className="ms-auto"
          value={[current]}
          onValueChange={(v) => v[0] && setView(v[0] as MarkdownEditorView)}
        >
          <Toggle value="write" aria-label={t.write}>
            <Pencil aria-hidden />
            <span className="max-sm:hidden">{t.write}</span>
          </Toggle>
          <Toggle value="preview" aria-label={t.preview}>
            <Eye aria-hidden />
            <span className="max-sm:hidden">{t.preview}</span>
          </Toggle>
          <Toggle value="split" aria-label={t.split} className="max-md:hidden">
            <Columns2 aria-hidden />
            <span className="max-sm:hidden">{t.split}</span>
          </Toggle>
        </ToggleGroup>
      </div>

      <div className={cn("grid min-h-0 flex-1", current === "split" && "md:grid-cols-2 md:divide-x md:divide-border rtl:md:divide-x-reverse")}>
        {showEditor ? (
          <textarea
            ref={ref}
            id={id}
            dir="auto"
            value={text}
            rows={rows}
            disabled={disabled}
            aria-label={ariaLabel ?? t.write}
            placeholder={placeholder ?? t.placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            className="min-h-48 w-full resize-y bg-transparent p-3 font-mono text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:bg-nq-hover/40"
          />
        ) : null}
        {showPreview ? (
          <div data-slot="markdown-editor-preview" aria-live="polite" className={cn("min-h-48 overflow-auto p-4", current === "split" && "max-md:border-t max-md:border-border")}>
            {text.trim() ? <Markdown>{text}</Markdown> : <p className="text-body-sm text-muted-foreground">{t.empty}</p>}
          </div>
        ) : null}
      </div>
      {name ? <input type="hidden" name={name} value={text} /> : null}
    </div>
  );
}

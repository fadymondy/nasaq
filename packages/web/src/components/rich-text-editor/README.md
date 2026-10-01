---
name: rich-text-editor
title: RichTextEditor
category: editors
status: beta
summary: Tiptap-based rich text editor with a Nasaq toolbar, per-paragraph auto direction, HTML or JSON output and read-only mode.
exports: [RichTextEditor, AutoDirection, isSafeLink, RichTextEditorProps, RichTextEditorHtmlProps, RichTextEditorJsonProps, RichTextFormat, RichTextToolbarItem, RichTextJson]
related: [markdown, field, mention-textarea, toggle-group]
story: components-editors-richtexteditor
base-ui: [toggle, toggle-group, popover, tooltip]
keywords: [wysiwyg, editor, tiptap, prosemirror, rich text, html, formatting, rtl]
---

# RichTextEditor

A WYSIWYG editor on Tiptap v3 (ProseMirror). The toolbar offers bold, italic, underline, strike, inline code,
headings 1-3, bulleted and numbered lists, quote, link, undo and redo, each with a tooltip that shows its keyboard
shortcut. Every block gets `dir="auto"`, so an Arabic paragraph and an English paragraph in the same document each
align from their own side.

## Bundle cost

Tiptap plus ProseMirror is roughly 150-200 KB minified (about 50-60 KB gzip) before Nasaq code. The component is
self-contained (no other Nasaq component imports it) and the packages are ES modules with `sideEffects` limited to
CSS, so an app that never renders it does not ship it. Load it lazily where it appears:

```tsx
import { lazy, Suspense } from "react";

const RichTextEditor = lazy(() => import("@nasaq/web").then((m) => ({ default: m.RichTextEditor })));

export function Body(props: { value: string; onChange: (v: string) => void }) {
  return (
    <Suspense fallback={<div className="h-40 rounded-control border border-border" />}>
      <RichTextEditor aria-label="Body" value={props.value} onValueChange={props.onChange} />
    </Suspense>
  );
}
```

## When to use

- Comments, descriptions, notes and articles that need formatting.
- Read-only rendering of content that was authored here (`readOnly`).

## When not to use

- Plain multi-line text: use `Textarea`. Mentions in plain text: [mention-textarea](../mention-textarea/README.md).
- Displaying Markdown: use [markdown](../markdown/README.md).
- Code editing: this is not a code editor.

## Import

```tsx
import { RichTextEditor } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { RichTextEditor } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Notes() {
  const [html, setHtml] = useState("<p>Hello</p>");
  return <RichTextEditor aria-label="Notes" value={html} onValueChange={setHtml} />;
}
```

## Anatomy

```
RichTextEditor                  data-slot="rich-text-editor"
  toolbar                       data-slot="rich-text-editor-toolbar" (role="toolbar")
    ToggleGroup (marks) / ToggleGroup (blocks) / link Popover / undo / redo
  content                       data-slot="rich-text-editor-content" (role="textbox", aria-multiline)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `format` | `"html" \| "json"` | `"html"` | Type of `value`, `defaultValue` and `onValueChange`. |
| `value` | `string \| JSONContent` | | Controlled document. Changes from outside replace the content without echoing. |
| `defaultValue` | `string \| JSONContent` | `""` | Uncontrolled initial document. |
| `onValueChange` | `(value: string) => void` (`JSONContent` for `format="json"`) | | Fires on every edit. |
| `placeholder` | `string` | localised "Write something…" | Shown while empty. |
| `readOnly` | `boolean` | `false` | No toolbar, no editing, no border. |
| `toolbar` | `RichTextToolbarItem[]` | all | Items and their order (`bold italic underline strike code h1 h2 h3 bulletList orderedList blockquote link undo redo`). `[]` hides the toolbar. |
| `minHeight` | `string` | `"10rem"` | Minimum height of the writing area. |
| `aria-labelledby` | `string` | | `id` of the label naming the editor. Without it the editor is named "Rich text editor". |
| `onBlur` | `() => void` | | Focus left the editor. |
| `className` | `string` | | Classes for the outer frame. |

Install `@tiptap/pm` alongside (peer of `@tiptap/react`). Also exported: `AutoDirection` (the Tiptap extension that adds `dir`), `isSafeLink(url)` (http(s), mailto, tel,
relative and `#` links only) and the type `RichTextJson`.

## Examples

Field label and Arabic:

```tsx
import { Field, FieldLabel, RichTextEditor } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function ArabicBody() {
  const [html, setHtml] = useState("<p>مرحبًا</p>");
  return (
    <div lang="ar" dir="rtl">
      <Field>
        <FieldLabel id="body-label">المحتوى</FieldLabel>
        <RichTextEditor aria-labelledby="body-label" value={html} onValueChange={setHtml} />
      </Field>
    </div>
  );
}
```

JSON output:

```tsx
import { RichTextEditor, type RichTextJson } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function JsonNotes() {
  const [doc, setDoc] = useState<RichTextJson>({ type: "doc", content: [{ type: "paragraph" }] });
  return <RichTextEditor format="json" aria-label="Notes" value={doc} onValueChange={setDoc} />;
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Ctrl/Cmd+B, I, U | Bold, italic, underline. |
| Ctrl/Cmd+Shift+S | Strikethrough. |
| Ctrl/Cmd+E | Inline code. |
| Ctrl/Cmd+Alt+1-3 | Headings. |
| Ctrl/Cmd+Shift+7 / 8 | Numbered / bulleted list. |
| Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z | Undo, redo. |
| Arrow keys in the toolbar | Move between toggles (follow the reading direction). |

The content is `role="textbox"` with `aria-multiline`. Toolbar buttons have `aria-label`s (en/ar built in) and
toggles expose `aria-pressed`. Point `aria-labelledby` at the visible label, or give `aria-label`. Tooltips carry the
shortcut but are not the only name.

## RTL & i18n

- Each paragraph, heading, quote and list has `dir="auto"`; with `text-start` the block aligns to its own start.
- The `dir` attribute is stored in the document, so HTML and JSON output keep it and `Markdown`-style renderers or emails orient correctly.
- Toolbar labels, placeholder and link dialog are Arabic when the Nasaq locale is `ar`. The link address input is forced LTR.
- Undo and redo icons mirror in RTL.

## Styling & tokens

Content typography reuses the `Markdown` roles: `text-h1..h3`, `text-body`, `text-nq-fg-body`,
`border-nq-line-strong`, `bg-secondary` for inline code. The frame uses `border-input`, `bg-card` and the focus outline
token. Target `data-slot` values and `data-readonly`. Extend with `className`.

## Do / Don't

- Do lazy-load it.
- Do sanitise the HTML on the server before storing or rendering it elsewhere; the editor only filters link schemes.
- Don't put raw hex colours in pasted content styling.
- Don't use it for short single-line input.

## Related

- [markdown](../markdown/README.md)
- [field](../field/README.md)
- [toggle-group](../toggle-group/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-editors-richtexteditor--docs

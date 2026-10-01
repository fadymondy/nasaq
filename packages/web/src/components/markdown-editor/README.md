---
name: markdown-editor
title: MarkdownEditor
category: editors
status: beta
summary: A plain-text Markdown editor with a formatting toolbar, Ctrl/⌘ shortcuts and a Write / Preview / Split view rendered in Nasaq typography, controlled or uncontrolled, with a hidden input for form posts.
exports: [MarkdownEditor, MarkdownEditorProps, MarkdownEditorLabels, MarkdownEditorView]
related: [markdown, rich-text-editor, notes]
story: components-editors-markdown-editor
base-ui: [toggle-group, tooltip]
keywords: [markdown, editor, md, write, preview, split, toolbar, textarea, comments, docs]
---

# MarkdownEditor

A `textarea` with a toolbar and a live preview. The value is Markdown text, so you store and diff it as is.

## When to use

- Descriptions, comments, release notes and docs where people know or tolerate Markdown.
- When you need the source text, not HTML.

## When not to use

- Writers who expect a word processor: use [`RichTextEditor`](../rich-text-editor/README.md).
- Showing Markdown only: use [`Markdown`](../markdown/README.md).
- A short single-line field: use `Input`.

## Import

```tsx
import { MarkdownEditor } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { MarkdownEditor } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Description() {
  const [value, setValue] = useState("## Notes\n\nWrite **here**.");
  return <MarkdownEditor value={value} onValueChange={setValue} defaultView="split" aria-label="Description" />;
}
```

## Anatomy

```
MarkdownEditor                  data-slot="markdown-editor", data-view="write|preview|split"
├─ toolbar (role="toolbar")     bold, italic, headings, lists, task list, quote, link, code, code block
├─ ToggleGroup                  Write · Preview · Split (Split from md up)
├─ textarea                     monospace, dir="auto"
├─ preview                      data-slot="markdown-editor-preview", <Markdown>
└─ input type="hidden"          when `name` is set
```

## API

**MarkdownEditor**: every `div` prop except `onChange` and `defaultValue`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `string` | `""` | Controlled or initial Markdown. |
| `onValueChange` | `(value) => void` | | Every edit, including toolbar actions. |
| `view` / `defaultView` | `"write" \| "preview" \| "split"` | `"write"` | Controlled or initial view. |
| `onViewChange` | `(view) => void` | | |
| `placeholder` | `string` | localised | |
| `rows` | `number` | `10` | Height of the text area. |
| `disabled` | `boolean` | `false` | |
| `name` | `string` | | Adds a hidden input with the value for form posts. |
| `aria-label` | `string` | "Write" | Name of the text area when there is no visible label. |
| `labels` | `Partial<MarkdownEditorLabels>` | | Override any string. |

Shortcuts: Ctrl/⌘+B bold, Ctrl/⌘+I italic, Ctrl/⌘+K link. Toolbar actions wrap the selection, or insert a
placeholder, and keep it selected.

## Accessibility

- The toolbar is labelled and `aria-controls` the text area; every icon button has a name and a tooltip.
- Toolbar buttons keep focus and the selection in the text area.
- The preview is `aria-live="polite"`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The text area uses `dir="auto"`, so Arabic and English
  lines each read the right way; Split puts Write at the inline start.

## Styling & tokens

- `Card` surface, `rounded-card`, mono text area, preview in `Markdown` typography. Target `[data-slot="markdown-editor"]`.

## Do / Don't

- Do sanitise Markdown on the server before rendering it elsewhere.
- Do start in Split on wide screens for people new to Markdown.
- Don't use it for chat input; Enter makes a new line here.

## Related

- [`Markdown`](../markdown/README.md)
- [`RichTextEditor`](../rich-text-editor/README.md)
- [`Notes`](../notes/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-editors-markdown-editor--docs

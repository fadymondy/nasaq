---
name: markdown
title: Markdown
category: typography
status: stable
summary: Renders GitHub-flavoured Markdown in Nasaq typography, with bidi-aware blocks, CodeBlock for code and no raw HTML.
exports: [Markdown, MarkdownProps]
related: [code-block, text, table, chat]
story: components-typography-markdown
base-ui: []
keywords: [markdown, md, gfm, rich text, prose, chat, docs, react-markdown]
---

# Markdown

Turns a Markdown string into Nasaq UI: headings and paragraphs use the `Text` roles, tables use the `Table`
components, fenced code uses [CodeBlock](../code-block/README.md), inline code uses `InlineCode`, and links,
lists, blockquotes and rules follow the design tokens. It is built on `react-markdown` with `remark-gfm`
(tables, task lists, strikethrough, autolinks). It is safe for untrusted text: raw HTML is never rendered.

## When to use

- Model output, release notes, comments, help articles: any text a person or an AI wrote as Markdown.
- Chat bubbles (see [chat](../chat/README.md)).

## When not to use

- A short label or sentence: use [Text](../text/README.md).
- Trusted, hand-written page layout: compose components directly.
- Editing Markdown: this renders only.

## Import

```tsx
import { Markdown } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Markdown } from "@fadymondy/nasaq/web";

export function Notes() {
  return <Markdown>{"## Release\n\n- Faster **search**\n- Run `pnpm build`"}</Markdown>;
}
```

## Anatomy

```
Markdown        data-slot="markdown"     <div> flex column, gap-3
├─ h1–h6        data-slot="text"         Text h1 / h2 / h3 roles, dir="auto"
├─ p            data-slot="text"         Text body, dir="auto"
├─ ul / ol / li                          dir="auto", logical padding
├─ blockquote                            border-s, dir="auto"
├─ table        data-slot="table"        Table, TableHeader, TableBody, TableRow, TableHead, TableCell
├─ pre          data-slot="code-block"   CodeBlock (always dir="ltr")
├─ code         data-slot="inline-code"  InlineCode
└─ a, hr, img, strong, task-list checkbox
```

## API

### `Markdown`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `string` | required | The Markdown source. |
| `components?` | `Components` (react-markdown) | none | Per-element overrides, merged over the defaults. |
| `remarkPlugins?` | `Options["remarkPlugins"]` | none | Added after `remark-gfm`. |
| `className?` | `string` | none | Merged onto the wrapper `<div>`. |

There is no option to enable raw HTML.

## Examples

### Mixed Arabic and English

```tsx
import { Markdown } from "@fadymondy/nasaq/web";

const source = `# ملاحظات الإصدار

هذه فقرة عربية تحتوي على \`pnpm build\` داخل الجملة.

This paragraph is English and stays left-to-right.

| الميزة | Status |
| :-- | --: |
| البحث | Done |`;

export function Notes() {
  return <Markdown>{source}</Markdown>;
}
```

### Override an element

```tsx
import { Markdown } from "@fadymondy/nasaq/web";

export function Plain({ text }: { text: string }) {
  return <Markdown components={{ h1: ({ children }) => <h2 className="text-h2">{children}</h2> }}>{text}</Markdown>;
}
```

## Accessibility

- Semantic elements are preserved: headings, lists, tables with `scope="col"` headers, `blockquote`.
- Wide tables scroll in a focusable named region (`Table`); code scrolls in a focusable region (`CodeBlock`).
- External links open in a new tab with `rel="noopener noreferrer"`.
- Task-list checkboxes are rendered `disabled`; they are display only.
- Images keep their Markdown alt text; write meaningful alt text in the source.

| Key | Action |
| --- | --- |
| `Tab` | Moves through links, scroll regions and copy buttons |
| Arrow keys | Scroll a focused table or code region |

## RTL & i18n

- Every block carries `dir="auto"`: the first strong character decides, so an Arabic paragraph between English ones flows right to left, and a bullet list follows its own text.
- The wrapper has no `dir`, so it inherits the page.
- Code, and inline code, are always left-to-right and bidi-isolated.
- GFM column alignment maps to `text-start` / `text-end` / `text-center`, not left/right, so it follows the page direction.
- No built-in strings apart from those in CodeBlock ("Copy code" / "نسخ الشيفرة").

## Styling & tokens

- Colours: `text-nq-fg-body` for prose, `text-foreground` for strong and links, `text-muted-foreground` for quotes, `border-border` and `border-nq-line-strong` for rules.
- Change one element with `components`; change spacing with `className` (`gap-*` on the wrapper).

## Do / Don't

- **Do** put untrusted text straight in `children`; it is safe by default.
- **Don't** expect `<div>` or `<script>` in the source to render: raw HTML is dropped.
- **Don't** wrap a Markdown block in a fixed `dir`; let `dir="auto"` decide per block.

## Related

- [CodeBlock](../code-block/README.md) · [Text](../text/README.md) · [Table](../table/README.md) · [Chat](../chat/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-typography-markdown--docs

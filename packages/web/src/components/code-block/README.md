---
name: code-block
title: CodeBlock
category: developer-tools
status: stable
summary: Syntax-highlighted code with filename header, line numbers, highlighted lines and a copy button; Shiki loads lazily. Also InlineCode.
exports: [CodeBlock, InlineCode, highlightCode, CodeBlockProps, CodeLanguage, CodeToken]
related: [copy-button, markdown, text]
story: components-developer-tools-code-block
base-ui: []
keywords: [code, syntax, highlight, shiki, snippet, pre, monospace, inline-code]
---

# CodeBlock

A `<figure>` holding a scrollable `<pre>` of highlighted code. Highlighting uses Shiki, loaded with a dynamic
import the first time a block renders, and each language grammar is its own chunk. Until Shiki arrives the
block shows the same lines as plain text, so nothing shifts when colours appear. Colours come from Shiki's
CSS-variables theme, mapped to `--nq-*` tokens, so light and dark work with no second theme and no hex in source.
`InlineCode` is the inline counterpart for a word or command inside a sentence.

## When to use

- Snippets, commands, config and API examples in docs, chat and tutorials.
- A short token in running text: `InlineCode`.

## When not to use

- Copying a single value such as an API key: use `CopyField` from [copy-button](../copy-button/README.md).
- Rendering Markdown that contains code fences: use [Markdown](../markdown/README.md), which uses CodeBlock for you.
- Editable code: this component is read-only.

## Import

```tsx
import { CodeBlock, InlineCode } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CodeBlock } from "@fadymondy/nasaq/web";

export function Example() {
  return <CodeBlock language="ts" filename="greet.ts" lineNumbers code={`export const greet = (name: string) => \`Hello, \${name}\`;`} />;
}
```

## Anatomy

```
CodeBlock            data-slot="code-block"          <figure dir="ltr">
├─ header            data-slot="code-block-header"   <figcaption> filename + CopyButton (when filename is set)
├─ CopyButton        data-slot="copy-button"         floats at the inline-end corner when there is no filename
└─ pre               data-slot="code-block-pre"      <pre role="region" tabindex="0">
   └─ code > span[data-line]                         one span per line, with optional gutter number
InlineCode           data-slot="inline-code"         <code dir="ltr">
```

## API

### `CodeBlock`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `code` | `string` | required | Source text. One trailing newline is dropped. |
| `language?` | `CodeLanguage \| string` | `"text"` | `ts tsx js jsx json bash sh css html md go php python py sql yaml yml`. Unknown values render as plain text. |
| `filename?` | `string` | none | Renders a header. Also the accessible name of the code region. |
| `lineNumbers?` | `boolean` | `false` | Gutter with 1-based numbers. Not selectable, so copying gives clean code. |
| `highlightLines?` | `number[] \| string` | none | Emphasised lines: `[2, 3]` or `"2-4,7"`. |
| `copyable?` | `boolean` | `true` | Show the copy button. |
| `copyAction?` | `ReactNode` | none | Replaces the copy button (same place). Used by the AI copy menu in [code-block-variants](../code-block-variants/README.md). |
| `copyLabel?` | `string` | "Copy code" / "نسخ الشيفرة" | Accessible name of the copy button. |
| `label?` | `string` | filename, else "Code" / "شيفرة برمجية" | Accessible name of the scroll region. |
| `preClassName?` | `string` | none | Classes for the scrolling `<pre>`, e.g. `max-h-80`. |
| `className?` | `string` | none | Merged onto the `<figure>`. |

`dir` is fixed to `ltr` and cannot be overridden.

### `InlineCode`

`(props: ComponentProps<"code">) => JSX.Element`. Left-to-right, bidi-isolated, `font-mono`, on `bg-secondary`.

### `highlightCode(code, language)`

`(code: string, language: string) => Promise<CodeToken[][] | null>`. Tokenises with the shared lazy Shiki instance;
resolves `null` for plain text or an unknown language.

## Examples

### Highlighted lines and a fixed height

```tsx
import { CodeBlock } from "@fadymondy/nasaq/web";

export function Long() {
  return (
    <CodeBlock
      language="bash"
      highlightLines="2"
      preClassName="max-h-48"
      code={"pnpm install\npnpm --filter @nasaq/web typecheck\npnpm build"}
    />
  );
}
```

### Arabic page, code stays left-to-right

```tsx
import { CodeBlock, InlineCode } from "@fadymondy/nasaq/web";

export function Install() {
  return (
    <div dir="rtl" className="space-y-3">
      <p>
        شغّل الأمر <InlineCode>pnpm add @nasaq/web</InlineCode> ثم أضف المزوّد.
      </p>
      <CodeBlock language="tsx" filename="app.tsx" code={"<NasaqProvider defaultLocale=\"ar\">{children}</NasaqProvider>"} />
    </div>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Focuses the code region, then the copy button |
| Arrow keys | Scroll the focused region |
| `Enter` / `Space` | Copies, on the copy button |

- The `<pre>` is `role="region"` and focusable so keyboard users can scroll long or wide code. Its name is the filename or "Code"; localise `label` when you pass your own.
- Copy results are announced through the CopyButton live region ("Code copied to clipboard").
- Colours are supplementary: every token is still readable text. Keep the theme mapping at AA contrast.

## RTL & i18n

- Code is always `dir="ltr"`, inside Arabic pages too; the block never mirrors. Its outer margins and layout still follow the page.
- Built-in strings: "Copy code" / "نسخ الشيفرة", "Code" / "شيفرة برمجية", "Code copied to clipboard" / "تم نسخ الشيفرة إلى الحافظة".
- Line numbers are Latin digits.
- `InlineCode` is an LTR isolate so it keeps its character order inside an Arabic sentence.

## Styling & tokens

- Surface: `bg-nq-surface-soft`, `border-border`, `rounded-surface`. Highlighted lines use `bg-nq-selected` and an `border-nq-accent` edge.
- Token colours are Shiki variables set on the figure: `--shiki-token-keyword` → `--nq-accent-text`, `string` → `--nq-success-text`, `constant` → `--nq-warning-text`, `function` → `--nq-info-text`, `comment` and `punctuation` → `--nq-fg-muted`. Override them from a parent with `[--shiki-token-keyword:var(--nq-brand)]`.
- State attributes: `data-highlighted` on the figure once Shiki has loaded; `data-highlighted` on a line that is emphasised; `data-line="n"` on each line.

## Do / Don't

- **Do** give a `filename` when the snippet belongs to a file.
- **Do** cap the height with `preClassName` for long output.
- **Don't** put prose inside a CodeBlock.
- **Don't** override colours with raw hex.

## Related

- [CopyButton](../copy-button/README.md) · [Markdown](../markdown/README.md) · [Text](../text/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-tools-code-block--docs

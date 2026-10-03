---
name: code-block-variants
title: CodeBlock variants
category: developer-tools
status: stable
summary: Code in tabs (pnpm npm yarn, curl JS Python), a copy menu for AI assistants, and a one-line command with a direct copy button. Composes CodeBlock.
exports: [CodeVariantLabels, CodeCopyKind, CodeCopyMenuProps, CodeCopyMenu, CodeBlockAIProps, CodeBlockAI, CodeTab, CodeTabsProps, CodeTabs, packageManagerTabs, execTabs, CommandSnippetProps, CommandSnippet, AiTarget, aiLink, buildPrompt, execCommand, InstallOptions, installCommand, PACKAGE_MANAGERS, PackageManager, stripPrompt, toMarkdown]
related: [code-block, copy-button, tabs, dropdown-menu]
story: components-developer-tools-code-block-variants
base-ui: [tabs, menu]
keywords: [code, tabs, package-manager, pnpm, npm, yarn, curl, copy, ai, prompt, claude, chatgpt, cursor, command, snippet, install]
---

# CodeBlock variants

Three ways to present code that build on [CodeBlock](../code-block/README.md) without changing it. `CodeTabs` shows
one snippet in several forms (package managers, languages) and copies the visible one. `CodeBlockAI` and
`CodeCopyMenu` add a copy menu: Copy code, Copy as Markdown, and a ready prompt for Claude, ChatGPT or Cursor,
with links that open the assistant with the prompt filled in. `CommandSnippet` is a one-line command with a copy
button that is always visible. Every panel is a real `CodeBlock`, so highlighting, line numbers and left-to-right
code in Arabic pages come for free.

## When to use

- Install and quick-start docs where the reader picks their package manager or language.
- Snippets a reader will hand to an AI assistant (the menu builds the prompt for them).
- A single terminal command to copy: `npm i @nasaq/web`.

## When not to use

- A plain snippet: use [CodeBlock](../code-block/README.md).
- A secret or key: use `CopyField` from [copy-button](../copy-button/README.md).
- Live command output: use [Terminal](../terminal/README.md).

## Import

```tsx
import { CodeTabs, CodeBlockAI, CommandSnippet, packageManagerTabs } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CodeTabs, packageManagerTabs } from "@fadymondy/nasaq/web";

export function Install() {
  return <CodeTabs syncKey="pm" aiCopy tabs={packageManagerTabs("@nasaq/web")} />;
}
```

## Anatomy

```
CodeTabs          data-slot="code-tabs"           <div dir="ltr">
├─ tab list       (Tabs)                          pnpm | npm | yarn | bun
└─ panel          CodeBlock                       one per tab, copy button or copy menu in the header
CodeBlockAI       CodeBlock with copyAction=CodeCopyMenu
CodeCopyMenu      data-slot="code-copy-menu"      split button + DropdownMenu
CommandSnippet    data-slot="command-snippet"     <div dir="ltr"> prompt + command + CopyButton
```

## API

### `CodeTabs`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tabs` | `CodeTab[]` | required | `{ value?, label, code, language?, filename? }`. |
| `value?` / `defaultValue?` / `onValueChange?` | `string` | first tab | Controlled or uncontrolled selection. |
| `syncKey?` | `string` | none | Blocks sharing a key switch together (choose pnpm once, every install block follows). |
| `title?` | `string` | none | Text before the tabs, e.g. a filename. |
| `aiCopy?` | `boolean \| { instruction?, targets?, openLinks?, onCopy? }` | `false` | Use the AI copy menu instead of the copy button. |
| `lineNumbers?` | `boolean` | `false` | Gutter numbers. |
| `preClassName?` | `string` | none | Classes for the scrolling `<pre>`. |
| `label?` | `string` | "Code variants" / "صيغ الشيفرة" | Accessible name of the tab list. |
| `labels?` | `Partial<CodeVariantLabels>` | built-in en/ar | Translations. |

### `CodeBlockAI`

Everything `CodeBlock` takes, plus `instruction?`, `targets?` (`["claude","chatgpt","cursor"]`), `openLinks?` (default
`true`), `onCopy?(kind, text, target?)` and `menuLabels?`.

### `CodeCopyMenu`

The split button on its own: `code`, `language?`, `filename?`, `instruction?`, `targets?`, `openLinks?`, `onCopy?`,
`labels?`. Pass it to `CodeBlock` as `copyAction`.

### `CommandSnippet`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `command` | `string` | required | The command. A leading `$ ` is dropped from the copy. |
| `prompt?` | `string \| false` | `"$"` | Glyph shown before the command, never copied. |
| `onCopy?` | `(command: string) => void` | none | After a successful copy. |
| `label?` | `string` | "Command" / "أمر" | Accessible name of the command region. |

### Helpers

`packageManagerTabs(pkg, { dev?, global?, managers? })`, `execTabs(command, { managers? })`, `installCommand`,
`execCommand`, `toMarkdown(code, language?, filename?)`, `buildPrompt({ code, language, filename, instruction, target })`, `aiLink(target, prompt)` (a URL, or `null` when the prompt is too long for a link), `stripPrompt`.
All pure functions.

## Examples

### Languages

```tsx
<CodeTabs
  tabs={[
    { label: "curl", language: "bash", code: 'curl -H "Authorization: Bearer $KEY" https://api.example.com/v1/me' },
    { label: "JavaScript", language: "js", code: 'const me = await fetch("/v1/me").then((r) => r.json());' },
    { label: "Python", language: "python", code: 'me = requests.get("https://api.example.com/v1/me").json()' },
  ]}
/>
```

### Copy for AI

```tsx
<CodeBlockAI language="ts" filename="retry.ts" instruction="Explain this and add jitter." code={source} />
```

## Accessibility

| Key | Action |
| --- | --- |
| `Arrow` keys | Move between tabs |
| `Tab` | Tab list, code region, then the copy control |
| `Enter` / `Space` | Copy, or open the menu on the chevron |
| `Esc` | Closes the menu |

- Tabs and the menu are Base UI, so roles, roving focus and focus return are handled.
- Copy results are announced in a live region.
- The "open in" items are links that open in a new tab; they say so in their label.

## RTL & i18n

- Code, tab labels and commands are `dir="ltr"` inside Arabic pages. The menu and its labels follow the page.
- Built-in strings in English and Arabic; override with `labels`.
- Very long prompts do not fit a link: the prompt is copied instead and the message says so.
- Assistant names are shown as text; no logos are bundled.

## Styling & tokens

- Surfaces and borders: `bg-nq-surface-soft`, `border-border`, `rounded-control`. Hover uses `bg-nq-hover`, focus `outline-nq-focus`.
- Slots: `code-tabs`, `code-copy-menu`, `command-snippet`.

## Do / Don't

- **Do** give related install blocks the same `syncKey`.
- **Do** set `instruction` so the prompt says what you want done.
- **Don't** put secrets in a snippet that offers "open in": the code goes into the link.
- **Don't** use tabs for more than about five variants.

## Related

- [CodeBlock](../code-block/README.md) · [CopyButton](../copy-button/README.md) · [Tabs](../tabs/README.md) · [DropdownMenu](../dropdown-menu/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-developer-tools-code-block-variants--docs

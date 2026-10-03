---
name: terminal
title: Terminal
category: developer-tools
status: stable
summary: Terminal-style output with prompt lines, ANSI colours mapped to tokens, streaming, copy and follow-the-tail mode. Optional command input.
exports: [TerminalLabels, TerminalLineKind, TerminalLineData, TerminalLine, AnsiText, TerminalProps, Terminal, AnsiSpan, AnsiStyle, ansi256, ansiColor, parseAnsi, parseAnsiRows, stripAnsi, useFollowScroll]
related: [log-viewer, deploy-view, code-block-variants, code-block]
story: components-developer-tools-terminal
base-ui: []
keywords: [terminal, console, shell, ansi, output, stream, tail, follow, prompt, command, cli, logs]
---

# Terminal

A dark, monospace output surface for command output. Lines are plain strings or `{ kind, text }`; a `command`
line shows the prompt, and ANSI escape codes in the text become coloured spans that use `--nq-*` tokens, so the
palette follows the theme and never uses raw hex. While `streaming`, the view follows the newest line, and if the
reader scrolls up it stops following and offers a "Jump to latest" button. Output is capped at `maxLines`
(default 2000) so long-running processes stay fast. Presentational: you own the lines and append to them.

## When to use

- Output of a build, install, migration or script, live or finished.
- A demo shell with `onCommand`, backed by your own handler.

## When not to use

- Structured, filterable logs: use [LogViewer](../log-viewer/README.md).
- A step-by-step pipeline: use [DeployView](../deploy-view/README.md).
- A one-line command to copy: use `CommandSnippet` from [code-block-variants](../code-block-variants/README.md).
- A real shell: this is not a terminal emulator. Cursor movement and full-screen programs are not handled.

## Import

```tsx
import { Terminal } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Terminal } from "@fadymondy/nasaq/web";

export function Build() {
  return (
    <Terminal
      title="~/app"
      streaming
      lines={[
        { kind: "command", text: "pnpm build" },
        "\u001b[32m✓\u001b[0m compiled 214 modules",
        { kind: "error", text: "warning: chunk is larger than 500 kB" },
      ]}
    />
  );
}
```

## Anatomy

```
Terminal        data-slot="terminal"           <div dir="ltr">
├─ header       data-slot="terminal-header"    title, live badge, wrap / clear / copy
├─ output       data-slot="terminal-output"    <div role="log"> scrolling area, follows the tail
│  └─ row       data-slot="terminal-row"       optional line number, prompt, ANSI spans
├─ jump         "Jump to latest"               shown when not following
└─ input        data-slot="terminal-input"     only with onCommand
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `lines` | `(string \| { kind?, text, id? })[]` | required | Oldest first. `kind`: `command output error info success`. |
| `title?` | `string` | "Terminal" / "الطرفية" | Header text. |
| `prompt?` | `string` | `"$"` | Shown before command lines and the input. Never copied. |
| `streaming?` | `boolean` | `false` | Live indicator and cursor. |
| `follow?` | `boolean` | `true` | Start pinned to the newest line. |
| `maxLines?` | `number` | `2000` | Older rows are dropped with a note. |
| `lineNumbers?` | `boolean` | `false` | Gutter numbers. |
| `wrap?` | `boolean` | `false` | Wrap long lines. The header has a toggle. |
| `copyable?` | `boolean` | `true` | Copy button. Copies clean text without ANSI codes. |
| `onClear?` | `() => void` | none | Shows a clear button. |
| `onCommand?` | `(command: string) => Promise<void> \| void` | none | Adds an input. It is disabled until the promise settles. Up and down walk history. |
| `height?` | `string \| number` | `"20rem"` | Height of the output area. |
| `labels?` | `Partial<TerminalLabels>` | built-in en/ar | Translations. |

Also exported: `AnsiText` (spans for one string, for use inside your own `<pre>`), `parseAnsi`, `parseAnsiRows`,
`stripAnsi`, `ansiColor`, `ansi256`, and the `useFollowScroll` hook used by [LogViewer](../log-viewer/README.md) and
[DeployView](../deploy-view/README.md).

### ANSI support

SGR codes: reset, bold, dim, italic, underline, inverse, strike, the 16 standard and bright colours, 256-colour and
truecolour. A carriage return redraws the row, so progress bars show their last state. Other escapes (cursor
movement, OSC titles) are removed.

## Examples

### Streaming

```tsx
const [lines, setLines] = useState<TerminalLine[]>([{ kind: "command", text: "pnpm test" }]);
// append as chunks arrive: setLines((l) => [...l, chunk])
<Terminal lines={lines} streaming={running} onClear={() => setLines([])} />;
```

### A command box

```tsx
<Terminal lines={lines} onCommand={async (cmd) => { setLines((l) => [...l, { kind: "command", text: cmd }]); await run(cmd); }} />
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Output region, then the header buttons and input |
| Arrow keys / `PageUp` / `PageDown` | Scroll the focused output |
| `End` | Jump to the newest line and resume following |
| `Up` / `Down` | History, in the input |

- The output is `role="log"` with a name, so screen readers can read it; it does not announce every streamed line.
- Colour is supplementary: errors also carry the `error` kind text and stay readable without colour.
- The jump button is a real button and appears only when following stopped.

## RTL & i18n

- The surface is `dir="ltr"` in Arabic pages; only the chrome (title, tooltips, buttons) is translated.
- Built-in Arabic strings; override with `labels`.
- Header controls sit on the logical inline-end side.

## Styling & tokens

- Surface `bg-nq-surface-soft` with `border-border` and `rounded-surface`; text `text-nq-fg-body`; kinds use `text-nq-danger-text`, `-success-text` and `-info-text`.
- ANSI colours are `var(--nq-*)` values; bright variants mix toward `--nq-fg`.
- Slots: `terminal`, `terminal-header`, `terminal-output`, `terminal-row`, `terminal-input`. `data-streaming` on the root.

## Do / Don't

- **Do** append lines instead of rebuilding the whole array when you can.
- **Do** keep `maxLines` modest for very chatty processes.
- **Don't** print secrets to the terminal; there is no masking.
- **Don't** expect keyboard-driven programs to work.

## Related

- [LogViewer](../log-viewer/README.md) · [DeployView](../deploy-view/README.md) · [CodeBlock variants](../code-block-variants/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-developer-tools-terminal--docs

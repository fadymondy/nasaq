---
name: typing-terminal
title: TypingTerminal
category: website
status: beta
summary: "A terminal that types commands and prints their output step by step, for hero sections and docs. Renders the full transcript first, for servers and reduced motion."
exports: [TypingTerminalLabels, TypingTerminalStep, TypingTerminalProps, TypingTerminal]
related: [terminal, marketing-sections]
story: components-website-typing-terminal
base-ui: []
keywords: [terminal, typing, typewriter, cli, hero, install, demo, ansi]
---

# TypingTerminal

Shows how a tool is used: it types each command, prints its output line by line, then offers Replay. Output may contain
ANSI colours. An `endSlot` appears at the end for a screenshot of the result or a call to action.

## When to use

- A marketing hero or a docs page that shows an install or a quick start.

## When not to use

- A real, interactive shell: use `Terminal`.
- A command people copy: use a code block with a copy button. The animation is decoration.

## Import

```tsx
import { TypingTerminal } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { TypingTerminal } from "@fadymondy/nasaq/web";

export function Hero() {
  return (
    <TypingTerminal
      title="~/my-shop"
      steps={[
        { cmd: "npx create-togo-app my-shop", out: ["\u001b[32m✓\u001b[0m Installed 214 packages"] },
        { cmd: "cd my-shop && togo dev", out: ["ready on http://localhost:5173"] },
      ]}
    />
  );
}
```

## Anatomy

```
TypingTerminal            data-slot="typing-terminal"  dir="ltr"
├─ header                 dots, title, Replay
├─ transcript             sr-only <pre>, the whole session
└─ body                   data-slot="typing-terminal-body"  fixed height
   ├─ rows                aria-hidden: prompt + command, output lines
   └─ end slot            data-slot="typing-terminal-end"
```

## API

`div` props (except `children` and `title`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `steps` | `{ cmd, out? }[]` | required | Commands without the prompt, and the lines they print. |
| `endSlot` | `ReactNode` | | Shown when the playback ends. |
| `title` | `ReactNode` | `"Terminal"` | In the header. |
| `prompt` | `string` | `"❯"` | |
| `typeMs` / `lineMs` | `number` | `28` / `110` | Speed per character and per line. |
| `loop` | `boolean` | `false` | Start again after 4s instead of showing Replay. |
| `height` | `number` | `320` | Body height in px, so the page does not move. |
| `play` | `boolean` | `true` | Set from an in-view observer to start when scrolled to. `false` shows the full transcript. |
| `onComplete` | `() => void` | | |
| `labels` | `TypingTerminalLabels` | | |

## Accessibility

- Screen readers get the whole transcript once, as text; the animated rows are hidden from them.
- With reduced motion (or under automation) the full transcript shows at once.
- Replay is a real button. The end slot stays reachable.

## RTL & i18n

- The terminal is always left to right, as code is. Labels (title, Replay) are in English and Arabic.

## Styling & tokens

- `bg-nq-surface-soft`, a hairline border and the mono font. ANSI colours map to the chart tokens via `AnsiText`.

## Do / Don't

- Do keep it to two or three commands.
- Don't animate on every scroll. Use `play` once, or `loop` for a hero that stays.

## Related

- [`terminal`](../terminal/README.md)
- [`marketing-sections`](../marketing-sections/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-website-typing-terminal--docs

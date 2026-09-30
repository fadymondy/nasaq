---
name: copilot-dock
title: CopilotDock
category: ai
status: beta
summary: "App-wide assistant: a floating launcher that opens CopilotChat in a non-modal panel docked to the inline-end edge, toggled with ⌘J / Ctrl+J."
exports: [CopilotDock, CopilotDockProps, CopilotDockLabels]
related: [copilot-chat, chat, ask-ai, feedback-reporter, app-shell]
story: components-ai-copilot-dock
base-ui: []
keywords: [copilot, assistant, ai, dock, side panel, launcher, floating button, chat, cmd j, ctrl j]
---

# CopilotDock

Puts [`CopilotChat`](../copilot-chat/README.md) one keystroke away on every page. A round launcher waits at the bottom inline-end corner. Opening it docks the chat as a panel on the inline-end edge. The panel is non-modal, so the page stays usable beside it. ⌘J / Ctrl+J toggles it from anywhere.

## When to use

- Once, at the app shell level, when an assistant should be reachable from every page.

## When not to use

- A dedicated assistant page: render `CopilotChat mode="page"`.
- A one-shot question box inside a page: use [`AskAI`](../ask-ai/README.md).

## Import

```tsx
import { CopilotDock } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CopilotDock } from "@fadymondy/nasaq/web";

<CopilotDock messages={messages} onSend={send} onStop={stop} starters={["Summarise my week"]} />;
```

## Anatomy

```
button [data-slot=copilot-dock-launcher]   (while closed, when `launcher`)
div    [data-slot=copilot-dock][data-open] (role complementary, inline-end edge)
└─ CopilotChat mode="panel" (its close button closes the dock)
```

## API

### `CopilotDock`

Takes every [`CopilotChat`](../copilot-chat/README.md) prop except `mode` and `onClose`, plus:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `false` | Uncontrolled start. |
| `onOpenChange` | `(open: boolean) => void` | — | Called on launcher, shortcut, close button and Escape. |
| `hotkey` | `string \| false` | `"j"` | Letter bound to ⌘ / Ctrl. `false` turns it off. |
| `launcher` | `boolean` | `true` | Show the floating button while closed. Turn off when a header button opens it. |
| `launcherIcon` | `ReactNode` | sparkles | Replaces the launcher icon. |
| `placement` | `"fixed" \| "absolute"` | `"fixed"` | `absolute` docks inside a `relative` parent (previews). |
| `width` | `string` | `"26rem"` | Panel width, never wider than the screen. |
| `dockLabels` | `Partial<CopilotDockLabels>` | — | Launcher and panel names. `labels` still goes to the chat. |

## Examples

### Opened from a header button

```tsx
const [open, setOpen] = useState(false);

<AppHeader>
  <Button variant="ghost" onClick={() => setOpen(true)}>Ask AI</Button>
</AppHeader>
<CopilotDock {...chat} open={open} onOpenChange={setOpen} launcher={false} />
```

### Wider panel, no shortcut

```tsx
<CopilotDock {...chat} width="32rem" hotkey={false} />
```

## Accessibility

- The launcher has an accessible name, `aria-expanded`, `aria-controls` and `aria-keyshortcuts`.
- Opening moves focus to the prompt box. Escape inside the panel, or the close button, closes it and returns focus to the launcher.
- The panel is a `complementary` landmark named "Assistant" / "المساعد". It does not trap focus, so the page stays reachable.
- The shortcut matches on the physical key, so it works on Arabic keyboard layouts.

## RTL & i18n

The launcher and panel sit at the inline end, so they move to the left in Arabic. Launcher and panel names ship in English and Arabic; the chat's own strings come from `CopilotChat`.

## Styling & tokens

- Launcher: `bg-primary text-primary-foreground shadow-floating rounded-full`. Panel: `bg-background border-s border-border shadow-floating`.
- Target with `[data-slot=copilot-dock]` and `[data-slot=copilot-dock-launcher]`; `[data-open]` is set while open.

## Do / Don't

- Do mount it once, in the shell, so the conversation survives page changes.
- Don't stack it with another floating launcher in the same corner; move one with `className`.

## Related

`copilot-chat`, `chat`, `ask-ai`, `feedback-reporter`, `app-shell`.

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-copilot-dock--docs

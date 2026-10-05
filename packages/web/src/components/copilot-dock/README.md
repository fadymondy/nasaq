---
name: copilot-dock
title: CopilotDock
category: ai
status: beta
summary: "App-wide assistant: a launcher or an Ask bar that opens CopilotChat in a non-modal panel docked to either edge or the bottom, floating, or expanded to the page. Toggled with ⌘J / Ctrl+J."
exports: [CopilotDock, CopilotDockProps, CopilotDockLabels, CopilotDockSide, CopilotDockPanel]
related: [copilot-chat, copilot-provider, chat, ask-ai, feedback-reporter, app-shell]
story: components-ai-assistant-copilot-dock
base-ui: []
keywords: [copilot, assistant, ai, dock, side panel, bottom panel, floating window, full page, launcher, ask bar, chat, cmd j, ctrl j]
---

# CopilotDock

Puts [`CopilotChat`](../copilot-chat/README.md) one keystroke away on every page. A round launcher waits at the bottom inline-end corner. Opening it docks the chat as a panel on the inline-end edge. The panel is non-modal, so the page stays usable beside it. ⌘J / Ctrl+J toggles it from anywhere.

From the header, people can move the panel to the other edge or the bottom, float it as a window, or expand it to the full page. With `persistKey`, the position is remembered. With `collapsedBar`, a slim "Ask anything" bar replaces the round launcher.

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
form   [data-slot=copilot-dock-bar]        (instead, with `collapsedBar`)
div    [data-slot=copilot-dock][data-open][data-side][data-expanded]   role complementary
└─ CopilotChat mode="panel" | "page" when expanded
   └─ header: …, [data-slot=copilot-dock-layout] menu, [data-slot=copilot-dock-expand], Close
```

## API

### `CopilotDock`

Takes every [`CopilotChat`](../copilot-chat/README.md) prop except `mode` and `onClose` (`messages` and `onSend` become optional), plus:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `false` | Uncontrolled start. |
| `onOpenChange` | `(open: boolean) => void` | — | Called on launcher, shortcut, close button and Escape. |
| `hotkey` | `string \| false` | `"j"` | Letter bound to ⌘ / Ctrl. `false` turns it off. |
| `launcher` | `boolean` | `true` | Show the floating button while closed. Turn off when a header button opens it. |
| `launcherIcon` | `ReactNode` | sparkles | Replaces the launcher icon. |
| `collapsedBar` | `boolean` | `false` | While closed, a slim bar at the bottom. Enter sends with `onSend` and opens. |
| `placement` | `"fixed" \| "absolute"` | `"fixed"` | `absolute` docks inside a `relative` parent (previews). |
| `side` / `defaultSide` / `onSideChange` | `"end" \| "start" \| "bottom" \| "float"` | `"end"` | Logical: `end` is the right edge in English and the left in Arabic. |
| `sides` | `CopilotDockSide[]` | all four | Choices in the header menu. One or none hides the menu. |
| `expanded` / `defaultExpanded` / `onExpandedChange` | `boolean` | `false` | Full page. Escape returns to the panel first. |
| `expandable` | `boolean` | `true` | Show the expand button. |
| `persistKey` | `string` | | localStorage key that remembers the position. |
| `width` | `string` | `"26rem"` | Side and floating width, never wider than the screen. |
| `height` | `string` | `50vh` / `40rem` | Bottom and floating height. |
| `dockLabels` | `Partial<CopilotDockLabels>` | — | Launcher and panel names. `labels` still goes to the chat. |
| `children` | `ReactNode \| (panel: CopilotDockPanel) => ReactNode` | — | Replaces `CopilotChat` with your own panel body. The function form gets `{ controls, close, expanded, side }`, so your header can carry the dock's position and expand controls. |
| `barContent` | `ReactNode` | — | With `collapsedBar`, replaces the Ask input. The bar becomes one button that opens the dock. |

## Examples

### Opened from a header button

```tsx
const [open, setOpen] = useState(false);

<AppHeader>
  <Button variant="ghost" onClick={() => setOpen(true)}>Ask AI</Button>
</AppHeader>
<CopilotDock {...chat} open={open} onOpenChange={setOpen} launcher={false} />
```

### With CopilotProvider

```tsx
<CopilotProvider transport={transport} dock={{ persistKey: "copilot-side", collapsedBar: true }}>
  {children}
</CopilotProvider>
```

### A dock that is not a chat

`children` turns the dock into a shell for any panel: an inbox, a support console, a notes pane. The bar shows your own summary instead of an input.

```tsx
<CopilotDock
  collapsedBar
  defaultSide="bottom"
  sides={["bottom", "end"]}
  height="70vh"
  launcherIcon={<Inbox />}
  barContent={<><span className="font-medium">Inbox</span><Badge>3</Badge></>}
>
  {({ controls, close }) => (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-1 border-b px-3 py-2">
        <h2 className="flex-1 text-sm font-medium">Inbox</h2>
        {controls}
        <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={close}><X /></Button>
      </header>
      <InboxBody />
    </section>
  )}
</CopilotDock>
```

### Wider panel, no shortcut

```tsx
<CopilotDock {...chat} width="32rem" hotkey={false} />
```

## Accessibility

- The launcher has an accessible name, `aria-expanded`, `aria-controls` and `aria-keyshortcuts`.
- Opening moves focus to the prompt box. Escape inside the panel, or the close button, closes it and returns focus to the launcher.
- The panel is a `complementary` landmark named "Assistant" / "المساعد". It does not trap focus, so the page stays reachable.
- The position menu is a radio menu; the expand button reports `aria-pressed`. Escape leaves full page before it closes the panel.
- The Ask bar is a labelled `search` form; its input names the shortcut with `aria-keyshortcuts`.
- The shortcut matches on the physical key, so it works on Arabic keyboard layouts.

## RTL & i18n

The launcher and panel sit at the inline end, so they move to the left in Arabic. The position menu names physical sides ("Dock right") and its icons follow the direction. Launcher and panel names ship in English and Arabic; the chat's own strings come from `CopilotChat`.

## Styling & tokens

- Launcher: `bg-primary text-primary-foreground shadow-floating rounded-full`. Panel: `bg-background shadow-floating` with a hairline on the inner edge; floating adds `rounded-card` and a full border.
- Target with `[data-slot=copilot-dock]`, `[data-side]`, `[data-expanded]`, `[data-slot=copilot-dock-launcher]` and `[data-slot=copilot-dock-bar]`.

## Do / Don't

- Do mount it once, in the shell, so the conversation survives page changes.
- Don't stack it with another floating launcher in the same corner; move one with `className`.

## Related

`copilot-chat`, `copilot-provider`, `chat`, `ask-ai`, `feedback-reporter`, `app-shell`.

## Lab

https://docs.nasaqui.com/?path=/docs/components-ai-assistant-copilot-dock--docs

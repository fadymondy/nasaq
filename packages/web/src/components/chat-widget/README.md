---
name: chat-widget
title: ChatWidget
category: collaboration
status: beta
summary: Floating customer chat for a website with a launcher and unread badge, a chat panel with greeting, quick questions, messages, typing and file attachments, and an offline leave-a-message form, driven by async callbacks.
exports: [ChatWidgetLabels, WidgetMessage, WidgetOfflineForm, ChatWidgetProps, ChatWidget]
related: [inbox, chat, copilot-chat]
story: components-collaboration-chat-widget
base-ui: [field, input]
keywords: [chat widget, live chat, customer chat, launcher, support, offline form, intercom, website chat]
---

# ChatWidget

The chat bubble on a customer site. A round launcher sits in a bottom corner. It opens a panel with a greeting from
your team, the conversation, and a box to write in. Outside business hours it swaps the box for a short form so the
visitor can leave their email. It stores nothing: you pass `messages` and it calls `onSend` and `onOfflineSubmit`.
The agent side is the [`Inbox`](../inbox/README.md).

## When to use

- A marketing site, docs or a web app where visitors talk to your team.
- A place where you want a quick-questions list before the visitor types.

## When not to use

- The agent screen: use [`Inbox`](../inbox/README.md).
- An AI assistant with sources and tools: use [`CopilotChat`](../copilot-chat/README.md).

## Import

```tsx
import { ChatWidget } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ChatWidget, type WidgetMessage } from "@fadymondy/nasaq/web";
import { useState } from "react";

declare const api: { send(text: string, files: File[]): Promise<void> };

export function SiteChat() {
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  return (
    <ChatWidget
      messages={messages}
      agent={{ name: "Layla" }}
      starters={["Pricing", "Talk to sales"]}
      onSend={async (text, files) => {
        setMessages((m) => [...m, { id: crypto.randomUUID(), from: "visitor", text, at: Date.now() }]);
        await api.send(text, files);
      }}
    />
  );
}
```

## Anatomy

```
ChatWidget                       data-slot="chat-widget" (data-open, data-online)
├─ panel                         role="dialog", labelled by the title
│  ├─ header                     avatar, title, online dot with text, close
│  ├─ ChatThread                 greeting, ChatMessage rows, quick questions, TypingIndicator
│  ├─ ChatComposer               text, attached file chips, attach button (online)
│  └─ offline form               data-slot="chat-widget-offline": name, email, message; then a thank-you
└─ launcher                      round button with an unread badge
```

## API

**ChatWidget**: every `div` prop except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `messages` | `readonly WidgetMessage[]` | required | `{ id, from: "visitor" \| "agent" \| "bot", text, at, name?, avatar?, status?, attachments? }`. |
| `onSend` | `(text, files: File[]) => Promise<void \| { error? }>` | required | Send. An `error` restores the text and files and shows the message. |
| `onRetry` | `(id) => void` | | Shows Retry on a failed visitor message. |
| `open` / `defaultOpen` / `onOpenChange` | `boolean` | closed | Controlled or uncontrolled. |
| `title` / `subtitle` | `string` | "Chat with us" | Header text. The subtitle defaults to a reply-time line for the state. |
| `agent` | `{ name, avatar? }` | | Shown in the header and on the greeting. |
| `greeting` | `string` | "Hi! How can we help you today?" | First bubble. |
| `starters` | `readonly string[]` | none | Quick questions until the visitor writes. |
| `online` | `boolean` | `true` | `false` shows the offline form instead of the composer. |
| `onOfflineSubmit` | `(form: { name, email, message }) => Promise<void \| { error? }>` | | Needed for the offline form. |
| `unread` | `number` | `0` | Badge on the launcher while closed. |
| `typing` | `boolean` | `false` | The team is typing. |
| `position` | `"end" \| "start"` | `"end"` | Bottom corner (follows RTL). |
| `placement` | `"fixed" \| "absolute" \| "static"` | `"fixed"` | Pin to the viewport, to a relative parent, or not at all. |
| `maxFileMb` | `number` | `5` | Larger files are refused with a message. |
| `labels` | `Partial<ChatWidgetLabels>` | | Override any string. |

## Examples

**Outside business hours**

```tsx
import { ChatWidget } from "@fadymondy/nasaq/web";

export const Away = () => (
  <ChatWidget
    messages={[]}
    online={false}
    onSend={async () => {}}
    onOfflineSubmit={async (form) => {
      await fetch("/api/leads", { method: "POST", body: JSON.stringify(form) });
    }}
  />
);
```

## Accessibility

- The launcher is a button with `aria-expanded`. The panel is a labelled `dialog` that does not trap focus, so the page stays usable. Escape closes it and focus returns to the launcher.
- The message list is a `role="log"`. New messages are announced politely. The unread count is text, not only a badge.
- Online state is text ("Online") as well as a dot. Form errors are text under each field; send errors are `role="alert"`.

## RTL & i18n

- English and Arabic follow the Nasaq locale. `position="end"` puts the widget in the left corner in Arabic.
- The email field is left to right. The launcher icon mirrors.

## Styling & tokens

- Built on `ChatThread`, `ChatMessage`, `ChatComposer`, `Field` and `--nq-*` tokens. The header uses `bg-primary`.
- Target `[data-slot="chat-widget"]`, `[data-slot="chat-widget-offline"]`.

## Do / Don't

- Do validate the offline form on your server as well.
- Do keep the greeting to one or two lines.
- Don't auto open the panel on page load.
- Don't put personal data in the quick questions.

## Related

- [`Inbox`](../inbox/README.md)
- [`Chat`](../chat/README.md)

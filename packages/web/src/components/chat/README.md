---
name: chat
title: ChatThread
category: collaboration
status: beta
summary: Chat UI kit. A bottom-sticking message thread, messages with avatar, time, status and streaming, and an autosizing composer.
exports: [ChatThread, ChatMessage, ChatComposer, TypingIndicator, ChatThreadProps, ChatMessageProps, ChatComposerProps, TypingIndicatorProps, ChatSide, ChatStatus]
related: [markdown, code-block, avatar, field, button]
story: components-collaboration-chat
base-ui: [field]
keywords: [chat, message, conversation, assistant, ai, composer, streaming, typing]
---

# ChatThread

Three parts for a conversation. `ChatThread` scrolls and follows new messages. `ChatMessage` is one bubble with an
avatar, a time, a delivery status and an optional streaming state. `ChatComposer` is the message box. Message text can be
plain or [Markdown](../markdown/README.md), so model replies with lists, tables and code render properly.

## When to use

- Assistant or support chat, comment-style conversations, streaming model output.

## When not to use

- A feed of activity events: use `NotificationItem`.
- A single comment box with no thread: use `Textarea` from [field](../field/README.md).

## Import

```tsx
import { ChatComposer, ChatMessage, ChatThread } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ChatComposer, ChatMessage, ChatThread } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Chat() {
  const [messages, setMessages] = useState([{ id: 1, side: "assistant" as const, text: "Hi! How can I help?" }]);
  return (
    <div className="flex h-96 flex-col rounded-surface border border-border">
      <ChatThread className="flex-1">
        {messages.map((m) => (
          <ChatMessage key={m.id} side={m.side} name={m.side === "user" ? "You" : "Assistant"} time={Date.now()}>
            {m.text}
          </ChatMessage>
        ))}
      </ChatThread>
      <div className="p-3 pt-0">
        <ChatComposer onSend={(text) => setMessages((m) => [...m, { id: m.length + 1, side: "user", text }])} />
      </div>
    </div>
  );
}
```

## Anatomy

```
ChatThread        data-slot="chat-thread"        wrapper
├─ scroller       role="log" aria-live="polite"  the scrolling region
│  └─ ChatMessage data-slot="chat-message"       data-side, data-status, data-streaming
│     ├─ Avatar   data-slot="avatar"
│     ├─ byline   name + DateTime (data-slot="date-time")
│     ├─ bubble   data-slot="chat-bubble"        Markdown or text; TypingIndicator while streaming
│     └─ status   data-slot="chat-status"        spinner / check / error + retry
└─ jump button    data-slot="chat-jump"          only when scrolled away from the bottom
ChatComposer      data-slot="chat-composer"
├─ attachments    data-slot="chat-attachments"   your slot
└─ Textarea (data-slot="textarea"), actions slot, send or stop Button
```

## API

### `ChatThread`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `string` | "Conversation" / "المحادثة" | Accessible name of the log. |
| `jumpLabel?` | `string` | "Jump to latest" / "الانتقال إلى الأحدث" | Name of the jump button. |
| `contentClassName?` | `string` | none | Classes for the inner message column (`p-4 gap-4` by default). |
| `className?` | `string` | none | On the wrapper. Give it a height (`flex-1`, `h-96`). |

It sticks to the bottom while the reader is within 48px of it, also as a message grows while streaming. Scroll up and it
stops following; the jump button returns you and resumes.

### `ChatMessage`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | `"user" \| "assistant"` | `"assistant"` | `user` sits on the inline-end edge, `assistant` on inline-start. Mirrors in RTL. |
| `name?` | `string` | none | Byline and avatar initials. |
| `avatarSrc?` | `string` | none | Avatar image. |
| `avatar?` | `ReactNode` | none | Replaces the Avatar. |
| `time?` | `Date \| number \| string` | none | Shown as a localised time via `DateTime`. |
| `status?` | `"sending" \| "sent" \| "error"` | none | Delivery state under the bubble. |
| `onRetry?` | `() => void` | none | Shows a Retry button on `error`. |
| `format?` | `"text" \| "markdown"` | `"text"` | How a string child is rendered. |
| `streaming?` | `boolean` | `false` | Shows the typing indicator and sets `aria-busy`. |
| `children?` | `ReactNode` | none | Body. Empty plus `streaming` shows only the dots. |

### `ChatComposer`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` / `defaultValue?` | `string` | `""` | Controlled or uncontrolled text. |
| `onValueChange?` | `(value: string) => void` | none | Fires on every change and after a send (with `""`). |
| `onSend?` | `(text: string) => void` | none | Trimmed text, on Enter or the send button. |
| `onStop?` | `() => void` | none | With `streaming`, the send button becomes a stop button. |
| `streaming?` | `boolean` | `false` | Blocks sending. |
| `disabled?` | `boolean` | `false` | Disables the field and buttons. |
| `placeholder?` | `string` | "Write a message…" / "اكتب رسالة…" | |
| `label?` / `sendLabel?` / `stopLabel?` | `string` | "Message", "Send", "Stop" (Arabic built in) | Accessible names. |
| `maxRows?` | `number` | `8` | The field grows to this many lines, then scrolls. |
| `attachments?` | `ReactNode` | none | Slot above the field. |
| `actions?` | `ReactNode` | none | Slot before the send button. |

### `TypingIndicator`

`{ label?: string } & ComponentProps<"span">`. Three pulsing dots, `role="status"`, still under reduced motion.

## Examples

### Streaming with a stop button

```tsx
import { ChatComposer, ChatMessage, ChatThread } from "@fadymondy/nasaq/web";

export function Streaming({ text, busy, onStop }: { text: string; busy: boolean; onStop: () => void }) {
  return (
    <div className="flex h-96 flex-col">
      <ChatThread className="flex-1">
        <ChatMessage name="Assistant" streaming={busy} format="markdown">
          {text}
        </ChatMessage>
      </ChatThread>
      <ChatComposer streaming={busy} onStop={onStop} onSend={() => {}} />
    </div>
  );
}
```

### Arabic with a failed message

```tsx
import { ChatMessage } from "@fadymondy/nasaq/web";

export function Failed({ retry }: { retry: () => void }) {
  return (
    <ChatMessage side="user" name="فادي" status="error" onRetry={retry}>
      مرحبًا، هل الخدمة متاحة؟
    </ChatMessage>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Enter` | Sends (ignored while an IME composition is open) |
| `Shift+Enter` | New line |
| `Tab` | Thread, field, buttons; arrow keys scroll the focused thread |

- The thread is `role="log"` with `aria-live="polite"`, so new messages are announced without stealing focus.
- Sending and typing are `role="status"`; a failed message announces with `role="alert"`.
- Status is text plus an icon, never colour alone. Localise `label`, `sendLabel`, `stopLabel` when you pass your own.
- The streaming bubble sets `aria-busy` until `streaming` ends.

## RTL & i18n

- `user` and `assistant` use logical alignment (start and end) and mirror in Arabic. The send icon flips.
- Plain text and the field use `dir="auto"`; Markdown blocks orient themselves; code stays left-to-right.
- Times use the Nasaq digit set through `DateTime`.
- Built-in strings ship in English and Arabic and follow the Nasaq locale.

## Styling & tokens

- User bubble `bg-secondary`; assistant bubble `bg-card` with `border-border`; errors `border-nq-danger`.
- Composer focus ring uses `border-nq-focus` on the wrapper (`focus-within`).
- Target `data-side`, `data-status`, `data-streaming`, `data-disabled`. Extend with `className`; do not use raw hex.

## Do / Don't

- **Do** give the thread a bounded height so it can scroll.
- **Do** keep `onSend` fast: set `status="sending"` on the message, then `sent` or `error`.
- **Don't** put the composer inside the thread's scroller.
- **Don't** render untrusted HTML in bubbles; use `format="markdown"`, which drops raw HTML.

## Related

- [Markdown](../markdown/README.md) · [CodeBlock](../code-block/README.md) · [Avatar](../avatar/README.md) · [Field](../field/README.md) · [Button](../button/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-collaboration-chat--docs

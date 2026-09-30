---
name: inbox
title: Inbox
category: collaboration
status: beta
summary: Unified inbox for chat, email and WhatsApp with a filterable conversation list, thread, composer, contact panel, assignment, snooze, find in thread, voice notes, location sharing, saved replies, reactions, a docked chat launcher and live new message toasts, driven by callbacks.
exports: [InboxProps, Inbox, ColorDot, ConversationRowMenu, SnoozeMenu, CannedPicker, ConversationRowMenuProps, SnoozeMenuProps, CannedPickerProps, InboxComposer, InboxComposerProps, VoicePlayer, VoiceRecorder, LocationPicker, LocationCard, LinkPreviewCard, VoicePlayerProps, VoiceRecorderProps, VoiceRecording, LocationPickerProps, LocationCardProps, LinkPreviewCardProps, QUICK_REACTIONS, MessageReactions, ReactionPicker, ReplyQuote, MessageText, AttachmentList, InboxMessageView, MessageReactionsProps, ReactionPickerProps, ReplyQuoteProps, MessageTextProps, InboxMessageViewProps, ThreadSearchBar, ContactInfoPanel, NewMessageToast, InboxDock, ThreadSearchBarProps, ContactInfoPanelProps, NewMessageToastProps, InboxDockProps, applySnippet, filterConversations, countViews, findMatches, snoozePresets, INBOX_COLORS, InboxAgent, InboxAttachment, InboxChannel, InboxColor, InboxContact, InboxConversation, InboxDraft, InboxMessage, InboxResult, InboxStatus, ConversationPatch, CannedSnippet, GeoPoint, LinkPreviewData, InboxReaction, VoiceNote, InboxLabels, ConversationContextMenu, ConversationContextMenuProps]
related: [chat, mention-textarea, rich-text-editor, notification-item, markdown, chat-widget]
story: components-collaboration-inbox
base-ui: [dialog, menu, popover, tabs]
keywords: [inbox, helpdesk, support, chat, email, whatsapp, conversation, assign, snooze, canned replies, voice note, location, live chat]
---

# Inbox

The screen an agent lives in: every conversation from chat, email and WhatsApp in one list, the thread next to it,
and who the customer is on the side. It stores nothing. You pass `conversations` and the component calls your
callbacks (`onSend`, `onUpdate`, `onReact`); you update your state and pass the new list back.

## When to use

- A support or sales team answering customers over several channels.
- Any admin screen that needs threads, an assignee, snooze and internal notes.

## When not to use

- A customer-facing chat box: use [`ChatWidget`](../chat-widget/README.md).
- A single AI conversation: use [`CopilotChat`](../copilot-chat/README.md).

## Import

```tsx
import { Inbox } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Inbox, type InboxAgent, type InboxConversation } from "@fadymondy/nasaq/web";
import { useState } from "react";

declare const initial: InboxConversation[];
declare const agents: InboxAgent[];

export function Support() {
  const [list, setList] = useState(initial);
  return (
    <Inbox
      conversations={list}
      agents={agents}
      currentAgentId="a1"
      onSend={async (draft) => {
        // POST the draft, then append the message you get back
      }}
      onUpdate={async (id, patch) => setList((all) => all.map((c) => (c.id === id ? { ...c, ...patch } : c)))}
    />
  );
}
```

## Anatomy

```
Inbox                              data-slot="inbox" (data-compact under compactBelow px)
├─ conversation list               search, view tabs (Open, Unread, Snoozed, Closed, Archived), channel and assignment filters
│  └─ row                          avatar, colour dot, pin and mute marks, preview, unread badge, ConversationRowMenu
├─ thread                          header (assign, SnoozeMenu, close, find, pop out, contact), ThreadSearchBar, ChatThread
│  ├─ InboxMessageView             chat bubble, email card, internal note, event line
│  └─ InboxComposer                reply or note, emoji, saved replies, attach, VoiceRecorder, LocationPicker
├─ ContactInfoPanel                details, tags, notes, Media, Files and Links with a lightbox
├─ NewMessageToast                 a stack, for messages in conversations you are not reading
└─ InboxDock (separate)            launcher with unread count and small chat windows
```

## API

**Inbox**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `conversations` | `readonly InboxConversation[]` | required | Channel, contact, messages, status, assignee, unread, pinned, muted, colour, snooze. |
| `agents` | `readonly InboxAgent[]` | required | Teammates for assignment and @mentions in notes. |
| `currentAgentId` | `string` | required | Signed-in agent. |
| `selectedId` / `defaultSelectedId` / `onSelectedChange` | `string \| null` | none | Controlled or uncontrolled selection. |
| `onSend` | `(draft: InboxDraft) => Promise<void \| { error? }>` | required | Reply, note, voice message or location. An `error` keeps the draft and shows the message. |
| `onUpdate` | `(id, patch: ConversationPatch) => void \| Promise<void>` | required | Pin, archive, mute, colour, status, assignee, snooze, mark unread. |
| `onReact` | `(conversationId, messageId, emoji) => void` | | Reaction toggled. |
| `onRetry` | `(conversationId, message) => void` | | Retry a failed send. |
| `onPopOut` | `(conversationId) => void` | | Shows a pop out button (pair with `InboxDock`). |
| `snippets` | `readonly CannedSnippet[]` | none | Saved replies, typed after `/`, with `{{name}}` and `{{agent}}`. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `toasts` | `boolean` | `true` | Toast for a new incoming message in another conversation (muted ones stay quiet). |
| `simulateVoice` | `boolean` | `false` | The recorder makes a fake note without the microphone (demos and tests). |
| `compactBelow` | `number` | `820` | Under this width one pane shows at a time and contact opens in a sheet. |
| `labels` | `Partial<InboxLabels>` | | Override any string. |

**Parts** you can use alone: `InboxComposer`, `InboxMessageView`, `MessageReactions`, `ReactionPicker`, `ReplyQuote`,
`MessageText`, `AttachmentList`, `VoiceRecorder`, `VoicePlayer`, `LocationPicker`, `LocationCard`, `LinkPreviewCard`,
`SnoozeMenu`, `ConversationRowMenu`, `CannedPicker`, `ThreadSearchBar`, `ContactInfoPanel`, `NewMessageToast`, `InboxDock`.

**Helpers** (pure, tested): `filterConversations`, `countViews`, `findMatches`, `snoozePresets`, `applySnippet`.

## Examples

**Docked chat windows next to any page**

```tsx
import { InboxDock, type InboxConversation, type InboxDraft } from "@fadymondy/nasaq/web";

declare const list: InboxConversation[];
declare const send: (d: InboxDraft) => Promise<void>;

export const Dock = () => <InboxDock conversations={list} me="a1" onSend={send} />;
```

## Context menu

Each conversation row opens the same menu as its ⋯ button (status, labels, snooze, mute…) on right-click, Shift+F10 or the Menu key. `contextMenu={false}` opts out. Exported as `ConversationContextMenu`.

## Accessibility

- The list is a labelled region; the open row has `aria-current`. Unread count is text for screen readers.
- The thread is a `role="log"` that follows new messages until the reader scrolls up.
- Find: Enter and Shift+Enter move between matches, Escape closes. Menus use Base UI menu keyboard rules.
- The location pad moves with arrow keys. The recorder announces its state and needs no pointer.
- Toasts pause on hover and focus, and have a dismiss button.

## RTL & i18n

- English and Arabic follow the Nasaq locale. Email addresses, phone numbers, URLs and coordinates stay left to right.
- Send, back and panel icons mirror. The map pad does not mirror: east is always to the right.
- WhatsApp is written as text; no logo is used.

## Styling & tokens

- Built on `chat`, `mention-textarea`, `rich-text-editor`, `notification-item`, `tabs`, `sheet`, `dialog` and `--nq-*` tokens.
- Target `[data-slot="inbox"]`, `[data-slot="inbox-composer"]`, `[data-slot="inbox-dock"]`.
- Colour labels use `--nq-tag-*`.

## Do / Don't

- Do send email as HTML only after your server sanitises it. The thread renders it read only through the editor schema.
- Do resolve `onSend` with `{ error }` instead of throwing.
- Don't rely on colour alone to tell conversations apart.
- Don't keep the microphone open after `VoiceRecorder` closes; it releases the stream itself.

## Related

- [`ChatWidget`](../chat-widget/README.md)
- [`Chat`](../chat/README.md)
- [`MentionTextarea`](../mention-textarea/README.md)

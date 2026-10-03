---
name: copilot-chat
title: CopilotChat
category: ai
status: beta
summary: "AI assistant chat with streamed Markdown answers, tool-call steps, sources, artifacts, follow-ups, context chips, file attachments, slash commands, toggles, history, a model picker and @mentions, as a side panel or a full page."
exports: [CopilotChatLabels, CopilotSendMeta, CopilotChatProps, CopilotSteps, CopilotSources, CopilotContextBarProps, CopilotContextBar, CopilotAttachmentChipProps, CopilotAttachmentChip, CopilotAnswerProps, CopilotAnswer, CopilotChat, availableContext, filterCommands, hostOf, isPreviewUrl, isSafeUrl, slashQuery, stepCounts, transcriptToMarkdown, visibleMessages, withoutContext, withoutSlash, CopilotAttachment, CopilotCommand, CopilotContextItem, CopilotMessage, CopilotModel, CopilotSessionSummary, CopilotSource, CopilotStep, CopilotStepStatus, CopilotToggle]
related: [chat, markdown, mention-textarea, code-block-variants, chat-widget, copilot-provider, copilot-dock, artifact-renderer]
story: components-ai-assistant-copilot-chat
base-ui: [collapsible, menu, select]
keywords: [copilot, ai chat, assistant, llm, streaming, tool calls, sources, citations, model picker, context, side panel]
---

# CopilotChat

The chat for an AI assistant inside your product. The answer streams in as Markdown, the tools the assistant used show
as a folded list of steps, and the sources sit under the text. The visitor can pin context (a file, a page, a
selection), pick a model, and mention things with `@`. Code in an answer gets the copy menu from
[`CodeBlockAI`](../code-block-variants/README.md), so it can be copied as a prompt for Claude, ChatGPT or Cursor.
It stores only the text in the box: you own `messages` and stream into them.

## When to use

- An assistant panel next to your app, or a full page chat.
- Answers that cite sources or call tools and should show it.

## When not to use

- People talking to people: use [`Inbox`](../inbox/README.md) or [`ChatWidget`](../chat-widget/README.md).
- A plain message thread: use [`Chat`](../chat/README.md).

## Import

```tsx
import { CopilotChat } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CopilotChat, type CopilotMessage } from "@fadymondy/nasaq/web";
import { useState } from "react";

declare function ask(prompt: string, onToken: (t: string) => void): Promise<void>;

export function Assistant() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  return (
    <CopilotChat
      messages={messages}
      starters={["Summarise this week", "What is overdue?"]}
      onSend={async (text) => {
        const id = crypto.randomUUID();
        setMessages((m) => [
          ...m,
          { id: `${id}u`, role: "user", text },
          { id, role: "assistant", text: "", streaming: true },
        ]);
        await ask(text, (token) =>
          setMessages((all) => all.map((x) => (x.id === id ? { ...x, text: x.text + token } : x))),
        );
        setMessages((all) => all.map((x) => (x.id === id ? { ...x, streaming: false } : x)));
      }}
    />
  );
}
```

## Anatomy

```
CopilotChat                       data-slot="copilot-chat" (data-mode="panel" | "page")
├─ header                         title, history, new chat, copy conversation, headerActions, close
├─ empty state                    title and starter prompts
├─ ChatThread                     role="log", follows the stream
│  ├─ ChatMessage (user)
│  └─ CopilotAnswer               ChatMessage with:
│     ├─ CopilotSteps             data-slot="copilot-steps", folded tool calls
│     ├─ Markdown                 code blocks are CodeBlockAI
│     ├─ ArtifactList             cards, tables, charts, pickers from the answer
│     ├─ CopilotSources           numbered links
│     ├─ copilot-stream-error     role="alert" with Retry, when `error` is set
│     ├─ actions                  copy, share, good, not helpful, try again
│     └─ follow-ups               suggestion chips under the last answer
├─ copilot-commands               "/" listbox above the box
└─ composer                       data-slot="copilot-composer": drop zone, command chips, attachment chips,
                                  CopilotContextBar, MentionTextarea, attach, toggles, model, send or stop
```

## API

**CopilotChat**: every `section` prop except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `messages` | `readonly CopilotMessage[]` | required | `{ id, role, text, at?, steps?, sources?, followUps?, streaming?, error?, feedback? }`. |
| `onSend` | `(text, { context, model, mentions }) => void \| Promise<void>` | required | A prompt from the box, a starter or a follow-up. |
| `onStop` | `() => void` | | Turns the send button into a stop button while an answer streams. |
| `onRegenerate` | `(messageId) => void` | | Try again on the last answer. |
| `onFeedback` | `(messageId, "up" \| "down") => void` | | Shows the two rating buttons. |
| `mode` | `"panel" \| "page"` | `"panel"` | Side sheet or centred full page column. |
| `title` / `onClose` / `onNewChat` | | "Copilot" | Header. Close shows in panel mode. |
| `starters` | `readonly string[]` | none | Prompts on the empty screen. |
| `context` / `onContextChange` / `contextOptions` | `CopilotContextItem[]` | none | Chips with remove and an Add context menu. |
| `models` / `model` / `onModelChange` | `CopilotModel[]` | none | The model picker. |
| `mentions` | `readonly MentionOption[]` | none | Things the visitor can `@` mention. |
| `copyTargets` | `AiTarget[]` | Claude, ChatGPT, Cursor | Assistants in the code copy menu. |
| `draft` / `onDraftChange` | `string` | | Control the box, e.g. to fill it from outside. |
| `attachments` / `onAttach` / `onAttachmentsChange` / `accept` | `CopilotAttachment[]` | | Attach button, paste and drop. You upload in `onAttach` and report `progress` and `error`; Send waits for uploads. |
| `commands` | `CopilotCommand[]` | | Typing `/` opens a menu; chosen commands become chips and are sent in `meta.commands`. |
| `toggles` / `activeToggles` / `onTogglesChange` | `CopilotToggle[]` | | Pressed buttons such as "Web search", sent in `meta.toggles`. |
| `sessions` / `activeSessionId` / `onSessionSelect` / `onSessionDelete` | `CopilotSessionSummary[]` | | The History menu. |
| `onArtifactAction` / `onArtifactPick` / `allowHtml` | | | Artifacts in `message.artifacts`; see `artifact-renderer`. |
| `share` | `boolean` | | A Share button on answers where `navigator.share` exists. |
| `disclaimer` | `ReactNode` | | Small print under the box. |
| `headerActions` | `ReactNode` | | Buttons before Close. |
| `labels` | `Partial<CopilotChatLabels>` | | Override any string. |

Messages with `hidden: true` are not shown, so an app can send structured replies (such as a picked option) without cluttering the thread. `onSend` receives `{ context, model, mentions, attachments, commands, toggles }`.

**Parts** you can use alone: `CopilotAnswer`, `CopilotSteps`, `CopilotSources`, `CopilotContextBar`, `CopilotAttachmentChip`.
**Helpers** (pure, tested): `transcriptToMarkdown`, `stepCounts`, `isSafeUrl`, `hostOf`, `withoutContext`, `availableContext`, `slashQuery`, `filterCommands`, `withoutSlash`, `isPreviewUrl`, `visibleMessages`.

For streaming, retries and sessions without wiring these yourself, wrap the app in [`CopilotProvider`](../copilot-provider/README.md).

## Examples

**Tool steps and sources on an answer**

```tsx
import { CopilotAnswer } from "@fadymondy/nasaq/web";

export const Answer = () => (
  <CopilotAnswer
    message={{
      id: "1",
      role: "assistant",
      text: "Three invoices are overdue.",
      steps: [{ id: "s1", label: "Searched invoices", tool: "invoices.search", status: "done", detail: "status=overdue" }],
      sources: [{ id: "a", title: "Invoices", url: "https://example.com/invoices" }],
    }}
  />
);
```

## Accessibility

- The thread is a `role="log"` that follows the stream until the reader scrolls up. A streaming answer sets `aria-busy`.
- Steps are a real disclosure button with a text summary. Status is an icon plus text, never colour alone.
- Every icon button has a name. The model picker, context chips and follow-ups are keyboard reachable. Enter sends, Shift+Enter adds a line and Enter is ignored during IME composition.
- The "/" menu is a labelled `listbox` whose active option is `aria-selected`. Arrow keys move, Enter or Tab choose, Escape closes it, and a live region announces the matches.
- Toggles are `aria-pressed` buttons. Attachments are named by file and say their upload progress or error. A failed answer is an `alert` with a Retry button.
- Source links open in a new tab with `rel="noopener noreferrer"`. Only `http` and `https` links are made clickable.

## RTL & i18n

- English and Arabic follow the Nasaq locale. Each answer paragraph uses `dir="auto"`, so Arabic and English mix in one answer. Code, tool names and hosts stay left to right.
- The send arrow mirrors. Side panel edge follows the inline end.

## Styling & tokens

- Built on `chat`, `markdown`, `mention-textarea`, `code-block-variants`, `collapsible`, `select` (the model menu is `AiModelSelect` from `ai-model-picker`) and `--nq-*` tokens.
- Target `[data-slot="copilot-chat"]`, `[data-slot="copilot-steps"]`, `[data-slot="copilot-sources"]`.

## Do / Don't

- Do set `streaming: false` on the message when the stream ends, or the box stays locked.
- Do keep `steps` in the message so history shows what the assistant did.
- Don't put secrets in `context` labels: they are shown on screen.
- Don't render raw HTML from the model: the Markdown drops it for you.

## Related

- [`Chat`](../chat/README.md)
- [`Markdown`](../markdown/README.md)
- [`MentionTextarea`](../mention-textarea/README.md)
- [`CodeBlockVariants`](../code-block-variants/README.md)

---
name: copilot-chat
title: CopilotChat
category: ai
status: beta
summary: AI assistant chat with streamed Markdown answers, collapsible tool-call steps, sources, starter prompts and follow-ups, context chips, a model picker, @mentions and copy-for-AI code blocks, as a side panel or a full page.
exports: [CopilotChatLabels, CopilotSendMeta, CopilotChatProps, CopilotSteps, CopilotSources, CopilotContextBarProps, CopilotContextBar, CopilotAnswerProps, CopilotAnswer, CopilotChat, availableContext, hostOf, isSafeUrl, stepCounts, transcriptToMarkdown, withoutContext, CopilotContextItem, CopilotMessage, CopilotModel, CopilotSource, CopilotStep, CopilotStepStatus]
related: [chat, markdown, mention-textarea, code-block-variants, chat-widget]
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
├─ header                         title, new chat, copy conversation, close (panel)
├─ empty state                    title and starter prompts
├─ ChatThread                     role="log", follows the stream
│  ├─ ChatMessage (user)
│  └─ CopilotAnswer               ChatMessage with:
│     ├─ CopilotSteps             data-slot="copilot-steps", folded tool calls
│     ├─ Markdown                 code blocks are CodeBlockAI
│     ├─ CopilotSources           numbered links
│     ├─ actions                  copy, good, not helpful, try again
│     └─ follow-ups               suggestion chips under the last answer
└─ composer                       CopilotContextBar, MentionTextarea, Select (model), send or stop
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
| `labels` | `Partial<CopilotChatLabels>` | | Override any string. |

**Parts** you can use alone: `CopilotAnswer`, `CopilotSteps`, `CopilotSources`, `CopilotContextBar`.
**Helpers** (pure, tested): `transcriptToMarkdown`, `stepCounts`, `isSafeUrl`, `hostOf`, `withoutContext`, `availableContext`.

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

---
name: copilot-provider
title: CopilotProvider
category: ai
status: beta
summary: "Owns a copilot conversation: streams answers from your transport, stops, retries, keeps sessions, and lets any part of the app open the assistant with useCopilot()."
exports: [CopilotProvider, CopilotProviderProps, CopilotLauncher, CopilotLauncherProps, CopilotLauncherLabels, useCopilot, useOptionalCopilot, CopilotContextValue, CopilotTransport, CopilotRequest, CopilotSessionStore, CopilotOpenOptions, CopilotSendOptions, CopilotEvent, StreamState, reduceStream, splitStreamingText, startAnswer, finishAnswer, retryPoint, describeInteraction]
related: [copilot-chat, copilot-dock, artifact-renderer]
story: components-ai-assistant-copilot-provider
base-ui: []
keywords: [copilot, assistant, ai, provider, context, streaming, sse, transport, sessions, history, retry, stop, hook]
---

# CopilotProvider

The state behind [`CopilotChat`](../copilot-chat/README.md) and [`CopilotDock`](../copilot-dock/README.md). You give it a
transport, a function that turns a request into a stream of events, and it does the rest:

- appends the question and a streaming answer;
- applies text, tool steps, sources, artifacts and follow-ups as they arrive;
- stops on demand;
- retries after an error;
- loads and deletes saved sessions.

Any component below it can open the assistant with `useCopilot().open(...)`.

## When to use

- An app-wide assistant whose answers stream from your backend (SSE, fetch streams, WebSockets).
- Pages that need to open the assistant with a question or with context, such as "Ask about this order".

## When not to use

- A one-off chat with its own state: pass `messages` and `onSend` to `CopilotChat` yourself.
- A single question box: use [`AskAI`](../ask-ai/README.md).

## Import

```tsx
import { CopilotProvider, CopilotLauncher, useCopilot } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { type CopilotEvent, CopilotLauncher, CopilotProvider, type CopilotTransport } from "@fadymondy/nasaq/web";

const transport: CopilotTransport = async function* ({ history, message, sessionId }, { signal }) {
  const res = await fetch("/api/copilot", {
    method: "POST",
    body: JSON.stringify({ history, message, sessionId }),
    signal,
  });
  // One JSON event per line, such as {"type":"delta","text":"Hi"}.
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as CopilotEvent;
  }
};

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <CopilotProvider transport={transport} greeting="Hi! Ask me anything." dock={{ launcher: false }}>
      <header>
        <CopilotLauncher />
      </header>
      {children}
    </CopilotProvider>
  );
}
```

Anywhere below:

```tsx
const copilot = useCopilot();

<Button onClick={() => copilot.open({ message: "Summarise this order", autoSend: true, context: [{ id: order.id, label: order.number }] })}>
  Ask AI
</Button>;
```

## Anatomy

```
CopilotProvider          context only, no DOM
├─ children              useCopilot() works here
└─ CopilotDock           when `dock` is set, wired to the state
CopilotLauncher          data-slot="copilot-launcher"  <button aria-expanded>
```

## API

### `CopilotProvider`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `transport` | `CopilotTransport` | required | `(request, { signal }) => AsyncIterable<CopilotEvent>`. Stop when `signal` aborts. |
| `sessions` | `CopilotSessionStore` | | `{ list, load, remove? }`. Turns on History; the list loads when the assistant first opens. |
| `initialMessages` | `CopilotMessage[]` | | |
| `greeting` | `string` | | An assistant message at the start of every new chat. |
| `defaultOpen` / `onOpenChange` | | `false` | |
| `onFeedback` | `(message, "up" \| "down") => void` | | Called when a rating is set. |
| `onArtifactAction` / `onArtifactPick` | | send back | By default the choice is sent to the assistant as a hidden message with `data: { type: "artifact-action" \| "artifact-pick", ... }`. |
| `dock` | `boolean \| CopilotDockProps` | | Mounts a `CopilotDock` wired to the state. |

### Events (`CopilotEvent`)

| Event | Effect |
| --- | --- |
| `{ type: "delta", text }` | Appends text. ` ```artifact ` blocks become artifacts; a block still being written stays hidden. |
| `{ type: "text", text }` | Replaces the text. |
| `{ type: "step", step }` | Adds a tool step or updates the one with the same `id`. |
| `{ type: "sources", sources }` / `{ type: "followUps", followUps }` | |
| `{ type: "artifact", artifact }` | Any JSON; validated and dropped when invalid. |
| `{ type: "session", id, title? }` | The server saved the conversation. |
| `{ type: "error", message? }` | Ends the answer with an error and a Retry button. |
| `{ type: "done" }` | Ends the answer; running steps are marked done. |

### `useCopilot()`

Returns:

- **State:** `messages`, `streaming`, `isOpen`.
- **Opening:** `open({ message?, autoSend?, context? })`, `close`, `toggle`.
- **Conversation:** `send(text, meta?, { hidden?, data? })`, `stop`, `retry(answerId?)`, `newChat`, `feedback`.
- **Composer:** `draft` / `setDraft`, `context` / `setContext`.
- **Sessions:** `sessionId`, `sessions`, `refreshSessions`, `loadSession`, `deleteSession`.
- **Wiring:** `chatProps`, which you spread on your own `CopilotChat` or `CopilotDock`.

`useOptionalCopilot()` returns `null` outside a provider.

### `CopilotLauncher`

`Button` props plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `look` | `"header" \| "icon"` | `"header"` | |
| `shortcut` | `string \| false` | `⌘J` / `Ctrl+J` | |
| `openWith` | `CopilotOpenOptions` | | |
| `labels` | | | |

### Pure helpers

The stream logic is exported for tests and custom state:

- `reduceStream(state, event)` and `startAnswer(id)`, which build up an answer;
- `finishAnswer(state)`, which ends it;
- `splitStreamingText(raw)`, which separates text from artifacts;
- `retryPoint(messages, answerId?)`, which finds the message a retry sends again;
- `describeInteraction(kind, detail)`, which writes the text of a hidden reply.

## Accessibility

- Answers stream into `CopilotChat`'s `log` region. Errors appear as an alert with a Retry button.
- Stop keeps what arrived and is not reported as an error.
- `CopilotLauncher` reports `aria-expanded` and names the shortcut in its title.

## RTL & i18n

The launcher label ships in English and Arabic. The text of hidden replies (`[action] …`, `[picked] …`) is for the model and is not shown.

## Styling & tokens

The provider has no DOM. `CopilotLauncher` is a `Button`; style it with `variant`, `size` and `className`.

## Do / Don't

- Do abort the network request when `signal` aborts, so Stop really stops the server.
- Do yield `{ type: "session" }` once the server saves the conversation, so History and Retry use the right id.
- Don't mount two providers for one assistant; open it from anywhere with `useCopilot()`.

## Related

- [`copilot-chat`](../copilot-chat/README.md)
- [`copilot-dock`](../copilot-dock/README.md)
- [`artifact-renderer`](../artifact-renderer/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-assistant-copilot-provider--docs

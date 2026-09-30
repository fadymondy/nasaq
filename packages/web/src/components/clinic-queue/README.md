---
name: clinic-queue
title: ClinicQueue
category: health
status: beta
summary: The doctor's live patient queue - a big Call next button, who is called or in the room, and a table of everyone else with call, call again, skip, start, finish and put back actions.
exports: [ClinicQueueAction, ClinicQueueLabels, ClinicQueueProps, ClinicQueue]
related: [waiting-screen, lobby-display, current-visit, data-table]
story: components-health-clinic-queue
base-ui: [menu, context-menu]
keywords: [queue, call next, skip, recall, doctor, live, data table]
---

# ClinicQueue

The order comes from queue-math: urgent first, then appointments, then walk-ins, first come first served in each group. Every move is a row action, so it is also in the row menu, the context menu and the keyboard.

## When to use

- The doctor or nurse works through the waiting list.
- Reception calls patients to rooms.

## When not to use

- A shared board: use LobbyDisplay.

## Import

```tsx
import { ClinicQueueAction, ClinicQueue } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ClinicQueue } from "@fadymondy/nasaq/web";

<ClinicQueue entries={queue} onAction={async (action, id) => api.queue(action, id)} />
```

## Anatomy

```
ClinicQueue                   data-slot="clinic-queue"
├─ header                     next in line, QueueLiveIndicator, Call next
├─ alerts                     error, unanswered call
├─ active cards               called and in the room, with their buttons
└─ DataTable                  ticket, patient, priority, status, wait; rowActions
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `entries` | `QueueEntry[]` | `required` | The queue. Pass one doctor's entries or all. |
| `onAction` | `(action, id?) => Promise<void \| { error? }>` | `required` | action is "call-next", "call", "recall", "skip", "start", "finish" or "no-show". |
| `graceMinutes` | `number` | `5` | Minutes a call may go unanswered before a warning. |
| `connection, updatedAt` |  | `"live"` | Live indicator. |
| `now` | `number` |  | Epoch ms for stories. |
| `labels` | `Partial<ClinicQueueLabels>` |  | Override any string. |

## Examples

**Apply the rules in your handler**

```tsx
import { callNext, skipTicket } from "@fadymondy/nasaq/web";

const change = action === "call-next" ? callNext(list, { room: "1", at: Date.now() }) : skipTicket(list, id);
```

## Accessibility

- Actions are buttons with text. The table has a label and row names.
- An unanswered call shows a warning alert with the ticket.

## RTL & i18n

- Table columns mirror; tickets stay left to right.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="clinic-queue"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`waiting-screen`](../waiting-screen/README.md)
- [`lobby-display`](../lobby-display/README.md)
- [`current-visit`](../current-visit/README.md)
- [`data-table`](../data-table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-health-clinic-queue--docs

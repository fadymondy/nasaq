---
name: waiting-screen
title: WaitingScreen
category: bookings
status: beta
summary: Patient waiting screen with ticket, position, estimated wait, now serving, room, a live connection indicator and a called state, driven by pure queue math.
exports: [QueueConnection, WaitingScreenLabels, QueueLiveIndicatorProps, QueueLiveIndicator, WaitingScreenProps, WaitingScreen]
related: [lobby-display, check-in-kiosk, clinic-queue]
story: components-bookings-waiting-screen
base-ui: [progress]
keywords: [queue, waiting, ticket, position, eta, live, realtime]
---

# WaitingScreen

What a patient sees on their own phone while they wait. It takes the whole queue so position, estimate and now serving always agree with what reception sees. QueueLiveIndicator is the small live, reconnecting or offline badge shared with the clinic screens. The queue-math helpers (positionInQueue, estimateWaitMinutes, callNext and friends) are exported too.

## When to use

- A patient checked in and waits for their turn.
- A QR on the ticket opens this page.

## When not to use

- A shared board in the waiting room: use LobbyDisplay.
- The doctor's list: use ClinicQueue.

## Import

```tsx
import { QueueConnection, QueueLiveIndicator, WaitingScreen } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { WaitingScreen } from "@fadymondy/nasaq/web";

<WaitingScreen entries={queue} entryId={myEntryId} rooms={2} connection={socketState} onLeave={() => api.leave(myEntryId)} />
```

## Anatomy

```
WaitingScreen                 data-slot="waiting-screen"
├─ header                     clinic name and QueueLiveIndicator
├─ ticket card                big ticket, position, estimated wait
├─ now serving
└─ leave button (onLeave)
QueueLiveIndicator            data-slot="queue-live-indicator"
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `entries` | `QueueEntry[]` | `required` | The whole queue. |
| `entryId` | `string` | `required` | Which entry is this patient. |
| `averageMinutes, rooms` | `number` | 10, 1 | For the estimate. |
| `clinic` | `string` |  | Name in the header. |
| `connection` | `"live" \| "reconnecting" \| "offline"` | `"live"` | Live state of your data feed. |
| `updatedAt, now` | `number` |  | Epoch milliseconds. now is for stories. |
| `onLeave` | `() => Promise<void \| { error? }>` |  | Leave the line. Omit to hide the button. |
| `labels` | `Partial<WaitingScreenLabels>` |  | Override any string. |

## Examples

**Wire it to a socket**

```tsx
const [connection, setConnection] = useState<QueueConnection>("live");
socket.onclose = () => setConnection("reconnecting");
```

## Accessibility

- Position and wait changes are announced politely; the called state is announced assertively once.
- Live state is text plus icon, not only a dot colour.

## RTL & i18n

- Ticket numbers stay left to right; the layout mirrors.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="waiting-screen"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`lobby-display`](../lobby-display/README.md)
- [`check-in-kiosk`](../check-in-kiosk/README.md)
- [`clinic-queue`](../clinic-queue/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-bookings-waiting-screen--docs

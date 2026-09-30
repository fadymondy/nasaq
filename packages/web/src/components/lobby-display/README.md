---
name: lobby-display
title: LobbyDisplay
category: commerce
status: beta
summary: Large-screen now-serving board with one card per room, up next and recent calls, a clock, and a chime plus flash for each new call, sized from its own width.
exports: [LobbyDisplayLabels, LobbyDisplayProps, LobbyDisplay]
related: [waiting-screen, clinic-queue, check-in-kiosk]
story: components-commerce-lobby-display
base-ui: [switch]
keywords: [tv, display, lobby, board, now serving, chime, queue, kiosk]
---

# LobbyDisplay

A board for a television in the waiting room. Sizes use container queries, so it reads from across the room at 1920 pixels and still fits a phone. The board shows ticket numbers only, never names.

## When to use

- A screen in the waiting room shows who is called to which room.
- Reception previews the board on a laptop.

## When not to use

- A patient's own phone: use WaitingScreen.

## Import

```tsx
import { LobbyDisplay } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { LobbyDisplay } from "@fadymondy/nasaq/web";

<LobbyDisplay entries={queue} rooms={["1", "2", "3"]} clinic="Nasaq Family Clinic" />
```

## Anatomy

```
LobbyDisplay                  data-slot="lobby-display"  (@container)
├─ header                     clinic, clock, sound switch
├─ room cards                 ticket and room; a new call flashes
├─ up next                    the next tickets in line
├─ recent calls
└─ sr-only live region        announces each new call
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `entries` | `QueueEntry[]` | `required` | The whole queue. |
| `rooms` | `string[]` | `required` | Room or desk names, in board order. |
| `clinic` | `string` |  | Name in the header. |
| `connection` | `"live" \| "reconnecting" \| "offline"` | `"live"` | Small indicator. |
| `sound, defaultSound, onSoundChange` | `boolean` |  | The chime. Browsers need one click before sound can play. |
| `highlightMs` | `number` | `10000` | How long a fresh call stays highlighted. |
| `upNext` | `number` | `5` | Tickets listed under Up next. |
| `now` | `number` |  | Epoch ms for stories. |
| `labels` | `Partial<LobbyDisplayLabels>` |  | Override any string. |

## Examples

**Sound needs a click**

```tsx
// The operator turns sound on once. Until then the board flashes and announces silently.
```

## Accessibility

- A new call is announced through an assertive live region. The first render is silent.
- The flash respects reduced motion: the highlight stays, the pulse stops.
- Contrast is high for reading at a distance.

## RTL & i18n

- The board mirrors. Tickets and the clock stay left to right.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="lobby-display"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`waiting-screen`](../waiting-screen/README.md)
- [`clinic-queue`](../clinic-queue/README.md)
- [`check-in-kiosk`](../check-in-kiosk/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-lobby-display--docs

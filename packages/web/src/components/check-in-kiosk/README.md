---
name: check-in-kiosk
title: CheckInKiosk
category: bookings
status: beta
summary: Self check-in kiosk - scan or type a booking code, or enter a phone number on a big keypad, find the booking, and print a queue ticket with a QR and an auto reset.
exports: [CheckInKioskLabels, CheckInRequest, CheckInResult, CheckInKioskProps, CheckInKiosk]
related: [waiting-screen, lobby-display, booking-manage, qr-code]
story: components-bookings-check-in-kiosk
base-ui: [tabs]
keywords: [kiosk, check-in, scan, phone, keypad, walk-in, queue]
---

# CheckInKiosk

For a tablet at the front door. A handheld scanner types into the focused code field like a keyboard. The camera is not used: this component has no scanner. It finds today's booking by code or phone, asks which one when there are several, says so when the person is too early, and offers a walk-in ticket.

## When to use

- Patients check themselves in.
- A scanner or a keypad is the only input.

## When not to use

- Booking a new visit: use BookingFlow.

## Import

```tsx
import { CheckInRequest, CheckInResult, CheckInKiosk } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CheckInKiosk } from "@fadymondy/nasaq/web";

<CheckInKiosk
  bookings={todaysBookings}
  onCheckIn={async (request) => {
    const entry = await api.checkIn(request);
    return { entry, position: 3, waitMinutes: 20 };
  }}
/>
```

## Anatomy

```
CheckInKiosk                  data-slot="check-in-kiosk"
├─ mode tabs                  scan a code, or phone
├─ code field or keypad
├─ result: choose one, too early, not found
└─ ticket                     queue number, QR, position, wait, reset countdown
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `bookings` | `KioskBooking[]` | `required` | Today's bookings for this desk. |
| `onCheckIn` | `(request) => Promise<CheckInResult \| { error }>` | `required` | Put the person in the queue. |
| `allowWalkIn` | `boolean` | `true` | Let people without a booking join. |
| `earlyMinutes, windowMinutes` | `number` | 60, 240 | How early is allowed; how far from now a booking counts. |
| `resetSeconds` | `number` | `20` | Seconds the ticket stays. 0 keeps it. |
| `defaultMode` | `"scan" \| "phone"` | `"scan"` | Start tab. |
| `now` | `number` |  | Epoch ms for stories. |
| `labels` | `Partial<CheckInKioskLabels>` |  | Override any string. |

## Examples

**Ticket QR**

```tsx
// The ticket QR holds queue:A-012, which parseTicketValue reads back.
```

## Accessibility

- Keys are real buttons at a touch size. Results are announced in a status region.
- The countdown to reset is stated in text so it can be paused by tapping.

## RTL & i18n

- The keypad stays in phone order (left to right) in Arabic, as phones do.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="check-in-kiosk"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`waiting-screen`](../waiting-screen/README.md)
- [`lobby-display`](../lobby-display/README.md)
- [`booking-manage`](../booking-manage/README.md)
- [`qr-code`](../qr-code/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-bookings-check-in-kiosk--docs

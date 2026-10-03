---
name: booking-manage
title: BookingManage
category: bookings
status: beta
summary: A patient's own booking page - QR ticket with code, add to calendar, reschedule in a dialog and cancel with the late fee stated, all following a cancel and reschedule policy.
exports: [BookingManageLabels, BookingTicketProps, BookingTicket, BookingManageProps, BookingManage]
related: [booking-flow, booking-slots, booking-pipeline, qr-code]
story: components-bookings-booking-manage
base-ui: [dialog, alert-dialog]
keywords: [booking, reschedule, cancel, ticket, ics, calendar, policy]
---

# BookingManage

What the patient sees after booking and when they come back to change it. BookingTicket is the ticket on its own: a QR that holds booking:CODE, the code as text, the details, a .ics download and a Google Calendar link.

## When to use

- A booking confirmation page or a manage link in an email.
- Enforcing a cancellation window and a late fee.

## When not to use

- Staff tools: use BookingPipeline.
- Booking for the first time: use BookingFlow.

## Import

```tsx
import { BookingTicket, BookingManage } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BookingManage } from "@fadymondy/nasaq/web";

<BookingManage
  booking={booking}
  policy={{ cancelHours: 24, lateFeePercent: 50 }}
  getSlots={() => api.slots(booking)}
  onReschedule={(start) => api.reschedule(booking.id, start)}
  onCancel={() => api.cancel(booking.id)}
/>
```

## Anatomy

```
BookingManage                 data-slot="booking-manage"
├─ BookingTicket              QR, code, details, calendar links
├─ policy text
├─ Reschedule button          opens a Dialog with BookingSlots
└─ Cancel button              ConfirmButton; the fee is stated first
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `booking` | `BookingRecord` | `required` | The booking shown. |
| `policy` | `{ cancelHours, rescheduleHours?, lateFeePercent? }` | `required` | Free cancellation window, reschedule window and the late fee. |
| `getSlots` | `(booking) => Promise<BookingSlot[]>` | `required` | Times to move to, called when the dialog opens. |
| `onReschedule` | `(start) => Promise<void \| { error? }>` | `required` | Move the booking. |
| `onCancel` | `() => Promise<void \| { error? }>` | `required` | Cancel it. |
| `now` | `Date` | the clock | For stories and tests. |
| `labels` | `Partial<BookingManageLabels>` |  | Override any string. |

## Examples

**The ticket alone**

```tsx
import { BookingTicket } from "@fadymondy/nasaq/web";

<BookingTicket booking={booking} />
```

## Accessibility

- The QR has an accessible name and the code is also plain text.
- Cancel names the fee before the patient confirms.
- Buttons that the policy disables say why in text.

## RTL & i18n

- Codes and phone numbers are left to right; the dialog and buttons mirror.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="booking-manage"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`booking-flow`](../booking-flow/README.md)
- [`booking-slots`](../booking-slots/README.md)
- [`booking-pipeline`](../booking-pipeline/README.md)
- [`qr-code`](../qr-code/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-bookings-booking-manage--docs

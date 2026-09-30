---
name: booking-flow
title: BookingFlow
category: commerce
status: beta
summary: Online booking flow with branch, service, doctor with ratings, day and time grid, guest or signed-in details, notes and files, payment choice, review and a QR ticket confirmation.
exports: [BookingStepId, BookingFlowLabels, BookingDetailsValue, BookingSubmission, BookingSlotQuery, BookingFlowProps, BookingFlow]
related: [booking-slots, booking-manage, booking-pipeline, checkout-steps, stepper, qr-code]
story: components-commerce-booking-flow
base-ui: [radio-group, field]
keywords: [booking, appointment, reservation, clinic, seatfor, steps, wizard, time slot]
---

# BookingFlow

The patient side of a booking. It walks through up to eight steps, keeps every choice in state and calls onSubmit once at the end. It never fetches: you pass the catalogue and a getSlots function.

## When to use

- A clinic, salon or service business lets customers book online.
- You need guests to book without an account, and signed-in patients to skip the details step.
- The result should be a code and a QR ticket the customer can keep.

## When not to use

- Staff booking on behalf of a walk-in: use a shorter form or the clinic schedule.
- Only picking a time in a dialog: use [BookingSlots](../booking-slots/README.md).
- A shop checkout: use [CheckoutSteps](../checkout-steps/README.md).

## Import

```tsx
import { BookingStepId, BookingDetailsValue, BookingSubmission, BookingSlotQuery, BookingFlow } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BookingFlow } from "@fadymondy/nasaq/web";

export function Book({ services, providers, locations }) {
  return (
    <BookingFlow
      locations={locations}
      services={services}
      providers={providers}
      getSlots={(query) => api.slots(query)}
      onSubmit={async (booking) => {
        const created = await api.book(booking);
        return { code: created.code };
      }}
    />
  );
}
```

## Anatomy

```
BookingFlow                   data-slot="booking-flow"
├─ Stepper (md and up) or "Step n of N" with Progress (mobile)
├─ step panel                 heading takes focus on each step change
│  ├─ branch, service, doctor (RadioCard lists)
│  ├─ time: BookingSlots
│  ├─ details: name, phone, email, book for someone else
│  ├─ notes: Textarea and FileUpload
│  ├─ payment: online or pay at the visit
│  └─ review
├─ summary aside              choices so far, price, tax and total
└─ confirmation               BookingTicket and "Book another visit"
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `locations` | `BookingLocation[]` | `[]` | Branches. The branch step is skipped when there are fewer than two. |
| `services` | `BookingService[]` | `required` | What can be booked: name, minutes, price and an optional group. |
| `providers` | `BookingProvider[]` | `required` | Doctors with specialty, rating and the services and branches they cover. |
| `getSlots` | `(query) => Promise<BookingSlot[]>` | `required` | Times for the branch, service and doctor. Called when the time step opens and when the choice changes. |
| `onSubmit` | `(booking) => Promise<void \| { code?, error? }>` | `required` | Create the booking. Return { error } to stay on the review step. |
| `signedIn` | `{ name, phone, email? }` |  | Fills the details and shows a short booking-as line. |
| `allowOnlinePayment` | `boolean` | `true` | Offer online payment. The flow only records the choice: taking the payment is the host's job. |
| `currency, taxRate` | `string, number` | "EGP", 0 | Money display and tax as a fraction. |
| `now` | `Date` | the clock | For stories and tests. |
| `onStepChange, onReset` | `callbacks` |  | Analytics and routing hooks. |
| `labels` | `Partial<BookingFlowLabels>` |  | Override any string. |

## Examples

**Take an error from the server**

```tsx
onSubmit={async (booking) => {
  const r = await api.book(booking);
  return r.ok ? { code: r.code } : { error: "That time was just taken. Pick another." };
}}
```

## Accessibility

- Each step change moves focus to the step heading and the stepper marks the current step with aria-current.
- Slot state is an icon and a word, never colour alone. Errors are announced next to their field.
- Everything works with the keyboard: choices are radio groups, the time grid is a radio group with arrow keys.

## RTL & i18n

- Layout uses logical classes; the stepper and the back and next arrows mirror.
- Codes, phone numbers, times and prices stay left to right inside bdi. Digits are Latin by default.
- English and Arabic strings ship in the component.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="booking-flow"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`booking-slots`](../booking-slots/README.md)
- [`booking-manage`](../booking-manage/README.md)
- [`booking-pipeline`](../booking-pipeline/README.md)
- [`checkout-steps`](../checkout-steps/README.md)
- [`stepper`](../stepper/README.md)
- [`qr-code`](../qr-code/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-booking-flow--docs

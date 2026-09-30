---
name: booking-pipeline
title: BookingPipeline
category: commerce
status: beta
summary: Staff status pipeline for a booking - requested, confirmed, checked in, in visit and done, with next-action buttons, confirm on no-show and cancel, and a timeline of every move.
exports: [BOOKING_STATUS_LABELS, useBookingStatusLabel, BookingStatusBadgeProps, BookingStatusBadge, BookingPipelineLabels, BookingPipelineProps, BookingPipeline]
related: [booking-manage, clinic-schedule, kanban-board, stepper, timeline]
story: components-commerce-booking-pipeline
base-ui: [alert-dialog]
keywords: [status, workflow, pipeline, check-in, no-show, timeline, booking]
---

# BookingPipeline

The status of one booking as a stepper, the moves allowed from where it is, and a history. The rules come from the pure booking-math functions (canTransition, nextStatuses), so a board and a form always agree. BookingStatusBadge shows the same status in a table.

## When to use

- Reception moves a booking along: confirm, check in, start, finish.
- Showing the history of a booking to staff.

## When not to use

- A patient looking at their own booking: use BookingManage.
- Ordering several bookings on a board: use KanbanBoard with canTransition to validate drops.

## Import

```tsx
import { BOOKING_STATUS_LABELS, BookingStatusBadge, BookingPipeline } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BookingPipeline } from "@fadymondy/nasaq/web";

<BookingPipeline
  status={booking.status}
  history={booking.history}
  onAdvance={async (to) => {
    const r = await api.move(booking.id, to);
    if (!r.ok) return { error: r.message };
  }}
/>
```

## Anatomy

```
BookingPipeline               data-slot="booking-pipeline"
├─ Stepper                    five stages; no-show or cancelled marks the stop point
├─ actions                    buttons for the moves allowed; no-show and cancel ask first
└─ history                    Timeline, newest first
BookingStatusBadge            data-slot="booking-status-badge"
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | `BookingStatus` | `required` | requested, confirmed, checked_in, in_visit, done, no_show or cancelled. |
| `history` | `BookingTransition[]` | `[]` | Every move so far, oldest first. |
| `onAdvance` | `(to) => Promise<void \| { error? }>` |  | Move to a status. Omit for a read-only pipeline. |
| `showHistory` | `boolean` | `true` | Show the timeline. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Stepper direction. |
| `labels` | `Partial<BookingPipelineLabels>` |  | Override any string. |

## Examples

**Show a status in a table cell**

```tsx
import { BookingStatusBadge } from "@fadymondy/nasaq/web";

<BookingStatusBadge status={row.status} />
```

## Accessibility

- The stepper marks the current stage. A stop (no-show, cancelled) is shown with an icon and text.
- Destructive moves ask for confirmation in an alert dialog.
- A failed move shows an alert and the status stays where it was.

## RTL & i18n

- Stages run right to left in Arabic; arrows mirror. Times use Latin digits by default.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="booking-pipeline"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`booking-manage`](../booking-manage/README.md)
- [`clinic-schedule`](../clinic-schedule/README.md)
- [`kanban-board`](../kanban-board/README.md)
- [`stepper`](../stepper/README.md)
- [`timeline`](../timeline/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-booking-pipeline--docs

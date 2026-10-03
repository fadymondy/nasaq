---
name: scheduler
title: Scheduler
category: productivity
status: beta
summary: Read-only day, week and month schedule with overlap-aware event blocks, plus SlotPicker, a booking-style Calendar and radio list of available times.
exports: [Scheduler, SlotPicker, SchedulerProps, SlotPickerProps, SchedulerSlot, layoutDayEvents, eventBox, timeSlots]
related: [calendar, date-picker, popover, toggle-group, radio-group]
story: components-productivity-scheduler
base-ui: [toggle-group, popover, radio, radio-group]
keywords: [schedule, calendar, agenda, events, booking, slots, week, month, day, appointments, rtl]
---

# Scheduler

`Scheduler` shows events on a day, week or month view. The day and week views place each event as a block by
its start and end time; events that overlap share the column side by side. The month view shows chips, with a
"+N more" popover when a day has more than fit. `SlotPicker` is the booking counterpart: a `Calendar` next to
a radio list of the times still free on the chosen day.

Both are controlled by data you pass in. Neither stores events. **Drag to create, move or resize is out of
scope**: an event is changed by your own UI (a dialog, a form) after `onEventClick` or `onSlotSelect`.

## When to use
- Showing appointments, shifts, bookings or meetings across a week or month.
- Letting a person pick a free time to book (`SlotPicker`).

## When not to use
- Choosing a date or a date range: use `Calendar` or `DatePicker`.
- A task board with drag and drop: use `KanbanBoard`.
- A plain chronological list: use a list or table.

## Import
```tsx
import { Scheduler, SlotPicker } from "@fadymondy/nasaq/web";
```
Outside this repo: `@fadymondy/nasaq/web`.

## Quick start
```tsx
import { Scheduler, type SchedulerEvent } from "@fadymondy/nasaq/web";
import { useState } from "react";

const events: SchedulerEvent[] = [
  { id: "1", title: "Design review", start: new Date(2026, 8, 29, 10, 0), end: new Date(2026, 8, 29, 11, 30), tone: "brand" },
  { id: "2", title: "Client call", start: new Date(2026, 8, 29, 10, 30), end: new Date(2026, 8, 29, 11, 0), tone: "success" },
];

export function Example() {
  const [picked, setPicked] = useState("");
  return (
    <>
      <Scheduler
        events={events}
        workingHours={{ start: 8, end: 18 }}
        onSlotSelect={(start, end) => setPicked(`${start.toISOString()} - ${end.toISOString()}`)}
        onEventClick={(event) => setPicked(event.title)}
      />
      <p>{picked}</p>
    </>
  );
}
```

## Anatomy
```
Scheduler                       data-slot="scheduler"  data-view="day|week|month"
├─ toolbar                      data-slot="scheduler-toolbar"   previous, next, Today, title, ToggleGroup of views
└─ grid                         data-slot="scheduler-grid"
   ├─ day / week: slot buttons  data-slot="scheduler-slot"      one per slot per day
   │  └─ event blocks           data-slot="scheduler-event"     data-tone
   └─ month: day cells          data-slot="scheduler-day"       data-today, data-outside
      └─ chips                  data-slot="scheduler-chip"      data-tone

SlotPicker                      data-slot="slot-picker"
├─ Calendar
└─ times                        data-slot="slot-picker-times"
   └─ radios                    data-slot="slot-picker-slot"
```

## API

### Scheduler
| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `events` | `SchedulerEvent[]` | required | `{ id, title, start: Date, end: Date, tone? }`. Events crossing midnight show on both days. |
| `view` / `defaultView` / `onViewChange` | `"day" \| "week" \| "month"` | `"week"` | The visible view. |
| `date` / `defaultDate` / `onDateChange` | `Date` | today | Any date inside the visible day, week or month. |
| `workingHours` | `{ start: number; end: number }` | `{ start: 8, end: 18 }` | Hours shown in the day and week views (`end` is exclusive, 1 to 24). Events outside are hidden or clipped. |
| `slotMinutes` | `number` | `30` | Length of one clickable slot (minimum 5). |
| `weekStartsOn` | `0..6` | locale | First day of the week (0 = Sunday). |
| `hour12` | `boolean` | locale | Force 12 or 24 hour time on the axis and in labels. |
| `maxChips` | `number` | `3` | Month chips per day. When there are more events, the last chip becomes "+N more". |
| `onSlotSelect` | `(start: Date, end: Date) => void` | none | Click on an empty slot. In the month view the day number reports the whole day. |
| `onEventClick` | `(event: SchedulerEvent) => void` | none | Click on an event block or chip. |
| `locale` | `string` | Nasaq locale | BCP 47 locale. |
| `dir` | `"ltr" \| "rtl"` | from locale | Force a direction. |
| `today` | `Date` | now | Override "today" for tests and stories. |

`tone` is one of `neutral` (default), `brand`, `success`, `warning`, `danger`, `info`.

### SlotPicker
| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `slots` | `SchedulerSlot[]` | required | `{ start: Date; end?: Date; disabled?: boolean }`. Any number of days. |
| `value` / `defaultValue` / `onValueChange` | `Date \| null`, `(start: Date) => void` | `null` | The selected slot's start. |
| `day` / `defaultDay` / `onDayChange` | `Date` | first day with a free slot | The day whose times are listed. |
| `weekStartsOn`, `hour12`, `locale`, `dir`, `today` | as above | | Same meaning as in `Scheduler`. |
| `emptyLabel` | `ReactNode` | localised | Shown when the chosen day has no slots. |

Days before today, or without an enabled slot, are disabled in the calendar.

### Layout helpers
Pure functions, exported for custom renderers and tested without a DOM.

| Export | Signature |
| --- | --- |
| `layoutDayEvents` | `(events, day, rangeStart, rangeEnd, minLength = 15) => PositionedEvent[]`. Minutes from midnight. Returns `{ event, top, height, column, columns }`. |
| `eventBox` | `(positioned, rangeMinutes) => { top, height, insetInlineStart, width }` in percent. |
| `timeSlots` | `({ start, end }, slotMinutes) => number[]`. Slot starts in minutes from midnight. |

## Examples

Arabic, 24-hour axis, Monday first:
```tsx
import { Scheduler } from "@fadymondy/nasaq/web";

export function Arabic() {
  return (
    <Scheduler
      locale="ar-EG"
      hour12={false}
      weekStartsOn={1}
      events={[{ id: "1", title: "مراجعة التصميم", start: new Date(2026, 8, 29, 10), end: new Date(2026, 8, 29, 11), tone: "brand" }]}
    />
  );
}
```

Booking:
```tsx
import { SlotPicker } from "@fadymondy/nasaq/web";
import { useState } from "react";

const slots = [9, 10, 11, 14].map((h) => ({ start: new Date(2026, 9, 1, h) }));

export function Booking() {
  const [value, setValue] = useState<Date | null>(null);
  return <SlotPicker slots={slots} value={value} onValueChange={setValue} />;
}
```

Controlled view and date:
```tsx
import { Scheduler, type SchedulerView } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Controlled() {
  const [view, setView] = useState<SchedulerView>("month");
  const [date, setDate] = useState(new Date(2026, 8, 1));
  return <Scheduler events={[]} view={view} onViewChange={setView} date={date} onDateChange={setDate} />;
}
```

## Accessibility
| Key | Action |
| --- | --- |
| Tab | Moves between toolbar controls, the grid (one tab stop), events and chips. |
| Arrow Up / Down | Day and week views: previous or next slot in the day. |
| Arrow Left / Right | Day and week views: adjacent day column (physical: in RTL, Left is the next day). |
| Home / End | First or last slot of the day. |
| Enter / Space | Selects the focused slot, event or chip. |
| Arrow keys (SlotPicker times) | Move and select between times; Tab leaves the group. |

- Each slot button is named with its full date and time; events and chips with title and time range.
- The title is an `aria-live="polite"` heading, so moving between periods is announced.
- The view switch is a labelled `ToggleGroup`. `SlotPicker` times are a `radiogroup` of `radio`s.
- Localised by default (English and Arabic): toolbar labels, "+N more", the slot list name and the empty text.

## RTL & i18n
- Day columns run right to left in RTL and the time axis sits on the right. Chevrons mirror.
- The week starts on the locale's first day unless `weekStartsOn` is set.
- The axis uses the locale's 12 or 24 hour format; `hour12` overrides. Digits are Western (Nasaq default).
- Times are wrapped in `<bdi>` so ranges stay ordered inside Arabic text.

## Styling & tokens
Uses `bg-card`, `border-border`, `bg-secondary`, `bg-primary`, `bg-nq-hover`, `bg-nq-selected`, the status
tokens (`nq-success`, `nq-warning`, `nq-danger`, `nq-info`) and `nq-brand` for event tones. Target
`[data-today]`, `[data-outside]` and `[data-tone]`. Pass `className` to the root; do not use raw hex.

## Do / Don't
- Do keep `workingHours` to the hours people schedule in; the grid is one row per slot.
- Do treat `onSlotSelect` as "the user wants to create here" and open your own form.
- Don't rely on tone alone: put the status in the title.
- Don't expect dragging: create, move and resize are not supported.

## Related
- [Calendar](../calendar/README.md)
- [DatePicker](../date-picker/README.md)
- [Popover](../popover/README.md)
- [ToggleGroup](../toggle-group/README.md)

## Lab
https://docs.nasaqui.com/?path=/docs/components-productivity-scheduler--docs

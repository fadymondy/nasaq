---
name: booking-slots
title: BookingSlots
category: commerce
status: beta
summary: Day calendar beside a grid of time tiles grouped by morning, afternoon and evening, with available, full and held states, a legend and a jump to the next free day.
exports: [BookingSlotsLabels, BookingSlotsProps, BookingSlots]
related: [booking-flow, booking-manage, calendar, scheduler]
story: components-commerce-booking-slots
base-ui: [radio-group]
keywords: [slots, time picker, availability, appointment, calendar, held, full]
---

# BookingSlots

Choose a day and a time. Days with no free time are disabled in the calendar. The times are a radio group so the keyboard and screen readers get one choice out of many.

## When to use

- Picking an appointment time from a list you already have.
- Inside a reschedule dialog.
- Showing that a time is taken (full) or briefly reserved by someone else (held).

## When not to use

- Free-form time entry: use TimePicker.
- A full day timeline of many bookings: use Scheduler or ClinicSchedule.

## Import

```tsx
import { BookingSlots } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BookingSlots } from "@fadymondy/nasaq/web";

export function Times({ slots }) {
  const [start, setStart] = useState<Date | null>(null);
  return <BookingSlots slots={slots} value={start} onValueChange={setStart} />;
}
```

## Anatomy

```
BookingSlots                  data-slot="booking-slots"
├─ Calendar                   days without a free time are disabled
├─ time groups                morning, afternoon, evening
│  └─ slot tiles              Radio, with icon and text for the state
├─ legend                     available, full, held
└─ next free day button
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `slots` | `BookingSlot[]` | `required` | Every time across the days shown, each with a state and places remaining. |
| `value, defaultValue, onValueChange` | `Date \| null` |  | The chosen start. |
| `day, defaultDay, onDayChange` | `Date` |  | The day shown. |
| `now` | `Date` | the clock | Past times are hidden. |
| `loading` | `boolean` | `false` | Show a skeleton. |
| `grouped` | `boolean` | `true` | Group by part of day. |
| `weekStartsOn, hour12, locale, dir` |  |  | Calendar and time formatting. |
| `labels` | `Partial<BookingSlotsLabels>` |  | Override any string. |

## Examples

**Hold-aware slots**

```tsx
// state is "available", "full", "held" or "past".
// A held slot is a temporary reservation, so it can free up again.
<BookingSlots slots={slots} />
```

## Accessibility

- The tiles are a Base UI radio group: arrow keys move, Space picks.
- Full and held tiles are disabled and say so in text and with an icon.
- The chosen time is announced with its date.

## RTL & i18n

- The calendar and the grid mirror. Times stay in a bdi so 09:30 never flips.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="booking-slots"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`booking-flow`](../booking-flow/README.md)
- [`booking-manage`](../booking-manage/README.md)
- [`calendar`](../calendar/README.md)
- [`scheduler`](../scheduler/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-booking-slots--docs

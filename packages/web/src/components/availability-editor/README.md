---
name: availability-editor
title: AvailabilityEditor
category: health
status: beta
summary: Weekly hours per day with breaks, copy to other days, and vacations picked as date ranges, with overlap and range checks that block saving.
exports: [AvailabilityEditorLabels, AvailabilityEditorProps, AvailabilityEditor]
related: [clinic-schedule, booking-slots, date-picker]
story: components-health-availability-editor
base-ui: [switch]
keywords: [availability, hours, breaks, vacation, time off, working hours, week]
---

# AvailabilityEditor

Where a provider sets when patients can book. The rules (overlaps, end before start, a break outside the hours, overlapping vacations) live in pure functions and appear beside the row. The pure helpers hoursForDate and isOnVacation are what a booking backend can reuse.

## When to use

- A doctor or a branch manager sets weekly hours.
- Adding a vacation or a day off.

## When not to use

- Booking a single time: use BookingSlots.

## Import

```tsx
import { AvailabilityEditor } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AvailabilityEditor } from "@fadymondy/nasaq/web";

<AvailabilityEditor defaultValue={availability} onSave={(value) => api.saveAvailability(value)} />
```

## Anatomy

```
AvailabilityEditor            data-slot="availability-editor"
├─ weekly card                one section per weekday: Switch, hours, breaks, copy
├─ vacations card             DateRangePicker, reason, list
├─ issues alert               everything that blocks saving
└─ Discard and Save
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value, defaultValue, onValueChange` | `Availability` |  | The weekly hours and vacations. |
| `onSave` | `(value) => Promise<void \| { error? }>` |  | Save. Disabled while there are issues or no change. |
| `weekStartsOn` | `number` | `6` | First day of the week, 0 is Sunday. |
| `minuteStep` | `number` | `15` | Minutes between choices in the time pickers. |
| `labels` | `Partial<AvailabilityEditorLabels>` |  | Override any string. |

## Examples

**Ask if someone is available**

```tsx
import { hoursForDate } from "@fadymondy/nasaq/web";

const hours = hoursForDate(availability, new Date(2026, 9, 20)); // null on vacation
```

## Accessibility

- Every switch and time picker has a label with the day. Issues are listed in one alert and next to the row.
- Save is disabled with a reason shown, not silently.

## RTL & i18n

- The week starts on Saturday by default and mirrors in Arabic. Times are 24-hour under the hood and shown by the picker.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="availability-editor"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`clinic-schedule`](../clinic-schedule/README.md)
- [`booking-slots`](../booking-slots/README.md)
- [`date-picker`](../date-picker/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-health-availability-editor--docs

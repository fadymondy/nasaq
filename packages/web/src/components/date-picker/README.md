---
name: date-picker
title: DatePicker
category: pickers
status: beta
summary: Input-looking trigger that opens a Calendar in a popover to pick a date or a range, plus a segmented TimePicker. Field-aware, locale and RTL aware.
exports: [DatePicker, DateRangePicker, TimePicker, DatePickerProps, DateRangePickerProps, TimePickerProps]
related: [calendar, popover, field, select, numeric]
story: components-pickers-datepicker
base-ui: [popover, field]
keywords: [date, range, time, picker, form, calendar, hijri, rtl]
---

# DatePicker

`DatePicker` and `DateRangePicker` are a form control that looks like an `Input`: a button showing the chosen
date, which opens a [`Calendar`](../calendar/README.md) in a [`Popover`](../popover/README.md). `TimePicker` is
an hour / minute (/ AM-PM) group of selects. All three work inside `Field` (label, description, error, invalid
state).

## When to use

- A date, a date range or a time of day in a form.

## When not to use

- Always-visible month grids (scheduling views): use [`Calendar`](../calendar/README.md).
- Durations or free numbers: use a number `Input`.

## Import

```tsx
import { DatePicker, DateRangePicker, TimePicker } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { DatePicker, Field, FieldDescription, FieldLabel } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Example() {
  const [date, setDate] = useState<Date | null>(null);
  return (
    <Field>
      <FieldLabel>Start date</FieldLabel>
      <DatePicker value={date} onValueChange={setDate} min={new Date()} />
      <FieldDescription>Work begins on this day.</FieldDescription>
    </Field>
  );
}
```

## Anatomy

```
DatePicker / DateRangePicker
  Popover
    trigger button        data-slot="date-picker-trigger"  (Field.Control)
    PopoverContent > Calendar
TimePicker                data-slot="time-picker"
  select                  data-slot="time-picker-hour" | "time-picker-minute" | "time-picker-period"
```

## API

Shared by `DatePicker` and `DateRangePicker`:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `placeholder` | `string` | English / Arabic | Text when empty. |
| `disabled` | `boolean` | `false` | Disables the control. |
| `min` / `max` | `Date` | none | Earliest / latest pickable day. |
| `disabledDates` | `Date[] \| (date: Date) => boolean` | none | Days that cannot be picked. |
| `weekStartsOn` | `0..6` | from locale | 0 = Sunday. |
| `locale` / `dir` | `string` / `"ltr" \| "rtl"` | provider | Override the active locale and direction. |
| `calendar` | `string` | none | Intl calendar for labels, e.g. `"islamic-umalqura"`. |
| `format` | `FormatDateOptions` | `{ dateStyle: "medium" }` | Trigger text format. |
| `name` | `string` | none | Hidden input with `YYYY-MM-DD` (range: `name-from`, `name-to`). |
| `id`, `className`, `popupLabel`, `aria-label` | | | Standard. `aria-label` is needed when there is no `FieldLabel`. |

`DatePicker`: `value`, `defaultValue` (`Date | null`), `onValueChange(value: Date | null)`. It closes on pick.

`DateRangePicker`: `value`, `defaultValue` (`DateRange`), `onValueChange(value: DateRange)`, `numberOfMonths`
(`1 | 2`; default two from 640px wide, else one). It closes when both ends are chosen.

`TimePicker`:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `string \| null` | `null` | 24-hour `"HH:mm"`. |
| `onValueChange` | `(value: string \| null) => void` | none | Called with `"HH:mm"`. |
| `hourCycle` | `12 \| 24` | from locale | Display cycle. |
| `minuteStep` | `number` | `1` | Minutes between options. |
| `disabled`, `locale`, `dir`, `name`, `id`, `className`, `aria-label` | | | Standard. |

## Examples

```tsx
import { DateRangePicker, Field, FieldLabel, TimePicker } from "@fadymondy/nasaq/web";

export function Arabic() {
  return (
    <div dir="rtl" lang="ar">
      <Field>
        <FieldLabel>الفترة</FieldLabel>
        <DateRangePicker locale="ar-SA" />
      </Field>
      <Field>
        <FieldLabel>وقت الاجتماع</FieldLabel>
        <TimePicker locale="ar-SA" defaultValue="14:30" minuteStep={15} />
      </Field>
    </div>
  );
}
```

## Accessibility

The trigger is a button with `aria-haspopup="dialog"`; `FieldLabel` targets it. Focus moves to the selected day
when the popup opens and returns to the trigger on close. Calendar keys are listed in the
[Calendar README](../calendar/README.md). `TimePicker` segments are native selects labelled Hour / Minute /
AM-PM (Arabic built in); the hour segment is the `Field` control.

## RTL & i18n

Trigger text, month names and day periods follow the locale; digits stay Western. The popup and calendar mirror
in RTL. Pass `locale`/`dir` when the picker is outside a `NasaqProvider`.

## Styling & tokens

Same control tokens as `Input` and `Select`. Target `data-invalid`, `data-popup-open` and
`data-placeholder` on the trigger.

## Do / Don't

- Do label every picker (`FieldLabel` or `aria-label`).
- Don't parse the trigger text; read the value from `onValueChange`.

## Related

- [Calendar](../calendar/README.md)
- [Popover](../popover/README.md)
- [Field](../field/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-pickers-datepicker--docs

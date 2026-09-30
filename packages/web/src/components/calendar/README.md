---
name: calendar
title: Calendar
category: pickers
status: beta
summary: Month grid for picking a day or a date range. Native Date and Intl only; locale-aware week start, labels and RTL keyboard.
exports: [Calendar, useCalendarLocale, CalendarProps, CalendarSingleProps, CalendarRangeProps, DateRange]
related: [date-picker, popover, numeric, field]
story: components-pickers-calendar
base-ui: []
keywords: [calendar, date, month, grid, range, picker, hijri, rtl]
---

# Calendar

An always-visible month grid for choosing one day (`mode="single"`) or a range (`mode="range"`). It has no
dependency beyond the browser: month, weekday and day labels come from `Intl.DateTimeFormat` through Nasaq's
`formatDate`, so they follow the active locale and use the Nasaq digit set (Western digits, also in Arabic).
The first day of the week comes from the locale (`Intl.Locale` week info), or from `weekStartsOn`.

## When to use

- A date or range that is best chosen by looking at the month.
- Inline scheduling views. For a form field, use the [`DatePicker`](../date-picker/README.md), which puts this calendar in a popover.

## When not to use

- Typing a known date (birthday): use a text `Input`.
- A time of day: use `TimePicker` from [date-picker](../date-picker/README.md).

## Import

```tsx
import { Calendar } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Calendar } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Example() {
  const [day, setDay] = useState<Date | null>(null);
  return <Calendar value={day} onValueChange={setDay} />;
}
```

## Anatomy

```
Calendar                      data-slot="calendar"  data-mode="single|range"
  month (one or two)          data-slot="calendar-month"
    header: prev, title, next data-slot="calendar-title"
    table role="grid"         data-slot="calendar-grid"
      th (weekday) / td role="gridcell" > button[data-date]
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `"single" \| "range"` | `"single"` | Selection mode. |
| `value` / `defaultValue` | `Date \| null` (single), `DateRange` (range) | none | Controlled / initial selection. |
| `onValueChange` | `(value) => void` | none | Called with the new selection. Clicking the selected day again clears it in single mode. |
| `month` / `defaultMonth` / `onMonthChange` | `Date` | selection or today | The first visible month. |
| `numberOfMonths` | `1 \| 2` | `1` | Months side by side. Outside days are hidden when 2. |
| `min` / `max` | `Date` | none | Earliest / latest pickable day. |
| `disabled` | `Date[] \| (date: Date) => boolean` | none | Days that cannot be picked. They stay focusable, with `aria-disabled`. |
| `showOutsideDays` | `boolean` | `true` | Show the neighbouring months' days that pad the first and last week. |
| `fixedWeeks` | `boolean` | `false` | Always six rows. |
| `weekStartsOn` | `0..6` | from locale | 0 = Sunday. Overrides the locale. |
| `locale` | `string` | provider locale, else `"en"` | BCP 47 tag. |
| `dir` | `"ltr" \| "rtl"` | from locale | Force a direction. |
| `calendar` | `string` | none | Intl calendar for labels, e.g. `"islamic-umalqura"`. Labels only; the grid stays Gregorian. |
| `today` | `Date` | now | Override today (tests, stories). |
| `autoFocus` | `boolean` | `false` | Focus the tabbable day on mount. |
| `previousMonthLabel` / `nextMonthLabel` | `string` | English / Arabic | Accessible names of the month buttons. |

`DateRange` is `{ from: Date | null; to: Date | null }`. `useCalendarLocale({ locale?, dir? })` returns
`{ locale, rtl, dir }` using the same resolution rules.

## Examples

```tsx
import { Calendar, type DateRange } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Booking() {
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  return (
    <Calendar
      mode="range"
      numberOfMonths={2}
      min={new Date()}
      disabled={(d) => d.getDay() === 5}
      value={range}
      onValueChange={setRange}
    />
  );
}
```

```tsx
import { Calendar } from "@fadymondy/nasaq/web";

export function Hijri() {
  return <Calendar locale="ar-SA" calendar="islamic-umalqura" />;
}
```

## Accessibility

Each month is a `role="grid"` with a roving tabindex: one day is in the tab order. Day buttons carry the full
date as `aria-label`; today has `aria-current="date"`; selected cells have `aria-selected`.

| Key | Action |
| --- | --- |
| Arrow Right / Left | Next / previous day. In RTL, Left is the next day. |
| Arrow Down / Up | Next / previous week. |
| Home / End | First / last day of the week. |
| Page Down / Page Up | Next / previous month. |
| Shift + Page Down / Up | Next / previous year. |
| Enter / Space | Pick the focused day. |

Localise `previousMonthLabel` and `nextMonthLabel` for languages other than English and Arabic.

## RTL & i18n

The grid, header and chevrons mirror with the direction; the previous/next chevrons swap icons in RTL.
Month and weekday names are Arabic in an Arabic locale; digits stay Western, like `Num` and `DateTime`.
Week start follows the region (`ar-EG` starts Saturday, `ar-SA` Sunday).

## Styling & tokens

Uses `bg-primary`, `bg-nq-selected` (range band), `bg-nq-hover`, `border-nq-focus` (today) and
`outline-nq-focus`. Target `data-selected`, `data-today`, `data-outside`, `data-disabled` on day buttons and
`data-in-range` on cells. Extend with `className` on the root.

## Do / Don't

- Do set `min`/`max` rather than validating after the fact.
- Don't switch to Arabic-Indic digits here; the system uses Western digits.

## Related

- [DatePicker](../date-picker/README.md)
- [Popover](../popover/README.md)
- [Numeric](../numeric/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-calendar--docs

---
name: time-fields
title: Time fields
category: pickers
status: beta
summary: Fields for clock times and time zones. A 24 hour time you type into (930 becomes 09:30), a start and end span, a live clock for one zone and a time zone picker with a ticking clock on every row. Everything comes from Intl, no zone table is shipped.
exports: [TimeFieldsLabels, TimeFieldProps, TimeField, TimeSpanFieldProps, TimeSpanField, TimeZoneClockProps, TimeZoneClock, TimeZoneFieldProps, TimeZoneField]
related: [date-picker, time-range-picker, calendar, field]
story: components-pickers-time-fields
keywords: [time, 24 hour, typed time, 930, time zone, timezone, clock, utc offset, opening hours, shift, world clock, intl]
---

# Time fields

Four controls for the time of day and the place it is read in.

| Control | What it is |
| --- | --- |
| `TimeField` | A text field for a 24 hour time. Type `930`, `9.30`, `0930`, `9h30` or `9:30 pm` and it becomes `09:30`. |
| `TimeSpanField` | A start and an end, with the length between them. An end before the start is an error, or the next day with `allowOvernight`. |
| `TimeZoneClock` | A live clock for one IANA zone: city, time, date, offset, and the gap from a reference zone. |
| `TimeZoneField` | A searchable time zone picker. Every row shows the time there now; a button picks the reader's own zone. |

Values are plain strings: `"09:30"` for a time and an IANA name such as `"Asia/Riyadh"` for a zone. They store, sort and travel in JSON without translation.

## When to use

- Opening hours, shifts, quiet hours, reminders and any form where people know the time they want and can type it.
- Account or workspace settings that need a time zone, and meeting tools that compare zones.

## When not to use

- Choosing a date, or a date with a time: use [`DatePicker`](../date-picker/README.md).
- The period a dashboard covers: use [`TimeRangePicker`](../time-range-picker/README.md).
- A duration ("2 hours"): use a number field with a unit.

## Import

```tsx
import { TimeField, TimeSpanField, TimeZoneClock, TimeZoneField, parseTimeInput, convertWallTime } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { TimeField, TimeZoneField } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Reminder() {
  const [time, setTime] = useState<string | null>("09:00");
  const [zone, setZone] = useState("Asia/Riyadh");
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <TimeField value={time} onValueChange={setTime} aria-label="Remind me at" />
      <TimeZoneField value={zone} onValueChange={setZone} />
    </div>
  );
}
```

## Anatomy

```
TimeField        data-slot="time-field"        Input (ltr) + "Will be 09:30" preview or error + hidden input when `name`
TimeSpanField    data-slot="time-span-field"   two TimeFields, an arrow, the duration and an "overnight" badge
TimeZoneClock    data-slot="time-zone-clock"   city, ticking time, date, offset, difference from `reference`
TimeZoneField    data-slot="time-zone-field"   Combobox (search + zone rows with live clocks) + "Use my time zone" + TimeZoneClock
```

## API

### TimeField

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string \| null` | none | Time as `"HH:mm"`, or `null` when empty (controlled). |
| `defaultValue` | `string \| null` | none | Initial time when uncontrolled. |
| `onValueChange` | `(value: string \| null) => void` | none | A time was accepted (on blur or Enter) or stepped. `null` when cleared. |
| `min` / `max` | `string` | none | Earliest and latest time, `"HH:mm"`. |
| `step` | `number` | `5` | Minutes per arrow key, snapped to the step. |
| `allowEndOfDay` | `boolean` | `false` | Accept `24:00`. |
| `hidePreview` | `boolean` | `false` | Hide the "Will be 09:30" line. |
| `error` | `ReactNode` | none | An error from outside, shown in place of the built-in ones. |
| `disabled` / `readOnly` / `required` | `boolean` | `false` | Usual field states. |
| `name` | `string` | none | Form name; a hidden input carries the normalised value. |
| `inputId` | `string` | generated | Id of the text input for a `<label htmlFor>`. |
| `placeholder` | `string` | `"HH:mm"` | Placeholder. |
| `labels` | `Partial<TimeFieldsLabels>` | en / ar | Text overrides. |

### TimeSpanField

`value` / `defaultValue` / `onValueChange` with `{ start, end }`, plus `allowOvernight`, `showDuration` (default true), `step`, `min`, `max`, `disabled`, `labels`.

### TimeZoneClock

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `timeZone` | `string` | none | IANA zone. |
| `label` | `ReactNode` | the city | Replaces the city ("Head office"). |
| `seconds` | `boolean` | `false` | Show and tick seconds. |
| `hourCycle` | `12 \| 24` | the language's | Clock style. |
| `reference` | `string` | none | Compare with this zone: "+2h", "Tomorrow". |
| `showDate` / `showOffset` | `boolean` | `true` | Date line and UTC offset. |
| `now` | `Date` | current time | Freezes the clock for tests and stories. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size of the time. |

### TimeZoneField

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `string \| null` | none | IANA zone. |
| `onValueChange` | `(timeZone: string) => void` | none | A zone was chosen. |
| `zones` | `readonly string[]` | every zone the browser knows | Narrow the list. |
| `reference` | `string` | none | Show each zone's gap from this one instead of its offset. |
| `showClock` | `boolean` | `true` | Ticking clock of the chosen zone under the field. |
| `showDetect` | `boolean` | `true` | "Use my time zone" button. |
| `seconds` / `hourCycle` | | | As `TimeZoneClock`. |
| `limit` | `number` | `60` | Rows shown at once; the list says when it is cut and asks for a more exact search. |
| `now` | `Date` | current time | Freezes the clocks. |
| `name` / `inputId` | `string` | none | Form name and input id. |

### Helpers (pure, no React)

| Function | Description |
| --- | --- |
| `parseTimeInput(text, { allowEndOfDay })` | Text to `"HH:mm"` or `null`. Reads Arabic-Indic and Persian digits and the markers am, pm, ص, م. |
| `stepTimeValue(value, delta, { min, max, wrap })` | Moves a time by minutes, snapped to the step; wraps around midnight or stops at `min` / `max`. |
| `timeSpanMinutes(span, overnight)` / `formatTimeSpan(minutes, locale)` | Length of a span and "8h 30m" / "8 س 30 د". |
| `timeZoneOffsetMinutes(at, zone)` / `formatUtcOffset(minutes)` | Offset at an instant, and "UTC+05:30". |
| `zonedWallTimeToInstant(day, time, zone)` | The instant a wall clock time means in a zone. Daylight saving gaps resolve to just after the gap; repeated hours take the first. |
| `convertWallTime(day, time, from, to)` | A wall time in one zone as the day and time in another. |
| `matchTimeZone(zone, query, at, locale)` / `parseOffsetQuery(text)` | The search the field uses: city, region, zone name or an offset like `utc+3`. |
| `listTimeZones()` / `detectTimeZone()` | The zones the browser knows (UTC first) and the reader's own. |

## Examples

Opening hours, with a night shift:

```tsx
import { TimeSpanField } from "@fadymondy/nasaq/web";

export const Shift = () => <TimeSpanField defaultValue={{ start: "22:00", end: "06:00" }} allowOvernight />;
```

A world clock strip:

```tsx
import { TimeZoneClock } from "@fadymondy/nasaq/web";

export const Strip = () => (
  <div className="grid gap-3 sm:grid-cols-3">
    {["Asia/Riyadh", "Europe/London", "America/New_York"].map((z) => <TimeZoneClock key={z} timeZone={z} reference="Asia/Riyadh" />)}
  </div>
);
```

## Accessibility

| Key | Action |
| --- | --- |
| Type a time | Shown as a preview ("Will be 09:30"); accepted on Enter or when the field loses focus. |
| Arrow Up / Down | Step by `step` minutes. |
| Page Up / Down | Step by an hour. |
| Escape | Put back the last accepted time. |
| Zone field | Combobox: type to search, arrows to move, Enter to choose. |

Errors and the preview are linked to the input with `aria-describedby`; the field is marked invalid when the text is refused. Clocks are `role="timer"` with
`aria-live="off"` so they do not chatter; the accessible name has the city, the time and the date.

## RTL & i18n

- Times, offsets and zone names are isolated left-to-right (`dir="ltr"`, `<bdi>`) inside Arabic text, and digits are Latin in both languages.
- The field accepts Arabic-Indic (٠٩٣٠) and Persian digits and the Arabic am / pm markers.
- The span arrow mirrors. City names come from the zone id; the long zone name is localised by `Intl`.

## Styling & tokens

Uses `Input`, `Combobox`, `Badge` and `Button` tokens. Target the `data-slot` values above; extend with `className`.

## Do / Don't

- Do store the `"HH:mm"` string and the IANA zone name, not an offset. Offsets change with daylight saving.
- Do pass `now` in stories and tests so the clock does not move.
- Don't use `TimeField` for a duration or for a time that includes a date.
- Don't ship your own zone list unless you need to narrow the choices; pass `zones` for that.

## Related

- [`DatePicker`](../date-picker/README.md)
- [`TimeRangePicker`](../time-range-picker/README.md)
- [`Field`](../field/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-time-fields--docs

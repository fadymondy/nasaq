---
name: time-range-picker
title: TimeRangePicker
category: pickers
status: beta
summary: Picks the window a dashboard covers with relative presets (1h, 6h, 24h, 7d, 30d), a week navigator, custom days and an optional comparison period. The value is plain data that reads and writes to a URL, and days are read in a named time zone.
exports: [TimeRangePickerLabels, TimeRangePickerProps, TimeRangePicker]
related: [date-picker, calendar, time-series-panel, report-filter-bar, toggle-group]
story: components-pickers-time-range-picker
base-ui: [toggle-group, popover, select]
keywords: [time range, period, last 24 hours, preset, week navigator, custom range, comparison, previous period, dashboard, time zone, url state]
---

# TimeRangePicker

A control for "what period does this dashboard show". It offers relative presets (`1h 6h 24h 7d 30d` by default, any `15m`, `3h`, `14d` works), a Week toggle that
reveals a previous / next week navigator, and a Custom button that opens a calendar for a day range. An optional "Compare with" select adds the previous period or
the same period last year. Under the controls it prints the resolved dates and the time zone, so a shared screenshot cannot be misread.

The value is plain data, so it goes into a URL, a saved view or a query without translation:

```ts
{ kind: "relative", preset: "24h" }                       // a window ending now
{ kind: "week", start: "2026-09-27" }                     // first day of the week
{ kind: "custom", from: "2026-09-01", to: "2026-09-15" }  // inclusive calendar days
```

Calendar days are strings, never `Date`s, so they cannot slip a day with the reader's clock. They become instants only through a named IANA time zone.

## When to use

- The period selector of a dashboard, report or monitoring page.
- Anywhere the chosen range must survive a reload or be shared as a link (`serializeTimeRange` / `parseTimeRange`).

## When not to use

- Picking one date in a form: use [`DatePicker`](../date-picker/README.md).
- A 7 / 28 / 90 day toggle inside one chart card: use `PeriodToggle` from [`TimeSeriesPanel`](../time-series-panel/README.md).
- Scheduling: use `DatePicker` and `TimePicker`.

## Import

```tsx
import { TimeRangePicker, resolveTimeRange, comparisonRange, serializeTimeRange, parseTimeRange } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { TimeRangePicker, resolveTimeRange, type TimeRangeValue } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Range() {
  const [value, setValue] = useState<TimeRangeValue>({ kind: "relative", preset: "24h" });
  return (
    <TimeRangePicker
      value={value}
      onValueChange={(next, range) => {
        setValue(next);
        console.log(range.from.toISOString(), range.to.toISOString()); // `to` is exclusive
      }}
      timeZone="Asia/Riyadh"
    />
  );
}
```

## Anatomy

```
TimeRangePicker          data-slot="time-range-picker"
├─ toggle-group          presets and the Week toggle
├─ popover (Custom)      Calendar in range mode, the picked days, Cancel / Apply
├─ select                "Compare with" (when comparison props are passed)
├─ time-range-week       data-slot="time-range-week": previous, label, next, This week (when Week is active)
└─ time-range-summary    data-slot="time-range-summary": resolved dates, UTC offset, comparison dates
```

## API

### TimeRangePicker

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `TimeRangeValue` | none | Selected range (controlled). |
| `defaultValue` | `TimeRangeValue` | `{ kind: "relative", preset: "24h" }` | Initial range when uncontrolled. |
| `onValueChange` | `(value, range: ResolvedTimeRange) => void` | none | New value and the instants it covers now (`to` exclusive). |
| `presets` | `readonly RelativePreset[]` | `TIME_RANGE_PRESETS` | Relative windows: minutes, hours or days (`"30m"`, `"6h"`, `"14d"`). |
| `allowWeek` | `boolean` | `true` | Offer the week navigator. |
| `allowCustom` | `boolean` | `true` | Offer custom days. |
| `allowFuture` | `boolean` | `false` | Let weeks and custom days reach past today. |
| `timeZone` | `string` | browser zone | IANA zone the days are read in. Pass it on the server. |
| `weekStartsOn` | `0..6` | the locale's | First day of the week, 0 = Sunday. |
| `comparison` | `TimeComparison` | none | `"none" \| "previous" \| "year"`. Passing it or `onComparisonChange` shows the select. |
| `defaultComparison` | `TimeComparison` | `"none"` | Initial comparison when uncontrolled. |
| `onComparisonChange` | `(mode, range: ResolvedTimeRange \| null) => void` | none | Comparison changed. |
| `showSummary` | `boolean` | `true` | Show the resolved dates and zone. |
| `now` | `Date` | current time | Overrides "now" for tests and stories. |
| `className` | `string` | none | On the root. |
| `labels` | `Partial<TimeRangePickerLabels>` | en / ar | Text overrides. |

### Helpers (pure, no React)

| Function | Description |
| --- | --- |
| `resolveTimeRange(value, { now, timeZone, weekStartsOn })` | The `[from, to)` instants of a value. Days start at local midnight in the zone, so a daylight saving day is 23 or 25 hours. |
| `comparisonRange(value, mode, ctx)` | The previous period (same number of calendar days straight before) or the same days a year earlier (a leap day clamps to Feb 28). `null` for `"none"`. |
| `currentWeek(ctx)` / `shiftWeek(value, n)` | The week value of now, and the week `n` weeks away. |
| `serializeTimeRange(value)` / `parseTimeRange(text)` | `"24h"`, `"week:2026-09-27"`, `"2026-09-01..2026-09-15"`; unreadable text gives `null`. |
| `zoneOffsetLabel(instant, timeZone)` | `"UTC+03:00"`. |
| `TIME_RANGE_PRESETS` | `["1h", "6h", "24h", "7d", "30d"]`. |

## Examples

Comparison and a URL:

```tsx
import { TimeRangePicker, parseTimeRange, serializeTimeRange, type TimeComparison, type TimeRangeValue } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Traffic() {
  const params = new URLSearchParams(window.location.search);
  const [value, setValue] = useState<TimeRangeValue>(parseTimeRange(params.get("range")) ?? { kind: "relative", preset: "7d" });
  const [compare, setCompare] = useState<TimeComparison>("previous");
  return (
    <TimeRangePicker
      value={value}
      onValueChange={(next) => {
        setValue(next);
        history.replaceState(null, "", `?range=${serializeTimeRange(next)}`);
      }}
      comparison={compare}
      onComparisonChange={setCompare}
      timeZone="Asia/Riyadh"
    />
  );
}
```

Monitoring, minutes and hours only:

```tsx
import { TimeRangePicker } from "@fadymondy/nasaq/web";

export const Live = () => <TimeRangePicker presets={["15m", "1h", "6h"]} allowWeek={false} allowCustom={false} defaultValue={{ kind: "relative", preset: "1h" }} />;
```

Arabic, week starting on Saturday:

```tsx
import { TimeRangePicker } from "@fadymondy/nasaq/web";

export const Ar = () => <TimeRangePicker weekStartsOn={6} timeZone="Asia/Riyadh" labels={{ label: "الفترة" }} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Move between presets (roving focus, follows the reading direction). |
| Space / Enter | Select a preset, open Custom, press a week button. |
| Arrow keys, PageUp / PageDown | Move within the calendar (Calendar's grid pattern). |
| Esc | Close the custom popover without applying. |

The preset group is named "Time range". Each preset has the long name as its accessible name ("Last 24 hours"). The week label is `aria-live="polite"`,
so the new week is announced when the arrows are used. Previous and next week buttons have labels. Localise `labels` and the `timeZone` shown to users.

## RTL & i18n

- Presets, the calendar and the week arrows follow the reading direction; the previous / next chevrons swap sides.
- Arabic preset names use the right plural forms ("آخر ساعتين", "آخر 6 ساعات", "آخر 24 ساعة", "آخر 30 يومًا"); dates use Western digits like the rest of Nasaq.
- The UTC offset is isolated left-to-right inside the Arabic summary.
- The default week start comes from the locale (`Intl.Locale`); pass `weekStartsOn` to force it.

## Styling & tokens

- Uses ToggleGroup, Button, Popover, Calendar and Select tokens. The active Custom button uses `border-primary` and `bg-nq-selected`.
- Target `[data-slot="time-range-picker"]`, `[data-slot="time-range-summary"]` or `[data-active]` on the Custom trigger; extend with `className`.

## Do / Don't

- Do keep the value in the URL so a range can be shared.
- Do pass `timeZone` for anything shared between people in different zones.
- Do treat `range.to` as exclusive when querying.
- Don't store `Date`s from Custom picks; store the day strings.
- Don't compare periods by subtracting milliseconds across daylight saving changes; use `comparisonRange`.

## Related

- [`DatePicker`](../date-picker/README.md)
- [`Calendar`](../calendar/README.md)
- [`TimeSeriesPanel`](../time-series-panel/README.md)
- [`ReportFilterBar`](../report-filter-bar/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-time-range-picker--docs

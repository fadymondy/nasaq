---
name: cron-builder
title: CronBuilder
category: workflow
status: beta
summary: A schedule editor with simple settings or a cron expression, a plain-language reading in English and Arabic, field-level validation, and the next runs in a chosen time zone. Ships a schedule list with ran, failed and missed status.
exports: [CronBuilder, CronBuilderProps, CronBuilderLabels, DEFAULT_TIME_ZONES]
related: [workflow-canvas, backup-manager, scheduler, run-history, step-editor]
story: components-workflow-cron-builder
base-ui: [select, tabs, toggle-group, field]
keywords: [cron, schedule, timer, recurring, time zone, next runs, job, automation]
---

# CronBuilder

Pick "every weekday at 09:00" from simple settings, or type the cron expression itself. Either way the builder says
the schedule in words (English or Arabic), names the field that is wrong when the expression does not parse, and lists
the next runs in the time zone you chose, so nobody has to trust their own reading of `0 9 * * 1-5`. The value is always
the cron string. The parser is built in (no cron library): five fields, `*`, lists, ranges, steps, month and day names,
`@daily` style macros, daylight saving gaps skipped. `CronScheduleList` is the companion list of saved schedules.

## When to use

- A trigger step in a workflow, a backup or report schedule, any recurring job the user configures.
- A settings page listing schedules with their last outcome (`CronScheduleList`).

## When not to use

- Picking a single date and time: use `date-picker`. Calendar-style booking: use `scheduler`.
- Second-level or Quartz seven-field expressions: only the five standard fields are supported.

## Import

```tsx
import { CronBuilder, CronScheduleList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CronBuilder } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Trigger() {
  const [cron, setCron] = useState("0 9 * * 1-5");
  const [zone, setZone] = useState("Asia/Riyadh");
  return <CronBuilder value={cron} onValueChange={(v) => setCron(v)} timeZone={zone} onTimeZoneChange={setZone} />;
}
```

`onValueChange` fires on every keystroke with `valid`, so a half-typed expression is still the value. Check `valid` (or call `isValidCron`) before you save.

## Anatomy

```
CronBuilder                     data-slot="cron-builder"
├─ presets                      Buttons with aria-pressed
├─ Tabs: Simple | Cron expression
│  ├─ simple: repeat, every N, minute, time, weekdays (ToggleGroup), day of month
│  └─ cron: monospace Input, hint, alert with the failing field
├─ summary                      data-slot="cron-summary", aria-live polite
├─ time zone Select
└─ next runs                    data-slot="cron-next-runs"

CronScheduleList                data-slot="cron-schedule-list"
└─ row                          Switch, name and words, last run Status, next run, run now / edit / delete
```

## API

### CronBuilder

Every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value / defaultValue` | `string` | `"0 9 * * 1-5"` | The cron expression or a macro. |
| `onValueChange` | `(value: string, valid: boolean) => void` | none | Every change; `valid` says whether it parses. |
| `timeZone / defaultTimeZone` | `string` | `"UTC"` | IANA zone the schedule is read in. Unknown names fall back to UTC. |
| `onTimeZoneChange` | `(timeZone: string) => void` | none | Zone picked. |
| `timeZones` | `readonly string[]` | `DEFAULT_TIME_ZONES` | Zones in the picker; the current one is always added. |
| `hideTimeZone` | `boolean` | `false` | Hide the picker. |
| `presets` | `readonly CronPreset[] \| false` | six common ones | `{ id, value, label? }`. |
| `previewCount` | `number` | `5` | Upcoming runs to list. |
| `now` | `Date \| number` | now | The moment previews count from (use it in tests and stories). |
| `disabled` | `boolean` | `false` | Read only. |
| `label` | `string` | "Schedule" | Accessible name of the group. |
| `labels` | `Partial<CronBuilderLabels>` | none | Override any English or Arabic string. |

### CronScheduleList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `schedules` | `readonly CronSchedule[]` | required | `{ id, name, cron, timeZone?, enabled, lastRun?: { at, status: "ok" \| "failed" \| "missed", message? } }`. |
| `onToggle` | `(schedule, enabled) => Promise<void \| { error?: string }>` | none | Pause or resume; without it the switch is disabled. |
| `onRunNow / onDelete` | `(schedule) => Promise<void \| { error?: string }>` | none | Show the buttons. Delete asks first. |
| `onEdit` | `(schedule) => void` | none | Shows the edit button. |
| `now / loading / labels / className` | none | none | Preview origin, skeleton, string overrides. |

### Helpers

`parseCron(expr)` returns `{ ok: true, value }` or `{ ok: false, error: { code, field, token } }`. `nextRuns(expr, { from, count, timeZone })`
returns Dates. `describeCron(expr, "en" | "ar")` returns a sentence or `null`. `simpleToCron` and `cronToSimple` convert the simple form.
`isValidCron`, `isValidTimeZone` and `DEFAULT_CRON_PRESETS` are exported too.

## Examples

Saved schedules with statuses:

```tsx
import { CronScheduleList } from "@fadymondy/nasaq/web";

export const Schedules = () => (
  <CronScheduleList
    schedules={[
      { id: "1", name: "Weekly report", cron: "0 9 * * 1", timeZone: "Asia/Riyadh", enabled: true, lastRun: { at: Date.now() - 3600_000, status: "ok" } },
      { id: "2", name: "Sync CRM", cron: "*/15 * * * *", enabled: true, lastRun: { at: Date.now() - 900_000, status: "failed" } },
    ]}
    onToggle={async () => {}}
    onRunNow={async () => {}}
  />
);
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves through presets, tabs, fields, days and zone. |
| Arrow keys | Switch tab; move between weekday toggles. |
| Space / Enter | Press a preset or weekday, open the zone list. |

The summary is a polite live region. A wrong expression is announced with `role="alert"` and `aria-invalid`. Weekday toggles carry the full day name. Schedule status is an icon plus a word, never colour alone. Localise `label` and any custom `labels`.

## RTL & i18n

- Cron text, time zone names and times stay left-to-right (`dir="ltr"`); the sentence around them follows the language.
- Digits are Latin, like the rest of Nasaq. Arabic plurals (دقيقتين، 5 دقائق، 15 دقيقة) are handled.
- The weekday toggles run in reading order, so Sunday sits at the start in both languages.

## Styling & tokens

- Uses `--nq-surface-soft`, `--nq-danger-text`, border and card tokens. Extend with `className`; never pass raw hex.

## Do / Don't

- Do show the time zone the schedule runs in; a schedule without one is a bug waiting for daylight saving.
- Do show the next runs before saving.
- Don't accept a value without checking `valid`.

## Related

- [`workflow-canvas`](../workflow-canvas/README.md)
- [`backup-manager`](../backup-manager/README.md)
- [`run-history`](../run-history/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-cron-builder--docs

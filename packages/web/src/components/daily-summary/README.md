---
name: daily-summary
title: Daily Summary
category: wellness
status: beta
summary: One day at a glance with water, meals by safety, caffeine by kind, focus sessions, shutdown violations, steps, sleep, energy, heart rate and weight, plus a day switcher.
exports: [DailySummary, DailySummaryProps, DailySummaryData, DailySummaryLabels, SummarySource]
related: [engine-card, vitals, health-reports, stat-card, meter]
story: components-wellness-daily-summary
base-ui: []
keywords: [health, daily, summary, water, meals, caffeine, steps, sleep, rollup, day]
---

# Daily Summary

The rollup for one civil day. Protocol figures (water, meals, caffeine, shutdown violations, focus sessions) come
first, then body and activity (steps, sleep, energy, resting heart rate, weight). A figure the device did not send
reads "Not synced"; it is never shown as zero. Meals and caffeine are split by kind with an icon and a word for each
kind, so colour is never the only signal.

## When to use

- The "today" or "yesterday" screen of a health app.
- Anywhere a person steps through days one at a time.

## When not to use

- Trends over weeks: use [`HealthReport`](../health-reports/README.md).
- Body readings and targets: use [`Vitals`](../vitals/README.md).

## Import

```tsx
import { DailySummary } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { DailySummary } from "@fadymondy/nasaq/web";

export function Today({ summary, load }: { summary: DailySummaryData; load: (date: string) => void }) {
  return <DailySummary summary={summary} waterGoalMl={3000} maxDate="2026-09-29" onDateChange={load} />;
}
```

## Anatomy

```
DailySummary                  data-slot="daily-summary"  data-date
├─ header                     previous, date heading, next, source Badge
├─ Protocol                   water (Meter against your goal), meals, caffeine, shutdown, focus sessions
└─ Body and activity          StatCards
```

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `summary` | `DailySummaryData` | One row per day. Every figure is optional. |
| `date` | `string` | The day shown while `summary` is absent. |
| `maxDate` | `string` | The next button stops here. |
| `onDateChange` | `(date: string) => void` | Called with the neighbouring civil date. Omit to hide the switcher. |
| `waterGoalMl` | `number` | The person's own goal. Nothing is drawn without one. |
| `loading`, `error`, `onRetry` | | Skeleton, the server's message, retry. |
| `labels` | `Partial<DailySummaryLabels>` | Override any string. |

`addCivilDays`, `isCivilDate`, `isAfter`, `minutesToSeconds` and `unclassifiedCount` are exported from the folder for hosts.

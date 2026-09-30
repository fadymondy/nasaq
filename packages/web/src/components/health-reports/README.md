---
name: health-reports
title: Health Reports
category: health
status: beta
summary: Health reports over a period with averages that skip missing days, a one-figure trend chart, meals and caffeine per day, and each engine's days on and off protocol.
exports: [HealthReport, HealthReportProps, HealthReportLabels, EngineReport]
related: [daily-summary, engine-details, chart, stat-card]
story: components-health-health-reports
base-ui: [toggle-group]
keywords: [health, reports, averages, trend, chart, adherence, streak, export, csv]
---

# Health Reports

A report over 7, 30 or 90 days. Averages skip days with no reading instead of counting them as zero. One chart shows
one figure at a time (water, steps, sleep, weight, resting heart rate). Meals and caffeine are stacked bars per day
with a legend. A table gives each day-judging engine's days on protocol, off it and not judged, with streaks. An optional
export button hands the work to the host.

## When to use

- The weekly or monthly review screen.

## When not to use

- One day: use [`DailySummary`](../daily-summary/README.md).
- One engine's history: use [`EngineDetails`](../engine-details/README.md).

## Import

```tsx
import { HealthReport } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { HealthReport, reportToCsv } from "@fadymondy/nasaq/web";

<HealthReport
  days={days}
  engines={[{ engine: "hydration", days: hydrationHistory }]}
  period={30}
  onPeriodChange={(n) => load(n)}
  onExport={async () => { download(reportToCsv(days)); }}
/>;
```

## Anatomy

```
HealthReport                  data-slot="health-report"
├─ header                     h1, lede, Export button, period ToggleGroup
├─ Averages                   StatGrid
├─ Trend                      figure ToggleGroup, ChartContainer (bars or line)
├─ Meals / Caffeine           stacked bar Cards
└─ Protocol days              Table
```

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `days` | `ReportDay[]` | Oldest first. Missing figures are left out. |
| `engines` | `EngineReport[]` | Per-engine `HistoryDay[]` for the same period. |
| `periods` / `period` / `onPeriodChange` | | Default `[7, 30, 90]`. |
| `onExport` | `() => Promise<void \| { error?: string }>` | Omit to hide the button. |
| `loading`, `error`, `onRetry` | | Skeleton, the server's message, retry. |
| `labels` | `Partial<HealthReportLabels>` | Override any string. |

Helpers exported from the folder: `summariseReport`, `average`, `metricSeries`, `reportToCsv`.

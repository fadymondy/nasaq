---
name: engine-details
title: Engine Details
category: wellness
status: beta
summary: One protocol engine's own page with its live card, per-day history, record timeline and the fixed protocol it follows.
exports: [EngineDetails, EngineDetailsProps, EngineDetailsLabels, EngineRecordEntry]
related: [engine-card, daily-summary, chart, timeline, stat-card]
story: components-wellness-engine-details
base-ui: [toggle-group]
keywords: [health, engine, history, streak, protocol, timeline, verdict, hydration, caffeine, gerd]
---

# Engine Details

The page behind an [`EngineCard`](../engine-card/README.md). It shows the live card, then for the engines that
judge days (hydration, caffeine, GERD) a window switch, counts of days on protocol, off protocol and not judged,
current and best streaks, a chart and a strip of every day. Then the engine's record as a timeline and the fixed
protocol constants.

Only counts and verdicts appear, never a rate. A day the engine did not judge is not a failure: it ends a streak
without counting against you, and it has its own shape in the strip.

## When to use

- The screen a dashboard card links to.

## When not to use

- A summary of one day: use [`DailySummary`](../daily-summary/README.md).

## Import

```tsx
import { EngineDetails } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { EngineDetails, type HistoryDay } from "@fadymondy/nasaq/web";

export function HydrationPage({ history }: { history: HistoryDay[] }) {
  return (
    <EngineDetails
      snapshot={{ engine: "hydration", state: "idle", totalMl: 1500, dailyCapMl: 5000, unitMl: 250, unitsLogged: 6, unitsTotal: 20 }}
      history={history}
      windows={[7, 30, 365]}
      onWindowChange={async (days) => { /* load that window, pass it back through history */ }}
      records={[{ id: "1", at: "2026-09-29T07:10:00Z", title: "250 mL logged", tone: "success" }]}
      backHref="/health"
    />
  );
}
```

## Anatomy

```
EngineDetails                 data-slot="engine-details"  data-engine
├─ header                     back link (mirrors in RTL), icon, h1, lede
├─ EngineCard                 hideTitle
├─ history section            ToggleGroup, StatGrid, Chart, EngineHistoryStrip, legend
├─ record section             Timeline
└─ protocol section           definition list of constants
```

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `snapshot` | `EngineSnapshot` | Required. |
| `history` | `HistoryDay[]` | Oldest first, one per civil day. |
| `historyLoading` / `historyError` / `onRetry` | | Skeleton, the server's message, retry. |
| `windows` | `number[]` | Default `[7, 30, 365]`. |
| `windowDays` / `onWindowChange` | | Controlled window. |
| `records` | `EngineRecordEntry[]` | Newest first. `tone` picks an icon as well as a colour. |
| `onAction`, `now` | | Passed to the card. |
| `backHref` | `string` | Omit to hide the link. |
| `labels` | `Partial<EngineDetailsLabels>` | Override any string. |

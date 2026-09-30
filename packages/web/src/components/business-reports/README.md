---
name: business-reports
title: BusinessReports
category: analytics
status: beta
summary: Four ready made business reports, profitability by project, an employee KPI dashboard, a CRM pipeline with a chart and table toggle and support inbox statistics. Each is a section you drop into a page.
exports: [BusinessReportsLabels, ProfitabilityRow, ProfitabilityReportProps, ProfitabilityReport, EmployeeKpi, EmployeeKpiDashboardProps, EmployeeKpiDashboard, PipelineStage, PipelineReportProps, PipelineReport, SupportSummary, SupportAgentRow, SupportStatsReportProps, SupportStatsReport]
related: [report-filter-bar, chart-extras, stat-card, data-table, time-series-panel, funnel-chart]
story: pages-analytics-profitability
base-ui: [toggle-group, context-menu]
keywords: [report, profitability, margin, employee, kpi, target, crm, pipeline, funnel, support, inbox, sla, csat, analytics]
---

# BusinessReports

Four report sections built from the same parts (`StatCard`, `SegmentBar`, `ProgressRing`, `FunnelSteps`, `TimeSeriesPanel`, `DataTable`). They take plain data and formatting options, and know nothing about where the data came from.

- `ProfitabilityReport`: revenue, cost, profit and margin, by project, client or service.
- `EmployeeKpiDashboard`: a card per person with attainment against a target.
- `PipelineReport`: the CRM pipeline stage by stage, as a funnel or a table.
- `SupportStatsReport`: response and resolution times, satisfaction, SLA, volume and agents.

## When to use

- A report page in a back office, next to a [`ReportFilterBar`](../report-filter-bar/README.md).
- You have the numbers already and want the layout, the tones and the wording.

## When not to use

- A live operations dashboard: use [`MetricTiles`](../metric-tiles/README.md) and [`DashboardBoard`](../dashboard-board/README.md).
- A single metric over time: use [`TimeSeriesPanel`](../time-series-panel/README.md).

## Import

```tsx
import { ProfitabilityReport, EmployeeKpiDashboard, PipelineReport, SupportStatsReport } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ProfitabilityReport } from "@fadymondy/nasaq/web";

const money = { style: "currency", currency: "SAR", maximumFractionDigits: 0 } as const;

export function Profit() {
  return (
    <ProfitabilityReport
      format={money}
      rows={[
        { id: "p1", name: "Website rebuild", revenue: 120000, cost: 78000, hours: 410 },
        { id: "p2", name: "Mobile app", revenue: 90000, cost: 96000, hours: 520 },
      ]}
    />
  );
}
```

## Anatomy

```
ProfitabilityReport      data-slot="profitability-report": StatGrid, cost against profit bar, DataTable
EmployeeKpiDashboard     data-slot="employee-kpi-dashboard": StatGrid, a Card per person with ProgressRing
PipelineReport           data-slot="pipeline-report": StatGrid, Chart / Table toggle, FunnelSteps or DataTable
SupportStatsReport       data-slot="support-stats-report": StatGrid, TimeSeriesPanel, SegmentBar, agents DataTable
```

## API

### ProfitabilityReport

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rows` | `{ id, name, revenue, cost, hours?, marginTrend? }[]` | required | One per project, client or service. |
| `format` | `FormatNumberOptions` | required | Currency options for money. |
| `subjectLabel` | `string` | "Project" | Heading of the name column. |
| `thinBelow` | `number` | `0.15` | Margins below this read "Thin". Below zero reads "Loss". |
| `rowActions` | `(row) => DataTableRowAction[]` | none | Row menu: the ⋯ button, context-click, long press, Shift+F10. |
| `loading` `error` `onRetry` | | | States. |
| `labels` | `Partial<BusinessReportsLabels>` | en / ar | Text overrides. |

### EmployeeKpiDashboard

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `employees` | `{ id, name, role?, avatarSrc?, target, actual, metrics?, trend?, delta? }[]` | required | `metrics` are extra figures on the card. |
| `format` | `FormatNumberOptions` | plain number | For target and actual. |
| `measure` | `string` | none | What the target measures, shown in the summary. |
| `onTrackAt` | `number` | `0.8` | Share of the target that counts as On track. |
| `actions` | `(employee) => ContextMenuAction[]` | none | Card menu: the ⋯ button, context-click, long press, Shift+F10. |

### PipelineReport

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `stages` | `{ id, label, count, value, won? }[]` | required | In order, each with the deals that reached it (so counts fall down the list); "Pipeline value" is the first stage. The stage marked `won` (default the last) gives the win rate. |
| `format` | `FormatNumberOptions` | required | Currency options. |
| `view` `defaultView` `onViewChange` | `"chart" \| "table"` | `"chart"` | The toggle. |
| `stageActions` | `(stage) => DataTableRowAction[]` | none | Menu of a stage in the table view. |

### SupportStatsReport

| Prop | Type | Description |
| --- | --- | --- |
| `summary` | `{ open, firstResponseMinutes, resolutionMinutes, csat, slaRate, deltas? }` | Times in minutes, rates as fractions. Short times show as minutes, long ones as hours. |
| `volume` `previousVolume` | `TimeSeriesPoint[]` | Rows with `date`, `created` and `resolved`. |
| `byStatus` | `SegmentBarSegment[]` | The status mix. |
| `agents` | `{ id, name, assigned, resolved, firstResponseMinutes, csat, trend? }[]` | The agents table. |
| `agentActions` | `(agent) => DataTableRowAction[]` | Row menu. |

### Helpers

`profitMargin`, `profitTotals`, `marginBand`, `attainment`, `kpiStatus`, `pipelineRows`, `winRate`, `median`, `slaRate`. All pure.

## Examples

A pipeline that opens as a table:

```tsx
import { PipelineReport } from "@fadymondy/nasaq/web";

export const Pipeline = () => (
  <PipelineReport
    defaultView="table"
    format={{ style: "currency", currency: "SAR", notation: "compact" }}
    stages={[
      { id: "lead", label: "Leads", count: 240, value: 960000 },
      { id: "proposal", label: "Proposal", count: 80, value: 640000 },
      { id: "won", label: "Won", count: 24, value: 210000, won: true },
    ]}
  />
);
```

Employee cards with a menu:

```tsx
import { EmployeeKpiDashboard } from "@fadymondy/nasaq/web";

export const Team = () => (
  <EmployeeKpiDashboard
    measure="Billable hours"
    employees={[{ id: "e1", name: "Sara", role: "Designer", target: 140, actual: 152 }]}
    actions={(e) => [{ id: "open", label: `Open ${e.name}`, onSelect: () => {} }]}
  />
);
```

## Accessibility

Each report is a `section`; figures live in tables with headers, or in cards with a heading. Status is always text as well as colour: Loss, Thin, Healthy and Ahead, On track, Behind carry an icon and a word. Rings and small charts have text names, and the funnel writes the conversion between steps. The chart and table toggle is a labelled toggle group. Menus open from the ⋯ button, context-click, long press, Shift+F10 and the Menu key.

## RTL & i18n

Layout follows the reading direction and the charts mirror. English and Arabic text ship built in; override with `labels`. Names and category labels come from you, localised. Numbers, currency, percentages and durations use Western digits and are bidi isolated.

## Styling & tokens

Uses the Card, Badge, StatCard and chart tokens (`--nq-success`, `--nq-warning`, `--nq-info`). Target `[data-slot="profitability-report"]` and the other slots; extend with `className`.

## Do / Don't

- Do pass money as `format` with the currency, so every figure agrees.
- Do give people and projects localised names.
- Do offer `actions` for the things a reader does next (open the project, message the person).
- Don't put the ring's meaning in colour only; keep the status word.
- Don't feed times in seconds; the support report expects minutes.

## Related

- [`ReportFilterBar`](../report-filter-bar/README.md)
- [`ChartExtras`](../chart-extras/README.md)
- [`DataTable`](../data-table/README.md)
- [`TimeSeriesPanel`](../time-series-panel/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/pages-analytics-profitability--docs

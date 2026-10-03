---
name: uptime-monitors
title: UptimeMonitors
category: monitoring
status: beta
summary: The admin side of uptime - a table of monitors with status, a recent-checks bar, a 24h, 7d or 30d uptime badge, response time and last check, pause, resume, check now, edit and delete, plus incidents with their updates.
exports: [UptimeMonitorsLabels, UptimeResult, UptimeMonitor, IncidentUpdate, Incident, MonitorInput, UptimeBarProps, UptimeBar, UptimeBadgeProps, UptimeBadge, IncidentListProps, IncidentList, UptimeMonitorsProps, UptimeMonitors, CheckResult, computeUptime, formatIncidentDuration, formatUptime, incidentMinutes, IncidentImpact, IncidentStatus, isOpenIncident, MonitorStatus, overallStatus, OverallStatus, responseLabel, UPTIME_PERIODS, UptimePeriod, UptimeTone, uptimeTone]
related: [status-page, status-page-manager, cert-monitor, ws-status, alerts, data-table]
story: components-monitoring-uptime-monitors
base-ui: [dialog, alert-dialog, field, select, toggle-group]
keywords: [uptime, monitor, ping, http check, incident, sla, availability, downtime]
---

# UptimeMonitors

Monitor sites and services. The table shows each monitor's status, a strip of recent checks, the uptime for the chosen period (switch between 24 hours, 7 days and 30 days above the table), the response time and the last check. Row actions (also on right-click): check now, pause, resume, edit and delete. Below it, incidents are listed with their status, impact, how long they lasted and an update timeline. The parts are exported too: `UptimeBar`, `UptimeBadge` and `IncidentList` are reused by the public status page. It has no backend: your callbacks act and you pass the new `monitors` back.

## When to use

- An admin page for monitoring.
- `UptimeBar` and `UptimeBadge` anywhere a service's health is shown.

## When not to use

- The public page customers see: use `StatusPage`.
- Metrics over time (latency curves): use `TimeSeriesPanel`.

## Import

```tsx
import { UptimeMonitors } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { UptimeMonitors, type UptimeMonitor } from "@fadymondy/nasaq/web";

declare const monitors: UptimeMonitor[];
declare const api: { pause(id: string): Promise<void>; checkNow(id: string): Promise<void> };

export const Uptime = () => (
  <UptimeMonitors
    monitors={monitors}
    onPause={(id) => api.pause(id)}
    onCheckNow={(id) => api.checkNow(id)}
  />
);
```

## Anatomy

```
UptimeMonitors               data-slot="uptime-monitors"
├─ header                    title, overall status Badge
├─ toolbar                   search, period ToggleGroup (24h, 7d, 30d), Add monitor
├─ DataTable                 monitor, Status, UptimeBar, UptimeBadge, response, last check; row menu
├─ incidents                 IncidentList (Timeline of updates)
├─ monitor Dialog            name, address, type, interval
└─ AlertDialog               delete confirm

UptimeBar                    data-slot="uptime-bar"       one segment per check, oldest first
UptimeBadge                  data-slot="uptime-badge"     percent, coloured by health
IncidentList                 data-slot="incident-list"    newest first
```

## API

**UptimeMonitors**: every `Card` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `monitors` | `readonly UptimeMonitor[]` | required | `{ id, name, target, kind, status, uptime: { "24h"?, "7d"?, "30d"? }, checks?, responseMs?, lastCheckAt?, intervalSec? }`. Status: `up`, `degraded`, `down`, `paused`, `unknown`. |
| `incidents` | `readonly Incident[]` | `[]` | `{ id, title, status, impact, startedAt, resolvedAt?, services?, updates? }`. |
| `defaultPeriod` | `"24h" \| "7d" \| "30d"` | `"30d"` | Which uptime the badge shows first. |
| `loading` | `boolean` | `false` | Skeleton state. |
| `onSave` | `(input: MonitorInput, id?) => Promise<void \| { error? }>` | | Shows Add monitor and Edit. |
| `onDelete`, `onPause`, `onResume`, `onCheckNow` | `(id) => Promise<...>` | | Each shows its row action. |
| `labels` | `Partial<UptimeMonitorsLabels>` | | Override any string. |

**UptimeBar**: `checks` (`"up" \| "degraded" \| "down" \| "none"`), `label`. **UptimeBadge**: `percent`, `period`. **IncidentList**: `incidents`, `showUpdates`.

**Helpers** (pure, tested): `computeUptime`, `formatUptime` (truncates: never shows a false 100%), `uptimeTone` (99.9 and up is green, 99 and up amber, below red), `overallStatus`, `incidentMinutes`, `formatIncidentDuration`, `isOpenIncident`, `responseLabel`.

## Examples

**Just the bar and badge**

```tsx
import { UptimeBadge, UptimeBar } from "@fadymondy/nasaq/web";

export const Health = () => (
  <>
    <UptimeBar checks={["up", "up", "degraded", "down", "up"]} />
    <UptimeBadge percent={99.95} period="30d" />
  </>
);
```

## Accessibility

- The bar is an image with a text summary; each segment has a title. The uptime badge always carries the figure, never colour alone.
- The period switch is a labelled `ToggleGroup`. Row actions are also a button in the row.
- Errors from callbacks appear in an `Alert`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. The bar runs right to left (oldest on the right). Percentages, addresses and times of response stay left to right.

## Styling & tokens

- Built on `DataTable`, `Card`, `Badge`, `Status`, `Timeline`, `ToggleGroup` and `--nq-*` tokens. Target `[data-slot="uptime-monitors"]`.

## Do / Don't

- Do count degraded as up for the percentage: the service answered.
- Do pass `none` for periods with no data instead of `up`.
- Don't round 99.996 up to 100%: use `formatUptime`.
- Don't hide open incidents behind a filter.

## Related

- [`status-page`](../status-page/README.md)
- [`status-page-manager`](../status-page-manager/README.md)
- [`cert-monitor`](../cert-monitor/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-monitoring-uptime-monitors--docs

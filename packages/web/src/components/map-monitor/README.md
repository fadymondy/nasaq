---
name: map-monitor
title: Map Monitor
category: charts
status: beta
summary: A map for watching live events. Region presets jump between places, a time-range filter narrows to recent events, and an alerts panel lists them by severity in step with the pins.
exports: [MapMonitorLabels, MapMonitorProps, MapMonitor]
related: [map-view, heatmap, activity-feed, alert]
story: components-charts-maps-map-monitor
base-ui: [toggle-group]
keywords: [map, alerts, incidents, monitoring, situation, operations, region, presets, time range, severity, live, war room, dispatch]
---

# Map Monitor

An operations map: incidents, outages or warnings on a `MapView`. People jump between regions you define, narrow to
the last day or week, and read the alerts as a list ordered by severity. Choosing an alert in the list selects its pin
and centres the map on it.

## When to use

- Dispatch, field operations, security or service monitoring, where place and recency both matter.

## When not to use

- Just pins, routes or areas: use `MapView`.
- Alerts with no location: use a list or `ActivityFeed`.

## Import

```tsx
import { MapMonitor, type MapAlert, type MapRegionPreset } from "@fadymondy/nasaq";
```

## Quick start

```tsx
const regions: MapRegionPreset[] = [
  { id: "ksa", label: "Saudi Arabia", labelAr: "السعودية", center: { lat: 23.9, lng: 45.1 }, zoom: 5 },
  { id: "riyadh", label: "Riyadh", labelAr: "الرياض", center: { lat: 24.71, lng: 46.67 }, zoom: 10 },
];

<MapMonitor
  regions={regions}
  alerts={alerts} // { id, lat, lng, title, severity, at, detail? }
  defaultRange="24h"
  onVisibleAlertsChange={(list) => setBadge(list.length)}
  tileUrl={tiles}
  attribution="© OpenStreetMap"
/>;
```

## Anatomy

- `data-slot="map-monitor"`: a `section` named by its heading.
- Header: heading, the region toggle group, the time-range toggle group, the Alerts button (count badge, controls the
  panel), your `actions`.
- The `MapView`, with alerts drawn as pins (tone and icon by severity, the time in the card).
- `map-monitor-alerts`: an `aside` with counts per severity and the list (`map-monitor-alert`, `data-severity`).
  It sits beside the map on large screens and below it on small ones.

## API

Every `MapView` prop passes through (pins, routes, areas, layers, tiles, actions, clustering and so on), except
`view`, which the monitor drives.

| Prop | Type | Notes |
| --- | --- | --- |
| `alerts` | `MapAlert[]` | `{ id, lat, lng, title, titleAr?, severity?, at, detail?, detailAr?, layer? }`. `severity` defaults to `medium`; `at` is a Date, epoch ms or ISO string. Ids must not clash with `pins`. |
| `regions` | `MapRegionPreset[]` | `{ id, label, labelAr?, center, zoom }`. |
| `defaultRegion`, `onRegionChange` | `string` | A region stays highlighted while the map sits on it. |
| `timeRanges` | `MapTimeRange[]` | `{ id, ms }`, `ms: null` for all. Default 24h, 7d, 30d, all. |
| `range`, `defaultRange`, `onRangeChange` | `string` | Default the "all" range. |
| `onVisibleAlertsChange` | `(alerts) => void` | The alerts left after the time filter. |
| `alertsOpen`, `defaultAlertsOpen`, `onAlertsOpenChange` | `boolean` | The panel. Default open. |
| `selectedId`, `defaultSelectedId`, `onSelect` | `string \| null` | Shared by pins and the list. |
| `now` | `number` | "Now" for the filter and relative times. |
| `title`, `headingAs`, `actions` | | `title={null}` hides the heading. Default `h2`. |
| `mapClassName` | `string` | The map's size. Default `h-[30rem]`. |
| `labels` | `Partial<MapMonitorLabels>` | `ranges` names custom range ids; `severity` renames levels. |

### Helpers

From `map-monitor-logic.ts`, pure: `filterMapAlerts(alerts, ms, now)` keeps the alerts in a range, most severe then
newest first (an unreadable time only shows under "all"); `countMapAlerts` counts per severity; `mapAlertTime`,
`mapAlertSeverity`, `isMapRegionView`; `MAP_ALERT_SEVERITIES`, `DEFAULT_MAP_TIME_RANGES`. Types `MapAlert`,
`MapAlertSeverity`, `MapRegionPreset`, `MapTimeRange`.

## Accessibility

- Regions and time ranges are toggle groups with names ("Region", "Time range").
- The Alerts button says whether it shows or hides the panel and how many alerts there are, and has `aria-expanded`
  and `aria-controls`.
- Severity is never colour alone: each alert has an icon and the severity in words, and the count badges carry the
  level as screen-reader text. The chosen alert has `aria-current`.
- Everything the map offers (keyboard pan and zoom, pin cards) comes from `MapView`.

## RTL & i18n

English and Arabic strings are built in, and `titleAr`, `detailAr` and `labelAr` are used in Arabic. Relative times
and counts use the locale. The severity rule sits on the inline start and the panel moves to the inline end, so both
mirror.

## Styling & tokens

`bg-card`, `border-border`; severity uses `nq-danger`, `nq-warning`, `nq-info` and neutral, the same tones as the
pins. The chosen alert uses `bg-nq-selected`.

## Do / Don't

- Do set `now` from your server clock when it matters, so the filter and the times agree with the data.
- Do keep the region list short (up to six); add a search for more.
- Don't reuse an alert id as a pin id.

## Related

`map-view`, `heatmap`, `activity-feed`, `alert`.

## Lab

Charts & Maps › Map Monitor: Default, Closed panel, Empty, Arabic.

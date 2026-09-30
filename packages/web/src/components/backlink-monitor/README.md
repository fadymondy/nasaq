---
name: backlink-monitor
title: BacklinkMonitor
category: analytics
status: beta
summary: "Backlink monitoring: new, lost and toxic links, a gained and lost chart, referring domains, and disavow or mark-safe actions."
exports: [BacklinkMonitorLabels, Backlink, BacklinkMonitorProps, BacklinkMonitor, NEW_LINK_DAYS, TOXIC_SPAM_SCORE, backlinkStatus, dailyLinkSeries, diffBacklinks, domainOf, isToxic, referringDomains, summarizeBacklinks]
related: [keyword-tracker, seo-pages, metric-tiles, time-series-panel, data-table]
story: components-analytics-backlink-monitor
base-ui: []
keywords: [backlinks, links, toxic, disavow, referring domains, seo, link building]
---

# BacklinkMonitor

BacklinkMonitor shows who links to you and how that changes. Summary tiles count links, referring domains, new this week, lost and toxic. A chart plots links gained and lost per day. The table can be filtered by status (new, active, lost, toxic), and toxic links can be disavowed in bulk or marked safe one by one.

## When to use

- The link profile part of an SEO dashboard.
- Alerting a team that a valuable link was lost or a spammy one appeared.

## When not to use

- Ranking positions: use [`KeywordTracker`](../keyword-tracker/README.md).

## Import

```tsx
import { BacklinkMonitor } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { type Backlink, BacklinkMonitor } from "@fadymondy/nasaq/web";

export function Links({ links }: { links: Backlink[] }) {
  return <BacklinkMonitor links={links} onDisavow={async (ids) => { await api.disavow(ids); }} onMarkSafe={async (id) => { await api.safe(id); }} />;
}
```

## Anatomy

```
BacklinkMonitor        data-slot="backlink-monitor"
  MetricTiles          links, domains, new, lost, toxic
  TimeSeriesPanel      gained and lost per day
  DataTable            source, anchor, target, DR, spam score, first seen, status
                       status facet, bulk Disavow
```

## API

### BacklinkMonitor

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `links` | `Backlink[]` | required | All links, including lost ones. |
| `onDisavow` | `(ids: string[]) => Promise<void \| { error?: string }>` | none | Shows the Disavow action. |
| `onMarkSafe` | `(id: string) => Promise<...>` | none | Shows Mark safe on flagged links. |
| `now` | `number` | `Date.now()` | Reference time. Pass a fixed value in demos and tests. |
| `days` | `number` | `30` | Days on the chart. |
| `title / description` | `ReactNode` | built-in | Header. |
| `pageSize` | `number` | `8` | Rows per page. |
| `loading / error / onRetry` | | none | States. |
| `className / labels` | | none | Classes; `Partial<BacklinkMonitorLabels>` strings. |

### Backlink

`{ id, sourceUrl, targetUrl, anchor, domainRating, spamScore, firstSeen, lostAt?, followed?, disavowed? }`. Dates are ISO strings.

### Helpers

- `backlinkStatus(link, now)` gives `lost`, `new` (first seen within `NEW_LINK_DAYS`, 7) or `active`; lost wins over new.
- `isToxic(link)` is true from `TOXIC_SPAM_SCORE` (60) upward, unless disavowed.
- `summarizeBacklinks(links, now)`, `referringDomains(links)` (live domains counted once, `www.` ignored), `domainOf(url)`, `dailyLinkSeries(links, days, now)` and `diffBacklinks(before, after)`.

## Examples

Only the counts:

```tsx
import { summarizeBacklinks } from "@fadymondy/nasaq/web";

const { total, toxic, lost } = summarizeBacklinks(links, Date.now());
```

Read only:

```tsx
import { BacklinkMonitor } from "@fadymondy/nasaq/web";

<BacklinkMonitor links={links} days={14} />;
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through the filters, table and actions. |
| Space | Select a row for the bulk action. |
| Enter | Run the focused action. |

Status is a word, not only a colour. The chart has a visually hidden data table through TimeSeriesPanel.

## RTL & i18n

URLs and anchors that are Latin stay left-to-right; Arabic anchors use `dir="auto"`. Dates go through `DateTime`. Built-in English and Arabic strings.

## Styling & tokens

New, lost and toxic use the info, warning and danger tokens. Chart series use `--nq-chart-*`.

## Do / Don't

- Do confirm in your own flow before disavowing: this screen has no undo.
- Do review toxic links before disavowing; a high spam score is a hint, not a verdict.
- Don't pass `Date.now()` inside a render loop for `now`; pass a stable value.

## Related

- [KeywordTracker](../keyword-tracker/README.md)
- [TimeSeriesPanel](../time-series-panel/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-backlink-monitor--docs

---
name: alerts
title: AlertList
category: analytics
status: beta
summary: Alert triage lists, AlertList and SecurityAlerts, with status tabs and counts, search, severity and source filters, sorting, acknowledge, resolve and reopen, and an expandable timeline per alert.
exports: [AlertList, SecurityAlerts, AlertListProps, SecurityAlertsProps, AlertsLabels, AlertItem, SecurityAlertItem, AlertEvent, AlertEventType, AlertAction, SecurityCategory, AlertCounts, AlertFilter, AlertLike, AlertSeverity, AlertSort, AlertStatus, canAcknowledge, canReopen, canResolve, countAlerts, filterAlerts, SEVERITIES, STATUSES, severityRank, sortAlerts, sourcesOf, urgentCount]
related: [alert, status, timeline, data-table, ws-status]
story: components-analytics-alerts
base-ui: [select, tabs]
keywords: [alerts, incidents, monitoring, severity, acknowledge, resolve, security, threats, on-call]
---

# AlertList and SecurityAlerts

Triage monitoring alerts. Tabs for Open, Acknowledged and Resolved (with counts), search, severity and source
filters, sorting, and Acknowledge, Resolve and Reopen on each alert. A row expands to its description and a
timeline. `SecurityAlerts` is the same list for security events: it adds the category, IP, location and
account, a recommended action, and follow-up actions such as Block IP. This is not the `Alert` callout
component (a message on a page): it is a list of alert records.

## When to use

- An on-call or monitoring page, an incident inbox, a security console.

## When not to use

- A message about the current form or page: use `Alert`.
- Thousands of alerts: page and filter on the server, then pass one page in.

## Import

```tsx
import { AlertList, SecurityAlerts } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AlertList, type AlertItem } from "@fadymondy/nasaq/web";

declare const alerts: AlertItem[];
declare const api: { ack(id: string): Promise<void>; resolve(id: string): Promise<void>; reopen(id: string): Promise<void> };

export function Alerts() {
  return <AlertList alerts={alerts} onAcknowledge={api.ack} onResolve={api.resolve} onReopen={api.reopen} />;
}
```

## Anatomy

```
AlertList / SecurityAlerts      data-slot="alert-list" | "security-alerts"
├─ heading and "Showing N of M"
├─ Tabs (underline)             All, Open, Acknowledged, Resolved, each with a count
├─ filters                      search, severity Select, source Select, sort Select
└─ list                         data-slot="alert-row" data-severity data-status
   ├─ severity Badge, status, count, source, time, tags
   ├─ actions                   Acknowledge, Resolve, Reopen, Show details
   └─ details                   description, security extras and actions, Timeline
```

## API

**AlertList**: every `section` prop except `children` and `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `alerts` | `AlertItem[]` | required | `{ id, title, severity, status, source, createdAt, description?, count?, tags?, timeline? }`. Severity: `critical`, `high`, `medium`, `low`, `info`. Status: `open`, `acknowledged`, `resolved`. |
| `defaultStatus` | `AlertStatus \| "all"` | `open` | The tab shown first. |
| `defaultSort` | `"severity" \| "newest"` | `severity` | Initial sort. |
| `onAcknowledge` | `(id) => Promise<void \| { error? }>` | | Shows Acknowledge on open alerts. |
| `onResolve` | `(id) => Promise<void \| { error? }>` | | Shows Resolve until resolved. |
| `onReopen` | `(id) => Promise<void \| { error? }>` | | Shows Reopen on resolved alerts. |
| `loading` | `boolean` | `false` | Skeleton rows. |
| `hideFilters` | `boolean` | `false` | Hide search and filters. |
| `title` | `ReactNode` | | Replace the heading. |
| `labels` | `Partial<AlertsLabels>` | | Override any string. |

**SecurityAlerts**: the same, with `SecurityAlertItem` (adds `category?`, `ip?`, `location?`, `account?`, `recommendation?`) and:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `actions` | `AlertAction[]` | Block IP, Mark as false positive | `{ id, label, variant? }` shown on alerts that are not resolved. |
| `onAction` | `(actionId, alertId) => Promise<void \| { error? }>` | | Runs an action. Buttons show only when set. |

**Helpers** (pure, tested): `filterAlerts`, `sortAlerts`, `countAlerts`, `sourcesOf`, `urgentCount`, `severityRank`, `canAcknowledge`, `canResolve`, `canReopen`.

## Examples

**Security alerts**

```tsx
import { SecurityAlerts, type SecurityAlertItem } from "@fadymondy/nasaq/web";

declare const alerts: SecurityAlertItem[];

export const Security = () => (
  <SecurityAlerts alerts={alerts} onResolve={async () => {}} onAction={async (action, id) => console.info(action, id)} />
);
```

## Accessibility

- Tabs use the tabs pattern. The "Showing N of M" line is a polite live region.
- Severity is a word and an icon, status is a word and a distinct shape. Details use a button with `aria-expanded` and `aria-controls`.
- Callback errors appear in an `Alert` (`role="alert"`) on the row.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Sources, IPs, accounts and tags are `dir="ltr"`. Reopen (a rotate arrow) mirrors.

## Styling & tokens

- Built on `Tabs`, `Select`, `Badge`, `Status`, `Timeline`, `Alert` and `--nq-*` tokens.
- Target `[data-slot="alert-row"][data-severity="critical"]`.

## Do / Don't

- Do let a callback return `{ error }` when the server refuses.
- Do keep the timeline short: created, acknowledged, resolved, comments.
- Don't rely on colour: keep the severity label.
- Don't use it for toast-like messages: use `Alert` or a toast.

## Related

- [`Alert`](../alert/README.md)
- [`Timeline`](../timeline/README.md)
- [`WsStatus`](../ws-status/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-alerts--docs

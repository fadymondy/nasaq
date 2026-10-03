---
name: error-tracking
title: Error tracking
category: monitoring
status: beta
summary: A list of captured errors with a frequency sparkline, and a detail view with stack trace, breadcrumbs, tags, captured screenshot, console and network, plus resolve and ignore.
exports: [ErrorTracking, BreadcrumbType, ErrorIssueDetail, DiagnosticsViewer, ErrorIssue, ErrorFrame, ErrorBreadcrumb, ErrorDiagnostics, CapturedConsoleEntry, CapturedRequest, ErrorActionResult, ErrorTrackingLabels, ErrorTrackingProps, ErrorIssueDetailProps, DiagnosticsViewerProps]
related: [entity-list, sparkline, code-block, status, tabs]
story: components-monitoring-error-tracking
base-ui: []
keywords: [errors, exceptions, sentry, stack trace, breadcrumbs, diagnostics, console, network, resolve, ignore, issues]
---

# Error tracking

The screen for the errors your app captured. The list shows each error with how often it happens (a sparkline), how many people it hit and when it was last seen. Opening one shows the stack trace, the breadcrumbs that led to it, its tags and what the browser captured: a screenshot, the console and the network calls. It holds no data; you pass issues and async callbacks.

## When to use

- A page that triages captured exceptions and lets someone resolve or ignore them.
- A support view that needs the captured diagnostics next to the error.

## When not to use

- A general log stream: use a table with [`DataTable`](../data-table/README.md).
- A single toast or banner for a live failure: use [`Alert`](../alert/README.md).

## Import

```tsx
import { ErrorTracking } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ErrorTracking } from "@fadymondy/nasaq/web";

<ErrorTracking
  issues={[
    {
      id: "e1",
      title: "TypeError: Cannot read properties of undefined",
      culprit: "checkout/cart.ts in totals",
      level: "error",
      status: "unresolved",
      count: 482,
      users: 61,
      firstSeen: "2026-09-20T09:00:00Z",
      lastSeen: "2026-09-30T08:12:00Z",
      series: [2, 4, 9, 14, 30, 41, 58],
    },
  ]}
  onStatusChange={async (issue, status) => { await api.setStatus(issue.id, status); }}
/>;
```

## Anatomy

```
ErrorTracking               data-slot="error-tracking"
├─ EntityList               table and cards, facets for status and level, row menu and context menu
│  └─ Sparkline             events per bucket, coloured by trend
└─ ErrorIssueDetail         opens in place, Back returns to the list
   ├─ header + actions      Resolve, Ignore, Reopen
   ├─ Tabs                  Stack trace, Breadcrumbs, Tags, Diagnostics
   └─ DiagnosticsViewer     Screenshot, Console, Network
```

## API

`ErrorTracking`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `issues` | `ErrorIssue[]` | required | `{ id, title, culprit?, level, status, count, users?, firstSeen, lastSeen, series?, release?, environment?, tags?, frames?, breadcrumbs?, diagnostics? }`. |
| `onStatusChange?` | `(issue, status) => Promise<void \| { error?: string }>` | none | Resolve, ignore or reopen. Return `{ error }` to show why it failed. Without it the actions are hidden. |
| `onOpenIssue?` | `(issue) => void` | none | Called when an error is opened. |
| `label?` | `string` | translated | Accessible name of the list. |
| `labels?` | `Partial<ErrorTrackingLabels>` | en/ar | Override any string. |

Other `EntityList` props (`toolbar`, `empty`, `density`) pass through.

`ErrorIssueDetail` takes `issue`, `onBack?`, `onStatusChange?`, `labels?`. `DiagnosticsViewer` takes `diagnostics` (`{ screenshot?, console?, network? }`) and `labels?`.

## Examples

### Diagnostics on their own

```tsx
<DiagnosticsViewer diagnostics={{ screenshot: "/captures/e1.png", console: [], network: [] }} />
```

## Accessibility

- Sparklines carry a text label with the trend and total, so the meaning is not colour alone.
- Level and status are spelled out in badges. Tabs use the tab pattern; the expandable source context is a button with `aria-expanded`.
- Row actions open from the ⋯ menu, the context menu, Shift+F10 and the Menu key.
- A failed action is announced with `role="alert"`.

## RTL & i18n

- English and Arabic built in. Stack frames, file paths, URLs, methods and IDs stay left-to-right inside `<bdi dir="ltr">`.
- Numbers and dates use the current locale; the back arrow mirrors.

## Styling & tokens

- `bg-card`, `border-border`, status colours from `--nq-*`. The sparkline uses `--nq-danger`, `--nq-success` and `--primary`.
- Target `[data-slot=error-tracking]`.

## Do / Don't

- **Do** send `series` oldest first, one number per bucket.
- **Do** put your own frames first and mark them `inApp: true`.
- **Don't** put a screenshot with personal data in `diagnostics` unless it is masked.

## Related

- [EntityList](../entity-list/README.md) · [Sparkline](../chart/README.md) · [CodeBlock](../code-block/README.md) · [Status](../status/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-monitoring-error-tracking--docs

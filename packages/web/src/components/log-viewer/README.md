---
name: log-viewer
title: LogViewer
category: monitoring
status: stable
summary: Virtualised log stream with level filters and counts, time ranges, timestamps, search with highlights and regex, follow tail, pause and resume, load older, server-side filtering, detail panel, copy and download.
exports: [LogViewerLabels, LogViewerFilter, LogViewerProps, LogViewer, compileMatcher, countByLevel, entriesUntil, entryText, filterLogs, formatLogTime, LOG_LEVELS, LOG_RANGES, LogEntry, LogFilter, LogLevel, LogRange, LogTimeOptions, logsToText, normalizeLevel, rangeSince, virtualWindow]
related: [terminal, deploy-view, data-table]
story: components-monitoring-log-viewer
base-ui: []
keywords: [logs, log, viewer, level, filter, search, timestamp, tail, follow, virtualised, stream, debug, error, time range, pause, live tail, load older, server-side]
---

# LogViewer

A log stream that behaves like a dev tool. Entries are `{ id, time, level, message, source?, fields? }`, oldest
first. The toolbar has level chips with live counts, a search box with a regex toggle, a timestamps toggle, copy
and download. Rows are fixed-height and windowed, so tens of thousands of entries scroll smoothly. While
following, the list stays on the newest entry; scrolling up stops it and shows "Jump to latest". Select a row to
see the full message and its structured fields. Presentational: append to `entries` to stream.

## When to use

- Application, server or container logs with levels and timestamps.
- Anything a developer would search and filter while debugging.

## When not to use

- Raw command output with colours: use [Terminal](../terminal/README.md).
- Tabular business data: use [DataTable](../data-table/README.md).
- Audit trails for people: use a timeline or activity list.

## Import

```tsx
import { LogViewer } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { LogViewer } from "@fadymondy/nasaq/web";

export function Logs() {
  return (
    <LogViewer
      streaming
      entries={[
        { id: 1, time: Date.now(), level: "info", source: "api", message: "listening on :3000" },
        { id: 2, time: Date.now(), level: "error", source: "db", message: "connection refused", fields: { host: "db-1" } },
      ]}
    />
  );
}
```

## Anatomy

```
LogViewer       data-slot="log-viewer"          <div dir="ltr">
├─ toolbar      data-slot="log-viewer-toolbar"  level chips, search, regex, timestamps, copy, download
├─ list         data-slot="log-viewer-list"     <div role="log"> windowed rows, follows the tail
│  └─ row       data-slot="log-viewer-row"      time, level badge, source, message (matches highlighted)
├─ jump         "Jump to latest"                shown when not following
└─ detail       data-slot="log-viewer-detail"   full message and fields of the selected row
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `entries` | `LogEntry[]` | required | Oldest first. `id` must be unique. `level`: `trace debug info warn error fatal`. |
| `title?` | `string` | "Logs" / "السجلات" | Header text. |
| `streaming?` | `boolean` | `false` | Live indicator. |
| `follow?` | `boolean` | `true` | Start pinned to the newest entry. |
| `defaultLevels?` | `LogLevel[]` | all | Levels on at the start. |
| `defaultQuery?` | `string` | `""` | Initial search. |
| `timestamps?` | `boolean` | `true` | Show times. The toolbar toggles it. |
| `utc?` | `boolean` | `false` | UTC instead of local time. |
| `rowHeight?` | `number` | `24` | Pixels. Rows are single-line. |
| `height?` | `string \| number` | `"24rem"` | Height of the list. |
| `toolbar?` | `ReactNode` | none | Extra controls, e.g. a source select. |
| `onDownload?` | `(entries) => void` | saves a `.log` file | Receives the visible entries. |
| `downloadFilename?` | `string` | `"logs.log"` | Default download name. |
| `ranges?` | `LogRange[]` | none | Adds a time-range select, e.g. `LOG_RANGES` (15 minutes to all time). |
| `defaultRange?` | `string` | last range | Range id chosen at the start. |
| `manual?` | `boolean` | `false` | The server filters: `entries` are shown as given (matches still highlighted). |
| `onFilterChange?` | `(filter: LogViewerFilter) => void` | none | `{ levels, query, regex, range, since }` after each change. Not called on mount. |
| `counts?` | `Partial<Record<LogLevel, number>>` | counted | Per-level totals for the chips, e.g. from the server. |
| `total?` | `number` | `entries.length` | Total matches, for the footer. |
| `hasOlder?` | `boolean` | `false` | Shows "Load older entries" above the first row. |
| `onLoadOlder?` | `() => void \| Promise<void>` | none | Prepend older entries; the list keeps its place. |
| `loadingOlder?` | `boolean` | tracks the promise | Shows a spinner in place of the button. |
| `liveTail?` | `boolean` | `false` | Adds pause / resume. Paused, new entries wait and are counted. |
| `onLiveChange?` | `(live: boolean) => void` | none | E.g. close the socket while paused. |
| `labels?` | `Partial<LogViewerLabels>` | built-in en/ar | Translations. |

Helpers: `filterLogs`, `compileMatcher`, `countByLevel`, `formatLogTime`, `normalizeLevel` (maps `WARNING`, `err`,
`critical` onto the six levels), `logsToText`, `virtualWindow`, `rangeSince` (a range's lower bound in epoch ms,
`null` for all time) and `entriesUntil` (what a list paused at an id shows). `filterLogs` also takes `since`. All
pure.

## Examples

### Parse and normalise your own lines

```tsx
const entries = raw.map((l, i) => ({ id: i, time: l.ts, level: normalizeLevel(l.severity) ?? "info", message: l.text }));
```

### Server-side filtering, time range and older pages

```tsx
<LogViewer
  manual
  entries={page.entries}
  counts={page.counts}
  total={page.total}
  ranges={LOG_RANGES}
  defaultRange="1h"
  onFilterChange={(f) => refetch({ levels: f.levels, q: f.query, since: f.since })}
  hasOlder={page.hasOlder}
  onLoadOlder={() => fetchOlder(page.entries[0]?.id)}
/>
```

### Live tail with pause

```tsx
<LogViewer entries={entries} streaming liveTail onLiveChange={(live) => (live ? socket.resume() : socket.pause())} />
```

While paused the list holds still, the footer reads "Paused · 12 new entries" and a button resumes and jumps to
the newest entry.

### Extra control

```tsx
<LogViewer entries={entries} toolbar={<Select items={services} value={service} onValueChange={setService} />} />
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Toolbar, then the list |
| `Up` / `Down` | Move the selected row |
| `Home` / `End` | First row / last row and resume following |
| `PageUp` / `PageDown` | Move by a page |
| `Enter` | Open the detail panel |
| `Esc` | Close the detail panel |

- The list is `role="log"`; the selected row is exposed with `aria-activedescendant`.
- Level chips are toggle buttons with counts in their names. Level is always text, not colour alone.
- An invalid regex shows an inline message and does not clear the list.

## RTL & i18n

- The surface is `dir="ltr"`: timestamps, sources and messages are code. The toolbar labels are translated.
- Timestamps use Latin digits and a fixed width so columns line up in any locale.
- Built-in Arabic strings; override with `labels`.

## Styling & tokens

- Level colours: `text-nq-danger-text`, `-warning-text`, `-info-text`, `-success-text`, `text-muted-foreground`. Selection `bg-nq-selected`, hover `bg-nq-hover`, matches `bg-nq-warning-soft`.
- Slots: `log-viewer`, `log-viewer-toolbar`, `log-viewer-list`, `log-viewer-row`, `log-viewer-detail`.

## Do / Don't

- **Do** give every entry a stable `id`.
- **Do** cap the number of entries you keep in memory for very long sessions.
- **Don't** log secrets; the viewer shows exactly what you pass.
- **Don't** rely on wrapped rows: rows are one line, and the detail panel shows the full text.

## Related

- [Terminal](../terminal/README.md) · [DeployView](../deploy-view/README.md) · [DataTable](../data-table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-monitoring-log-viewer--docs

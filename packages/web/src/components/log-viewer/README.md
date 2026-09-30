---
name: log-viewer
title: LogViewer
category: developer
status: stable
summary: Virtualised log stream with level filters and counts, timestamps, search with highlights and regex, follow tail, detail panel, copy and download.
exports: [LogViewerLabels, LogViewerProps, LogViewer, compileMatcher, countByLevel, entryText, filterLogs, formatLogTime, LOG_LEVELS, LogEntry, LogLevel, LogTimeOptions, logsToText, normalizeLevel, virtualWindow]
related: [terminal, deploy-view, data-table]
story: components-developer-log-viewer
base-ui: []
keywords: [logs, log, viewer, level, filter, search, timestamp, tail, follow, virtualised, stream, debug, error]
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
| `labels?` | `Partial<LogViewerLabels>` | built-in en/ar | Translations. |

Helpers: `filterLogs`, `compileMatcher`, `countByLevel`, `formatLogTime`, `normalizeLevel` (maps `WARNING`, `err`,
`critical` onto the six levels), `logsToText`, `virtualWindow`. All pure.

## Examples

### Parse and normalise your own lines

```tsx
const entries = raw.map((l, i) => ({ id: i, time: l.ts, level: normalizeLevel(l.severity) ?? "info", message: l.text }));
```

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

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-log-viewer--docs

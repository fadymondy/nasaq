---
name: report-editor
title: Report editor
category: editors
status: beta
summary: A block based report editor for headings, rich text, key figures, charts, tables and callouts, with a live preview and a read only print friendly report viewer.
exports: [ReportEditor, ReportEditorProps, ReportViewer, ReportViewerProps, ReportChart, ReportChartProps]
related: [repeater, rich-text-editor, chart, stat-card, content-table-editor, presentation-editor]
story: components-editors-report-editor
keywords: [report, document, blocks, editor, charts, metrics, table, preview, print, viewer, pdf]
---

# Report editor

Write a report as a stack of blocks. Each block edits in a collapsible, reorderable row (built on `Repeater`); Preview
shows the finished report through `ReportViewer`, which you can also use alone to show a saved report.

## When to use

- Periodic reports that mix words, numbers and charts: monthly summaries, client updates.

## When not to use

- Free writing without structure: use `RichTextEditor`.
- Slides: use `PresentationEditor`.

## Import

```tsx
import { ReportEditor, ReportViewer } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ReportEditor defaultValue={{ title: "May summary", blocks: [] }} onSave={async (report) => { await api.save(report); }} />

<ReportViewer report={saved} />
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value`, `defaultValue`, `onValueChange` | `Report` | empty | Title, subtitle, author, date and blocks. |
| `onSave` | `(report) => Promise<void \| { error?: string }>` | none | Adds Save and the unsaved state. |
| `onPrint` | `() => void` | `window.print()` | Print button in the preview. |
| `defaultView` | `"edit" \| "preview"` | `"edit"` | Start tab. |
| `readOnly` | `boolean` | `false` | Shows the viewer only. |
| `labels`, `className` | | | English and Arabic built in. |

`ReportViewer` props: `report`, `showToc` (default when two or more headings), `onPrint`, `hidePrint`, `labels`, `className`.
`ReportChart` draws a chart block (bars, lines or area) mirrored for RTL.

Blocks: `heading` (level 1 to 3), `text` (HTML from the rich text editor), `metrics` (labels, values, change, currency), `chart`, `table`, `callout` (info, success, warning, danger) and `divider`. Switching the type of a block keeps its text.

## Behaviour

- Blocks with no content show a badge and a count in the toolbar; nothing stops saving.
- Numbers typed in Arabic digits are understood.
- The viewer hides its Print button on paper, and keeps charts, tables, figures and callouts from splitting across pages. Printing uses the browser print of the whole page, so place the viewer on a page of its own for a clean result.

## Accessibility

Charts are images with a summary label (title, type, number of points). The contents list links to headings. Callouts use `role="note"`.

## RTL

Charts flip their axes, the contents indent from the reading start, and numbers, dates and currency codes stay left to right.

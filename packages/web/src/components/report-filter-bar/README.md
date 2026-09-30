---
name: report-filter-bar
title: ReportFilterBar
category: analytics
status: beta
summary: The controls around a report, a period and filter bar that lives in the URL, saved views that can be renamed and shared, a print-ready report sheet and an export menu for PDF and Markdown.
exports: [ReportFilterBarLabels, ReportFilterField, UseReportFiltersOptions, ReportFiltersApi, useReportFilters, ReportFilterBarProps, ReportFilterBar, SavedReportViewsProps, SavedReportViews, ReportSheetProps, ReportSheet, ReportExportFormat, ReportExportMenuProps, ReportExportMenu]
related: [time-range-picker, data-table, time-series-panel, export-action, chart-extras]
story: components-analytics-report-filter-bar
base-ui: [select, popover, toggle-group, checkbox, dialog, alert-dialog, menu, context-menu]
keywords: [report, filter, saved view, url state, query string, share link, print, pdf, markdown, export, analytics]
---

# ReportFilterBar

Four pieces that turn a page of numbers into a report people can come back to and pass on:

- `useReportFilters` keeps the period and the filters in the address, so a reload, the back button and a pasted link all give the same report.
- `ReportFilterBar` is the control row: a `TimeRangePicker`, select, multi-select and toggle filters, removable chips and a reset.
- `SavedReportViews` names a set of filters. Views can be opened, renamed, updated, shared by link and deleted.
- `ReportSheet` and `ReportExportMenu` give the report a print layout and PDF, Markdown and clipboard export.

## When to use

- Any analytics or business report where the reader chooses a period and slices the numbers.
- A report that will be shared, printed or archived.

## When not to use

- Filtering a single table: use the toolbar of [`DataTable`](../data-table/README.md).
- A dashboard with a fixed period: use [`TimeRangePicker`](../time-range-picker/README.md) alone.
- Exporting rows as CSV or XLSX: use [`ExportButton`](../export-action/README.md). `ReportExportMenu` exports the report as a document.

## Import

```tsx
import { ReportFilterBar, SavedReportViews, ReportSheet, ReportExportMenu, useReportFilters } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { ReportExportMenu, ReportFilterBar, ReportSheet, useReportFilters } from "@fadymondy/nasaq/web";

const fields = [
  { id: "status", kind: "multi", label: "Status", options: [{ value: "open", label: "Open" }, { value: "won", label: "Won" }] },
  { id: "owner", kind: "select", label: "Owner", options: [{ value: "sara", label: "Sara" }, { value: "omar", label: "Omar" }] },
] as const;

export function DealsReport() {
  const filters = useReportFilters({ fields: [...fields], defaultRange: { kind: "relative", preset: "30d" } });
  return (
    <ReportSheet
      title="Deals report"
      toolbar={<ReportExportMenu document={{ title: "Deals report", sections: [] }} />}
    >
      <ReportFilterBar fields={[...fields]} state={filters.state} defaults={filters.defaults} onStateChange={filters.setState} />
      {/* Query with filters.state.range and filters.state.fields */}
    </ReportSheet>
  );
}
```

## Anatomy

```
ReportFilterBar          data-slot="report-filter-bar"
├─ TimeRangePicker       presets, week, custom days, optional comparison
├─ report-filter-field   data-slot="report-filter-field": a label and a Select, a multi-select Popover or a ToggleGroup
├─ reset and live count  "3 filters applied", Reset filters, and your `actions`
└─ report-filter-chips   data-slot="report-filter-chips": a removable chip for each applied choice
SavedReportViews         data-slot="saved-report-views": a chip per view, its "..." button, Save view / Update
ReportSheet              data-slot="report-sheet": title, filters printed as text, generated time, content, footer
ReportExportMenu         a Button that opens a menu: print or PDF, Markdown, copy Markdown
```

## API

### The state

```ts
interface ReportFilterState {
  range: TimeRangeValue;               // see TimeRangePicker
  comparison: "none" | "previous" | "year";
  fields: Record<string, string[]>;    // one entry per field; empty means "all"
}
```

A field is `{ id, kind: "select" | "multi" | "toggle", label, options: { value, label }[], allLabel? }`. `select` and `toggle` hold at most one value. The ids `range` and `compare` are reserved.

### useReportFilters(options)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `fields` | `ReportFilterField[]` | required | The filters. |
| `defaultRange` | `TimeRangeValue` | last 30 days | Range when the URL has none. |
| `defaultComparison` | `TimeComparison` | `"none"` | |
| `defaultFields` | `Record<string, string[]>` | none | Values when the URL has none (a default owner). |
| `params` / `onParamsChange` | `URLSearchParams \| string` / `(params) => void` | none | Controlled mode for a router: read from `params`, write through `onParamsChange`. Your other params are kept. |
| `syncLocation` | `boolean` | `true` without `params` | Read and write the page address. `false` keeps the state in memory (stories, dialogs). |

Returns `state`, `defaults`, `setState`, `setRange`, `setComparison`, `setField(id, values)`, `reset()`, `query` (the query string, empty at the defaults) and `activeCount`. Defaults never appear in the URL, and unknown keys or values that are not options are ignored when it is read.

### ReportFilterBar

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `fields` | `ReportFilterField[]` | required | |
| `state` / `onStateChange` | `ReportFilterState` / `(state) => void` | required | |
| `defaults` | `ReportFilterState` | 30 days, no filters | What reset returns to and what counts as applied. Pass `filters.defaults`. |
| `range` | `false \| Omit<TimeRangePickerProps, ...>` | `{}` | Options for the period picker (`timeZone`, `weekStartsOn`, `now`) or `false` to hide it. |
| `comparison` | `boolean` | `false` | Show "Compare with". |
| `presets` | `RelativePreset[]` | picker default | Relative presets. |
| `actions` | `ReactNode` | none | Extra controls at the end. |
| `labels` | `Partial<ReportFilterBarLabels>` | en / ar | Text overrides. |

### SavedReportViews

| Prop | Type | Description |
| --- | --- | --- |
| `views` | `{ id, name, query, shared? }[]` | The saved views. `query` is what `filters.query` gave when it was saved. |
| `fields`, `state`, `defaults` | | The same as the bar. |
| `onApply` | `(view, next: ReportFilterState) => void` | Set the filters to `next`. |
| `onSave` | `(name, query) => void \| Promise<void>` | Save the current filters as a new view. Throwing shows an error in the dialog. |
| `onRename` `onUpdate` `onDelete` | async callbacks | Each action is offered only when its callback is given. |
| `onShare` | `(view, shared) => string \| void \| Promise<string \| void>` | Turn sharing on or off. Return the link and it is copied. |
| `activeId` | `string \| null` | The opened view (controlled). By default the last opened view, or the one whose filters match. |

A view that was opened and then changed shows "Changed" and offers "Update with current filters" and "Save as new view". Names are trimmed and made unique ("Weekly (2)").

### ReportSheet

`title`, `subtitle`, `filters` (`{ label, value }[]` printed under the title), `generatedAt`, `timeZone`, `toolbar` (screen only), `footer`, `children`. When printed, everything else on the page is hidden, the frame is dropped, `<section>`, table rows and figures do not split across pages and colours are kept. Put `data-print-hide` or `print:hidden` on anything that must stay off paper.

### ReportExportMenu

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `document` | `ReportDoc \| () => ReportDoc` | required | The report as data: `{ title, subtitle?, filters?, generatedAt?, sections: [{ heading?, text?, stats?, table? }] }`. |
| `filename` | `string` | the title | Without extension. |
| `formats` | `("pdf" \| "markdown" \| "copy")[]` | all three | |
| `onPrint` | `() => void \| Promise<void>` | `window.print()` | Replace the browser dialog, for example to fetch a server made PDF. |
| `onExported` | `(format) => void` | none | |

### Helpers

`reportFiltersToQuery(state, fields, defaults)`, `reportFiltersFromQuery(input, fields, defaults)`, `activeFilterCount`, `sameReportFilters`, `emptyReportFilters`, `savedViewMatches`, `savedViewState`, `uniqueViewName`, `isValidViewName`, `reportToMarkdown(doc)`, `markdownCell`. All pure.

## Examples

Controlled by a router:

```tsx
import { ReportFilterBar, useReportFilters } from "@fadymondy/nasaq/web";
import { useSearchParams } from "react-router";

export function Report({ fields }: { fields: Parameters<typeof useReportFilters>[0]["fields"] }) {
  const [params, setParams] = useSearchParams();
  const filters = useReportFilters({ fields, params, onParamsChange: setParams });
  return <ReportFilterBar fields={fields} state={filters.state} defaults={filters.defaults} onStateChange={filters.setState} />;
}
```

Saved views:

```tsx
import { SavedReportViews, type SavedReportView, type ReportFiltersApi } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Views({ filters }: { filters: ReportFiltersApi }) {
  const [views, setViews] = useState<SavedReportView[]>([]);
  return (
    <SavedReportViews
      views={views}
      fields={filters.fields}
      state={filters.state}
      defaults={filters.defaults}
      onApply={(_, next) => filters.setState(next)}
      onSave={(name, query) => setViews((v) => [...v, { id: crypto.randomUUID(), name, query }])}
      onDelete={(view) => setViews((v) => v.filter((x) => x.id !== view.id))}
    />
  );
}
```

A Markdown export:

```tsx
import { ReportExportMenu } from "@fadymondy/nasaq/web";

export const Export = () => (
  <ReportExportMenu
    filename="q3-profit"
    document={() => ({
      title: "Profitability",
      filters: [{ label: "Period", value: "Q3 2026" }],
      sections: [{ heading: "By project", table: { columns: ["Project", "Margin"], rows: [["Alpha", "31%"], ["Beta", "18%"]] } }],
    })}
  />
);
```

## Accessibility

The bar is a `group` named "Report filters". Every filter has a visible label tied to its control, and the applied count is announced in a polite live region when it changes. Chips have remove buttons that name the filter. Saved views are a list of toggle buttons (`aria-pressed`); each view opens its menu from a context-click, Shift+F10, the Menu key, a long press on touch or its "..." button. Rename and save use a dialog that traps focus and returns it, delete asks first, and export and link results are announced.

## RTL & i18n

Rows, chips and menus follow the reading direction; the reset icon and the picker's arrows are mirrored. English and Arabic text ship built in; override with `labels`. Numbers, currency and dates use Western digits and are bidi isolated. The Markdown export keeps the text as given, so write labels in the language of the reader.

## Styling & tokens

Uses Card, Badge, Button, Select, Popover, ToggleGroup and Dialog tokens; the sheet uses `bg-card`, `border-border` and text tokens. Target `[data-slot="report-filter-bar"]`, `[data-slot="saved-report-views"]`, `[data-slot="report-sheet"]`; extend with `className`. The print styles are scoped to the sheet and use no colours of their own.

## Do / Don't

- Do put the period and filters in the URL with `useReportFilters`; it is what makes a report shareable.
- Do print the filters in the sheet, so a paper copy says what it covers.
- Do give `filename` and a `ReportDoc` builder that reads current data.
- Don't reuse the ids `range` and `compare` for fields.
- Don't share a view as its query only in emails; the link should open the report.

## Related

- [`TimeRangePicker`](../time-range-picker/README.md)
- [`DataTable`](../data-table/README.md)
- [`ExportButton`](../export-action/README.md)
- [`TimeSeriesPanel`](../time-series-panel/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-report-filter-bar--docs

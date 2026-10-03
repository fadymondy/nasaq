---
name: export-action
title: ExportButton
category: files
status: beta
summary: A button or menu that exports table data as CSV, XLSX or JSON, and PDF through a callback, with column choice, a rows scope of selected, filtered or all, a progress state and pure serializers with no dependency.
exports: [ExportActionLabels, ExportFormat, ExportScope, ExportColumn, ExportScopeSource, ExportRequest, ExportFile, ExportActionProps, saveExportBlob, ExportDialogProps, ExportDialog, ExportButton]
related: [data-table, entity-list, share-action, page-actions]
story: components-files-export-button
keywords: [export, download, csv, xlsx, excel, json, pdf, report, columns, scope, progress]
---

# ExportButton

The "Export" action of a list or a report. It opens a dialog where the user picks a format, which rows (the
selection, the current filter or everything) and which columns, then builds the file in the browser with a
progress state and a cancel button. The serializers are pure functions you can also use without the UI.

## When to use

- Letting people take table data out as CSV, Excel or JSON.
- Exporting rows that live on the server: give a scope a `load` function.
- Adding PDF by handing the component your own PDF builder.

## When not to use

- Downloading one known file: use a plain link or a `Button`.
- Sharing a link or inviting people: use [`ShareButton`](../share-action/README.md).
- Printing a page: call `window.print()` from a [`PageActions`](../page-actions/README.md) button.

## Import

```tsx
import { ExportButton, toCsv, toXlsx } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ExportButton, type ExportColumn } from "@fadymondy/nasaq/web";

type Row = { id: string; name: string; email: string };

const columns: ExportColumn<Row>[] = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
];

export function Toolbar({ all, filtered, selected }: { all: Row[]; filtered: Row[]; selected: Row[] }) {
  return <ExportButton columns={columns} scopes={{ selected, filtered, all }} filename="contacts" />;
}
```

## Anatomy

```
ExportButton                  data-slot="export-button"    (or a menu when mode="menu")
└─ ExportDialog               data-slot="export-dialog"
   ├─ format cards            CSV, Excel, JSON (+ PDF with onExportPdf)
   ├─ rows scope              radios with row counts
   ├─ columns                 checkboxes with select all
   ├─ progress                data-slot="export-progress"  Progress + Cancel
   └─ result                  data-slot="export-done"      Download again / Done
```

## API

**ExportButton** (`ExportActionProps<T>`)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `columns` | `ExportColumn<T>[]` | | `{ id, label, value? }`. `value(row)` gives the cell, else `row[id]`. |
| `scopes` | `{ selected?, filtered?, all? }` | | Each is `T[]` or `{ count, load() }` for server rows. A scope with no rows is disabled; a missing scope is hidden. |
| `formats` | `("csv" \| "xlsx" \| "json" \| "pdf")[]` | `csv, xlsx, json` | `pdf` only appears when `onExportPdf` is given. |
| `defaultFormat` / `defaultScope` | | first available | Starting choices. |
| `filename` / `sheetName` | `string` | `"export"` | File name without extension; XLSX sheet name. |
| `onExportPdf` | `(request, { signal, onProgress }) => Promise<Blob \| void>` | | Builds the PDF. Return a Blob to download it, or nothing if you delivered it yourself. |
| `onDownload` | `(file) => void \| Promise` | browser download | Replace the download (save dialog, upload to storage). |
| `onComplete` | `(file) => void` | | Called after the file is handed over. |
| `mode` | `"dialog" \| "menu"` | `"dialog"` | `menu` lists formats that export at once, plus "Export options…". |
| `children` / `variant` / `size` / `disabled` / `className` | | `Export`, `secondary`, `sm` | The trigger button. |
| `labels` | `Partial<ExportActionLabels>` | | Override any string. |

**ExportDialog** takes the same props plus `open` and `onOpenChange`, for opening it from your own control.

**Serializers** (pure, no DOM): `toCsv(rows, { delimiter, newline, bom, guardFormulas })`, `csvField`, `toJson(records)`,
`toXlsx(rows, { sheetName, rtl })`, `zipStore`, `crc32`, `buildExportFile({ format, columns, rows, onProgress, signal })`.

## Examples

**Server rows behind a scope**

```tsx
<ExportButton
  columns={columns}
  scopes={{ all: { count: 12840, load: () => api.listAllContacts() } }}
  filename="all-contacts"
/>
```

**PDF through a callback**

```tsx
<ExportButton
  columns={columns}
  scopes={{ all: rows }}
  onExportPdf={async (request, { signal, onProgress }) => {
    const res = await fetch("/api/pdf", { method: "POST", body: JSON.stringify(request.rows), signal });
    onProgress(1);
    return res.blob();
  }}
/>
```

**CSV outside the UI**

```ts
import { toCsv } from "@fadymondy/nasaq/web";

const csv = toCsv([["Name", "Note"], ["Sara", "=1+1"]], { bom: true }); // "=1+1" is exported as text
```

## Accessibility

- The dialog traps focus and closes with Escape (not while a file is being built; use Cancel).
- Formats and rows are radio groups with their own legends; columns are checkboxes with a select-all that shows the mixed state.
- The progress bar has an accessible name; the result line is a `role="status"` live region.
- Formula-like text (`=`, `+`, `-`, `@`) is prefixed so a spreadsheet does not run it.

## RTL & i18n

- Strings ship in English and Arabic. CSV gets a UTF-8 BOM so Excel reads Arabic; XLSX sheets are right-to-left in Arabic.
- File names and counts stay left-to-right inside `<bdi dir="ltr">`; numbers follow the locale.

## Styling & tokens

- Built from `Button`, `Dialog`, `RadioGroup`, `Checkbox`, `Progress` and `Alert`; use their tokens. Extend with `className`.

## Do / Don't

- Do give `value` for columns whose cell is not a plain field (dates, joined tags).
- Do use `load` for large or remote scopes so the rows are fetched only when chosen.
- Don't pass rendered React nodes as cell values; return text or numbers.
- Don't rely on PDF without `onExportPdf`.

## Related

- [`DataTable`](../data-table/README.md)
- [`EntityList`](../entity-list/README.md)
- [`ShareButton`](../share-action/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-files-export-button--docs

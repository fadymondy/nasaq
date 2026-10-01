---
name: import-wizard
title: ImportWizard
category: files
status: beta
summary: A four step wizard that imports rows from a CSV or pasted text. It maps columns to fields, previews and validates rows, then commits the valid ones.
exports: [ImportWizard, ImportWizardProps, ImportWizardLabels, ImportResult, ImportField, ImportFieldType, ColumnMapping, IssueCode, RowIssue, ParsedRow, ParsedCsv, parseCsv, detectDelimiter, guessMapping, checkType, buildRows, unmappedRequired, summarize]
related: [file-upload, stepper, table, progress]
story: components-files-import-wizard
base-ui: [checkbox, select]
keywords: [import, csv, upload, column mapping, preview, validation, spreadsheet, bulk, contacts]
---

# ImportWizard

Upload, map, review, import. Parsing and validation run in the browser with no dependencies; your
`onImport` only receives rows that passed.

## When to use

- Bulk creating contacts, products or any records from a spreadsheet.

## When not to use

- A single file with no mapping: use `Dropzone`.
- Excel workbooks directly: save as CSV first; XLSX parsing is not built in.

## Import

```tsx
import { ImportWizard } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ImportWizard
  fields={[
    { key: "name", label: "Name", required: true },
    { key: "email", label: "Email", type: "email", required: true },
  ]}
  uniqueKey="email"
  onImport={async (rows) => api.import(rows)}
/>
```

## Anatomy

```
ImportWizard         data-slot="import-wizard"
├─ Stepper           Upload, Map columns, Review, Import
├─ Upload            Dropzone, paste box, template download
├─ Map               one Select per field, guessed from headers and aliases
├─ Review            counts, issues by line, "skip invalid rows" Checkbox, Table preview
└─ Import            Progress, result counts and per line failures
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `fields` | `ImportField[]` | required | `{ key, label, type?, required?, aliases? }`. Types: text, email, phone, number, date, url. |
| `onImport` | `(rows) => Promise<ImportResult \| void>` | required | Return `{ imported, failed?, error? }`. |
| `uniqueKey` | `string` | none | Field whose repeats are flagged as duplicates. |
| `maxRows` | `number` | `5000` | Row limit. |
| `maxSize` | `number` | 5 MB | File size limit in bytes. |
| `onDone` | `() => void` | none | Called from the last step. |
| `labels` | `ImportWizardLabels` | en / ar | Every string. |

## Examples

- **Aliases**: `aliases: ["e-mail", "البريد"]` lets the header guess match Arabic and variant headers.

## Accessibility

The Stepper marks the current step; each mapping Select has a label; issues are text with line numbers.

## RTL & i18n

English and Arabic built in. Cell values and file names render left-to-right in their own isolate.

## Styling & tokens

Uses `Table`, `Progress`, `Alert` and `Badge` tokens; nothing custom.

## Do / Don't

- Do validate again on the server; the browser check is a convenience.
- Do not promise other sources (vCard, Google, WhatsApp) here: only CSV, TSV and pasted text are supported.

## Related

- [Dropzone](../file-upload/README.md)
- [Stepper](../stepper/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-files-import-wizard--docs

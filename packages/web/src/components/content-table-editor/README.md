---
name: content-table-editor
title: Content table editor
category: editors
status: beta
summary: An editable table for structured content with typed columns, cell editing by keyboard, sorting, search, undo and redo, footer totals, validation, CSV export and a save state.
exports: [ContentTableEditor, ContentTableEditorProps]
related: [data-table, repeater, report-editor, rich-text-editor]
story: components-editors-content-table-editor
keywords: [table, spreadsheet, grid, editor, cells, columns, inline edit, csv, content, cms, sort, undo]
---

# Content table editor

A spreadsheet-like grid for content people maintain by hand: a price list, a glossary, a schedule. Columns have
types (text, number, select, date, checkbox, link, tags), cells edit in place, and the whole thing works from the keyboard.

## When to use

- A table people fill in and correct: many short rows with the same fields.
- You need sorting, search, totals and CSV without building a form per row.

## When not to use

- Read-only tables of records: use `DataTable`.
- Long rich text per row: use `RichTextEditor` in a form.
- A few repeated form groups: use `Repeater`.

## Import

```tsx
import { ContentTableEditor } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ContentTableEditor
  defaultValue={{
    columns: [
      { id: "name", label: "Name", type: "text", required: true },
      { id: "price", label: "Price", type: "number" },
    ],
    rows: [{ id: "r1", cells: { name: "Coffee", price: 12 } }],
  }}
  onSave={async (value) => {
    await api.save(value);
  }}
/>
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value`, `defaultValue`, `onValueChange` | `ContentTableValue` | empty | Columns and rows. Controlled or not. |
| `onSave` | `(value) => Promise<void \| { error?: string }>` | none | Adds a Save button and the saved, unsaved and failed states. |
| `onExport` | `(csv) => void` | download | Receives the CSV text. Without it the browser downloads `content-table.csv`. |
| `readOnly` | `boolean` | `false` | Show cells but refuse edits. |
| `editableColumns` | `boolean` | `true` | Add, rename, retype, reorder and delete columns. |
| `searchable` | `boolean` | `true` | The search box. |
| `label`, `toolbar`, `maxHeight`, `className` | | | Grid name, extra toolbar content, scroll height. |
| `labels` | `ContentTableLabels` | localised | English and Arabic built in; overrides any string. |

## Behaviour

- Arrow keys move between cells, Enter or F2 or typing starts editing, Enter or Tab commits, Escape cancels, Delete clears a cell.
- Ctrl or Cmd plus Z and Y undo and redo (50 steps). Deleting rows is undone the same way, so there are no confirm dialogs.
- Header menus sort (empty cells always last), edit, move and delete columns. Row menus insert, duplicate, move and delete.
- Required and link columns show an error on the cell and a count in the toolbar.
- Numbers accept Arabic digits and separators.

## Shared editors

The text and option-list cell editors live in `data-table/cell-editors.tsx` and are shared with DataTable's in-cell edit. This component's props and behaviour are unchanged.

## Accessibility

The grid has `role="grid"` with a roving tab stop, `aria-sort` on sorted headers, and a polite live region for changes. Errors are text plus an icon, not colour alone.

## RTL

Arrow keys mirror, sticky columns and menus use logical sides, and numbers, dates and links stay left to right inside their cells.

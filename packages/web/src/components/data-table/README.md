---
name: data-table
title: Data Table
category: data-display
status: beta
summary: The interactive layer on top of Table. A useDataTable hook plus opt-in pieces for sorting, search, facet filters, column visibility, selection with bulk actions, row actions, keyboard navigation, pagination, and loading, empty and error states.
exports: [DataTableSortDirection, DataTableSort, DataTableColumn, DataTableRowAction, UseDataTableOptions, DataTableInstance, DataTableLabels, useDataTable, DataTableProps, DataTable, DataTableToolbar, DataTableSearchProps, DataTableSearch, DataTableFacetOption, DataTableFacetFilterProps, DataTableFacetFilter, DataTableViewOptions, DataTableBulkActionsProps, DataTableBulkActions, DataTablePagination, DataTableActions, DataTableAction, DataTableActionsProps, DataTableCellEdit, DataTableCustomEditContext, DataTableCellEditResult, DataTableEditOption, DataTableCellValue]
related: [table, checkbox, states, dropdown-menu, page-actions, status]
story: components-data-display-data-table
base-ui: [menu, checkbox]
keywords: [data table, datagrid, grid, table, sort, sorting, filter, facet, search, pagination, paging, selection, bulk actions, row actions, columns, visibility, keyboard, server-side]
---

# Data Table

`Table` plus behaviour. It looks exactly like `Table`: same rows, borders, hover and selected tint.
`useDataTable` holds the state (sort, search, filters, page, selection, hidden columns) and returns a
`table` instance. You pass that instance to whichever pieces you need.

Every capability is opt-in. A table with only sortable columns has no toolbar, no checkboxes and no pager.

| You want | Add |
| --- | --- |
| Sorting | `sortValue` on a column |
| Search | `searchValue` on columns + `<DataTableSearch>` |
| Filter by value | `filterValue` on a column + `<DataTableFacetFilter>` |
| Show/hide columns | `<DataTableViewOptions>` (`hideable: false` to pin a column) |
| Selection | `selectable: true` (+ `<DataTableBulkActions>` for actions on the selection) |
| Row menu | `rowActions` on `<DataTable>` |
| Open a row | `onRowClick` on `<DataTable>` |
| Paging | `pageSize` + `<DataTablePagination>` |
| States | `loading`, `error` + `onRetry`, `empty` on `<DataTable>` |

## When to use

- Lists that people work through: issues, invoices, members, apps, time entries.
- Any table that needs to sort, filter, select or page.

## When not to use

- Read-only rows with nothing to do: use `Table` directly. It is lighter.
- Spreadsheet editing (cell focus, inline editing): out of scope.
- Very large lists (thousands of rows client-side): paginate on the server with `manual`.

## Import

```tsx
import {
  DataTable, DataTableFacetFilter, DataTablePagination, DataTableSearch,
  DataTableToolbar, DataTableViewOptions, useDataTable, type DataTableColumn,
} from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const columns: DataTableColumn<Issue>[] = [
  { id: "key", header: "Key", cell: (r) => r.key, sortValue: (r) => r.key, searchValue: (r) => r.key, hideable: false },
  { id: "title", header: "Title", cell: (r) => r.title, sortValue: (r) => r.title, searchValue: (r) => r.title },
  { id: "status", header: "Status", cell: (r) => <Status tone={tone(r)}>{r.status}</Status>, filterValue: (r) => r.status },
  { id: "due", header: "Due", cell: (r) => format(r.due), sortValue: (r) => r.due, align: "end" },
];

function Issues({ issues }: { issues: Issue[] }) {
  const table = useDataTable({ data: issues, columns, getRowId: (r) => r.key, pageSize: 20, selectable: true });
  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder="Search issues…" />
        <DataTableFacetFilter table={table} column="status" options={statusOptions} />
        <DataTableViewOptions table={table} />
      </DataTableToolbar>
      <DataTable
        table={table}
        label="Issues"
        onRowClick={(r) => navigate(`/issues/${r.key}`)}
        rowActions={(r) => [
          { id: "edit", label: "Edit", icon: Pencil, onSelect: () => edit(r) },
          { id: "delete", label: "Delete", icon: Trash2, danger: true, group: "danger", onSelect: () => remove(r) },
        ]}
      />
      <DataTablePagination table={table} />
    </div>
  );
}
```

Define `columns` outside the component, or wrap it in `useMemo`.

## Anatomy

```
DataTableToolbar            search · facet filters · View (pushed to the inline end)
  or DataTableBulkActions   "3 selected" · your buttons · ✕ (swap it in while table.selection.size > 0)
DataTable                   ☐ | sortable headers ↕ | … | ⋯ row actions
DataTablePagination         "1–20 of 143"  ‹ ›
```

## API

### `useDataTable(options)`

| Option | Type | Notes |
| --- | --- | --- |
| `data`, `columns`, `getRowId` | | Required. |
| `pageSize` | `number` | Omit for no pagination. |
| `selectable` | `boolean` | Adds the checkbox column. |
| `density`, `frame`, `bordered`, `striped`, `hover` | see [`Table`](../table/README.md) | Table style, passed straight to `Table`. Default: `density="default"`, hover on. |
| `defaultSort` | `DataTableSort \| null` | `{ id, direction }`. |
| `sort`, `query`, `filters`, `page`, `selection`, `hidden` | `{ value, onChange }` | Control any piece of state (URL params, server). |
| `manual`, `rowCount` | `boolean`, `number` | `data` is already sorted, filtered and paged by the server. |

It returns a `DataTableInstance`: `rows` (what to render), `rowCount`, `sort`/`toggleSort`, `query`/`setQuery`,
`filters`/`setFilter`/`resetFilters`, `isFiltered`, `page`/`setPage`/`pageCount`, `hidden`/`toggleColumn`,
`selection`/`selectedRows`/`toggleRow`/`togglePage`/`setSelection`.

Any change to sort, search or filters goes back to page 1. Search is case-insensitive and folds Arabic
(أ/إ/آ → ا, ة → ه, ى → ي, no tashkeel), so "مراجعه" finds "مراجعة". Sorting uses `Intl.Collator` with
numeric ordering, is stable, and puts empty values last.

### `DataTableColumn<T>`

`id`, `header`, `cell` (required). `label` (a plain-text name when `header` is not a string), `sortValue`,
`searchValue`, `filterValue`, `align` (`start` · `end` · `center`), `hideable` (default true), `defaultHidden`,
`className`, `headerClassName`.

### `<DataTable>`

| Prop | Notes |
| --- | --- |
| `table`, `label` | Required. `label` is the table's accessible name. |
| `rowLabel` | A row's name for "Select MH-728" / "Actions for MH-728". Defaults to the id. |
| `onRowClick` | Click, or Enter on the focused row. Ignores clicks on controls inside the row. |
| `rowActions` | `(row) => DataTableRowAction[]`: `{ id, label, icon?, onSelect, danger?, disabled?, group? }`. |
| `loading` | Skeleton rows and `aria-busy`. |
| `error`, `onRetry` | Replaces the body with `ErrorState`. |
| `empty` | Shown when there is no data. When filtering leaves no rows, "No matching results" with **Clear filters** is shown instead. |
| `labels` | Override any built-in string. |

### Pieces

- `DataTableToolbar`: a flex row. Put the controls in it.
- `DataTableSearch`: `table`, `placeholder`. Esc clears it.
- `DataTableFacetFilter`: `table`, `column`, `options: { value, label, icon? }[]`, `title?`. A dashed button
  when empty. Shows one chosen label, or the count.
- `DataTableViewOptions`: the column checklist. The last visible column cannot be hidden.
- `DataTableBulkActions`: `table` + your buttons. Hidden when nothing is selected. It includes the count and
  a clear button.
- `DataTablePagination`: renders nothing when there is only one page.

## Examples

**Sort only.** `useDataTable({ data, columns, getRowId, defaultSort: { id: "due", direction: "asc" } })` and
`<DataTable table={table} label="Issues" />`. No other pieces are needed.

**Server-side.**

```tsx
const [sort, setSort] = useState<DataTableSort | null>(null);
const [page, setPage] = useState(0);
const { data, total } = useIssues({ sort, page });
const table = useDataTable({
  data, columns, getRowId, pageSize: 20, manual: true, rowCount: total,
  sort: { value: sort, onChange: setSort }, page: { value: page, onChange: setPage },
});
```

See the lab for all states: Default, SortOnly, States.

## Context menu, table actions and in-cell edit

**Context menu.** `rowActions` also open as a context menu at the pointer on right-click, and at the row on Shift+F10 or the Menu key. Escape returns focus to the row. Inputs, links and Shift+right-click keep the browser's own menu. Pass `contextMenu={false}` to opt out; without `rowActions` nothing changes. It is the shared `ContextMenuActions` from the context-menu component.

**Table actions.** `<DataTableActions actions={[...]} />` in the toolbar: one `primary` button, secondary buttons, an `overflow` group in a ⋯ menu, `iconOnly` for refresh, `loading` for a spinner. Below the `sm` breakpoint the secondary buttons fold into the menu. It sits next to `DataTableBulkActions`, which replaces the toolbar while rows are selected.

**In-cell edit.** Give a column `edit: { type, value, options, validate, disabled, label, render }` and the table an `onCellEdit(row, columnId, value)`. Types: `text` (default), `number`, `select`, `date`, `switch` (toggles in place) and `custom` (`render` gets `commit`/`cancel`/`error`).

| Key | Action |
| --- | --- |
| Enter, F2, double-click | Start editing (typing a character also starts, replacing the value) |
| Enter | Save and move down |
| Tab / Shift+Tab | Save and move to the next / previous editable cell |
| Esc | Cancel and return focus to the cell |

`validate` runs first and keeps the editor open with its message. `onCellEdit` may return `{ error }` or throw: the cell shows the new value with a spinner while pending, then rolls back and shows the message. Update your data before it resolves. Editors are shared with ContentTableEditor (`cell-editors.tsx`). Numbers accept Arabic-Indic digits.

## Accessibility

- A real `<table>` with `aria-label`. Sorted headers set `aria-sort`, and each sortable header is a button.
- Rows use a roving tabindex, so Tab enters the table once. **↑ ↓ Home End** move between rows. **Enter** opens
  the row (`onRowClick`). **Space** toggles selection. **Shift+F10** or the context-menu key opens the row menu.
- The row checkbox and ⋯ button are only in the tab order on the active row.
- The ⋯ appears on hover, on focus, on selected rows, and always on touch screens.
- The header checkbox reports `mixed` when only part of the page is selected.
- Selection count and page range are live text. Loading sets `aria-busy`.

## RTL & i18n

- Built-in strings in English and Arabic, chosen from the Nasaq locale. Override them with `labels`.
- Columns follow the reading direction. `align: "end"` means the inline end, and the ⋯ sits at the inline end.
- Pager chevrons mirror in RTL. Numbers use Latin digits (the Nasaq numeral rule).
- Localise `label`, headers and `rowLabel` yourself.

## Styling & tokens

Rows are the `Table` rows: `hover:bg-nq-hover`, and selected rows use `bg-nq-selected` with `data-state="selected"`.
The bulk bar uses `bg-nq-selected`. Toolbar controls use `h-control-sm`. Pass `className` to the table,
or set `className`/`headerClassName` on a column for widths (`w-24`).

## Do / Don't

- **Do** turn on only what the screen needs. A settings list rarely needs search, and a five-row table never needs paging.
- **Do** give every column a stable `id`. It keys sort, filter and visibility state.
- **Don't** put a primary action inside `rowActions` only. If opening the row is the main action, use `onRowClick`.
- **Don't** hide the column that names the row. Set `hideable: false` on it.

## Related

`table` (the primitives), `checkbox`, `states` (Empty/Error), `dropdown-menu`, `page-actions`, `status`.

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-data-table--docs

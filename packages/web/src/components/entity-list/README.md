---
name: entity-list
title: EntityList
category: data-display
status: beta
summary: A list of records shown as a DataTable or as a grid of cards with a view toggle, search, multi-value facet filters, bulk select, row actions, loading skeletons, an error state and an empty state. The base for ContactList, CompanyList and ProjectList.
exports: [EntityListLabels, EntityListView, EntityFacet, EntityListContext, EntityListProps, EntityList]
related: [data-table, contact-list, company-list, project-list, export-action]
story: components-data-display-entity-list
keywords: [list, cards, grid, table, records, crm, filter, search, bulk, toggle view]
---

# EntityList

Records that people browse both ways: a dense table to scan and sort, and cards to look at. `EntityList` puts a
`DataTable` and a card grid behind one toolbar (search, facet filters, view toggle) and one selection, so a page
gets both views with the same data, filters and bulk actions. `ContactList`, `CompanyList` and `ProjectList` are
thin wrappers around it.

## When to use

- Building a list of one kind of record that needs a table and a card view.
- Filters on values that can be several per row (tags, members).

## When not to use

- A plain table with no card view: use [`DataTable`](../data-table/README.md).
- Contacts, companies or projects: use the ready-made lists ([`ContactList`](../contact-list/README.md), [`CompanyList`](../company-list/README.md), [`ProjectList`](../project-list/README.md)).

## Import

```tsx
import { EntityList } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { EntityIdentity, EntityList, type DataTableColumn } from "@fadymondy/nasaq/web";

type Person = { id: string; name: string; role: string };

const columns: DataTableColumn<Person>[] = [
  { id: "name", header: "Name", cell: (p) => <EntityIdentity name={p.name} avatarName={p.name} subtitle={p.role} />, sortValue: (p) => p.name, hideable: false },
];

export function People({ people }: { people: Person[] }) {
  return (
    <EntityList
      label="People"
      data={people}
      columns={columns}
      getRowId={(p) => p.id}
      rowLabel={(p) => p.name}
      renderCard={(p) => <EntityIdentity name={p.name} avatarName={p.name} subtitle={p.role} size="lg" />}
    />
  );
}
```

## Anatomy

```
EntityList                    data-slot="entity-list"
├─ toolbar                    search, facet filters, sort (cards), columns (table), view toggle, your `toolbar`
├─ bulk bar                   while rows are selected: count, clear, your `bulkActions`
├─ table view                 DataTable
├─ cards view                 one card per row (checkbox + menu at the inline end)
└─ pagination
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` / `columns` / `getRowId` | | | As for `DataTable`. |
| `label` | `string` | | Accessible name of the list. |
| `renderCard` | `(row) => ReactNode` | | One card's content. |
| `facets` | `EntityFacet<T>[]` | | `{ id, title, options: { value, label, icon? }[], getValues(row) => string[] }`. A row matches when it has any picked value in each facet. |
| `view` / `defaultView` / `onViewChange` / `views` | `"table" \| "cards"` | both, table | The layout and the toggle. One entry in `views` hides the toggle. |
| `pageSize` | `number` | DataTable's | Rows or cards per page. |
| `selectable` / `selection` | | `true` | Checkboxes and bulk bar. |
| `toolbar` | `ReactNode \| (context) => ReactNode` | | Buttons at the inline end, for example export. `context` has `filteredRows`, `selectedRows`, `allRows`. |
| `bulkActions` | `(context) => ReactNode` | | Buttons in the bulk bar. |
| `rowActions` / `onRowClick` / `rowLabel` | | | Row menu, opening a row, the row's plain name. |
| `loading` / `error` / `onRetry` | | | Skeleton table or cards; error state with retry. |
| `empty` | `ReactNode` | | Shown when there is no data at all. |
| `cardMinWidth` / `defaultSort` / `labels` / `className` | | `272` | |

Building blocks for columns and cards: `EntityIdentity`, `TagList`, `PersonCell`, `ActivityCell`, `AvatarStack`, `CardMeta`.

## Examples

**Export the filtered rows**

```tsx
<EntityList
  {...props}
  toolbar={({ filteredRows, selectedRows }) => (
    <ExportButton columns={exportColumns} scopes={{ selected: selectedRows, filtered: filteredRows, all: props.data }} />
  )}
/>
```

## Context menu and table actions

`rowActions` open as a context menu on right-click, Shift+F10 or the Menu key, in the table and on cards (the card's ⋯ button stays). `contextMenu={false}` opts out. `actions` renders `DataTableActions` (primary button, secondary buttons, ⋯ overflow) at the toolbar's inline end, before the `toolbar` slot. `onCellEdit` and column `edit` configs are passed to the table view (see DataTable).

## Accessibility

- The table view is `DataTable`. The card view is a grid of cards with one tab stop: arrow keys, Home and End move focus (swapped in RTL), Enter opens, Space selects, Shift+F10 opens the card menu.
- Every card has a named checkbox and a named menu button. A hidden live region announces the result count after search and filters.
- Skeletons carry `aria-busy`; errors use `role="alert"`.

## RTL & i18n

- English and Arabic strings ship. Cards place the checkbox and menu at the inline end; arrow keys follow the reading direction.
- Emails, domains and keys in your cells should use `<bdi dir="ltr">`.

## Styling & tokens

- Card surfaces use `bg-card`, `border-border`, `nq-hover` and `nq-selected`. Extend with `className`.
- Cards keep their full width. The checkbox and menu sit over the top inline-end corner, so give only the top row of
  `renderCard` room for them with `pe-(--entity-card-controls)`. EntityList sets that variable to the width the
  controls actually need (0 when there are none).

## Do / Don't

- Do give `rowLabel` so checkbox labels read "Select Sara Ali".
- Do keep `columns` and `facets` stable (`useMemo`) for large lists.
- Don't put interactive elements in `renderCard` that compete with `onRowClick`.

## Related

- [`DataTable`](../data-table/README.md)
- [`ExportButton`](../export-action/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-entity-list--docs

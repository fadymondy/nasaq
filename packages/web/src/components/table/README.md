---
name: table
title: Table
category: data-display
status: stable
summary: Styled primitives for a native HTML table (rows, heads, cells, caption, footer) inside a horizontally scrolling container. No sorting, selection or pagination.
exports: [Table, TableProps, TableDensity, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption]
related: [card, badge, status, avatar, numeric, states]
story: components-data-display-table
base-ui: []
keywords: [table, grid, rows, columns, list, data, thead, tbody, tabular]
---

# Table

The presentational parts of a data table. Each export is a thin wrapper over the matching HTML element
(`table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `caption`) with Nasaq row height, borders, hover and
selected states. `Table` wraps the `<table>` in a container that scrolls horizontally inside its own box, so
a wide table never breaks the page layout.

There is no state or behaviour here. You render the rows and handle everything else.

## When to use

- Showing read-only, row-and-column data: issues, invoices, time entries, members.
- Building your own table when you need full control of the markup.

## When not to use

- Interactive data tables (sorting, row selection, pagination, row actions): use [`DataTable`](../data-table/README.md), the interactive layer. It is
  being built on top of these primitives.
- A short list of items with one line each: use a list of `SidebarItem`s or plain rows, not a table.
- Layout of non-tabular content: use the layout primitives (grid/stack), never a table.
- Nothing to show: render [`EmptyState`](../states/README.md) in place of the table, not an empty body.

## Import

```tsx
import {
  Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@fadymondy/nasaq/web";

const rows = [
  { key: "MH-728", title: "هيكل التطبيق v2", status: "قيد التنفيذ", hours: "6.5" },
  { key: "MH-718", title: "خط إنتاج الرموز", status: "مكتملة", hours: "11.25" },
];

export function IssuesTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>المفتاح</TableHead>
          <TableHead>العنوان</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead className="text-end">الساعات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="font-mono text-caption text-muted-foreground" dir="ltr">{r.key}</TableCell>
            <TableCell className="font-medium">{r.title}</TableCell>
            <TableCell><Badge variant="info">{r.status}</Badge></TableCell>
            <TableCell className="text-end tabular-nums">{r.hours}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## Anatomy

```
Table                         data-slot="table-container" (div, overflow-x-auto)
└─ <table>                    data-slot="table"  (props and className go here)
   ├─ TableCaption            data-slot="table-caption"   (caption-bottom)
   ├─ TableHeader             data-slot="table-header"    <thead>
   │  └─ TableRow             data-slot="table-row"
   │     └─ TableHead × n     data-slot="table-head"      <th>
   ├─ TableBody               data-slot="table-body"      <tbody>
   │  └─ TableRow × n         data-slot="table-row"
   │     └─ TableCell × n     data-slot="table-cell"      <td>
   └─ TableFooter             data-slot="table-footer"    <tfoot>
```

## API

All parts forward their remaining props to the underlying element and merge `className`. The style props live
on `Table` and reach every row and cell through context, so you set them once.

| `Table` prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label?` | `string` | none | `aria-label` of the scroll region. Localise it. |
| `density?` | `TableDensity` (`"compact" \| "default" \| "comfortable"`) | `"default"` | Cell padding: `px-2 py-1`, `px-4 py-3`, `px-5 py-4`. |
| `frame?` | `boolean` | `false` | A rounded border and card background around the table, with a tinted header. |
| `bordered?` | `boolean` | `false` | Lines between columns as well as rows. |
| `striped?` | `boolean` | `false` | Every other body row tinted. Header and footer rows are never striped. |
| `hover?` | `boolean` | `true` | Highlight the row under the pointer. |

A selected row (`data-state="selected"`) always wins over the stripe and the hover tint.

| Export | Element | Props type | Notes |
| --- | --- | --- | --- |
| `Table` | `div` > `table` | `TableProps` (`ComponentProps<"table">` plus `label?: string`) | `className` and all props apply to the `<table>`, not the container. `label` becomes the `aria-label` of the scroll container, which is `role="region"` and `tabIndex={0}` (focus ring `--nq-focus`). Base: `w-full caption-bottom border-collapse text-body-sm`. |
| `TableHeader` | `thead` | `ComponentProps<"thead">` | Row bottom border; header rows do not highlight on hover. |
| `TableBody` | `tbody` | `ComponentProps<"tbody">` | Last row has no bottom border. |
| `TableFooter` | `tfoot` | `ComponentProps<"tfoot">` | Top border, `bg-secondary/50`, medium weight. Use for totals. |
| `TableRow` | `tr` | `ComponentProps<"tr">` | Bottom border, `hover:bg-nq-hover` (unless `hover={false}`), `even:bg-secondary/40` when `striped`, `data-[state=selected]:bg-nq-selected`. `data-state="selected"` also sets `aria-selected`. |
| `TableHead` | `th` | `ComponentProps<"th">` | Defaults to `scope="col"` (pass `scope="row"` for row headers). `h-row text-start text-caption font-medium text-muted-foreground`, padding from `density`, no wrap. |
| `TableCell` | `td` | `ComponentProps<"td">` | `h-row align-middle`, padding from `density`, no wrap. |
| `TableCaption` | `caption` | `ComponentProps<"caption">` | Rendered below the table. `text-caption text-muted-foreground`. |

## Examples

### Numbers, keys and a totals row

Numeric columns are `text-end tabular-nums`. Identifiers such as issue keys stay LTR in Arabic with `dir="ltr"`.
For numbers inside Arabic sentences use `Num` from the numeric component.

```tsx
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@fadymondy/nasaq/web";

export function TimeTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>المهمة</TableHead>
          <TableHead className="text-end">الساعات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>هيكل التطبيق</TableCell>
          <TableCell className="text-end tabular-nums">6.5</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>خط إنتاج الرموز</TableCell>
          <TableCell className="text-end tabular-nums">11.25</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>الإجمالي</TableCell>
          <TableCell className="text-end tabular-nums">17.75</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
```

### Status column and assignee

Use [`Status`](../status/README.md) (inline) or [`Badge`](../badge/README.md) (chip) for state, and
[`Avatar`](../avatar/README.md) `size="xs"` for people.

```tsx
import { Avatar, Status, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@fadymondy/nasaq/web";

export function Assignments() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell><Status tone="warning">In review</Status></TableCell>
          <TableCell>
            <span className="flex items-center gap-2">
              <Avatar name="Fady Mondy" size="xs" />
              Fady Mondy
            </span>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
```

### Selected row and caption

Set `data-state="selected"` on a `TableRow` to show the selected background. The state is visual only, so add
`aria-selected` yourself if the table behaves as a grid.

```tsx
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@fadymondy/nasaq/web";

export function Members({ selected }: { selected: string }) {
  const members = ["Nour Adel", "Mona Hany"];
  return (
    <Table>
      <TableCaption>Team members</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => (
          <TableRow key={m} data-state={m === selected ? "selected" : undefined}>
            <TableCell>{m}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Framed, striped and bordered

A table that stands on its own on a busy page can carry its own frame. Stripes help follow a row across a wide
table; column lines help when cells are dense numbers.

```tsx
<Table label="Invoices" frame striped>
  …
</Table>

<Table label="Ledger" frame bordered density="compact">
  …
</Table>
```

### Inside a card with its own actions

When the table shares a card with a header action (as in the App Shell story), the card owns the outer edge.
The default cell padding (`px-4`) already lines up with the card header, so leave `frame` off.

```tsx
import {
  Button, Card, CardAction, CardDescription, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@fadymondy/nasaq/web";

export function RecentIssues() {
  return (
    <Card className="gap-2 pb-1">
      <CardHeader>
        <CardTitle>أحدث المهام</CardTitle>
        <CardDescription>آخر ما تم تحديثه</CardDescription>
        <CardAction>
          <Button size="sm">عرض الكل</Button>
        </CardAction>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العنوان</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>هيكل التطبيق v2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
```

## Accessibility

The parts are native table elements, so screen readers get table, row and column semantics for free.

| Key | Action |
| --- | --- |
| `Tab` | Moves through focusable content inside cells (links, buttons). Rows and cells themselves are not focusable. |

- Add a `TableCaption` (or `aria-labelledby` on `Table`) so the table has a name, and pass `label` to name the scroll region.
- Header cells are `<th scope="col">` by default. Pass `scope="row"` on row headers.
- `TableRow data-state="selected"` sets `aria-selected` as well as the highlight.
- The scroll container is `role="region"` with `tabIndex={0}`, so keyboard users can focus it and scroll columns that
  overflow on small screens. Pass `label` (localised) so the region has a name.
- Localise the caption, header text and any cell labels yourself.

## RTL & i18n

- Alignment uses logical values: `TableHead` is `text-start`. Use `text-end` (never `text-right`) for numeric columns, and `ps-*` / `pe-*` for padding.
- Column order follows `dir`; the first `TableHead` sits on the inline start.
- Identifiers, keys, emails and URLs inside Arabic rows need `dir="ltr"`. Numbers in sentences use `Num` from the numeric component.
- Use `tabular-nums` on numeric cells so digits align.
- The component has no built-in strings.

## Styling & tokens

- Row height `h-row`, separator `border-border`, hover `bg-nq-hover`, selected `bg-nq-selected`, footer `bg-secondary/50`. Header text is `text-muted-foreground`.
- State attribute: `data-state="selected"` on `TableRow`. The `<table>` carries `data-density`, and `data-frame`, `data-bordered`, `data-striped` when on.
- Target parts with `[data-slot=table-row]`, `[data-slot=table-head]`, `[data-slot=table-cell]`, `[data-slot=table-container]`.
- Extend through `className` per part. Do not override colours with raw hex; use the tokens above.

## Do / Don't

- **Do** let a table sit on the surface with a heading above it. The table already has rows, so it does not need a card.
- **Do** use a card only when the table shares it with actions that belong to it (header menu, "View all").
- **Do** end-align and tabulate numbers; keep keys and IDs LTR.
- **Do** pair a state with a label: use `Status` or `Badge`, never a coloured dot alone.
- **Don't** put a table inside a card that has nothing else to say.
- **Don't** hand-tune row height or padding per screen. Use `density` instead.
- **Don't** frame a table that already sits in a card: the card is the frame.
- **Don't** build sorting, selection or pagination on these primitives when [`DataTable`](../data-table/README.md) covers it.

## Related

- [Card](../card/README.md) · [Badge](../badge/README.md) · [Status](../status/README.md)
- [Avatar](../avatar/README.md) · [States](../states/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-table--docs

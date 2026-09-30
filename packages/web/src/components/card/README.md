---
name: card
title: Card
category: layout
status: stable
summary: Bordered surface that groups one unit the user acts on or compares, with header, action, content and footer slots.
exports: [Card, CardHeader, CardTitle, CardTitleProps, CardDescription, CardAction, CardContent, CardFooter]
related: [table, badge, states, app-shell]
story: components-layout-card
base-ui: []
keywords: [card, panel, kpi, metric, container, surface, group]
---

# Card

A container on the `card` surface (level 1) with a border and card radius. It is built from slots:
`CardHeader` (with `CardTitle`, `CardDescription` and an optional `CardAction` on the inline end),
`CardContent` and `CardFooter`. It has no variants and no behaviour.

Nasaq layouts are flat by default. Use a card only when the content is a unit that needs a visible edge.

## When to use

- The item is a unit the user acts on or compares: a KPI, an app in a store grid, a plan in a pricing table.
- The group needs its own actions (header menu, footer buttons) that must visibly belong to it.
- The content sits beside unrelated content in a grid and would otherwise bleed into it.

## When not to use

- A page section, a form, a list or a single table: use whitespace and a heading instead.
- A card inside a card: use a divider or a heading for the sub-group.
- Floating layers (menus, dialogs, sheets): use their own components; they use the overlay surface.
- Filler such as "welcome" cards or decorative widgets: leave the cell empty.
- Nothing to show: use [`EmptyState`](../states/README.md).

## Import

```tsx
import {
  Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  Badge, Button, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@fadymondy/nasaq/web";

export function ProjectSettings() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>إعدادات المشروع</CardTitle>
        <CardDescription>الاسم والظهور والمسؤول الافتراضي.</CardDescription>
        <CardAction>
          <Badge variant="success">نشط</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="text-body-sm text-muted-foreground">
        تجمع البطاقة موضوعًا واحدًا. اجعل إجراءً رئيسيًا واحدًا في التذييل.
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">إلغاء</Button>
        <Button variant="primary">حفظ</Button>
      </CardFooter>
    </Card>
  );
}
```

## Anatomy

```
Card                          data-slot="card"          flex column, gap-4, py-4
├─ CardHeader                 data-slot="card-header"   grid, px-4
│  ├─ CardTitle               data-slot="card-title"
│  ├─ CardDescription         data-slot="card-description"
│  └─ CardAction              data-slot="card-action"   inline end, spans both header rows
├─ CardContent                data-slot="card-content"  px-4
└─ CardFooter                 data-slot="card-footer"   flex, items-center, gap-2, px-4
```

When a `CardAction` is present the header switches to two columns (`1fr auto`). Every part is optional.

## API

Every part is a `div` (`ComponentProps<"div">`), forwards its remaining props and merges `className`.
There are no custom props and no variants.

| Export | data-slot | Default classes |
| --- | --- | --- |
| `Card` | `card` | `flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground` |
| `CardHeader` | `card-header` | `grid auto-rows-min items-start gap-1 px-4`, two columns when a `card-action` child exists |
| `CardTitle` | `card-title` | `text-label text-foreground`. `CardTitleProps` adds `as?: "div" \| "h1" \| … \| "h6"` (default `"div"`). |
| `CardDescription` | `card-description` | `text-body-sm text-muted-foreground` |
| `CardAction` | `card-action` | `col-start-2 row-span-2 row-start-1 self-start justify-self-end` |
| `CardContent` | `card-content` | `px-4` |
| `CardFooter` | `card-footer` | `flex items-center gap-2 px-4` |

## Examples

### Metric card

```tsx
import { Badge, Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@fadymondy/nasaq/web";
import { TrendingUp } from "lucide-react";

export function RevenueCard() {
  return (
    <Card className="max-w-xs gap-2 py-3.5">
      <CardHeader>
        <CardDescription>الإيرادات</CardDescription>
        <CardTitle className="text-h2 leading-tight tabular-nums">$48,210</CardTitle>
        <CardAction>
          <Badge variant="outline">
            <TrendingUp />
            <span dir="ltr">+12.4%</span>
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="text-caption text-muted-foreground">في ارتفاع هذا الشهر</CardFooter>
    </Card>
  );
}
```

Metric cards are denser than content cards (`gap-2 py-3.5`, about 12% shorter). The value gets
`leading-tight`: it is digits, so it doesn't need the tall line-height Arabic text uses, while the label and note
keep theirs. That keeps the number dominant without cramping Arabic.

### KPI grid

```tsx
import { Card, CardDescription, CardHeader, CardTitle } from "@fadymondy/nasaq/web";

const kpis = [
  { label: "المشاريع النشطة", value: "23" },
  { label: "الساعات المسجلة", value: "412" },
];

export function Kpis() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label} className="gap-2 py-3.5">
          <CardHeader>
            <CardDescription>{k.label}</CardDescription>
            <CardTitle className="text-h2 leading-tight tabular-nums">{k.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
```

For currency and other numbers inside Arabic text, format with `Num` from the numeric component.

## Accessibility

A card is a plain `div`. It has no role, focus or keyboard behaviour.

| Key | Action |
| --- | --- |
| `Tab` | Moves through the interactive children (buttons, links) in DOM order. |

- `CardTitle` is a `div` by default. Pass `as="h3"` (any of `h1`-`h6`) so the card title is a heading in the
  document outline, or add `role="group"` with `aria-labelledby`.
- A clickable card is not provided. Put a real `<a>` or `Button` inside instead of adding `onClick` to the `div`.
- Localise all copy yourself; the component has no strings.

## RTL & i18n

- Layout is logical: `CardAction` sits on the inline end (left in RTL) and needs no change.
- Keep numbers and deltas LTR inside Arabic text: `<span dir="ltr">+12.4%</span>` or `Num`.
- Use `justify-end` in `CardFooter` for the primary action; it flips with `dir`.

## Styling & tokens

- Surface `bg-card` (level 1), text `text-card-foreground`, edge `border-border`, radius `rounded-card`.
- Tune spacing with `gap-*` on `Card` (for example `gap-3` for metric cards) and `pb-*` when a table fills the bottom.
- Target parts with `[data-slot=card]`, `[data-slot=card-header]`, `[data-slot=card-action]`.
- Extend with `className`. Never override colours with raw hex.

## Do / Don't

- **Do** use a card for a unit users act on or compare, or a group with its own actions.
- **Do** keep one primary action in the footer.
- **Do** use whitespace and a heading for sections, forms and single tables.
- **Don't** nest cards. Use a divider or heading inside.
- **Don't** add cards to fill a grid: no decorative charts or "welcome" cards.
- **Don't** hand-tune padding per screen; use the density tokens.

## Related

- [Table](../table/README.md) · [Badge](../badge/README.md) · [States](../states/README.md)
- [AppShell](../app-shell/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-card--docs

---
name: repeater
title: Repeater
category: form-builders
status: beta
summary: A list of rows the user can add, remove, duplicate, reorder by drag or keyboard and collapse, with min and max limits. Bring your own row content.
exports: [Repeater, RepeaterProps, RepeaterRowContext, RepeaterLabels]
related: [schema-repeater, field, sortable-list, button]
story: components-form-builders-repeater
keywords: [repeater, list, rows, add, remove, duplicate, reorder, drag, sortable, collapse, form, dynamic]
---

# Repeater

The frame for "add another" form sections: phone numbers, line items, team members. It owns the row chrome
(drag handle, collapse, duplicate, remove) and the list rules; you render what is inside a row.

## When to use

- A form section where the user decides how many rows there are.

## When not to use

- Rows made of standard fields: use `SchemaRepeater`, which generates them and validates.
- A fixed list of options: use checkboxes or a select.

## Import

```tsx
import { Repeater } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<Repeater<{ name: string }>
  defaultValue={[{ name: "Sara" }]}
  createItem={() => ({ name: "" })}
  rowTitle={(row) => row.name}
  min={1}
  max={5}
  renderRow={(row, { update }) => (
    <Input value={row.name} onChange={(e) => update({ name: e.currentTarget.value })} />
  )}
/>
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value`, `defaultValue`, `onValueChange` | `T[]`, `(T[]) => void` | `[]` | The rows. Controlled or not. |
| `createItem` | `() => T` | required | A new row. |
| `cloneItem` | `(T) => T` | `structuredClone` | How Duplicate copies a row. |
| `renderRow` | `(item, ctx) => ReactNode` | required | Row body. `ctx`: `index`, `id`, `count`, `disabled`, `update(patch \| fn)`. |
| `rowTitle`, `rowSummary`, `rowMeta` | functions | "Item n" | Header title, the line shown while collapsed, and header extras. |
| `min`, `max` | `number` | none | Remove stops at `min`; Add and Duplicate stop at `max`. |
| `reorderable`, `duplicable`, `collapsible` | `boolean` | `true` | Turn features off. |
| `defaultCollapsed`, `disabled` | `boolean` | `false` | |
| `label`, `addLabel`, `empty`, `labels` | | localised | English and Arabic built in; `labels` overrides any string. |

## Behaviour

- Drag the handle (mouse or touch). Keyboard: focus the handle, then ArrowUp / ArrowDown move the row, Home / End jump to the ends. Each move is announced through a polite live region.
- Rows keep their identity through reorder, so inputs inside keep focus and state.
- After Add focus goes to the new row; after Remove it goes to a neighbour.

## Accessibility

The list is a `ul` named by `label`. The collapse toggle has `aria-expanded` and `aria-controls`. The handle exposes `aria-keyshortcuts` and a hint.

## RTL

Layout uses logical properties; the handle and chevrons follow the direction. Row content is yours: keep codes and URLs `dir="ltr"`.

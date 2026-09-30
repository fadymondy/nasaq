---
name: checkbox
title: Checkbox
category: forms
status: beta
summary: A box for choices applied on submit and for selecting rows. Supports an indeterminate state for "some selected".
exports: [Checkbox]
related: [switch, field, data-table]
story: components-forms-checkbox
base-ui: [checkbox]
keywords: [checkbox, check, tick, select, selection, indeterminate, mixed, form, agree, terms]
---

# Checkbox

A 16px box with a 24px hit area. Use it for choices that are applied when a form is submitted, and for row selection.
`indeterminate` draws a dash and reports `aria-checked="mixed"`: use it on a "select all" box when only
some items are selected.

## When to use

- Form options that take effect on submit ("Email me a copy").
- Selecting items in a list or table (DataTable uses it).

## When not to use

- A setting that takes effect immediately: use `Switch`.
- Picking one of several options: use a radio group or a select.

## Import

```tsx
import { Checkbox } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<Field className="flex-row items-center gap-2">
  <Checkbox id="copy" defaultChecked />
  <FieldLabel htmlFor="copy">Email me a copy</FieldLabel>
</Field>
```

Or wrap it in a `<label>`: `<label className="flex items-center gap-2"><Checkbox /> Email me a copy</label>`.

## API

All Base UI `Checkbox.Root` props, including:

| Prop | Type | Notes |
| --- | --- | --- |
| `checked` / `defaultChecked` | `boolean` | Controlled or uncontrolled. |
| `onCheckedChange` | `(checked: boolean) => void` | |
| `indeterminate` | `boolean` | Dash; `aria-checked="mixed"`. |
| `disabled`, `required`, `name`, `value` | | Form behaviour, including a hidden input for native forms. |

## Accessibility

- Renders `role="checkbox"` with `aria-checked`. Space toggles it.
- Always give it a name: a `<label>`, a `FieldLabel`, or `aria-label` when it stands alone (as in a table row).
- The hit area is 24px, although the box is 16px.

## RTL & i18n

Nothing to mirror. The check and dash glyphs are symmetric.

## Styling & tokens

Unchecked: `border-nq-line-strong` on `bg-card`. Checked or indeterminate: `bg-primary`. Focus ring: `nq-focus`.
Radius 4px. `className` merges onto the root.

## Related

`switch` (immediate settings), `field`, `data-table` (row selection).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-checkbox--docs

---
name: infolist
title: Infolist
category: data-display
status: stable
summary: A read-only description list for a record's detail page, turning enum and boolean values into badges, with links, copy buttons, sections, and a column layout.
exports: [Infolist, InfolistLabels, InfolistEnumOption, InfolistItemType, InfolistItem, InfolistSection, InfolistProps]
related: [schema-form, relation-picker, badge, copy-button]
story: components-data-display-infolist
keywords: [description list, details, key value, record, read only, badge, enum]
---

# Infolist

The read side of a form. `Infolist` shows a record as label and value pairs. An `enum` value becomes a coloured
badge, a `boolean` becomes a Yes or No badge, emails, phone numbers and links are clickable, ids can be copied, and a
missing value says "Not set" instead of leaving a hole.

## When to use

- The detail page of a customer, order, device or any record.
- The read-only twin of a [SchemaForm](../schema-form/README.md).

## When not to use

- Rows of many records: use a table.
- Editing in place: use a form.

## Import

```tsx
import { Infolist } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<Infolist
  columns={2}
  items={[
    { id: "name", label: "Name", labelAr: "الاسم", value: "Acme Trading" },
    { id: "status", label: "Status", labelAr: "الحالة", type: "enum", value: "active", options: { active: { label: "Active", labelAr: "نشط", variant: "success" } } },
    { id: "vip", label: "VIP", labelAr: "مميز", type: "boolean", value: true },
    { id: "email", label: "Email", type: "email", value: "hello@acme.test", copyable: true },
  ]}
/>
```

## Anatomy

```
Infolist                 data-slot="infolist"  role="group"
└─ section               one per group, with a heading
   └─ dl
      └─ div             data-slot="infolist-item"
         ├─ dt           label
         └─ dd           value, and a copy button
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `InfolistItem[]` | none | Flat rows. |
| `sections` | `InfolistSection[]` | none | Groups with `title`, `titleAr`, `description` and `items`. |
| `columns` | `1 \| 2 \| 3` | `2` | From the small breakpoint up; one column on a phone. |
| `layout` | `"stacked" \| "inline"` | `stacked` | Label above the value, or label and value on one line. |
| `showEmpty` | `boolean` | `true` | `false` hides rows without a value. |
| `label`, `locale`, `labels`, `className` | | | |

`InfolistItem`: `id`, `label`, `labelAr`, `value`, `type` (`text`, `number`, `date`, `datetime`, `boolean`, `enum`,
`email`, `url`, `tel`, `code`, `list`), `options` (for `enum` and `list`: `label`, `labelAr`, `variant`, `icon`),
`copyable`, `unit`, `wide`, `render`, `hint`, `hintAr`.

## Accessibility

- It is a real description list (`dl`, `dt`, `dd`), so a screen reader pairs each label with its value.
- Badges carry words and an icon; the colour only backs them up.
- Links open in a new tab with `noopener`; only `http` and `https` are linked.

## RTL & i18n

- Labels use `labelAr`; values that are code, emails, phone numbers and URLs stay left to right.
- Free text is isolated with `bdi dir="auto"`. Numbers and dates use Latin digits.

## Styling & tokens

Badge variants and text tokens. Extend with `className`.

## Do / Don't

- Do give enum values a `variant` so status reads at a glance.
- Do mark ids and codes `copyable`.
- Do not put actions in the values; put them in the page header.

## Related

- [SchemaForm](../schema-form/README.md)
- [RelationPicker](../relation-picker/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-data-display-infolist--docs

---
name: schema-repeater
title: SchemaRepeater
category: forms
status: beta
summary: A Repeater whose rows are generated from a field schema (text, number, select, switch, date, nested repeater) with built-in validation in English and Arabic.
exports: [SchemaRepeater, SchemaRepeaterProps]
related: [repeater, field, select, date-picker]
story: components-forms-schema-repeater
keywords: [schema, repeater, form builder, dynamic form, validation, rows, nested, line items]
---

# SchemaRepeater

Describe a row as a list of fields and get a full add / remove / duplicate / reorder / collapse form, with
validation. The value is plain JSON, the same shape you validate on the server (`validateRows` is exported and
has no React dependency).

## When to use

- Line items, contacts, rules, hosts: rows of standard inputs.

## When not to use

- Rows with custom layout or components: use `Repeater`.

## Import

```tsx
import { SchemaRepeater, type SchemaField } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const fields: SchemaField[] = [
  { key: "name", type: "text", label: "Name", required: true, width: "half" },
  { key: "qty", type: "number", label: "Quantity", min: 1, integer: true, width: "half" },
  { key: "kind", type: "select", label: "Kind", options: [{ value: "a", label: "A" }] },
];

<SchemaRepeater fields={fields} label="Items" titleKey="name" min={1} max={10} onValidate={(r) => setValid(r.valid)} />
```

## Field types

| type | value | notable options |
| --- | --- | --- |
| `text` | `string` | `inputType`, `multiline`, `ltr`, `minLength`, `maxLength`, `pattern`, `patternMessage` |
| `number` | `number \| null` | `min`, `max`, `step`, `integer`, `unit` |
| `select` | `string \| null` | `options`, `placeholder` |
| `switch` | `boolean` | |
| `date` | ISO `YYYY-MM-DD \| null` | `min`, `max` |
| `repeater` | `SchemaRow[]` | `fields`, `min`, `max`, `titleKey`, `addLabel` (nested, any depth) |

All fields accept `key`, `label`, `description`, `required`, `width` ("full" or "half"), `hidden(row)` and `validate(value, row)`.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `fields` | `SchemaField[]` | The row schema. |
| `value`, `defaultValue`, `onValueChange` | `SchemaRow[]` | The rows. |
| `min`, `max`, `label`, `titleKey`, `rowTitle` | | Limits and row headings. |
| `showErrors` | `boolean` | Reveal every error (after a failed submit). Otherwise a field shows its error once edited. |
| `errors` | `RowErrors[]` | Server errors by row and field key. |
| `onValidate` | `(SchemaValidation) => void` | Called when the issue count or list message changes. |
| `messages`, `labels` | | Override validation messages and repeater strings. |
| `reorderable`, `duplicable`, `collapsible`, `defaultCollapsed`, `disabled`, `addLabel`, `empty` | | Passed to `Repeater`. |

## Accessibility

Errors render in `FieldError` tied to the input; the row header shows an issue count badge; the row-count message is `role="alert"`.

## RTL

Built-in messages have Arabic text. Email, URL, tel and `ltr` text inputs stay left-to-right.

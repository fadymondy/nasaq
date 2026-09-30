---
name: relation-picker
title: RelationPicker
category: forms
status: stable
summary: A field that points at another record and finds it by searching your API, storing ids and showing names, for one record or many, with create from typed text and loading, empty and error states.
exports: [RelationPicker, RelationPickerLabels, RelationOption, RelationPickerProps]
related: [combobox, schema-form, field, select]
story: components-forms-relation-picker
keywords: [relation, foreign key, lookup, async, search, picker, customer, assignee]
---

# RelationPicker

A foreign-key field. The value is an id; the person sees a name. Results come from your `search` function, so the list
can be as long as your table. It is built on [Combobox](../combobox/README.md), so filtering is Arabic-aware when you
pass fixed `options` instead.

## When to use

- Choosing a customer, project, owner or parent from a table too big for a Select.

## When not to use

- Fewer than about 20 choices: a [Select](../select/README.md).
- Free tags: a tags input.

## Import

```tsx
import { RelationPicker } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<RelationPicker
  aria-label="Customer"
  value={customerId}
  onValueChange={setCustomerId}
  search={(query, signal) => fetch(`/api/customers?q=${query}`, { signal }).then((r) => r.json())}
  resolve={(ids) => fetch(`/api/customers?ids=${ids.join(",")}`).then((r) => r.json())}
  onCreate={async (name) => ({ value: await api.createCustomer(name), label: name })}
/>
```

Add `multiple` and pass `string[]` for several records.

## Anatomy

```
RelationPicker            data-slot="relation-picker"
└─ Combobox               input (single) or chips (multiple)
   └─ list                results, the selected records, and a "Create ..." row
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` / `onValueChange` | `string \| null`, or `string[]` with `multiple` | none | Ids. The callback also gets the record or records. |
| `multiple` | `boolean` | `false` | Chips. |
| `search` | `(query, signal) => Promise<RelationOption[]>` | none | Called with an empty query when the list opens, then after `debounce`. Earlier calls are aborted. |
| `options` | `RelationOption[]` | none | Fixed records, searched on the client when `search` is omitted. |
| `resolve` | `(ids) => Promise<RelationOption[]>` | none | Names for saved ids the picker has not seen. |
| `onCreate` | `(query) => Promise<RelationOption \| { error }>` | none | Adds a row to create a record from the typed text. |
| `debounce` | `number` | `250` | Milliseconds. |
| `renderOption` | `(option) => ReactNode` | label and description | |
| `invalid`, `disabled`, `id`, `name`, `placeholder`, `aria-label` | | | `name` writes hidden inputs for a native form. |
| `locale`, `labels`, `className` | | | |

`RelationOption`: `value`, `label`, `labelAr`, `description`, `disabled`.

## Accessibility

- It is a combobox: type to search, arrow keys move, Enter picks, Escape closes.
- Loading, empty and error states are announced in a status region; the error has a retry button.
- Chips have a remove button named "Remove".

## RTL & i18n

Names use `labelAr` when the locale is Arabic. Labels and option text are isolated with `bdi dir="auto"`.

## Styling & tokens

Uses Combobox tokens. Extend with `className`.

## Do / Don't

- Do return a stable `value` (the id), never the label.
- Do provide `resolve` when the form loads saved values.
- Do not fetch in `renderOption`.

## Related

- [Combobox](../combobox/README.md)
- [SchemaForm](../schema-form/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-relation-picker--docs

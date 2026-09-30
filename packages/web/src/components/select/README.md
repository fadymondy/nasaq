---
name: select
title: Select
category: forms
status: beta
summary: Pick one value from a short list. A Field-style trigger that opens a DropdownMenu-style list. Wraps Base UI Select.
exports: [Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator, SelectContentProps]
related: [field, dropdown-menu, chip-group]
story: components-forms-select
base-ui: [select]
keywords: [select, dropdown, picker, combobox, form, choose one, option]
---

# Select

A form control for choosing one value from a list. The trigger looks like an `Input`; the list looks like a
`DropdownMenu`. Built on Base UI `Select`, so it has typeahead, keyboard navigation and a hidden native input
for forms (`name`).

## When to use

- One choice from 4 to ~15 known options in a form (type, priority, product).

## When not to use

- Two or three options that should stay visible: use [`ChipGroup`](../chip-group/README.md) or radios.
- Actions rather than a value: use [`DropdownMenu`](../dropdown-menu/README.md).
- Long, searchable lists: use the command palette pattern.

## Import

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Field, FieldLabel, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@fadymondy/nasaq/web";

const TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "question", label: "Question" },
];

export function TypeField() {
  return (
    <Field>
      <FieldLabel>Type</FieldLabel>
      <Select items={TYPES} defaultValue="bug" name="type">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
```

## Anatomy

```
Select                     Base UI Select.Root (pass items so the trigger can show labels)
├─ SelectTrigger           data-slot="select-trigger", chevron icon appended
│  └─ SelectValue          data-slot="select-value"
└─ SelectContent           Portal + positioner + popup + list   data-slot="select-content"
   ├─ SelectGroup          Base UI Select.Group
   │  └─ SelectLabel       data-slot="select-label" (inside a group only)
   ├─ SelectItem           data-slot="select-item", check at the inline-start
   └─ SelectSeparator      data-slot="select-separator"
```

## API

`Select` = `Select.Root` (`value?`, `defaultValue?`, `onValueChange?`, `items?`, `name?`, `disabled?`,
`required?`, `multiple?`). `SelectGroup` = `Select.Group`.

### `SelectContent`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `side?` | `Select.Positioner` `side` | `"bottom"` | Side of the trigger to open on. |
| `align?` | `"start" \| "center" \| "end"` | `"start"` | Alignment against the trigger. |
| `sideOffset?` | `number` | `4` | Gap to the trigger in px. |
| `alignItemWithTrigger?` | `boolean` | `false` | Overlay the selected item on the trigger (native feel). |

The popup is at least as wide as the trigger and scrolls within the available height.

### `SelectValue`

Base UI `Select.Value`. Pass `placeholder` for the empty state (muted).

### `SelectItem`

Base UI `Select.Item` props: `value` (required), `disabled?`, `label?`. Children are the item text.

## Accessibility

- The trigger is a combobox button; the list is a listbox with roving focus and typeahead.
- Wrap it in a `Field` with a `FieldLabel` so the trigger is labelled.
- RTL: the check and chevron sit on logical sides and mirror with the page.

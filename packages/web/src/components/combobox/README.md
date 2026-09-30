---
name: combobox
title: Combobox
category: forms
status: beta
summary: Searchable select for long lists, single or multiple (chips), with Arabic-aware filtering and an empty state. Wraps Base UI Combobox.
exports: [Combobox, ComboboxInput, ComboboxChips, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty, ComboboxGroup, ComboboxLabel, ComboboxSeparator, ComboboxValue, ComboboxCollection, comboboxFilter, ComboboxInputProps, ComboboxChipsProps, ComboboxContentProps]
related: [select, field, input-group, commands]
story: components-forms-combobox
base-ui: [combobox]
keywords: [combobox, autocomplete, searchable select, typeahead, multiselect, chips, tags, filter]
---

# Combobox

A form control for choosing from a long list by typing. It looks like a `Select`, filters as you type, and in
`multiple` mode shows the selection as removable chips. Filtering folds Arabic letter variants and diacritics,
so typing `اداره` finds `إدارة`.

## When to use

- One or many choices from a list too long to scan (countries, people, tags).

## When not to use

- Four to fifteen options: use [`Select`](../select/README.md).
- Free text with no fixed options: use [`Input`](../field/README.md).

## Import

```tsx
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Field,
  FieldLabel,
} from "@fadymondy/nasaq/web";

const COUNTRIES = [
  { value: "sa", label: "Saudi Arabia" },
  { value: "eg", label: "Egypt" },
  { value: "jo", label: "Jordan" },
];

export function CountryField() {
  return (
    <Field>
      <FieldLabel>Country</FieldLabel>
      <Combobox items={COUNTRIES}>
        <ComboboxInput placeholder="Search a country…" />
        <ComboboxContent>
          <ComboboxEmpty>No results</ComboboxEmpty>
          <ComboboxList>
            {(item: { value: string; label: string }) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
```

## Anatomy

```
Combobox                  Base UI Combobox.Root (filter defaults to comboboxFilter)
├─ ComboboxInput          single: box with input, clear and chevron   data-slot="combobox-input-group"
│  or ComboboxChips       multiple: chips + inline input              data-slot="combobox-chips"
│     └─ chip             data-slot="combobox-chip" / "combobox-chip-remove"
└─ ComboboxContent        portal + positioner + popup                 data-slot="combobox-content"
   ├─ ComboboxEmpty       data-slot="combobox-empty"
   └─ ComboboxList        data-slot="combobox-list"
      ├─ ComboboxGroup / ComboboxLabel / ComboboxSeparator
      └─ ComboboxItem     data-slot="combobox-item", check at the inline-start
```

## API

**Combobox**: Base UI `Combobox.Root` props (`items`, `value`, `defaultValue`, `onValueChange`, `multiple`,
`name`, `disabled`, `itemToStringLabel`, `isItemEqualToValue`, `inputValue`, ...). Items shaped `{ value, label }`
need no extra config. Differences from Base UI:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `filter` | `null \| (item, query, itemToString?) => boolean` | `comboboxFilter` | Arabic-aware substring match. `null` turns filtering off (async search). |

**ComboboxInput** (single mode)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `clearable` | `boolean` | `true` | Show a clear button when there is a value. |
| `clearLabel` | `string` | `"Clear"` | Accessible name of the clear button. Localise. |
| `triggerLabel` | `string` | `"Open"` | Accessible name of the chevron button. Localise. |

Other props go to the Base UI `Combobox.Input` (`placeholder`, `id`, `aria-invalid`).

**ComboboxChips** (multiple mode)

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `placeholder` | `string` | none | Shown only while nothing is selected. |
| `itemToLabel` | `(item: unknown) => ReactNode` | item `label` | Chip text. |
| `removeLabel` | `string` | `"Remove"` | Accessible name of each remove button. Localise. |
| `inputProps` | `Combobox.Input` props | none | Props for the inline input. |

**ComboboxContent**: `side` (`"bottom"`), `align` (`"start"`), `sideOffset` (`4`), plus Base UI `Popup` props.
In multi mode the popup is anchored to the chips box and matches its width.

**ComboboxList**: takes a render function `(item) => ReactNode` over the filtered items, or plain children.

**ComboboxItem**: `value` is the item object; `disabled` is supported. **ComboboxEmpty** shows only when the
filter leaves nothing and requires `items` on the root.

**comboboxFilter(item, query, itemToString?)**: the default filter, exported for reuse.

## Examples

Multiple with chips, controlled, Arabic copy:

```tsx
import {
  Combobox,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@fadymondy/nasaq/web";
import { useState } from "react";

type Option = { value: string; label: string };
const ITEMS: Option[] = [
  { value: "sa", label: "المملكة العربية السعودية" },
  { value: "eg", label: "مصر" },
  { value: "jo", label: "الأردن" },
];

export function Countries() {
  const [value, setValue] = useState<Option[]>([]);
  return (
    <Combobox multiple items={ITEMS} value={value} onValueChange={setValue}>
      <ComboboxChips placeholder="ابحث عن دولة…" removeLabel="إزالة" />
      <ComboboxContent>
        <ComboboxEmpty>لا توجد نتائج</ComboboxEmpty>
        <ComboboxList>
          {(item: Option) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Down / Up | Opens the list and moves the highlight. |
| Enter | Selects the highlighted item. |
| Escape | Closes the list. |
| Backspace (multi, empty input) | Highlights then removes the last chip. |
| Left / Right (multi) | Moves between chips. |

The input has `role="combobox"` and the list `role="listbox"`; the empty state is announced politely. The
clear, chevron and chip-remove buttons are icon-only: pass localised `clearLabel`, `triggerLabel`, `removeLabel`.
Label the control with `FieldLabel`.

## RTL & i18n

Padding, the check indicator and chip layout use logical properties and mirror in RTL. Filtering folds case,
diacritics, tatweel and alef/yeh/teh-marbuta variants. Localise the empty message and the button labels.

## Styling & tokens

Uses `border-input`, `bg-card`, `border-nq-focus`, `border-nq-danger`, `h-control`, `rounded-control`,
`bg-popover`, `shadow-floating`, `bg-nq-selected`. State attributes: `data-highlighted`, `data-disabled`,
`data-invalid`. Extend with `className`.

## Do / Don't

- Do provide an empty state. Do label the control.
- Don't use it for fewer than ~5 options; use `Select`.

## Related

- [Select](../select/README.md)
- [Field](../field/README.md)
- [InputGroup](../input-group/README.md)

## Lab

`https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-combobox--docs`

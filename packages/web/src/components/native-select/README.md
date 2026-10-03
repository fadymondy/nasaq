---
name: native-select
title: NativeSelect
category: forms
status: beta
summary: The browser's own select, styled like Input, with options as data or as option/optgroup children, a placeholder, two sizes and the Field label, description and invalid state.
exports: [NativeSelect, NativeSelectProps, NativeSelectOption]
related: [select, combobox, field, form]
story: components-forms-native-select
base-ui: [field]
keywords: [select, dropdown, native, option, optgroup, form, mobile, picker, list]
---

# NativeSelect

A styled `<select>`. Phones open their own wheel or sheet, it posts with plain HTML forms, and it is light.

## When to use

- Mobile-first forms and long plain lists (countries, time zones).
- Server forms that must work without JavaScript.

## When not to use

- Options with icons, descriptions or search: use [`Select`](../select/README.md) or [`Combobox`](../combobox/README.md).
- Several values: use `Combobox` with multiple, or checkboxes.

## Import

```tsx
import { NativeSelect } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Field, FieldLabel, NativeSelect } from "@fadymondy/nasaq/web";

export function Country() {
  return (
    <Field>
      <FieldLabel>Country</FieldLabel>
      <NativeSelect
        name="country"
        defaultValue=""
        required
        placeholder="Choose a country"
        options={[
          { value: "eg", label: "Egypt" },
          { value: "sa", label: "Saudi Arabia" },
        ]}
      />
    </Field>
  );
}
```

## Anatomy

```
NativeSelect                    data-slot="native-select" (wrapper)
├─ select                       Field control: gets the label, description and invalid state
│  ├─ option value=""           the placeholder (disabled when required)
│  └─ options / children
└─ ChevronDown                  at the inline end
```

## API

**NativeSelect**: every `select` prop except `size`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `readonly NativeSelectOption[]` | | `{ value, label, disabled? }`. Or pass `option` / `optgroup` children. |
| `placeholder` | `string` | | A first empty option. With `required` it cannot be picked again. |
| `size` | `"sm" \| "md"` | `"md"` | Control height. |

`className` goes on the wrapper; the other props go on the `select`.

## Accessibility

- It is a real `select`: keyboard, screen readers and autofill work as the platform does.
- Inside `Field`, `FieldLabel` names it and `FieldError` describes it.
- Text is 16px on touch screens so iOS does not zoom.

## RTL & i18n

- The chevron sits at the inline end and the padding mirrors. Option text follows the page direction.

## Styling & tokens

- Same height, border, radius and focus ring as `Input` (`h-control`, `rounded-control`, `--nq-focus`).

## Do / Don't

- Do use a placeholder like "Choose…" with `required` instead of preselecting a wrong value.
- Don't use it for fewer than four options: radios show the choice without a click.

## Related

- [`Select`](../select/README.md)
- [`Combobox`](../combobox/README.md)
- [`Field`](../field/README.md)
- [`Form`](../form/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-forms-native-select--docs

---
name: input-group
title: InputGroup
category: forms
status: beta
summary: An input with leading and trailing addons (icon, text affix or button) inside one bordered control that matches Input height.
exports: [InputGroup, InputGroupAddon, InputGroupText, InputGroupInput, InputGroupAddonProps]
related: [field, select, combobox]
story: components-forms-inputgroup
base-ui: [input]
keywords: [input, addon, prefix, suffix, icon, search, password, currency, affix]
---

# InputGroup

A single bordered control that holds an input plus addons on its start and end edges: a search icon, an
`https://` prefix, a currency unit, a show-password button. The group owns the border, focus ring and invalid
state, so the parts read as one field and the height matches `Input` at every density.

## When to use

- A search box with an icon, a URL or currency field with a unit, a password field with a toggle.

## When not to use

- Plain text entry with no addon: use [`Input`](../field/README.md).
- Picking from a list: use [`Select`](../select/README.md) or [`Combobox`](../combobox/README.md).

## Import

```tsx
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Field, FieldLabel, InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@fadymondy/nasaq/web";

export function WebsiteField() {
  return (
    <Field>
      <FieldLabel>Website</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText dir="ltr">https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput ltr placeholder="nasaq.app" />
      </InputGroup>
    </Field>
  );
}
```

## Anatomy

```
InputGroup            data-slot="input-group" (role="group")
├─ InputGroupAddon    data-slot="input-group-addon", align="start" | "end"
│  └─ InputGroupText  data-slot="input-group-text"  (or an icon or a Button)
└─ InputGroupInput    data-slot="input-group-input"  (Base UI Input)
```

## API

**InputGroup**: a `div`. Takes all `div` props.

**InputGroupAddon**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `align` | `"start" \| "end"` | `"start"` | Edge the addon sits on. Logical, so `end` is the left edge in RTL. |

**InputGroupText**: a `span` for affixes such as `SAR` or `https://`.

**InputGroupInput**

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `ltr` | `boolean` | `false` | Force left-to-right entry and `text-start`, for emails, URLs and codes in Arabic forms. |

All other props go to the Base UI `Input`.

## Examples

Password toggle with a button addon:

```tsx
import { Button, InputGroup, InputGroupAddon, InputGroupInput } from "@fadymondy/nasaq/web";
import { Eye } from "lucide-react";

export function Password() {
  return (
    <InputGroup>
      <InputGroupInput type="password" />
      <InputGroupAddon align="end" className="pe-1.5">
        <Button variant="ghost" size="icon-sm" aria-label="Show password">
          <Eye aria-hidden="true" />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
```

Currency in Arabic:

```tsx
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@fadymondy/nasaq/web";

export function Price() {
  return (
    <InputGroup>
      <InputGroupInput inputMode="decimal" placeholder="0.00" />
      <InputGroupAddon align="end">
        <InputGroupText>ر.س</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves to the input, then to any button addon. |

The group has `role="group"`. Wrap in `Field` with `FieldLabel` so the input is labelled; icon-only button
addons need an `aria-label` you localise. Decorative icons take `aria-hidden`.

## RTL & i18n

Addons use logical padding, so `align="start"` sits on the right in RTL. Use `ltr` on the input and `dir="ltr"`
on `InputGroupText` for URLs and other Latin content.

## Styling & tokens

Uses `border-input`, `bg-card`, `border-nq-focus`, `border-nq-danger`, `h-control`, `rounded-control`. State
attributes: `data-invalid` on the input turns the group border danger; a disabled input dims the group.
Extend with `className`.

## Do / Don't

- Do keep addons short. Do give icon buttons a label.
- Don't put a second bordered control inside; use `variant="ghost"` buttons.

## Related

- [Field](../field/README.md)
- [Select](../select/README.md)
- [Combobox](../combobox/README.md)

## Lab

`https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-inputgroup--docs`

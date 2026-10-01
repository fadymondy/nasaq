---
name: color-picker
title: ColorPicker
category: pickers
status: beta
summary: Swatch trigger that opens a popover with a swatch grid (tag palette by default), a validated hex field and an optional native colour input.
exports: [ColorPicker, ColorPickerProps, ColorSwatch, tagSwatches, isHexColor, normalizeHexColor, colorToCss]
related: [popover, radio-group, field, tag-input]
story: components-pickers-color-picker
base-ui: [popover, radio-group, radio, field]
keywords: [color, colour, picker, swatch, hex, palette, tag color]
---

# ColorPicker

A form control for choosing one colour. The trigger looks like an input and shows the current swatch and its
name. It opens a popover with a grid of swatches (the `--nq-tag-*` palette by default), a hex field that
validates what the user types, and an optional "Custom" button that opens the browser's native colour input.

## When to use

- Colouring a label, a tag, a calendar or a chart series.
- Letting users choose a brand colour, with a few approved swatches plus a free hex value.

## When not to use

- Picking one of a few named options with no colour meaning: use a [`RadioGroup`](../radio-group/README.md) or a `Select`.
- Editing tags themselves: use a [`TagInput`](../tag-input/README.md).

## Import

```tsx
import { ColorPicker } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ColorPicker, Field, FieldLabel } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function LabelColor() {
  const [color, setColor] = useState<string | null>("--nq-tag-teal");
  return (
    <Field>
      <FieldLabel>Label colour</FieldLabel>
      <ColorPicker value={color} onValueChange={setColor} aria-label="Label colour" />
    </Field>
  );
}
```

## Value format

The value is a plain string, and it is one of two things:

| Kind | Example | When |
| --- | --- | --- |
| CSS custom property name | `--nq-tag-red` | A swatch from the default palette, or any swatch whose `value` is a `--var` name. It follows the theme and brand, so store it when the colour is a design decision. |
| Hex string | `#1a73e8` | Anything typed in the hex field, picked with the native input, or a swatch given as hex. Always lower-case and 6 digits when it comes from the picker (`#abc` is stored as `#aabbcc`). |

`null` means no colour. Turn a value into a CSS colour with `colorToCss(value)`: a hex string stays as is, and
`--nq-tag-red` becomes `var(--nq-tag-red)`.

```tsx
import { colorToCss } from "@fadymondy/nasaq/web";

export const Dot = ({ color }: { color: string }) => <span className="size-3 rounded-full" style={{ backgroundColor: colorToCss(color) }} />;
```

## Anatomy

```
ColorPicker
├─ trigger                 button rendered through Field.Control      data-slot="color-picker-trigger"
│  └─ chip + name          data-slot="color-picker-chip"
└─ popover                 aria-label "Choose colour"
   ├─ swatch grid          radiogroup                                 data-slot="color-picker-swatches"
   │  └─ swatch            role="radio"                               data-slot="color-picker-swatch"
   ├─ hex field            dir="ltr" text input                       data-slot="color-picker-hex"
   │  └─ error             role="alert"                               data-slot="color-picker-error"
   └─ Custom button        opens <input type="color">                 data-slot="color-picker-custom"
```

## API

### `ColorPicker`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` | `string \| null` | none | Controlled value (hex or `--var` name). |
| `defaultValue?` | `string \| null` | `null` | Initial value when uncontrolled. |
| `onValueChange?` | `(value: string) => void` | none | Called with the chosen swatch value, or a lower-case 6 digit hex. |
| `swatches?` | `readonly ColorSwatch[]` | `tagSwatches(locale)` | Choices in the grid. `[]` hides the grid cleanly. |
| `mode?` | `"swatches" \| "hex"` | `"swatches"` | `"hex"` is hex-only: no swatch grid, only the hex field and the "Custom" button. |
| `columns?` | `number` | `5` | Swatches per row. |
| `allowHex?` | `boolean` | `true` | Show the hex field. |
| `allowNative?` | `boolean` | `true` | Show the "Custom" button for the native colour input. |
| `disabled?` | `boolean` | `false` | Disables the trigger. |
| `invalid?` | `boolean` | `false` | Marks the trigger invalid (`aria-invalid`, danger border). |
| `name?` | `string` | none | Renders a hidden input carrying the value for forms. |
| `id?` | `string` | none | Id of the trigger. |
| `placeholder?` | `string` | "No colour" | Trigger text when there is no value. |
| `locale?` / `dir?` | `string` / `"ltr" \| "rtl"` | from the provider | Override for the popup strings and direction. |
| `aria-label?` | `string` | "Choose colour" | Name of the trigger; the current colour name is appended. |
| `className?` | `string` | none | Merged onto the trigger. |

### Types and helpers

| Export | Signature |
| --- | --- |
| `ColorSwatch` | `{ value: string; label: string }`. `label` is the swatch's accessible name. |
| `tagSwatches(locale?)` | `ColorSwatch[]`: gray, red, orange, amber, green, teal, blue, violet, pink as `--nq-tag-*` names. |
| `isHexColor(value)` | `boolean`: true for `#rgb` or `#rrggbb`. |
| `normalizeHexColor(input)` | `string \| null`: lower-case `#rrggbb`; accepts a missing `#` and 3 digit shorthand. |
| `colorToCss(value)` | `string`: `--nq-tag-red` to `var(--nq-tag-red)`, hex unchanged. |

## Examples

### Your own swatches

```tsx
import { ColorPicker } from "@fadymondy/nasaq/web";

export function BrandColor() {
  return (
    <ColorPicker
      aria-label="Brand colour"
      columns={3}
      allowNative={false}
      swatches={[
        { value: "--nq-tag-blue", label: "Brand blue" },
        { value: "--nq-tag-green", label: "Success green" },
        { value: "--nq-tag-red", label: "Alert red" },
      ]}
    />
  );
}
```

### In a form

```tsx
import { ColorPicker, Field, FieldError, FieldLabel } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Required() {
  const [color, setColor] = useState<string | null>(null);
  return (
    <Field invalid={!color}>
      <FieldLabel>Colour</FieldLabel>
      <ColorPicker name="color" value={color} onValueChange={setColor} invalid={!color} aria-label="Colour" />
      <FieldError match>Choose a colour.</FieldError>
    </Field>
  );
}
```

### Arabic

```tsx
import { ColorPicker, Field, FieldLabel, NasaqProvider } from "@fadymondy/nasaq/web";

export function LabelColorAr() {
  return (
    <NasaqProvider locale="ar" target="scope">
      <Field>
        <FieldLabel>لون الوسم</FieldLabel>
        <ColorPicker defaultValue="--nq-tag-red" aria-label="لون الوسم" />
      </Field>
    </NasaqProvider>
  );
}
```

## Accessibility

The trigger is a button with `aria-label` "Choose colour: Teal". The popover is labelled "Choose colour". The
swatch grid is a `radiogroup` (Base UI `RadioGroup`), each swatch is a `role="radio"` with an accessible name
from its `label`, and the selected swatch also gets a ring, so the state is not colour only.

| Key | Action |
| --- | --- |
| `Enter` / `Space` on the trigger | Opens the popover. |
| `Left` / `Right` in the grid | Previous / next swatch and select it. They follow the reading direction, so `Right` goes to the previous swatch in RTL. |
| `Up` / `Down` in the grid | Previous / next swatch and select it. |
| `Tab` | Grid, hex field, Custom button. |
| `Enter` in the hex field | Validates and applies the value. |
| `Esc` | Closes and returns focus to the trigger. |

- The hex field has an accessible name; an invalid entry sets `aria-invalid` and shows an announced error.
- Caller must localise: `aria-label`, `placeholder`, and the `label` of every custom swatch. The built-in strings and the tag palette names come in English and Arabic.

## RTL & i18n

- The grid, trigger and buttons use logical layout, so they mirror with `dir`.
- The hex field is always `dir="ltr"`; hex digits never reverse in Arabic.
- Palette names and every built-in string switch to Arabic when the locale is `ar`.

## Styling & tokens

- Default swatches are `--nq-tag-*` variables. There are no hex colours in the component; hex only ever comes from the user's data.
- Surfaces use `bg-card`, `border-input`, `border-nq-line-strong`, the popover uses `bg-popover`; the focus ring is `nq-focus`; errors use `nq-danger`.
- Slots: `color-picker-trigger`, `color-picker-chip`, `color-picker-swatches`, `color-picker-swatch` (`data-checked`), `color-picker-hex`, `color-picker-error`, `color-picker-custom`.
- Extend the trigger with `className`; never override colours with raw hex.

## Do / Don't

- **Do** store a `--nq-tag-*` name when the colour is a design choice, so it adapts to dark mode and brands.
- **Do** give custom swatches a `label`; without it a screen reader has nothing to say.
- **Don't** assume the value is hex: pass it through `colorToCss` before using it in a style.
- **Don't** save the resolved colour of a token as hex unless you want it frozen.

## Related

- [Popover](../popover/README.md) · [RadioGroup](../radio-group/README.md) · [Field](../field/README.md) · [TagInput](../tag-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-pickers-color-picker--docs

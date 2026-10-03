---
name: slider
title: Slider
category: forms
status: beta
summary: Draggable single-value or range slider with marks, a Nasaq-formatted value label, disabled state and Field wiring. Wraps Base UI Slider.
exports: [Slider, SliderProps, SliderMark]
related: [progress, field, numeric, toggle-group]
story: components-forms-slider
base-ui: [slider]
keywords: [slider, range, thumb, marks, volume, price filter, value]
---

# Slider

Picks a number, or a range of two numbers, by dragging a thumb along a track. Pass a number for one thumb or an
array for a range. The value label uses Nasaq number formatting (Western digits in Arabic too). Built on Base UI `Slider`.

## When to use

- Choosing an approximate value on a scale: volume, quality, a price range filter.
- A range where dragging is faster than typing two numbers.

## When not to use

- An exact figure the user must type: use an `Input`.
- Showing a value the user cannot change: use `Progress` or `Meter`.
- Two to five named options: use `ToggleGroup` or `RadioGroup`.

## Import

```tsx
import { Slider } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Slider } from "@fadymondy/nasaq/web";

export function Volume() {
  return <Slider label="Volume" defaultValue={40} />;
}
```

## Anatomy

```
<Slider>                      data-slot="slider"
├─ slider-head                label + value row
│  └─ slider-value            formatted value(s)
├─ slider-control             data-slot="slider-control"
│  └─ slider-track
│     ├─ slider-range         the filled part
│     └─ slider-thumb         one per value
└─ slider-marks               optional ticks, aria-hidden
```

## API

### Slider (`SliderProps`)

All Base UI `Slider.Root` props except `orientation`, `format` and `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `number \| number[]` | none | A number is one thumb; an array is a range. |
| `onValueChange` | `(value, details) => void` | none | Called while dragging. |
| `onValueCommitted` | `(value, details) => void` | none | Called when the drag or key press ends. |
| `min` / `max` / `step` | `number` | `0` / `100` / `1` | Scale. |
| `label` | `ReactNode` | none | Visible name above the track. |
| `showValue` | `boolean` | `true` when `label` is set | Show the formatted value at the inline end. |
| `format` | `FormatNumberOptions` | none | Intl options, e.g. `{ style: "percent" }`. Also used for the spoken value. |
| `marks` | `readonly SliderMark[] \| boolean` | none | Ticks under the track; `true` = one per step. |
| `thumbLabels` | `readonly string[]` | none | Accessible name per thumb in a range. |
| `disabled` | `boolean` | `false` | Blocks input. |
| `name` | `string` | none | Form field name. |

`SliderMark`: `{ value: number; label?: ReactNode }`.

## Examples

Price range in Arabic:

```tsx
import { Slider } from "@fadymondy/nasaq/web";

export function PriceAr() {
  return (
    <Slider
      label="نطاق السعر"
      min={0}
      max={10000}
      step={100}
      defaultValue={[1200, 8500]}
      format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }}
      thumbLabels={["الحد الأدنى", "الحد الأقصى"]}
    />
  );
}
```

Inside a Field:

```tsx
import { Field, FieldDescription, FieldLabel, Slider } from "@fadymondy/nasaq/web";

export function Seats() {
  return (
    <Field name="seats">
      <FieldLabel>Seats</FieldLabel>
      <Slider aria-label="Seats" defaultValue={10} min={1} max={50} showValue />
      <FieldDescription>You can change this later.</FieldDescription>
    </Field>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves focus to a thumb. |
| ArrowRight / ArrowUp | Increases by one step (in RTL, ArrowLeft increases). |
| ArrowLeft / ArrowDown | Decreases by one step. |
| PageUp / PageDown | Larger step. |
| Home / End | Minimum / maximum. |

- Each thumb is an `input type="range"`. Name it with `label`, `aria-label` or `thumbLabels` and localise those.
- Marks are decorative (`aria-hidden`); the value is spoken through `aria-valuetext`.

## RTL & i18n

The fill starts at the inline start, so in RTL it grows from the right and arrow keys follow the direction (from
the `NasaqProvider` direction). Marks are placed with `inset-inline-start`. Values are formatted with Western
digits in every locale.

## Styling & tokens

`bg-nq-surface-soft` track, `bg-primary` range, `bg-card` thumb with `border-primary`, focus ring `nq-focus`.
State attributes: `data-disabled`, `data-dragging`. `className` merges onto the root.

## Do / Don't

- Do show the value; a bare slider is imprecise.
- Don't use it for values that need exactness.

## Related

[progress](../progress/README.md), [field](../field/README.md), [numeric](../numeric/README.md).

## Lab

https://docs.nasaqui.com/?path=/docs/components-forms-slider--docs

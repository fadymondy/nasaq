---
name: radio-group
title: RadioGroup
category: forms
status: beta
summary: Pick exactly one option from a short list, as plain radios or as bordered cards for plan-style choices.
exports: [RadioGroup, Radio, RadioCard, RadioCardProps]
related: [checkbox, switch, field, select, toggle-group]
story: components-forms-radio-group
base-ui: [radio-group, radio]
keywords: [radio, radio group, single choice, option, plan, card, pick one, form]
---

# RadioGroup

A set of mutually exclusive options. `RadioGroup` owns the value and keyboard behaviour, `Radio` is the round
control, and `RadioCard` is the card variant where the whole bordered card is the radio (pricing plans, billing
periods, delivery methods). Built on Base UI `RadioGroup` and `Radio`, so it works inside forms and inside `Field`.

## When to use

- Choosing one of two to five options where seeing all of them helps.
- Plan or tier selection: use `RadioCard`.

## When not to use

- Many options: use `Select`.
- Several may be chosen: use `Checkbox`.
- A setting that applies immediately: use `Switch`.
- A compact segmented choice such as a view mode: use `ToggleGroup`.

## Import

```tsx
import { RadioGroup, Radio, RadioCard } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Field, FieldDescription, FieldLabel, Radio, RadioGroup } from "@fadymondy/nasaq/web";

export function Contact() {
  return (
    <Field name="contact">
      <FieldLabel>Contact by</FieldLabel>
      <FieldDescription>We only use this for account notices.</FieldDescription>
      <RadioGroup defaultValue="email" aria-label="Contact by">
        <label className="flex items-center gap-2 text-body-sm">
          <Radio value="email" /> Email
        </label>
        <label className="flex items-center gap-2 text-body-sm">
          <Radio value="sms" /> SMS
        </label>
      </RadioGroup>
    </Field>
  );
}
```

## Anatomy

```
<RadioGroup>            data-slot="radio-group"
├─ <Radio>              data-slot="radio"        (with <label>)
│  └─ indicator         data-slot="radio-indicator"
└─ <RadioCard>          data-slot="radio-card"
   ├─ mark              data-slot="radio-card-mark"
   ├─ title             data-slot="radio-card-title"
   ├─ description       data-slot="radio-card-description"
   └─ meta              data-slot="radio-card-meta"
```

## API

### RadioGroup

All Base UI `RadioGroup` props.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` / `defaultValue` | `unknown` | none | Controlled or uncontrolled selected value. |
| `onValueChange` | `(value, eventDetails) => void` | none | Called when the selection changes. |
| `name` | `string` | none | Form field name. |
| `disabled`, `readOnly`, `required` | `boolean` | `false` | Form behaviour. |

### Radio

All Base UI `Radio.Root` props. `value` is required.

### RadioCard (`RadioCardProps`)

All Base UI `Radio.Root` props except `children` and the HTML `title`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | The option's name. |
| `description` | `ReactNode` | none | Supporting text. |
| `meta` | `ReactNode` | none | Content at the inline end, such as a price. |

## Examples

Plan choice with cards:

```tsx
import { RadioCard, RadioGroup } from "@fadymondy/nasaq/web";

export function Plans() {
  return (
    <RadioGroup defaultValue="pro" aria-label="Plan">
      <RadioCard value="free" title="Free" description="For trying it out" meta="$0" />
      <RadioCard value="pro" title="Pro" description="For growing teams" meta="$12" />
    </RadioGroup>
  );
}
```

Arabic:

```tsx
import { Radio, RadioGroup } from "@fadymondy/nasaq/web";

export function ContactAr() {
  return (
    <RadioGroup defaultValue="email" aria-label="طريقة التواصل">
      <label className="flex items-center gap-2 text-body-sm">
        <Radio value="email" /> البريد الإلكتروني
      </label>
      <label className="flex items-center gap-2 text-body-sm">
        <Radio value="sms" /> رسالة نصية
      </label>
    </RadioGroup>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves focus into the group (to the selected radio, or the first). |
| Arrow keys | Move to and select the next or previous radio. In RTL, ArrowLeft goes to the next one. |
| Space | Selects the focused radio. |

- `RadioGroup` has `role="radiogroup"`, each radio `role="radio"` with `aria-checked`.
- Name the group (`FieldLabel`, `aria-labelledby` or `aria-label`), and localise that label.
- A `RadioCard` takes its accessible name from its title and description.

## RTL & i18n

The card mirrors: the mark sits at the inline start and `meta` at the inline end. Layout uses logical classes only.
Arrow-key direction follows the `NasaqProvider` direction.

## Styling & tokens

Border `border-nq-line-strong`, checked `bg-primary` / `border-primary`, card selected `bg-nq-selected`, focus
`nq-focus`. State attributes: `data-checked`, `data-unchecked`, `data-disabled`. `className` merges onto the root.

## Do / Don't

- Do preselect a sensible default when one option is almost always right.
- Don't use a radio group for a single on/off choice.

## Related

[checkbox](../checkbox/README.md), [switch](../switch/README.md), [field](../field/README.md), [toggle-group](../toggle-group/README.md).

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-radio-group--docs

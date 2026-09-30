---
name: switch
title: Switch
category: forms
status: stable
summary: On/off toggle for a setting that applies immediately; the thumb mirrors in RTL.
exports: [Switch]
related: [field, text]
story: components-forms-switch
base-ui: [switch]
keywords: [toggle, on off, setting, checkbox, boolean, preference]
---

# Switch

A two-state toggle for a preference that takes effect the moment it is flipped (notifications, dark mode,
a feature flag). It wraps Base UI `Switch.Root` and `Switch.Thumb`, so it is a real switch to assistive
technology and works inside forms.

## When to use

- A setting that saves immediately, with no Save button.
- A boolean that is clearly "on" or "off".

## When not to use

- A choice that only applies when a form is submitted: use a checkbox inside a [`Field`](../field/README.md).
- More than two options: use a select or radio group.
- An action rather than a state: use a `Button`.

## Import

```tsx
import { Switch } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Switch } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function EmailNotifications() {
  const [on, setOn] = useState(true);
  return (
    <label className="flex items-center gap-3 text-body-sm text-foreground">
      <Switch checked={on} onCheckedChange={setOn} />
      Email notifications
    </label>
  );
}
```

## Anatomy

```
Switch                data-slot="switch"        (track, 36 x 20 px)
└─ thumb              data-slot="switch-thumb"  (16 px, travels to the inline end)
```

## API

### `Switch`

Takes the props of Base UI `Switch.Root` (`ComponentProps<typeof BaseSwitch.Root>`) and merges
`className`. The commonly used ones:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `checked?` | `boolean` | none | Controlled state. |
| `defaultChecked?` | `boolean` | `false` | Uncontrolled initial state. |
| `onCheckedChange?` | `(checked: boolean, eventDetails) => void` | none | Called when toggled. |
| `disabled?` | `boolean` | `false` | Disables the switch (`data-disabled`, 50% opacity). |
| `readOnly?` | `boolean` | `false` | Not changeable but still focusable. |
| `required?` | `boolean` | `false` | For form validation. |
| `name?` | `string` | none | Form field name. |
| `value?` | `string` | none | Submitted value when on. |
| `aria-label?` | `string` | none | Required when there is no visible label. |
| `className?` | `string` | none | Merged onto the track. |

## Examples

### Controlled with a visible label

```tsx
import { Switch } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function DarkModeToggle() {
  const [on, setOn] = useState(false);
  return (
    <label className="flex items-center justify-between gap-6 text-body-sm text-foreground">
      Dark mode
      <Switch checked={on} onCheckedChange={setOn} />
    </label>
  );
}
```

### States

```tsx
import { Switch } from "@fadymondy/nasaq/web";

export function States() {
  return (
    <div className="flex items-center gap-4">
      <Switch aria-label="Off" />
      <Switch aria-label="On" defaultChecked />
      <Switch aria-label="Disabled off" disabled />
      <Switch aria-label="Disabled on" disabled defaultChecked />
    </div>
  );
}
```

### Arabic

```tsx
import { Switch } from "@fadymondy/nasaq/web";

export function ArabicSetting() {
  return (
    <label dir="rtl" lang="ar" className="flex items-center justify-between gap-6 text-body-sm text-foreground">
      إشعارات البريد الإلكتروني
      <Switch defaultChecked />
    </label>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` | Moves focus to the switch. |
| `Space` | Toggles. |
| `Enter` | Toggles (Base UI's switch is a button with `role="switch"`). |

- Renders `role="switch"` with `aria-checked`. It always needs a name: wrap it in a `<label>` or pass
  `aria-label`. The caller must localise that text.
- Focus shows a 2px `outline-nq-focus` ring with a 2px offset.
- State is shown by thumb position as well as track colour, so it is not colour-only.

## RTL & i18n

- The thumb moves toward the inline end: `translate-x-3.5` in LTR and `rtl:data-checked:-translate-x-3.5`
  in RTL (the 14px travel of a 16px thumb inside the 36px track, 1px border and 2px padding), so "on" sits at the left in Arabic layouts.
- No built-in strings.

## Styling & tokens

- Track: `bg-nq-line-strong` off, `bg-primary` on (`data-checked`). Thumb `bg-background`, on
  `bg-primary-foreground`.
- Focus `outline-nq-focus`; motion `duration-150 ease-nq`.
- Target `[data-slot=switch]`, `[data-slot=switch-thumb]`, `data-checked`, `data-disabled`.

## Do / Don't

- **Do** use it for settings that apply immediately.
- **Do** label it, visibly or with `aria-label`.
- **Don't** use it for choices that need a Save button.
- **Don't** rely on the track colour alone to explain a setting; keep the label meaningful.

## Related

- [Field](../field/README.md) · [Text](../text/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-switch--docs

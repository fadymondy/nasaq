---
name: stepper
title: Stepper
category: navigation
status: beta
summary: Ordered steps with markers and connectors, horizontal or vertical, with complete, current, upcoming and error states.
exports: [Stepper, StepperItem, StepperProps, StepperItemProps, StepperOrientation, StepStatus]
related: [tabs, progress, breadcrumb]
story: components-navigation-stepper
base-ui: []
keywords: [stepper, wizard, steps, progress, checkout, onboarding, multi-step]
---

# Stepper

Shows where the user is in a fixed sequence (a setup wizard, a checkout). Each step has a numbered marker, a title and an optional description; connectors join the markers. State is derived from one `current` index on the root, so a wizard only has to move one number.

## When to use

- A short, ordered flow of two to seven steps, where the user needs to see how far along they are.
- A wizard with Back and Next buttons, or a read-only progress trail such as an order status.

## When not to use

- A continuous amount of progress (upload, percent): use [`Progress`](../progress/README.md).
- Unordered sections of one page: use [`Tabs`](../tabs/README.md).
- Showing the path to the current page: use [`Breadcrumb`](../breadcrumb/README.md).

## Import

```tsx
import { Stepper, StepperItem } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Stepper, StepperItem } from "@fadymondy/nasaq/web";

export function Setup() {
  return (
    <Stepper current={1} aria-label="Setup steps">
      <StepperItem title="Account" description="Name and email" />
      <StepperItem title="Workspace" description="Pick a plan" />
      <StepperItem title="Invite" description="Add your team" />
    </Stepper>
  );
}
```

## Anatomy

```
Stepper                        data-slot="stepper", data-orientation      <ol>
└─ StepperItem                 data-slot="stepper-item", data-status      <li>
   ├─ step                     data-slot="stepper-step"                   <div>, or <button> when `onClick` is set; carries aria-current="step"
   │  ├─ marker                data-slot="stepper-marker"                 number, check (complete) or X (error)
   │  └─ text                  data-slot="stepper-text"                   title + description
   └─ connector                data-slot="stepper-connector"              omitted on the last item; data-complete when the step is complete
```

## API

### `Stepper`

`StepperProps extends Omit<ComponentProps<"ol">, "children">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `current` | `number` | required | Zero-based index of the current step. Earlier steps are complete, later ones upcoming. |
| `orientation?` | `"horizontal" \| "vertical"` | `"horizontal"` | Along the inline axis, or stacked. |
| `children` | `ReactNode` | required | `StepperItem` elements in order. |
| `aria-label?` | `string` | none | Names the list. Localise it. |

### `StepperItem`

`StepperItemProps extends Omit<ComponentProps<"li">, "title" | "onClick">`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | The step's name. |
| `description?` | `ReactNode` | none | A short second line. |
| `error?` | `boolean` | `false` | Shows the error state (X marker, "Error" for screen readers). |
| `onClick?` | `() => void` | none | Turns the step into a `<button type="button">`. Omit for a read-only step. |
| `disabled?` | `boolean` | none | Disables a clickable step. |
| `statusLabel?` | `string` | `"Completed"` / `"Current step"` / `"Upcoming"` / `"Error"` | Screen-reader status text. Defaults by provider locale (`"مكتملة"`, `"الخطوة الحالية"`, `"قادمة"`, `"خطأ"`). |

`StepStatus` is `"complete" | "current" | "upcoming" | "error"`.

## Examples

### Wizard with Back and Next

```tsx
import { Button, Stepper, StepperItem } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Wizard() {
  const [current, setCurrent] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <Stepper current={current}>
        <StepperItem title="الحساب" />
        <StepperItem title="مساحة العمل" />
        <StepperItem title="تم" />
      </Stepper>
      <div className="flex justify-between">
        <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((n) => n - 1)}>السابق</Button>
        <Button variant="primary" disabled={current === 2} onClick={() => setCurrent((n) => n + 1)}>التالي</Button>
      </div>
    </div>
  );
}
```

### Clickable finished steps, and an error

```tsx
import { Stepper, StepperItem } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Checkout() {
  const [current, setCurrent] = useState(2);
  return (
    <Stepper current={current} orientation="vertical">
      <StepperItem title="Cart" onClick={() => setCurrent(0)} />
      <StepperItem title="Address" onClick={() => setCurrent(1)} />
      <StepperItem title="Payment" description="Card was declined" error />
    </Stepper>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Moves between clickable steps. |
| `Enter` / `Space` | Activates the focused step (`onClick`). |

- The root is an ordered list; give it an `aria-label`.
- The current step's element has `aria-current="step"`.
- Every title is followed by screen-reader text with its status, so state is never colour alone: complete shows a check, error an X, and the others a number.
- Localise `aria-label` and, for languages other than English and Arabic, `statusLabel`.

## RTL & i18n

- The row is a flex row, so in RTL the first step is on the right and the connectors run right to left. Vertical steps use a grid on the inline axis.
- Numbers go through `Num`, so they follow the provider locale digits (Latin by default).
- Built-in strings: the status labels, English and Arabic by provider locale.

## Styling & tokens

- Markers use `bg-primary` (complete), `border-nq-focus` (current), `border-border` (upcoming) and `nq-danger-*` (error). Connectors are `bg-border`, or `bg-primary` when complete.
- Target `[data-slot=stepper-item][data-status=current]` and the other statuses. Extend with `className`; never use raw hex.

## Do / Don't

- **Do** keep titles to one or two words.
- **Do** let users go back to finished steps with `onClick`.
- **Don't** use a stepper for more than about seven steps.
- **Don't** make upcoming steps clickable when later steps depend on earlier answers.

## Related

- [Tabs](../tabs/README.md) · [Progress](../progress/README.md) · [Breadcrumb](../breadcrumb/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-navigation-stepper--docs

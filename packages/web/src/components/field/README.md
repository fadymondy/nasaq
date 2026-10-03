---
name: field
title: Field
category: forms
status: stable
summary: Labelled form field (label, control, description, error) built on Base UI Field, with the Nasaq text Input and Textarea.
exports: [Field, FieldLabel, FieldDescription, FieldError, FieldControl, InputProps, Input, Textarea]
related: [switch, text, icon]
story: components-forms-field
base-ui: [field, input]
keywords: [form, input, textarea, label, validation, error, description, text field]
---

# Field

Groups a form control with its label, helper text and error message, and wires them together
(`for`/`id`, `aria-describedby`, `aria-invalid`) through Base UI's Field. `Input` and `Textarea` are the
Nasaq-styled text controls: one control height, a visible focus ring, and an invalid border that is
always paired with error text.

## When to use

- Any single-value text form row that needs a label, hint or validation message.
- Standalone text inputs (`Input` and `Textarea` work without `Field`, for example a toolbar search).

## When not to use

- On/off settings that apply immediately: use [`Switch`](../switch/README.md).
- Laying out several fields: compose `Field`s in a plain flex or grid column; there is no form component.
- Static label/value display: use [`Text`](../text/README.md).

## Import

```tsx
import { Field, FieldLabel, FieldDescription, FieldError, Input, Textarea } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Field, FieldDescription, FieldLabel, Input } from "@fadymondy/nasaq/web";

export function ProjectName() {
  return (
    <Field name="project">
      <FieldLabel>Project name</FieldLabel>
      <Input placeholder="Nasaq" />
      <FieldDescription>Shown in the sidebar and on invoices.</FieldDescription>
    </Field>
  );
}
```

## Anatomy

```
Field                     data-slot="field"              (flex column, gap 1.5)
├─ FieldLabel             data-slot="field-label"
├─ Input                  data-slot="input"              (Base UI Input; joins the Field automatically)
│  or Textarea            data-slot="textarea"           (Field.Control as <textarea>)
│  or FieldControl        (Base UI Field.Control, unstyled re-export)
├─ FieldDescription       data-slot="field-description"
└─ FieldError             data-slot="field-error"
```

## API

Every part forwards its remaining props to the Base UI part it wraps. Types are the Base UI types
(`ComponentProps<typeof BaseField.Root>` and so on). The tables list what matters most.

### `Field`

Wraps Base UI `Field.Root`. Adds the `className` merge and `data-slot="field"`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name?` | `string` | none | Form field name, used for submission and server-side errors. |
| `invalid?` | `boolean` | none | Forces the invalid state (`data-invalid` on all parts). |
| `disabled?` | `boolean` | none | Disables the control and dims the label. |
| `validate?` | Base UI validate function | none | Custom validation (see Base UI Field). |
| `validationMode?` | Base UI validation mode | Base UI default | When validation runs (see Base UI Field). |
| `className?` | `string` | none | Merged after `flex flex-col gap-1.5`. |

### `FieldLabel`, `FieldDescription`

Wrap `Field.Label` and `Field.Description`. Only `className` and Base UI's own props apply.
`FieldLabel` dims with `data-disabled`.

### `FieldError`

Wraps `Field.Error`. Renders `text-caption` in `text-nq-danger-text`.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `match?` | `boolean` or Base UI validity key | none | `true` always shows the error (use with `Field invalid`). Otherwise it shows only for the matching `ValidityState` flag. |
| `children?` | `ReactNode` | none | The message. Localise it. |

### `Input`

Wraps Base UI `Input` (`ComponentProps<typeof BaseInput>`), so every native `<input>` prop works
(`type`, `value`, `defaultValue`, `onChange`, `placeholder`, `aria-invalid`, ...). Height `h-control`,
full width.

`InputProps extends ComponentProps<typeof BaseInput>` adds:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `ltr?` | `boolean` | `false` | Sets `dir="ltr"` and `text-start` so emails, URLs, codes and phone numbers type and align left-to-right inside Arabic forms. |

### `Textarea`

Renders Base UI `Field.Control` as a `<textarea>` (`ComponentProps<"textarea">`), `min-h-20`, `py-2`. It shares the control
styles of `Input` and is wired to `FieldLabel`, `FieldDescription` and `FieldError` (including `data-invalid`).

### `FieldControl`

`export const FieldControl = BaseField.Control`: the unstyled Base UI control, for a Field control that
is not `Input`.

## Examples

### Description and textarea

```tsx
import { Field, FieldDescription, FieldLabel, Textarea } from "@fadymondy/nasaq/web";

export function Description() {
  return (
    <Field className="max-w-sm">
      <FieldLabel>Description</FieldLabel>
      <Textarea rows={3} placeholder="What is this project for?" />
      <FieldDescription>Visible to everyone in the workspace.</FieldDescription>
    </Field>
  );
}
```

### Invalid state with an error message

```tsx
import { Field, FieldError, FieldLabel, Input } from "@fadymondy/nasaq/web";

export function EmailField() {
  return (
    <Field invalid className="max-w-sm">
      <FieldLabel>Email</FieldLabel>
      <Input type="email" defaultValue="fady@" aria-invalid />
      <FieldError match>Enter a complete email address.</FieldError>
    </Field>
  );
}
```

### Disabled

```tsx
import { Field, FieldLabel, Input } from "@fadymondy/nasaq/web";

export function WorkspaceId() {
  return (
    <Field disabled className="max-w-sm">
      <FieldLabel>Workspace ID</FieldLabel>
      <Input defaultValue="ws_01J9" />
    </Field>
  );
}
```

### Arabic form with an LTR value

```tsx
import { Field, FieldDescription, FieldLabel, Input } from "@fadymondy/nasaq/web";

export function ArabicForm() {
  return (
    <div dir="rtl" lang="ar" className="flex max-w-sm flex-col gap-5">
      <Field>
        <FieldLabel>اسم المشروع</FieldLabel>
        <Input placeholder="نسق" />
      </Field>
      <Field>
        <FieldLabel>البريد الإلكتروني</FieldLabel>
        <Input type="email" dir="ltr" className="text-start" placeholder="name@example.com" />
        <FieldDescription>نستخدمه لإرسال الفواتير.</FieldDescription>
      </Field>
    </div>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Moves between controls. |
| Click on the label | Focuses the control (Base UI links label and control). |

- `Input`, `Textarea` and `FieldControl` are linked to `FieldLabel`, `FieldDescription` and `FieldError` by Base UI.
- Error text is a real text node next to the invalid border, so invalid state is not colour-only.
- Give an invalid `Input` `aria-invalid`; the border styles read both `data-invalid` and `aria-invalid`.
- The caller must localise label, description and error text.
- Used outside a `Field`, give `Input` and `Textarea` an explicit `aria-label` so they have a name.
- Controls respect `--nq-touch-min` and use 16px text on coarse pointers so iOS does not zoom on focus.

## RTL & i18n

- The field is a flex column with no direction of its own; text follows `dir`.
- `px-3` is symmetric, so the control needs no RTL override.
- For emails, URLs and codes pass `<Input ltr />` (sets `dir="ltr"` and `text-start`) so the value aligns to
  the reading start. Otherwise use `dir="auto"` for mixed-script values.
- No built-in strings. Pass labels, placeholders and messages localised.

## Styling & tokens

- Control: `rounded-control`, `border-input`, `bg-card`, `text-body`, `text-foreground`,
  `placeholder:text-muted-foreground`, `h-control` (Input only).
- Focus: `border-nq-focus` plus a 1px `outline-nq-focus`.
- Invalid: `data-invalid:border-nq-danger`, `aria-invalid:border-nq-danger`. Error text `text-nq-danger-text`.
- Disabled: `disabled:opacity-50`, `disabled:cursor-not-allowed`.
- Target `[data-slot=input]`, `[data-slot=textarea]`, `[data-slot=field-error]`, and Base UI's
  `data-invalid` / `data-disabled`.
- Extend with `className`; never override the border colour with raw hex.

## Do / Don't

- **Do** always render a `FieldLabel`. A placeholder is not a label.
- **Do** show errors with `FieldError`, not only a red border.
- **Don't** hide the label to save space without an `aria-label`.
- **Don't** signal state by colour alone.

## Related

- [Switch](../switch/README.md) for immediate on/off settings.
- [Text](../text/README.md) for the typography roles used by labels.

## Lab

https://docs.nasaqui.com/?path=/docs/components-forms-field--docs

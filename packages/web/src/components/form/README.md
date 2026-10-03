---
name: form
title: Form
category: forms
status: beta
summary: A form that wires errors to Nasaq fields by name, with useForm for values, validation, a pending submit and server errors mapped back onto fields, and FormField for label, control, description and error in one line.
exports: [Form, FormProps, FormField, FormFieldProps, useForm, UseFormOptions, UseFormResult, FormErrors, FormSubmitResult]
related: [field, native-select, alert, button]
story: components-forms-form
base-ui: [form, field]
keywords: [form, validation, errors, submit, server errors, field, useForm, pending, react hook form]
---

# Form

`Form` is Base UI's form: an error keyed by a field's `name` marks that field invalid and shows the message,
and editing the field clears it. `useForm` is a small state hook to go with it; you can also bring your own
form library and pass `errors`.

## When to use

- Any form that submits to a server and can get field errors back (taken email, bad slug).
- Simple forms where a form library would be too much.

## When not to use

- Large, dynamic or nested forms: use a form library and pass its errors to `Form`'s `errors`.
- One inline field that saves on blur: a `Field` alone is enough.

## Import

```tsx
import { Form, FormField, useForm } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, Form, FormField, Input, useForm } from "@fadymondy/nasaq/web";

declare function signUp(v: { email: string }): Promise<{ ok: boolean; taken?: boolean }>;

export function SignUp() {
  const form = useForm({
    defaultValues: { email: "" },
    validate: (v) => (v.email.includes("@") ? {} : { email: "Enter a valid email." }),
    onSubmit: async (v) => {
      const res = await signUp(v);
      if (res.taken) return { fieldErrors: { email: "This email already has an account." } };
      if (!res.ok) return { error: "Sign-up failed. Try again." };
    },
  });
  return (
    <Form {...form.formProps}>
      <FormField name="email" label="Email">
        <Input {...form.register("email")} type="email" />
      </FormField>
      <Button type="submit" variant="primary" loading={form.submitting}>Create account</Button>
    </Form>
  );
}
```

## Anatomy

```
Form                            data-slot="form", noValidate
├─ Alert (danger)               formError, above the fields
└─ FormField                    Field name=…
   ├─ FieldLabel
   ├─ control                   Input, Textarea, NativeSelect…
   ├─ FieldDescription
   └─ FieldError                the error for this name
```

## API

**Form**: every Base UI `Form` prop, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `errors` | `Record<string, string \| undefined>` | | Errors by field name. Empty values are ignored. |
| `formError` | `string \| null` | | One error for the whole form. |

**FormField**: every `Field` prop, plus `name` (required), `label`, `description` and the control as `children`.

**useForm({ defaultValues, validate?, onSubmit })**

- `validate(values)` returns an error per invalid field; an empty object submits.
- `onSubmit(values)` may return `{ fieldErrors?, error? }`. A thrown error becomes `formError`.

Returns `values`, `setValue(name, value)`, `errors`, `setErrors`, `formError`, `submitting`, `dirty`,
`register(name)` (`{ name, value, onChange }` for text controls), `formProps` (spread on `Form`) and
`reset(values?)`.

## Accessibility

- Invalid fields get `aria-invalid` and their error is linked with `aria-describedby` by `Field`.
- `formError` is an `Alert`, announced when it appears.
- The form is `noValidate`, so messages come from you, localised, instead of the browser's bubbles.

## RTL & i18n

- Layout follows the page direction. Write messages in the user's language; nothing is hard-coded.

## Styling & tokens

- A vertical stack with `gap-4`. Target `[data-slot="form"]`.

## Do / Don't

- Do return server field errors with the same keys as the field names.
- Do say how to fix it: "Use 8 characters or more", not "Invalid".
- Don't disable the submit button until the form is valid; let people submit and see what is missing.

## Related

- [`Field`](../field/README.md)
- [`NativeSelect`](../native-select/README.md)
- [`Alert`](../alert/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-forms-form--docs

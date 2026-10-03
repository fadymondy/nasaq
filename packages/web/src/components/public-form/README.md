---
name: public-form
title: PublicForm
category: form-builders
status: beta
summary: Renders a form definition for visitors, with rules that show hide or require fields, validation in Arabic and English, a hidden honeypot and a thank-you. Includes a ready contact form with a topic.
exports: [PublicForm, PublicFormProps, PublicFormLabels, ContactForm, ContactFormProps]
related: [form-builder, testimonials, field, phone-input]
story: components-form-builders-public-form
base-ui: [field, select, radio-group, checkbox]
keywords: [form, public form, contact, inquiry, subscribe, embed, honeypot, spam, topic, allowed origins, conditional fields]
---

# PublicForm

The visitor side of a form built with [FormBuilder](../form-builder/README.md). Give it a `FormDefinition` and it draws the
fields, applies the rules (`show`, `hide`, `require`) as answers change, checks the answers in the visitor's language,
drops bot submissions quietly and shows the thank-you in Arabic or English. `ContactForm` is the same thing with the
contact preset: name, email, topic, message.

The model and its pure helpers (`validateFormValues`, `formFieldStates`, `formOriginAllowed`, `formEmbedSnippet`, and more) live in `form-model.ts` and are exported too, so the server can run the same checks.

## When to use

- A contact, inquiry, subscribe or feedback form on a marketing site, embedded from another origin.
- Any short form whose fields come from data rather than code.

## When not to use

- A long form with steps or file uploads: build it from `Field` parts (or the wizard components).
- An in-app settings form: use `Field` directly.

## Import

```tsx
import { ContactForm, PublicForm, contactFormDefinition, formOriginAllowed } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ContactForm } from "@fadymondy/nasaq/web";

export const Contact = () => (
  <ContactForm
    onSubmit={async (data) => {
      await fetch("/api/contact", { method: "POST", body: JSON.stringify(data) });
    }}
  />
);
```

## Anatomy

```
PublicForm                data-slot="public-form" data-kind="contact"
├─ Field per visible field   data-field="<id>"
├─ honeypot                  hidden input name="website_url", aria-hidden, not focusable
├─ error text                role="alert" when the server refused
└─ Send button               then a thank-you  data-state="done"
```

## API

### `PublicForm`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `form` | `FormDefinition` | required | `{ name, kind, fields, rules, allowedOrigins, enabled, thanksEn, thanksAr, honeypot }`. |
| `onSubmit?` | `(data) => void \| { error? } \| Promise<...>` | none | Only visible answers, trimmed. Resolve `{ error }` or throw to keep the form and show a message. |
| `defaultValues?` | `Record<string, string \| boolean>` | `{}` | |
| `submitLabel?` | `ReactNode` | "Send" | |
| `preview?` | `boolean` | `false` | Validates but never sends; used inside the builder. |
| `locale?` / `labels?` | | provider locale | Validation messages and button text. |

A form with `enabled: false` shows a closed notice instead of the fields.

### `ContactForm`

`PublicForm` with `contactFormDefinition(topics)`. Props: everything above except `form` is optional, plus `topics` (`{ value, label, labelAr? }[]`) and `form` to replace the preset.

### Fields and rules

| Kind | Control |
| --- | --- |
| `text`, `email`, `number` | `Input` (email and number are left to right) |
| `phone` | `PhoneInput`, stored as E.164 |
| `textarea` | `Textarea` |
| `select`, `radio` | `Select` / `RadioGroup`, options `{ value, label, labelAr? }` |
| `checkbox` | `Checkbox` |

A rule is a `RuleBuilder` definition: conditions on other fields, and actions of type `show`, `hide` or `require` with `config.target` set to the field id. A field a `show` rule targets stays hidden until one of its rules matches.

### Helpers

| Export | Description |
| --- | --- |
| `validateFormValues(form, values)` | Error code per field: `required`, `email`, `phone`, `number`. Hidden fields are skipped. |
| `formFieldStates(form, values)` | `{ visible, required }` per field after the rules. |
| `buildFormSubmission(form, values)` | `{ data, spam }`: visible answers only; `spam` when the honeypot was filled. |
| `formOriginAllowed(allowed, origin)` | Exact match or `https://*.example.com`. **An empty list allows nothing.** |
| `parseFormOrigins(text)` / `normalizeFormOrigin(raw)` | Comma-separated input to normalised origins. |
| `formEmbedSnippet({ baseUrl, formKey, style })` | An iframe or script snippet. |
| `contactFormDefinition(topics?)`, `newFormField`, `newFormRule`, `moveFormField`, `parseFormOptions`, `formText` | Building blocks. |

## Examples

### A form that asks more when it matters

```tsx
import { PublicForm, contactFormDefinition, newFormRule } from "@fadymondy/nasaq/web";

const form = contactFormDefinition();
form.fields.push({ id: "order", kind: "text", label: "Order number", labelAr: "رقم الطلب", required: true });
const rule = newFormRule("show");
rule.actions[0]!.config.target = "order";
rule.conditions.children = [{ kind: "condition", id: "c1", field: "topic", op: "is", value: "support" }];
form.rules.push(rule);

export const Support = () => <PublicForm form={form} onSubmit={(data) => console.log(data)} />;
```

### Check the origin on the server

```ts
import { formOriginAllowed } from "@fadymondy/nasaq/web";

export function canEmbed(form: { allowedOrigins: string[] }, origin: string) {
  return formOriginAllowed(form.allowedOrigins, origin);
}
```

## Accessibility

- Every field has a visible label; optional ones say "(optional)". Errors are text under the field, the field is `aria-invalid`, and focus moves to the first field with a problem.
- The honeypot is `aria-hidden`, out of the tab order and named "Leave this field empty".
- The thank-you and closed states use `role="status"`; a server error uses `role="alert"`.

## RTL & i18n

- Labels, help, placeholders and options come in pairs (`label` and `labelAr`); the visitor's locale picks one and falls back to the other.
- Email and number inputs stay left to right inside Arabic forms. Numbers accept Arabic-Indic digits.
- The thank-you has `thanksEn` and `thanksAr`.

## Styling & tokens

Uses `Field`, `Input`, `Select`, `Button` tokens. `className` goes on the form; the layout is one column.

## Do / Don't

- **Do** run `validateFormValues`, `buildFormSubmission` and `formOriginAllowed` on the server too: the client is not a gate.
- **Do** show the thank-you for spam as well; telling a bot it was caught teaches it.
- **Don't** put secrets in a form definition: it is public.

## Related

- [FormBuilder](../form-builder/README.md) · [Testimonials](../testimonials/README.md) · [PhoneInput](../phone-input/README.md) · [Field](../field/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-form-builders-public-form--docs

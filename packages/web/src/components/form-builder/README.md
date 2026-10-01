---
name: form-builder
title: FormBuilder
category: form-builders
status: beta
summary: Build an embeddable public form in English and Arabic. Add and order fields, write show hide or require rules, choose which sites may embed it, and copy the snippet.
exports: [FormBuilder, FormBuilderProps, FormBuilderLabels]
related: [public-form, rule-builder, tag-input, code-block]
story: components-form-builders-form-builder
base-ui: [tabs, field, select, switch]
keywords: [form builder, embed, iframe, allowed origins, snippet, contact form, conditional logic, honeypot]
---

# FormBuilder

The admin side of public forms. It edits a plain `FormDefinition` (stored by you) and shows a live [PublicForm](../public-form/README.md) preview beside it.

- **Fields**: add eight kinds, edit labels in English and Arabic, mark required, write options (`Riyadh | الرياض`), reorder with the arrows or the row menu.
- **Logic**: rules built with [RuleBuilder](../rule-builder/README.md) that show, hide or require a field from other answers.
- **Settings**: the sites allowed to embed the form, a tester for an address, thank-you messages in both languages, the honeypot.
- **Embed**: an iframe or script snippet and the public link, each with a copy button.

The allowed sites list is **closed by default**: with nothing in it no site can embed the form, and the builder says so.

## When to use

- A CMS or admin that lets editors create contact, inquiry or subscribe forms for public sites.

## When not to use

- Forms your developers write in code: use `Field` and friends.
- Complex multi-step flows: use a wizard.

## Import

```tsx
import { FormBuilder } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { FormBuilder, contactFormDefinition } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function EditForm() {
  const [form, setForm] = useState(contactFormDefinition());
  return <FormBuilder value={form} onValueChange={setForm} formKey="pk_live_123" embedBaseUrl="https://forms.example.com" onSave={(f) => fetch("/api/forms/1", { method: "PUT", body: JSON.stringify(f) })} />;
}
```

## Anatomy

```
FormBuilder                data-slot="form-builder"
├─ header                  name, "Accepting responses" switch, Save
└─ Tabs
   ├─ Fields               list (data-slot="form-builder-field", context menu), settings card, live preview
   ├─ Logic                one RuleBuilder card per rule
   ├─ Settings             allowed sites (TagInput), address tester, thank-you (en, ar), honeypot
   └─ Embed                iframe or script CodeBlock, public link + CopyButton
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value?` / `defaultValue?` | `FormDefinition` | blank inquiry form | The form being edited. |
| `onValueChange?` | `(form) => void` | none | Every edit. |
| `formKey?` | `string` | `"pk_live_demo"` | Public key in the snippet and link. |
| `embedBaseUrl?` | `string` | `"https://forms.example.com"` | Where public forms are served. |
| `onSave?` | `(form) => void \| Promise<void>` | none | Shows a Save button. |
| `saving?` | `boolean` | `false` | |
| `locale?` / `labels?` | | provider locale | Every visible string in Arabic and English. |

The definition, helpers and validators are documented in [PublicForm](../public-form/README.md).

## Examples

### Save through your API

```tsx
import { FormBuilder, type FormDefinition } from "@fadymondy/nasaq/web";

export const Editor = ({ form, save }: { form: FormDefinition; save: (f: FormDefinition) => Promise<void> }) => <FormBuilder defaultValue={form} onSave={save} />;
```

## Accessibility

- Tabs use arrow keys. The field list is a list of buttons; the current one has `aria-current`. Each row also opens a menu (move, duplicate, remove) on context-click, long-press, Shift+F10 or the Menu key.
- Every reorder and delete has a labelled button as well as the menu.
- The preview is a `complementary` region named "Live preview".

## RTL & i18n

- Labels for the builder itself come in Arabic and English. Arabic label and thank-you inputs are right to left. The origins input and snippets are left to right.
- Removing a field also removes rules that pointed at it.

## Styling & tokens

Cards, tabs and inputs use the standard tokens. The Fields tab is two columns from `lg`, one below.

## Do / Don't

- **Do** validate submissions and the request origin on the server with the helpers from `public-form`.
- **Do** leave the honeypot on.
- **Don't** put a wildcard on a whole public suffix (`https://*.com` is refused).

## Related

- [PublicForm](../public-form/README.md) · [RuleBuilder](../rule-builder/README.md) · [TagInput](../tag-input/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-form-builders-form-builder--docs

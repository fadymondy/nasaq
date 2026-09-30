---
name: tag-input
title: TagInput
category: forms
status: beta
summary: Chips inside an input box. Enter or comma adds, Backspace removes the last, paste splits on commas and new lines; supports maxTags, validation, suggestions, and Field.
exports: [TagInput, TagInputProps]
related: [field, input-group, badge, combobox, chip-group]
story: components-forms-tag-input
base-ui: [input]
keywords: [tags, chips, labels, emails, multi-value, keywords, token]
---

# TagInput

A text input that turns what you type into removable chips. Use it for free-form lists: labels, keywords,
email recipients. It is a Field control, so `FieldLabel`, `FieldDescription` and `FieldError` wire up as they do
for `Input`.

## When to use

- The user types their own values and there can be several.
- The values can also come from a suggestion list, but free entry is allowed.

## When not to use

- Picking from a fixed list: use [`Combobox`](../combobox/README.md) or [`Select`](../select/README.md).
- A single filter chosen from a few: use [`ChipGroup`](../chip-group/README.md).

## Import

```tsx
import { TagInput } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { Field, FieldLabel, TagInput } from "@fadymondy/nasaq/web";

export function Labels() {
  return (
    <Field>
      <FieldLabel>Labels</FieldLabel>
      <TagInput defaultValue={["design", "urgent"]} />
    </Field>
  );
}
```

## Anatomy

```
TagInput                     data-slot="tag-input"  (data-invalid, data-disabled)
├─ box                       data-slot="tag-input-box"
│  ├─ Badge + remove button  data-slot="tag-input-tag"
│  └─ input                  data-slot="tag-input-field"
├─ ul role=listbox           data-slot="tag-input-suggestions"  (only with suggestions)
└─ p role=alert              data-slot="tag-input-error"
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `readonly string[]` | none | Controlled tags. |
| `defaultValue` | `readonly string[]` | `[]` | Initial tags when uncontrolled. |
| `onValueChange` | `(tags: string[]) => void` | none | |
| `maxTags` | `number` | none | At the limit new tags are refused with a message. |
| `validate` | `(tag: string, tags: readonly string[]) => boolean \| string` | none | `true` accepts, `false` shows a generic message, a string is the message to show. |
| `onReject` | `(tag: string, reason: "duplicate" \| "invalid" \| "max") => void` | none | |
| `suggestions` | `readonly string[]` | none | Filtered with `normalizeForSearch`; chosen tags are hidden. |
| `separators` | `readonly string[]` | `["Enter", ",", "،"]` | Keys that add the typed text. |
| `addOnBlur` | `boolean` | `true` | Add the pending text when the input loses focus. |
| `placeholder` | `string` | "Type and press Enter" / "اكتب ثم اضغط Enter" | Shown while there are no tags. |
| `disabled` | `boolean` | `false` | |
| `name` | `string` | none | Renders one hidden input per tag for native forms. |
| `invalid` | `boolean` | `false` | Danger border. Automatic inside `<Field invalid>`. |
| `inputProps` | Base UI Input props | none | For the text input: `id`, `aria-label`, `dir`. |

Duplicates are ignored, compared with `normalizeForSearch` (case and Arabic letter variants folded).

## Examples

Emails with a limit:

```tsx
import { Field, FieldLabel, TagInput } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Invite() {
  const [emails, setEmails] = useState<string[]>([]);
  return (
    <Field>
      <FieldLabel>Invite by email</FieldLabel>
      <TagInput
        value={emails}
        onValueChange={setEmails}
        maxTags={3}
        inputProps={{ dir: "ltr" }}
        validate={(tag) => /^\S+@\S+\.\S+$/.test(tag) || `${tag} is not a valid email.`}
      />
    </Field>
  );
}
```

Arabic with suggestions:

```tsx
import { Field, FieldLabel, TagInput } from "@fadymondy/nasaq/web";

export function Skills() {
  return (
    <Field>
      <FieldLabel>المهارات</FieldLabel>
      <TagInput suggestions={["إدارة المشاريع", "تصميم", "برمجة"]} />
    </Field>
  );
}
```

## Accessibility

| Key | Action |
| --- | --- |
| Enter, comma, Arabic comma | Adds the typed text as a tag. |
| Backspace (empty input) | Removes the last tag. |
| Arrow Down / Up | Moves through suggestions. |
| Enter (suggestion active) | Adds that suggestion. |
| Escape | Closes suggestions. |
| Tab | Moves to a tag's remove button, then out. |

- With `suggestions` the input is a `role="combobox"` with `aria-activedescendant`.
- Each remove button is named "Remove <tag>". Adding and removing are announced through a polite live region; refusals through `role="alert"`.
- Localise messages you return from `validate`; built-in ones follow the Nasaq locale.

## RTL & i18n

- Chips flow from the inline start. Tag text is wrapped in `<bdi>` so an English tag inside Arabic keeps its order.
- The Arabic comma is a separator by default.
- Pass `inputProps={{ dir: "ltr" }}` for emails and URLs.

## Styling & tokens

Box uses `border-input`, `bg-card`, `border-nq-focus`; errors use `border-nq-danger` and `text-nq-danger-text`. Target `[data-invalid]` and `[data-disabled]` on the root. Extend with `className`; do not override colours with hex.

## Do / Don't

- Do set `maxTags` when the backend has a limit.
- Do validate on the server too.
- Do not use it for a fixed choice list; use Combobox.

## Related

- [Field](../field/README.md)
- [Badge](../badge/README.md)
- [ChipGroup](../chip-group/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-tag-input--docs

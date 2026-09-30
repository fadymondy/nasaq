---
name: inline-edit
title: InlineEdit
category: forms
status: beta
summary: Text that turns into an input in place with Save and Cancel, async save, validation by type, and keyboard and focus handling.
exports: [InlineEditLabels, InlineEditProps, InlineEdit]
related: [field, data-table, profile-form, button]
story: components-forms-inline-edit
base-ui: [input]
keywords: [inline edit, edit in place, rename, click to edit, title, save cancel]
---

# InlineEdit

A value that reads as plain text until you click it. Then it becomes an input (or a textarea) in the same place, with Save and Cancel buttons. Use it for titles, names, descriptions and other single fields where opening a dialog or a form page would be too heavy.

## When to use

- Renaming a document, project or list item.
- A profile or settings value edited one field at a time.
- Short text or one paragraph that changes now and then.

## When not to use

- Several related fields saved together: use a form ([profile-form](../profile-form/README.md), [field](../field/README.md)).
- Editing cells of a table: use DataTable's column `edit` and `onCellEdit`.
- Long or formatted content: use [rich-text-editor](../rich-text-editor/README.md).

## Import

```tsx
import { InlineEdit } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { useState } from "react";
import { InlineEdit } from "@fadymondy/nasaq/web";

export function ProjectTitle() {
  const [title, setTitle] = useState("Website redesign");
  return (
    <InlineEdit
      label="title"
      value={title}
      required
      maxLength={80}
      displayClassName="text-h2"
      onSave={async (next) => {
        await api.rename(next);
        setTitle(next);
      }}
    />
  );
}
```

## Anatomy

```
InlineEdit           data-slot="inline-edit"  data-state="display" | "editing"
├─ display           <button> with the text and a pencil (shown on hover, focus and touch)
└─ editing           role="group"
    ├─ Input | Textarea
    ├─ Save (check) and Cancel (x) buttons
    └─ message       role="alert" for errors, or the multi-line key hint
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | required | The saved value. |
| `onSave` | `(value) => void \| { error?: string } \| Promise<...>` | required | Save the new value. Return `{ error }` or throw to keep editing. Busy while pending. |
| `label` | `string` | required | Names the field ("Edit title") and the empty text ("Add title"). |
| `type` | `"text" \| "number" \| "url" \| "email"` | `"text"` | Validates on save. `number` accepts Arabic-Indic digits. `url` accepts only http and https. |
| `multiline`, `rows` | `boolean`, `number` | `false`, `3` | A textarea. Enter adds a line, Ctrl or Cmd+Enter saves. |
| `placeholder` | `string` | none | Shown for an empty value and in the input. |
| `required` | `boolean` | `false` | An empty value is refused. |
| `maxLength` | `number` | none | Counted in characters. |
| `validate` | `(value) => string \| undefined` | none | Return a message to refuse the value. Runs after the built-in checks. |
| `onBlurAction` | `"save" \| "cancel" \| "none"` | `"save"` | What leaving the open editor does. |
| `renderValue` | `(value) => ReactNode` | none | Custom display, such as a link. |
| `displayClassName`, `inputClassName` | `string` | none | Make the display match the heading it replaces. |
| `ltr` | `boolean` | true for number, email, url | Force left-to-right entry for codes and links inside Arabic pages. |
| `disabled`, `readOnly` | `boolean` | `false` | No edit affordance. |
| `editing`, `onEditingChange` | `boolean`, `(boolean) => void` | uncontrolled | Control the state, for example to start editing from a menu. |
| `labels` | `InlineEditLabels` | English or Arabic | Overrides for the strings. |

## Examples

```tsx
<InlineEdit label="website" type="url" value={site} onSave={saveSite} />
```

```tsx
<InlineEdit label="description" multiline rows={4} value={about} onSave={saveAbout} onBlurAction="none" />
```

```tsx
<InlineEdit
  label="handle"
  value={handle}
  validate={(v) => (/^[a-z0-9_]+$/.test(v) ? undefined : "Use lowercase letters, digits and underscores.")}
  onSave={async (v) => ((await api.isTaken(v)) ? { error: "That handle is taken." } : void (await api.save(v)))}
/>
```

Arabic copy:

```tsx
<InlineEdit label="العنوان" value="إعادة تصميم الموقع" onSave={save} labels={{ edit: "تعديل {label}" }} />
```

## Accessibility

| Key | Action |
| --- | --- |
| Enter, Space | On the text: start editing. In a single-line field: save. |
| Ctrl or Cmd + Enter | Save a multi-line field. |
| Escape | Cancel and give focus back to the text. |
| Tab | Move between the field, Save and Cancel. |

- The display is a real button named "Edit title". The editor is a group with the same name; the input has `aria-invalid` and `aria-describedby` pointing at the error.
- Focus returns to the text after saving or cancelling, so keyboard users keep their place.
- Enter during IME composition (Arabic or CJK input methods) is left to the IME.
- Localise `label`, and `labels` where wording matters.

## RTL & i18n

- The text and input use `dir="auto"`, so Arabic and English values each align naturally.
- `number`, `email` and `url` fields are left-to-right so codes and links keep their order.
- Numbers typed with Arabic-Indic digits are converted before validating.

## Styling & tokens

Uses `--nq-hover`, `--nq-focus` and the control tokens. Target `data-slot="inline-edit"`, `data-state` and `data-pending`. Pass `displayClassName` to match the surrounding type role.

## Do / Don't

- Do show what will happen: Save and Cancel are always visible while editing.
- Do keep the display looking like the text it replaces.
- Don't use it where a mistake is costly and needs review. Use a form with a confirmation.
- Don't rely on hover for discovery. The pencil is always shown on touch and focus.

## Related

- [field](../field/README.md), [profile-form](../profile-form/README.md), [data-table](../data-table/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-forms-inline-edit--docs
